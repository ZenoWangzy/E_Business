"""
Celery application configuration.

Provides async task processing for background jobs like:
- Expired invite cleanup
- Email sending
- AI processing tasks
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "ebusiness",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Task routing
    task_routes={
        "app.tasks.*": {"queue": "default"},
    },
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-expired-invites": {
            "task": "app.tasks.invite_cleanup.cleanup_expired_invites",
            "schedule": crontab(hour="0", minute="0"),  # Run daily at midnight UTC
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.tasks"])
