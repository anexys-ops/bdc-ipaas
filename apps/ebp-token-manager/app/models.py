from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = (UniqueConstraint("slug", name="uq_clients_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    folder_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_first_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_last_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    ebp_user_sub: Mapped[str | None] = mapped_column(Text, nullable=True)
    ebp_code_tiers: Mapped[str | None] = mapped_column(Text, nullable=True)
    ebp_contact_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    initial_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_raw_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    token: Mapped["TokenState"] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        uselist=False,
    )
    history: Mapped[list["RefreshLog"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        order_by="desc(RefreshLog.created_at)",
    )
    refresh_token_history: Mapped[list["RefreshTokenHistory"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        order_by="desc(RefreshTokenHistory.created_at)",
    )


class TokenState(Base):
    __tablename__ = "token_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), unique=True, nullable=False)
    client_slug: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_refresh_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_response_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    refresh_in_progress: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    force_refresh: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    alert_fingerprint: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_alert_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    client: Mapped[Client] = relationship(back_populates="token")


class RefreshLog(Base):
    __tablename__ = "refresh_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    client: Mapped[Client] = relationship(back_populates="history")


class RefreshTokenHistory(Base):
    __tablename__ = "refresh_token_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    client_slug: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    client: Mapped[Client] = relationship(back_populates="refresh_token_history")


class SchedulerRun(Base):
    __tablename__ = "scheduler_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    triggered_clients: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ok_clients: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_clients: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AppSetting(Base):
    __tablename__ = "app_settings"
    __table_args__ = (UniqueConstraint("key", name="uq_app_settings_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
