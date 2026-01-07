# Redis Cache Invalidation & Consistency

**Date**: 2026-01-08
**Context**: Billing/Credits System

## The Problem
User credits were sufficient in the primary database (100 credits), but the API returned `402 Payment Required`.
This occurred after manual database adjustments were not propagated to the cache layer.

## The Root Cause
The system uses a "Look-Aside" caching strategy where the API checks Redis first.
Redis held a stale value (`0` credits) with a long TTL (or no TTL), shadowing the database truth.

## The Fix
Cleared the specific Redis key to force a cache miss and subsequent database fetch.

```bash
# Redis CLI command to delete the key
DEL billing:workspace:{id}:credits
```

## The Lesson
1.  **Cache Invalidation is Hard**: Whenever manual DB updates are performed, related cache keys MUST be identified and invalidated.
2.  **Safety Valves**: Admin tools should include "Clear Cache" buttons for critical entities (like User/Workspace).
3.  **TTL Strategy**: Avoid infinite TTL for business data. A shorter TTL (e.g., 5-10 mins) can self-heal inconsistencies at the cost of slight DB load increase.
