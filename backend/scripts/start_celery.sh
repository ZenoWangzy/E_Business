#!/bin/bash

# Celery Worker Startup Script
# Story 2.2: AI Generation Worker (Celery/Redis)

set -e

# Environment Configuration
export PYTHONPATH="${PYTHONPATH}:/app"

# Default values
WORKER_NAME="celery-worker@%h"
LOG_LEVEL="${CELERY_LOG_LEVEL:-info}"
CONCURRENCY="${CELERY_CONCURRENCY:-4}"
QUEUES="${CELERY_QUEUES:-image_generation,default}"
ENV_MODE="${ENV_MODE:-development}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Celery Worker Startup Script${NC}"
echo -e "${GREEN}  Story 2.2: AI Generation Worker${NC}"
echo -e "${GREEN}======================================${NC}"
echo

# Print configuration
echo -e "${YELLOW}Configuration:${NC}"
echo "  - Worker Name: ${WORKER_NAME}"
echo "  - Log Level: ${LOG_LEVEL}"
echo "  - Concurrency: ${CONCURRENCY}"
echo "  - Queues: ${QUEUES}"
echo "  - Environment: ${ENV_MODE}"
echo "  - AI Mock Mode: ${AI_MOCK_MODE:-true}"
echo

# Health check function
health_check() {
    echo -e "${YELLOW}Performing health check...${NC}"

    # Check Redis connection
    if python -c "import redis; r=redis.from_url('${REDIS_URL}'); r.ping()"; then
        echo -e "${GREEN}✓ Redis connection successful${NC}"
    else
        echo -e "${RED}✗ Redis connection failed${NC}"
        exit 1
    fi

    # Check Database connection
    if python -c "import sqlalchemy; sqlalchemy.create_engine('${DATABASE_URL}').connect()"; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}✗ Database connection failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}Health check passed!${NC}"
    echo
}

# Wait for dependencies (optional)
if [ "${WAIT_FOR_DEPS}" = "true" ]; then
    echo -e "${YELLOW}Waiting for dependencies...${NC}"
    sleep 5
fi

# Perform health check
health_check

# Set up environment-specific settings
if [ "$ENV_MODE" = "production" ]; then
    # Production settings
    WORKER_OPTIONS="--max-tasks-per-child=1000 --time-limit=330"
    echo -e "${YELLOW}Running in PRODUCTION mode${NC}"
else
    # Development settings
    WORKER_OPTIONS="--max-tasks-per-child=10"
    echo -e "${YELLOW}Running in DEVELOPMENT mode${NC}"
fi

# Start Celery worker
echo -e "${GREEN}Starting Celery worker...${NC}"
echo

# Command to start the worker
CELERY_CMD="celery -A app.core.celery_app worker \
    --hostname=${WORKER_NAME} \
    --loglevel=${LOG_LEVEL} \
    --concurrency=${CONCURRENCY} \
    --queues=${QUEUES} \
    ${WORKER_OPTIONS}"

# Execute the command
echo -e "${YELLOW}Executing: ${CELERY_CMD}${NC}"
echo
eval $CELERY_CMD