"""
System Log Model for Admin Dashboard.

Story 5.3: Admin Dashboard - Stats & Logs

Stores system runtime logs (WARNING/ERROR) for admin visibility,
separate from audit logs which track user actions.
"""
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, DateTime, Text, Index, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SystemLogLevel(str, enum.Enum):
    """Log severity levels."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class SystemLog(Base):
    """
    System runtime logs for admin visibility.
    
    Stores WARNING and ERROR logs from the application for
    monitoring and debugging purposes. INFO logs stay in files only.
    
    Attributes:
        level: Log severity (error, warning, info)
        message: Log message content
        component: Source component (api, worker, celery, etc.)
        trace_id: Request trace ID for correlation
        stack_trace: Full stack trace for errors
        created_at: Timestamp when log was created
    """
    __tablename__ = "system_logs"
    __table_args__ = (
        Index("ix_system_logs_level_created", "level", "created_at"),
        Index("ix_system_logs_component_created", "component", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    level: Mapped[SystemLogLevel] = mapped_column(SQLEnum(SystemLogLevel), index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    component: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    trace_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<SystemLog(id={self.id}, level={self.level}, component={self.component})>"
