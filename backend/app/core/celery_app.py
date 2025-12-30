"""
[IDENTITY]: Celery Application Configuration
Celery app instance and schedule configuration for background tasks.

[INPUT]:
- Env Vars: REDIS_URL from config.py

[LINK]:
- Config -> app.core.config.get_settings
- Tasks -> app.tasks.*

[OUTPUT]:
- celery_app instance

[POS]: /backend/app/core/celery_app.py

[PROTOCOL]:
1. Uses Redis as broker and backend.
2. Configures timezone to UTC.
3. Defines static task routes and queues.
4. Sets up Beat schedule for periodic maintenance.
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
        "app.tasks.image_generation.*": {"queue": "image_generation"},
        "app.tasks.*": {"queue": "default"},
    },
    # Queue configuration
    task_default_queue="default",
    task_queues={
        "default": {
            "exchange": "default",
            "routing_key": "default",
        },
        "image_generation": {
            "exchange": "image_generation",
            "routing_key": "image_generation",
        },
    },
    # Time limits (important for AI tasks)
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=330,  # 5.5 minutes hard limit
    # Task retry configuration
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-expired-invites": {
            "task": "app.tasks.invite_cleanup.cleanup_expired_invites",
            "schedule": crontab(hour="0", minute="0"),  # Run daily at midnight UTC
        },
        "reset-monthly-quotas": {
            "task": "app.tasks.billing.reset_monthly_quotas",
            "schedule": crontab(hour=0, minute=5, day_of_month=1),  # First day of month at 00:05
        },
        "cleanup-redis-cache": {
            "task": "app.tasks.billing.cleanup_redis_cache",
            "schedule": crontab(hour=2, minute=0),  # Daily at 02:00 UTC
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.tasks"])
