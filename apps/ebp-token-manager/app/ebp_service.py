from __future__ import annotations

from datetime import UTC, datetime, timedelta
import json
from pathlib import Path
import threading
import time
from typing import Any

import requests
from sqlalchemy.orm import Session

from app.alerts import build_error_fingerprint, send_error_email
from app.config import get_settings
from app.models import Client, RefreshLog, RefreshTokenHistory, SchedulerRun, TokenState
from app.runtime_settings import get_effective_config


settings = get_settings()
_refresh_lock = threading.Lock()


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def compact_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def iter_client_config_paths() -> list[Path]:
    root = Path(settings.clients_dir)
    if not root.exists():
        return []
    return [p / "client.json" for p in sorted(root.iterdir()) if p.is_dir() and (p / "client.json").exists()]


def ensure_token_state(client: Client) -> TokenState:
    if client.token is None:
        client.token = TokenState()
    client.token.client_slug = client.slug
    return client.token


def sync_clients_from_disk(db: Session) -> int:
    created_or_updated = 0
    for config_file in iter_client_config_paths():
        payload = json.loads(config_file.read_text(encoding="utf-8"))
        slug = payload["slug"].strip().lower()
        client = db.query(Client).filter(Client.slug == slug).one_or_none()
        if client is None:
            client = Client(slug=slug, name=payload.get("name", slug))
            db.add(client)
            db.flush()
            created_or_updated += 1

        client.name = payload.get("name", client.name)
        client.folder_id = payload.get("folder_id")
        client.contact_name = payload.get("contact_name") or client.contact_name
        client.contact_email = payload.get("contact_email") or client.contact_email
        client.contact_first_name = payload.get("contact_first_name") or client.contact_first_name
        client.contact_last_name = payload.get("contact_last_name") or client.contact_last_name
        client.ebp_user_sub = payload.get("ebp_user_sub") or client.ebp_user_sub
        client.ebp_code_tiers = payload.get("ebp_code_tiers") or client.ebp_code_tiers
        client.ebp_contact_id = payload.get("ebp_contact_id") or client.ebp_contact_id
        client.enabled = bool(payload.get("enabled", True))
        client.initial_refresh_token = payload.get("initial_refresh_token") or client.initial_refresh_token
        client.webhook_file_url = payload.get("webhook_file_url")
        client.webhook_raw_url = payload.get("webhook_raw_url")
        client.notes = payload.get("notes")

        token_state = ensure_token_state(client)
        if client.initial_refresh_token and not token_state.refresh_token:
            token_state.refresh_token = client.initial_refresh_token
            created_or_updated += 1

    db.commit()
    return created_or_updated


def serialize_client(client: Client) -> dict[str, Any]:
    return {
        "slug": client.slug,
        "name": client.name,
        "folder_id": client.folder_id,
        "contact_name": client.contact_name,
        "contact_email": client.contact_email,
        "contact_first_name": client.contact_first_name,
        "contact_last_name": client.contact_last_name,
        "ebp_user_sub": client.ebp_user_sub,
        "ebp_code_tiers": client.ebp_code_tiers,
        "ebp_contact_id": client.ebp_contact_id,
        "enabled": client.enabled,
        "initial_refresh_token": client.initial_refresh_token,
        "webhook_file_url": client.webhook_file_url,
        "webhook_raw_url": client.webhook_raw_url,
        "notes": client.notes,
    }


