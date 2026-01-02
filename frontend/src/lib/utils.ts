/**
[IDENTITY]: Shared Utility Functions
Common UI and Logic Helpers.

[INPUT]:
- Various(Strings, Classes, Dates).

[LINK]:
- TailwindMerge -> package: tailwind - merge
  - Clsx -> package: clsx

  [OUTPUT]: Formatted / Processed Data.
[POS]: /frontend/src / lib / utils.ts

[PROTOCOL]:
1. ** Pure Functions **: No side effects allowed.
2. ** UI Agnostic **: Can be used in Server or Client components.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
