from __future__ import annotations

import base64
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import json
from zoneinfo import ZoneInfo
from urllib.parse import urlencode
import threading

from fastapi import Depends, FastAPI, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
import requests
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, SessionLocal, engine, get_db
from app.ebp_service import (
    ensure_token_state,
    refresh_client,
    refresh_due_clients,
    remove_client_from_disk,
    scheduler_loop,
    log_refresh,
    notify_webhooks,
    store_refresh_token_history,
    sync_clients_from_disk,
    write_client_to_disk,
)
from app.models import Client, SchedulerRun
from app.runtime_settings import get_effective_config, upsert_config


settings = get_settings()
templates = Jinja2Templates(directory="/app/templates")
stop_event = threading.Event()
worker_thread: threading.Thread | None = None
FRANCE_TZ = ZoneInfo("Europe/Paris")


def require_basic_auth(request: Request) -> None:
    if settings.auth_mode == "none":
        return

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Basic "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    encoded = auth.split(" ", 1)[1]
    try:
        decoded = base64.b64decode(encoded).decode("utf-8")
        username, password = decoded.split(":", 1)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        ) from exc

    if username != settings.admin_username or password != settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    global worker_thread

    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS folder_id TEXT NULL"))
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name TEXT NULL"))
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_email TEXT NULL"))
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_first_name TEXT NULL"))
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_last_name TEXT NULL"))
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS ebp_user_sub TEXT NULL"))
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS ebp_code_tiers TEXT NULL"))
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS ebp_contact_id TEXT NULL"))
        conn.execute(text("ALTER TABLE token_states ADD COLUMN IF NOT EXISTS client_slug TEXT NULL"))
        conn.execute(text("ALTER TABLE token_states ADD COLUMN IF NOT EXISTS alert_fingerprint TEXT NULL"))
        conn.execute(text("ALTER TABLE token_states ADD COLUMN IF NOT EXISTS last_alert_at DATETIME NULL"))
        conn.execute(text("ALTER TABLE refresh_logs ADD COLUMN IF NOT EXISTS source TEXT NULL"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY AUTO_INCREMENT, `key` TEXT NOT NULL, value TEXT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_app_settings_key (`key`(255)))"))
        conn.execute(
            text(
                """
                UPDATE token_states ts
                JOIN clients c ON c.id = ts.client_id
                SET ts.client_slug = c.slug
                WHERE ts.client_slug IS NULL OR ts.client_slug <> c.slug
                """
            )
        )
    with SessionLocal() as db:
        sync_clients_from_disk(db)
        clients = db.query(Client).all()
        for client in clients:
            ensure_token_state(client)
            store_refresh_token_history(db, client, client.token.refresh_token, "bootstrap")
        db.commit()

    stop_event.clear()
    worker_thread = threading.Thread(
        target=scheduler_loop,
        args=(SessionLocal, stop_event),
        daemon=True,
        name="ebp-refresh-worker",
    )
    worker_thread.start()
    yield
    stop_event.set()
    if worker_thread and worker_thread.is_alive():
        worker_thread.join(timeout=5)


app = FastAPI(title=settings.app_title, lifespan=lifespan)


def format_paris_datetime(value: datetime | None) -> str:
    if value is None:
        return ""
    return value.replace(tzinfo=UTC).astimezone(FRANCE_TZ).strftime("%d/%m/%Y %H:%M:%S")


templates.env.filters["paris_dt"] = format_paris_datetime


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def get_public_base_url(request: Request) -> str:
    if settings.public_base_url:
        return settings.public_base_url
    return str(request.base_url).rstrip("/")


def get_ebp_callback_url(request: Request) -> str:
    return f"{get_public_base_url(request)}/ebp/callback"


def sign_state(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    encoded = base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")
    secret = (settings.internal_api_token or settings.admin_password).encode("utf-8")
    digest = hmac.new(secret, encoded.encode("utf-8"), hashlib.sha256).digest()
    signature = base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")
    return f"{encoded}.{signature}"


def verify_state(state: str) -> dict:
    try:
        encoded, provided_signature = state.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid state") from exc

    secret = (settings.internal_api_token or settings.admin_password).encode("utf-8")
    expected_digest = hmac.new(secret, encoded.encode("utf-8"), hashlib.sha256).digest()
    expected_signature = base64.urlsafe_b64encode(expected_digest).decode("utf-8").rstrip("=")
    if not hmac.compare_digest(provided_signature, expected_signature):
        raise HTTPException(status_code=400, detail="Invalid state signature")

    padded = encoded + "=" * (-len(encoded) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
    if payload.get("exp", 0) < int(utcnow().timestamp()):
        raise HTTPException(status_code=400, detail="Expired state")
    return payload


def require_internal_token(request: Request) -> None:
    configured = settings.internal_api_token.strip()
    if not configured:
        raise HTTPException(status_code=503, detail="Internal API token not configured")

    auth = request.headers.get("Authorization", "")
    expected = f"Bearer {configured}"
    if auth != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def fetch_clients(db: Session) -> list[Client]:
    clients = (
        db.query(Client)
        .options(
            selectinload(Client.token),
            selectinload(Client.history),
            selectinload(Client.refresh_token_history),
        )
        .order_by(Client.name.asc())
        .all()
    )
    changed = False
    for client in clients:
        ensure_token_state(client)
        changed = hydrate_client_from_stored_payload(client) or changed
    if changed:
        db.commit()
    return clients


def get_client_or_404(db: Session, client_id: int) -> Client:
    client = (
        db.query(Client)
        .options(
            selectinload(Client.token),
            selectinload(Client.history),
            selectinload(Client.refresh_token_history),
        )
        .filter(Client.id == client_id)
        .one_or_none()
    )
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_token_state(client)
    return client


def hydrate_client_from_userinfo(client: Client, userinfo_body: dict) -> None:
    display_name = (userinfo_body.get("name") or "").strip()
    current_name = (client.name or "").strip()
    if display_name and not current_name:
        client.name = display_name
    client.contact_name = display_name or client.contact_name
    client.contact_email = (
        userinfo_body.get("email")
        or next(iter(userinfo_body.get("ebp.email", [])), None)
        or client.contact_email
    )
    client.contact_first_name = userinfo_body.get("given_name") or client.contact_first_name
    client.contact_last_name = userinfo_body.get("family_name") or client.contact_last_name
    client.ebp_user_sub = userinfo_body.get("sub") or client.ebp_user_sub
    client.ebp_code_tiers = (
        userinfo_body.get("http://login.schemas.ebp.com/identity/claims/CodeTiers")
        or client.ebp_code_tiers
    )
    client.ebp_contact_id = (
        userinfo_body.get("http://login.schemas.ebp.com/identity/claims/ContactId")
        or client.ebp_contact_id
    )


def hydrate_client_from_stored_payload(client: Client) -> bool:
    token = ensure_token_state(client)
    if not token.last_response_json:
        return False
    try:
        payload = json.loads(token.last_response_json)
    except ValueError:
        return False
    userinfo_body = payload.get("userinfo")
    if not isinstance(userinfo_body, dict):
        return False

    before = (
        client.name,
        client.contact_name,
        client.contact_email,
        client.contact_first_name,
        client.contact_last_name,
        client.ebp_user_sub,
        client.ebp_code_tiers,
        client.ebp_contact_id,
    )
    hydrate_client_from_userinfo(client, userinfo_body)
    after = (
        client.name,
        client.contact_name,
        client.contact_email,
        client.contact_first_name,
        client.contact_last_name,
        client.ebp_user_sub,
        client.ebp_code_tiers,
        client.ebp_contact_id,
    )
    return before != after


def get_client_status(token) -> tuple[str, str]:
    if token.last_error:
        return "bad", "Erreur"
    if token.access_token and token.expires_at:
        return "ok", "OK"
    return "warn", "A initialiser"


def build_client_summary(client: Client) -> dict:
    token = ensure_token_state(client)
    status_class, status_label = get_client_status(token)
    return {
        "id": client.id,
        "slug": client.slug,
        "name": client.name,
        "folder_id": client.folder_id,
        "enabled": client.enabled,
        "status_class": status_class,
        "status_label": status_label,
        "contact_name": client.contact_name,
        "contact_email": client.contact_email,
        "contact_first_name": client.contact_first_name,
        "contact_last_name": client.contact_last_name,
        "ebp_user_sub": client.ebp_user_sub,
        "ebp_code_tiers": client.ebp_code_tiers,
        "ebp_contact_id": client.ebp_contact_id,
        "token": token,
    }


def build_dashboard_metrics(clients: list[Client]) -> dict:
    total = len(clients)
    ok = 0
    error = 0
    pending = 0
    requested = 0

    for client in clients:
        token = ensure_token_state(client)
        if token.refresh_token:
            requested += 1
        if token.last_error:
            error += 1
        elif token.access_token and token.expires_at:
            ok += 1
        else:
            pending += 1

    return {
        "total": total,
        "ok": ok,
        "error": error,
        "pending": pending,
        "requested": requested,
    }


def get_last_scheduler_runs(db: Session) -> dict:
    last_windmill = (
        db.query(SchedulerRun)
        .filter(SchedulerRun.source == "windmill")
        .order_by(SchedulerRun.created_at.desc())
        .first()
    )
    last_auto = (
        db.query(SchedulerRun)
        .filter(SchedulerRun.source == "auto")
        .order_by(SchedulerRun.created_at.desc())
        .first()
    )
    return {
        "windmill": last_windmill,
        "auto": last_auto,
    }


def render_dashboard(request: Request, db: Session):
    sync_clients_from_disk(db)
    clients = fetch_clients(db)
    scheduler_runs = get_last_scheduler_runs(db)
    client_cards = [build_client_summary(client) for client in clients]
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "app_title": settings.app_title,
            "active_page": "dashboard",
            "clients": clients,
            "client_cards": client_cards,
            "metrics": build_dashboard_metrics(clients),
            "scheduler_runs": scheduler_runs,
            "runtime_config": get_effective_config(db),
        },
    )


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def index(
    request: Request,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    return render_dashboard(request, db)


@app.get("/clients", response_class=HTMLResponse)
def clients_page(
    request: Request,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    sync_clients_from_disk(db)
    clients = fetch_clients(db)
    return templates.TemplateResponse(
        request,
        "clients.html",
        {
            "app_title": settings.app_title,
            "active_page": "clients",
            "clients": [build_client_summary(client) for client in clients],
            "metrics": build_dashboard_metrics(clients),
        },
    )


@app.get("/clients/{client_id}", response_class=HTMLResponse)
def client_detail(
    request: Request,
    client_id: int,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = get_client_or_404(db, client_id)
    summary = build_client_summary(client)
    return templates.TemplateResponse(
        request,
        "client_detail.html",
        {
            "app_title": settings.app_title,
            "active_page": "clients",
            "client": client,
            "summary": summary,
        },
    )


@app.get("/config", response_class=HTMLResponse)
def config_page(
    request: Request,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    runtime_config = get_effective_config(db)
    return templates.TemplateResponse(
        request,
        "config.html",
        {
            "app_title": settings.app_title,
            "active_page": "config",
            "runtime_config": runtime_config,
            "db_access": {
                "host": settings.db_public_host,
                "port": settings.db_public_port,
                "database": settings.db_public_name,
                "user": settings.db_public_user,
                "password": settings.db_public_password,
            },
        },
    )


@app.post("/config")
def update_config(
    request: Request,
    smtp_host: str = Form(...),
    smtp_port: str = Form(...),
    smtp_username: str = Form(""),
    smtp_password: str = Form(""),
    smtp_from_email: str = Form(""),
    alert_to_email: str = Form(""),
    alert_policy: str = Form("new_only"),
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    upsert_config(
        db,
        {
            "smtp_host": smtp_host.strip(),
            "smtp_port": smtp_port.strip(),
            "smtp_username": smtp_username.strip(),
            "smtp_password": smtp_password,
            "smtp_from_email": smtp_from_email.strip(),
            "alert_to_email": alert_to_email.strip(),
            "alert_policy": alert_policy.strip(),
        },
    )
    return RedirectResponse("/config", status_code=303)


@app.get("/clients/{client_id}/connect-ebp")
def connect_ebp(
    request: Request,
    client_id: int,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    state = sign_state(
        {
            "client_id": client.id,
            "slug": client.slug,
            "exp": int((utcnow() + timedelta(minutes=10)).timestamp()),
        }
    )

    params = {
        "client_id": settings.ebp_client_id,
        "response_type": "code",
        "redirect_uri": get_ebp_callback_url(request),
        "scope": settings.ebp_auth_scope,
        "state": state,
        "prompt": "login",
        "max_age": "0",
    }
    url = f"https://api-login.ebp.com/connect/authorize?{urlencode(params)}"
    return RedirectResponse(url, status_code=302)


def apply_authorization_code(
    db: Session,
    client: Client,
    code: str,
    redirect_uri: str,
):
    token_response = requests.post(
        settings.ebp_token_url,
        data={
            "client_id": settings.ebp_client_id,
            "client_secret": settings.ebp_client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
        },
        timeout=settings.request_timeout_seconds,
    )

    try:
        token_body = token_response.json()
    except ValueError:
        token_body = {"raw": token_response.text}

    if token_response.status_code >= 400 or "error" in token_body:
        ensure_token_state(client)
        client.token.last_error = json.dumps(token_body, ensure_ascii=False)
        client.token.last_http_status = token_response.status_code
        client.token.last_error_at = utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail=token_body)

    userinfo_body = None
    access_token = token_body.get("access_token")
    if access_token:
        userinfo_response = requests.get(
            "https://api-login.ebp.com/connect/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=settings.request_timeout_seconds,
        )
        if userinfo_response.ok:
            userinfo_body = userinfo_response.json()

    if userinfo_body:
        hydrate_client_from_userinfo(client, userinfo_body)

    ensure_token_state(client)
    client.token.access_token = token_body.get("access_token")
    client.token.refresh_token = token_body.get("refresh_token") or client.token.refresh_token
    store_refresh_token_history(db, client, client.token.refresh_token, "authorization_code")
    client.token.token_type = token_body.get("token_type")
    expires_in = int(token_body.get("expires_in") or 3600)
    client.token.expires_at = utcnow() + timedelta(seconds=expires_in)
    client.token.last_success_at = utcnow()
    client.token.last_refresh_at = utcnow()
    client.token.last_error = None
    client.token.last_http_status = token_response.status_code
    stored_payload = {"token": token_body}
    if userinfo_body:
        stored_payload["userinfo"] = userinfo_body
    client.token.last_response_json = json.dumps(stored_payload, ensure_ascii=False, separators=(",", ":"))
    db.commit()


@app.get("/ebp/callback")
def ebp_callback(
    request: Request,
    code: str,
    state: str,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    payload = verify_state(state)
    client = db.query(Client).filter(Client.id == int(payload["client_id"])).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    apply_authorization_code(db, client, code, get_ebp_callback_url(request))
    return RedirectResponse(f"/clients/{client.id}", status_code=303)


@app.post("/clients/{client_id}/exchange-code")
def exchange_ebp_code(
    request: Request,
    client_id: int,
    authorization_code: str = Form(...),
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    apply_authorization_code(db, client, authorization_code.strip(), get_ebp_callback_url(request))
    return RedirectResponse(f"/clients/{client.id}", status_code=303)


@app.post("/clients")
def create_client(
    request: Request,
    slug: str = Form(...),
    name: str = Form(...),
    folder_id: str = Form(""),
    refresh_token: str = Form(""),
    webhook_file_url: str = Form(""),
    webhook_raw_url: str = Form(""),
    notes: str = Form(""),
    enabled: str = Form("true"),
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    slug_value = slug.strip().lower()
    existing = db.query(Client).filter(Client.slug == slug_value).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Client slug already exists")

    client = Client(
        slug=slug_value,
        name=name.strip(),
        folder_id=folder_id.strip() or None,
        initial_refresh_token=refresh_token.strip() or None,
        webhook_file_url=webhook_file_url.strip() or None,
        webhook_raw_url=webhook_raw_url.strip() or None,
        notes=notes.strip() or None,
        enabled=enabled.lower() == "true",
    )
    ensure_token_state(client)
    if client.initial_refresh_token:
        client.token.refresh_token = client.initial_refresh_token
    db.add(client)
    db.commit()
    if client.initial_refresh_token:
        store_refresh_token_history(db, client, client.initial_refresh_token, "create")
        db.commit()
    write_client_to_disk(client)
    return RedirectResponse(f"/clients/{client.id}", status_code=303)


@app.post("/clients/{client_id}/update")
def update_client(
    request: Request,
    client_id: int,
    name: str = Form(...),
    slug: str = Form(...),
    folder_id: str = Form(""),
    contact_name: str = Form(""),
    contact_email: str = Form(""),
    contact_first_name: str = Form(""),
    contact_last_name: str = Form(""),
    ebp_code_tiers: str = Form(""),
    ebp_contact_id: str = Form(""),
    refresh_token: str = Form(""),
    webhook_file_url: str = Form(""),
    webhook_raw_url: str = Form(""),
    notes: str = Form(""),
    enabled: str = Form("false"),
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    old_slug = client.slug
    new_slug = slug.strip().lower()
    if not new_slug:
        raise HTTPException(status_code=400, detail="Slug vide")
    existing = db.query(Client).filter(Client.slug == new_slug, Client.id != client_id).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Client slug already exists")

    client.name = name.strip()
    client.slug = new_slug
    client.folder_id = folder_id.strip() or None
    client.contact_name = contact_name.strip() or None
    client.contact_email = contact_email.strip() or None
    client.contact_first_name = contact_first_name.strip() or None
    client.contact_last_name = contact_last_name.strip() or None
    client.ebp_code_tiers = ebp_code_tiers.strip() or None
    client.ebp_contact_id = ebp_contact_id.strip() or None
    client.webhook_file_url = webhook_file_url.strip() or None
    client.webhook_raw_url = webhook_raw_url.strip() or None
    client.notes = notes.strip() or None
    client.enabled = enabled.lower() == "true"
    ensure_token_state(client)
    if refresh_token.strip():
        client.token.refresh_token = refresh_token.strip()
        client.initial_refresh_token = refresh_token.strip()
        client.token.force_refresh = True
        store_refresh_token_history(db, client, refresh_token.strip(), "update")
    db.commit()
    if old_slug != new_slug:
        remove_client_from_disk(old_slug)
    write_client_to_disk(client)
    return RedirectResponse(f"/clients/{client.id}", status_code=303)


@app.post("/clients/{client_id}/delete")
def delete_client(
    request: Request,
    client_id: int,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    slug = client.slug
    db.delete(client)
    db.commit()
    remove_client_from_disk(slug)
    return RedirectResponse("/clients", status_code=303)


@app.post("/clients/{client_id}/set-refresh-token")
def set_refresh_token_and_refresh(
    request: Request,
    client_id: int,
    refresh_token: str = Form(...),
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    new_refresh_token = refresh_token.strip()
    if not new_refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token vide")

    ensure_token_state(client)
    client.token.refresh_token = new_refresh_token
    client.initial_refresh_token = new_refresh_token
    client.token.force_refresh = True
    client.token.last_error = None
    store_refresh_token_history(db, client, new_refresh_token, "manual")
    db.commit()
    write_client_to_disk(client)

    refresh_client(db, client, source="manual")
    return RedirectResponse(f"/clients/{client.id}", status_code=303)


@app.post("/clients/{client_id}/refresh")
def force_refresh(
    request: Request,
    client_id: int,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_token_state(client)
    client.token.force_refresh = True
    db.commit()
    refresh_client(db, client, source="manual")
    return RedirectResponse(f"/clients/{client.id}", status_code=303)



@app.post("/clients/{client_id}/send-webhooks")
def send_webhooks_manual(
    request: Request,
    client_id: int,
    _: None = Depends(require_basic_auth),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    if not client.webhook_file_url and not client.webhook_raw_url:
        raise HTTPException(status_code=400, detail="Aucun webhook configuré sur ce client")
    token = ensure_token_state(client)
    if token.last_response_json:
        try:
            payload = json.loads(token.last_response_json)
        except ValueError:
            payload = {}
    else:
        payload = {
            "access_token": token.access_token,
            "refresh_token": token.refresh_token,
            "token_type": token.token_type,
        }
    try:
        notify_webhooks(client, payload)
        log_refresh(db, client, True, "Webhook envoyé manuellement", "webhook_manual")
        db.commit()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur webhook: {exc}")
    return RedirectResponse(f"/clients/{client.id}?tab=fiche-tab&webhook=ok", status_code=303)


@app.post("/internal/run-refresh")
def run_refresh(
    request: Request,
    _: None = Depends(require_internal_token),
):
    result = refresh_due_clients(SessionLocal, source="windmill")
    return {"status": "ok", **result}
