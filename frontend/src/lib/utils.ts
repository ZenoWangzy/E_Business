/**
[IDENTITY]: Shared Utility Functions
Common UI and Logic Helpers.

[INPUT]:
- Various (strings, class names).
- UUID strings (canonical form).

[LINK]:
- TailwindMerge -> package: tailwind-merge
- Clsx -> package: clsx

[OUTPUT]:
- cn(): className merge helper.
- isUuid(): runtime UUID validator.
[POS]: /frontend/src/lib/utils.ts

[PROTOCOL]:
1. ** Pure Functions **: No side effects allowed.
2. ** UI Agnostic **: Can be used in Server or Client components.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runtime UUID validator.
 *
 * Note: This validates the canonical UUID string format (any version).
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}
