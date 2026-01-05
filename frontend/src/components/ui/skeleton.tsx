/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Skeleton
 * Loading placeholder block.
 *
 * [INPUT]:
 * - Props: React.HTMLAttributes<HTMLDivElement>
 *
 * [LINK]:
 * - Utils -> @/lib/utils (cn)
 *
 * [OUTPUT]: Rendered placeholder <div>.
 * [POS]: /frontend/src/components/ui/skeleton.tsx
 *
 * [PROTOCOL]:
 * 1. Pure presentational component.
 * 2. Caller controls sizing via className.
 *
 * === END HEADER ===
 */

import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