def write_client_to_disk(client: Client) -> Path:
    root = Path(settings.clients_dir)
    root.mkdir(parents=True, exist_ok=True)
    client_dir = root / client.slug
    client_dir.mkdir(parents=True, exist_ok=True)
    config_path = client_dir / "client.json"
    config_path.write_text(
        json.dumps(serialize_client(client), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return config_path


def remove_client_from_disk(slug: str) -> int:
    removed = 0
    for config_path in iter_client_config_paths():
        try:
            payload = json.loads(config_path.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if str(payload.get("slug", "")).strip().lower() != slug.strip().lower():
            continue
        config_path.unlink(missing_ok=True)
        try:
            config_path.parent.rmdir()
        except OSError:
            pass
        removed += 1
    return removed


def log_refresh(
    db: Session,
    client: Client,
    success: bool,
    message: str,
    source: str | None = None,
    http_status: int | None = None,
    response_excerpt: str | None = None,
) -> None:
    db.add(
        RefreshLog(
            client_id=client.id,
            success=success,
            source=source,
            message=message[:2000],
            http_status=http_status,
            response_excerpt=(response_excerpt or "")[:8000] or None,
        )
    )


def store_refresh_token_history(
    db: Session,
    client: Client,
    refresh_token: str | None,
    source: str | None = None,
) -> None:
    value = (refresh_token or "").strip()
    if not value:
        return
    latest = (
        db.query(RefreshTokenHistory)
        .filter(RefreshTokenHistory.client_id == client.id)
        .order_by(RefreshTokenHistory.created_at.desc())
        .first()
    )
    if latest is not None and latest.refresh_token == value:
        return
    db.add(
        RefreshTokenHistory(
            client_id=client.id,
            client_slug=client.slug,
            refresh_token=value,
            source=source,
        )
    )


def should_refresh(token: TokenState) -> bool:
    if token.force_refresh:
        return True
    if not token.refresh_token:
        return False
    if token.expires_at is None:
        return True
    margin = timedelta(seconds=settings.refresh_margin_seconds)
    return token.expires_at <= (utcnow() + margin)


def notify_webhooks(client: Client, response_json: dict[str, Any]) -> None:
    raw_json = compact_json(response_json)

    if client.webhook_file_url:
        files = {
            "file": (
                f"{client.slug}_ebp_token.json",
                raw_json.encode("utf-8"),
                "application/json",
            )
        }
        requests.post(client.webhook_file_url, files=files, timeout=settings.request_timeout_seconds)

    if client.webhook_raw_url:
        requests.post(
            client.webhook_raw_url,
            data=raw_json.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
            timeout=settings.request_timeout_seconds,
        )


def refresh_client(db: Session, client: Client, source: str = "auto") -> tuple[bool, str]:
    token = ensure_token_state(client)
    runtime_config = get_effective_config(db)
    alert_policy = str(runtime_config.get("alert_policy") or "new_only")
    if not token.refresh_token:
        token.last_error = "Refresh token absent."
        token.last_error_at = utcnow()
        db.commit()
        return False, token.last_error

    payload = {
        "client_id": settings.ebp_client_id,
        "client_secret": settings.ebp_client_secret,
        "refresh_token": token.refresh_token,
        "grant_type": "refresh_token",
    }

    token.refresh_in_progress = True
    token.last_refresh_at = utcnow()
    db.commit()

    try:
        response = requests.post(
            settings.ebp_token_url,
            data=payload,
            timeout=settings.request_timeout_seconds,
        )
        token.last_http_status = response.status_code

        try:
            body = response.json()
        except ValueError:
            body = {"raw": response.text}

        token.last_response_json = compact_json(body)

        if response.status_code >= 400 or "error" in body:
            message = f"EBP refresh failed: {body.get('error', response.reason)}"
            token.last_error = message
            token.last_error_at = utcnow()
            token.refresh_in_progress = False
            token.force_refresh = False
            fingerprint = build_error_fingerprint(message, response.status_code)
            should_alert = (
                alert_policy == "all_errors"
                or (alert_policy == "new_only" and token.alert_fingerprint != fingerprint)
            )
            token.alert_fingerprint = fingerprint
            log_refresh(db, client, False, message, source, response.status_code, token.last_response_json)
            db.commit()
            if should_alert and alert_policy != "disabled":
                try:
                    send_error_email(runtime_config, client, token, message)
                    token.last_alert_at = utcnow()
                    db.commit()
                except Exception:
                    pass
            return False, message

        token.access_token = body.get("access_token")
        token.refresh_token = body.get("refresh_token") or token.refresh_token
        store_refresh_token_history(db, client, token.refresh_token, source)
        token.token_type = body.get("token_type")
        expires_in = int(body.get("expires_in") or 3600)
        token.expires_at = utcnow() + timedelta(seconds=expires_in)
        token.last_success_at = utcnow()
        token.last_error = None
        token.refresh_in_progress = False
        token.force_refresh = False
        token.alert_fingerprint = None

        notify_webhooks(client, body)

        message = "Refresh OK"
        log_refresh(db, client, True, message, source, response.status_code, token.last_response_json)
        db.commit()
        return True, message

    except Exception as exc:
        token.last_error = f"Unhandled error: {exc}"
        token.last_error_at = utcnow()
        token.refresh_in_progress = False
        fingerprint = build_error_fingerprint(token.last_error, None)
        should_alert = (
            alert_policy == "all_errors"
            or (alert_policy == "new_only" and token.alert_fingerprint != fingerprint)
        )
        token.alert_fingerprint = fingerprint
        log_refresh(db, client, False, token.last_error, source)
        db.commit()
        if should_alert and alert_policy != "disabled":
            try:
                send_error_email(runtime_config, client, token, token.last_error)
                token.last_alert_at = utcnow()
                db.commit()
            except Exception:
                pass
        return False, token.last_error


def refresh_due_clients(session_factory, source: str = "auto") -> dict[str, int | str]:
    if not _refresh_lock.acquire(blocking=False):
        return {
            "triggered_clients": 0,
            "ok_clients": 0,
            "error_clients": 0,
            "summary": "Refresh already running",
        }

    try:
        db = session_factory()
        try:
            sync_clients_from_disk(db)
            clients = (
                db.query(Client)
                .filter(Client.enabled.is_(True))
                .order_by(Client.name.asc())
                .all()
            )
            triggered = 0
            ok_clients = 0
            error_clients = 0
            for client in clients:
                token = ensure_token_state(client)
                if should_refresh(token):
                    triggered += 1
                    ok, _ = refresh_client(db, client, source=source)
                    if ok:
                        ok_clients += 1
                    else:
                        error_clients += 1
            summary = f"{source}: {triggered} clients, {ok_clients} OK, {error_clients} erreurs"
            db.add(
                SchedulerRun(
                    source=source,
                    success=error_clients == 0,
                    triggered_clients=triggered,
                    ok_clients=ok_clients,
                    error_clients=error_clients,
                    summary=summary,
                )
            )
            db.commit()
            return {
                "triggered_clients": triggered,
                "ok_clients": ok_clients,
                "error_clients": error_clients,
                "summary": summary,
            }
        finally:
            db.close()
    finally:
        _refresh_lock.release()


def scheduler_loop(session_factory, stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        refresh_due_clients(session_factory, source="auto")
        stop_event.wait(settings.refresh_interval_seconds)
