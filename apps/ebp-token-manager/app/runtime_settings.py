from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AppSetting


settings = get_settings()

CONFIG_DEFAULTS = {
    "smtp_host": settings.smtp_host,
    "smtp_port": str(settings.smtp_port),
    "smtp_username": settings.smtp_username,
    "smtp_password": settings.smtp_password,
    "smtp_from_email": settings.smtp_from_email,
    "alert_to_email": settings.alert_to_email,
    "alert_policy": settings.alert_policy,
}


def get_config_map(db: Session) -> dict[str, str]:
    rows = db.query(AppSetting).all()
    return {row.key: row.value or "" for row in rows}


def get_effective_config(db: Session) -> dict[str, str | int]:
    merged: dict[str, str | int] = dict(CONFIG_DEFAULTS)
    merged.update(get_config_map(db))
    try:
        merged["smtp_port"] = int(str(merged.get("smtp_port") or settings.smtp_port))
    except ValueError:
        merged["smtp_port"] = settings.smtp_port
    merged["alert_policy"] = str(merged.get("alert_policy") or "new_only")
    return merged


def upsert_config(db: Session, updates: dict[str, str]) -> None:
    existing = {row.key: row for row in db.query(AppSetting).all()}
    for key, value in updates.items():
        row = existing.get(key)
        if row is None:
            db.add(AppSetting(key=key, value=value))
        else:
            row.value = value
    db.commit()
