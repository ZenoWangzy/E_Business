"""
[IDENTITY]: Database Log Handler
Async logging handler that persists WARNING and ERROR logs to database for admin dashboard visibility.

[INPUT]:
- Log Records: WARNING and ERROR level logging events
- Session Factory: Async database session factory

[LINK]:
- System Log Model -> app.models.system_log.SystemLog
- Admin Dashboard -> Story 5.3: Stats & Logs
- Root Logger -> Python logging system (handler attachment)

[OUTPUT]:
- Database log entries in system_logs table
- Console log output unchanged

[POS]: /backend/app/core/db_log_handler.py

[PROTOCOL]:
1. **Async Non-Blocking**: Uses asyncio.create_task() to avoid blocking main thread
2. **Level Filtering**: Only WARNING and ERROR written to database (prevents bloat)
3. **Error Handling**: Silently fails to prevent infinite logging loops
4. **Trace Support**: Captures stack traces for exceptions
"""
import logging
import asyncio
import traceback
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession


class DBLogHandler(logging.Handler):
    """
    Async logging handler that writes WARNING and ERROR logs to database.
    
    Only WARNING and ERROR level logs are written to the database.
    INFO and DEBUG logs stay in files only to avoid database bloat.
    
    Uses asyncio.create_task() to avoid blocking the main thread.
    """
    
    def __init__(self, session_factory, component: str = "api"):
        """
        Initialize the database log handler.
        
        Args:
            session_factory: Async session factory for database access.
            component: Component name (api, worker, celery, etc.)
        """
        super().__init__()
        self.session_factory = session_factory
        self.component = component
        self.setLevel(logging.WARNING)  # Only WARNING and ERROR
    
    def emit(self, record: logging.LogRecord) -> None:
        """
        Emit a log record to the database.
        
        Non-blocking emit using asyncio.create_task().
        
        Args:
            record: The log record to emit.
        """
        try:
            # Get or create event loop
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._async_emit(record))
            except RuntimeError:
                # No running loop, create one for this operation
                asyncio.run(self._async_emit(record))
        except Exception:
            # Don't raise exceptions from logging
            self.handleError(record)
    
    async def _async_emit(self, record: logging.LogRecord) -> None:
        """
        Async implementation of log emit.
        
        Args:
            record: The log record to emit.
        """
        try:
            # Import here to avoid circular imports
            from app.models.system_log import SystemLog, SystemLogLevel
            
            # Map Python logging levels to our enum
            level_map = {
                logging.ERROR: SystemLogLevel.ERROR,
                logging.CRITICAL: SystemLogLevel.ERROR,
                logging.WARNING: SystemLogLevel.WARNING,
            }
            log_level = level_map.get(record.levelno, SystemLogLevel.INFO)
            
            # Get message
            message = record.getMessage()
            
            # Get stack trace if exception info is present
            stack_trace: Optional[str] = None
            if record.exc_info:
                stack_trace = ''.join(traceback.format_exception(*record.exc_info))
            
            # Get trace_id from record if available
            trace_id = getattr(record, 'trace_id', None)
            
            # Get component from record or use default
            component = getattr(record, 'component', self.component)
            
            # Create log entry
            async with self.session_factory() as session:
                log_entry = SystemLog(
                    level=log_level,
                    message=message[:5000],  # Limit message length
                    component=component,
                    trace_id=trace_id,
                    stack_trace=stack_trace,
                    created_at=datetime.now(timezone.utc)
                )
                session.add(log_entry)
                await session.commit()
                
        except Exception:
            # Silently fail to avoid infinite loops
            pass


def setup_db_logging(session_factory, component: str = "api") -> DBLogHandler:
    """
    Setup database logging handler on the root logger.
    
    Args:
        session_factory: Async session factory for database access.
        component: Component name for log entries.
        
    Returns:
        The configured DBLogHandler instance.
    """
    handler = DBLogHandler(session_factory, component=component)
    handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    # Add to root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    
    return handler
