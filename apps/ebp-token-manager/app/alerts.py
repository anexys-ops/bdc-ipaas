from __future__ import annotations

from email.message import EmailMessage
import hashlib
import smtplib

from app.models import Client, TokenState


def build_error_fingerprint(message: str, http_status: int | None) -> str:
    base = f"{http_status or '-'}|{message}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def send_error_email(config: dict[str, str | int], client: Client, token: TokenState, message: str) -> None:
    smtp_username = str(config.get("smtp_username") or "")
    smtp_password = str(config.get("smtp_password") or "")
    alert_to_email = str(config.get("alert_to_email") or "")
    smtp_from_email = str(config.get("smtp_from_email") or smtp_username)
    smtp_host = str(config.get("smtp_host") or "smtp.gmail.com")
    smtp_port = int(config.get("smtp_port") or 587)

    if not smtp_username or not smtp_password or not alert_to_email:
        return

    msg = EmailMessage()
    msg["Subject"] = f"[EBP] Alerte token en erreur - {client.slug}"
    msg["From"] = smtp_from_email
    msg["To"] = alert_to_email
    msg.set_content(
        "\n".join(
            [
                "Une erreur est survenue sur un token EBP.",
                "",
                f"Client: {client.name}",
                f"Slug: {client.slug}",
                f"HTTP: {token.last_http_status or '-'}",
                f"Derniere erreur: {message}",
                f"Derniere erreur date: {token.last_error_at or '-'}",
                f"Expiration: {token.expires_at or '-'}",
                "",
                "Verifiez le dashboard EBP Token Manager pour plus de details.",
            ]
        )
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
