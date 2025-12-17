"""
Structured logging configuration for the application.

Provides JSON-formatted logging with task tracking capabilities.
"""
import logging
import sys
from datetime import datetime
from typing import Any, Dict

import structlog
from pythonjsonlogger import jsonlogger

from app.core.config import get_settings

settings = get_settings()


def configure_logging() -> None:
    """Configure structured logging for the application."""

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure JSON formatter for standard library logging
    json_formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Configure console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO if not settings.debug else logging.DEBUG)
    root_logger.addHandler(console_handler)

    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if not settings.debug else logging.DEBUG
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger with task tracking support.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Structured logger instance
    """
    return structlog.get_logger(name)


def log_task_event(
    logger: structlog.stdlib.BoundLogger,
    task_id: str,
    event_type: str,
    message: str,
    **kwargs: Any,
) -> None:
    """Log a task-related event with structured context.

    Args:
        logger: Structured logger instance
        task_id: Celery task ID
        event_type: Type of event (e.g., "started", "progress", "completed", "failed")
        message: Log message
        **kwargs: Additional context data
    """
    logger.info(
        message,
        task_id=task_id,
        event_type=event_type,
        timestamp=datetime.utcnow().isoformat(),
        **kwargs,
    )


# Initialize logging on import
configure_logging()