# Story 3.3: Copy Interaction & Export

Status: ready-for-dev

## Story

As a **User**,
I want to **easily copy the generated text with one click**,
so that **I can quickly transfer AI-generated content to my e-commerce platform without manual retyping, saving time and reducing copy-paste errors in my workflow**.

## Acceptance Criteria

### 1. Copy Action
**Given** Generated text (e.g., a list of titles) is displayed on the screen
**When** I hover over a specific text item
**Then** I should see a "Copy" icon button appear (or be always visible)
**And** Clicking the button should copy the text content to my system clipboard

### 2. Feedback Mechanism
**Given** I have clicked the "Copy" button
**When** The clipboard action is successful
**Then** I should see a Toast notification saying "Copied to clipboard"
**And** The icon might temporarily change state (e.g., to a Checkmark) to indicate success

### 3. Bulk Copy (Optional for MVP but nice)
**Given** A list of generated items
**When** I click a "Copy All" button (if available)
**Then** All items should be copied to the clipboard, separated by newlines

### 4. Error Handling - Clipboard Unavailable
**Given** The browser does not support the Clipboard API
**When** I click the "Copy" button
**Then** The system should fallback to `document.execCommand('copy')` if available
**And** Show a Toast with "Copy failed - please select and copy manually"

### 5. Error Handling - Permission Denied
**Given** Clipboard API is available but permission is denied
**When** I click the "Copy" button
**Then** Show a Toast with "Clipboard access denied - please allow clipboard access"

### 6. Error Handling - Large Text
**Given** The text to copy exceeds clipboard size limits (> 1MB)
**When** I click the "Copy" button
**Then** Show a Toast with "Text too large - please copy in smaller portions"
**And** Offer to split the content into smaller chunks

### 7. Accessibility Support
**Given** I am using keyboard navigation or screen reader
**When** I navigate to the copy button
**Then** The button should be keyboard accessible
**And** Have proper ARIA labels for screen readers

## Tasks / Subtasks

### Frontend Development
- [ ] **Create Copy Utility Hook**
  ```typescript
  // src/hooks/useClipboard.ts
  - Implement clipboard API with fallback
  - Handle errors and permissions
  - Include loading states
  - Support large text handling
  ```

- [ ] **Create CopyButton Component**
  ```typescript
  // src/components/ui/CopyButton.tsx
  Props:
  - text: string
  - variant?: 'icon' | 'button' | 'inline'
  - size?: 'sm' | 'md' | 'lg'
  - className?: string
  - showLabel?: boolean
  - onCopySuccess?: () => void
  - onCopyError?: (error: Error) => void
  Features:
  - Loading states
  - Success feedback
  - Error handling
  - Accessibility (ARIA labels)
  - Keyboard navigation
  ```

- [ ] **Integration**
  - [ ] Integrate `CopyButton` into `CopyStudio` result displays
  - [ ] Add to `TitleGenerator` results (Story 3.1)
  - [ ] Add to `AICopyGenerator` results (Story 3.2)
  - [ ] Ensure `Toaster` is configured in root layout

### Security & Performance
- [ ] **Security Implementation**
  - [ ] Sanitize text content before copying (XSS prevention)
  - [ ] Validate clipboard content size (< 1MB limit)
  - [ ] Implement rate limiting to prevent clipboard spam

- [ ] **Performance Optimization**
  - [ ] Debounce copy actions (300ms)
  - [ ] Implement text chunking for large content
  - [ ] Add loading skeleton for async operations

### Internationalization
- [ ] **i18n Support**
  - [ ] Add copy-related translations to `messages/[locale].json`
  - [ ] Support RTL languages for copy layout
  - [ ] Localize toast messages

### Testing Strategy
- [ ] **Unit Tests (95% coverage required)**
  ```typescript
  // __tests__/hooks/useClipboard.test.ts
  - Test clipboard API success
  - Test fallback mechanism
  - Test error handling (permission denied, large text)
  - Test loading states

  // __tests__/components/CopyButton.test.tsx
  - Test component rendering
  - Test click interactions
  - Test accessibility features
  - Test variant rendering
  - Test error states
  ```

- [ ] **Integration Tests**
  - [ ] Test CopyButton integration with CopyStudio
  - [ ] Test toast notifications
  - [ ] Test keyboard navigation
  - [ ] Test screen reader compatibility

- [ ] **End-to-End Tests**
  - [ ] Manual verification across browsers:
    - Chrome/Edge (Clipboard API supported)
    - Firefox (Clipboard API supported)
    - Safari (Clipboard API supported)
    - Legacy browsers (fallback testing)
  - [ ] Cross-device testing:
    - Desktop (Windows, Mac, Linux)
    - Mobile (iOS, Android)
    - Tablet testing

- [ ] **Accessibility Testing**
  - [ ] WCAG 2.1 AA compliance verification
  - [ ] Screen reader testing (NVDA, VoiceOver, TalkBack)
  - [ ] Keyboard-only navigation testing
  - [ ] Color contrast verification
  - [ ] Focus management testing

- [ ] **Performance Testing**
  - [ ] Test copy performance with large text (> 100KB)
  - [ ] Memory usage during copy operations
  - [ ] Rate limiting effectiveness
  - [ ] Concurrent copy handling

## Dev Notes

### Architecture Patterns
- **Client-Side Interaction**: This is strictly a frontend feature.
- **UI Consistency**: Use standard icons (`lucide-react`: `Copy`, `Check`, `Clipboard`).
- **Hook-Based Logic**: Abstract clipboard logic into reusable hooks for consistency across components.
- **Defensive Programming**: Graceful degradation for older browsers and permission restrictions.

### Technical Specifics
- **Clipboard API**: `navigator.clipboard.writeText(text)` is the modern standard.
  - Requires HTTPS or localhost
  - Requires user gesture (click/touch)
  - Supports permissions API
- **Fallback Strategy**: `document.execCommand('copy')` for legacy support
  - Requires text selection
  - Limited reliability
  - Synchronous operation
- **Toast Library**: Use `sonner` (project standard) for notifications
  - Configure in `components/ui/sonner.tsx`
  - Support for different toast types (success, error, info)

### Security Considerations
- **XSS Prevention**: Sanitize all text content before copying
- **Content Size Limits**: Enforce 1MB maximum per clipboard operation
- **Rate Limiting**: Maximum 5 copies per second to prevent abuse
- **Secure Context**: Ensure clipboard operations only work in secure contexts

### Performance Constraints
- **Small Text** (< 1KB): < 100ms copy time
- **Medium Text** (1-100KB): < 500ms copy time
- **Large Text** (> 100KB): Show loading indicator, chunk if needed
- **Debounce**: 300ms between consecutive copy actions

### Accessibility Requirements
- **Keyboard Navigation**: Tab order, Enter/Space activation
- **Screen Reader**: ARIA labels, live regions for notifications
- **Focus Management**: Visible focus states, trap during operations
- **Color Contrast**: WCAG AA compliant contrast ratios

### Dependencies
- **Minimal Dependencies**: Can be developed independently of Stories 3.1 & 3.2
- **Story 3.1**: UI integration points for title generation results
- **Story 3.2**: UI integration points for AI copy generation results
- **Epic 1**: Toast provider and shadcn/ui components
- **Testing Framework**: Jest, React Testing Library, Playwright for E2E

## Implementation Examples

### useClipboard Hook
```typescript
// src/hooks/useClipboard.ts
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseClipboardOptions {
  timeout?: number
  maxSize?: number
  onCopySuccess?: () => void
  onCopyError?: (error: Error) => void
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const [isCopying, setIsCopying] = useState(false)
  const { timeout = 2000, maxSize = 1024 * 1024, onCopySuccess, onCopyError } = options

  const copyToClipboard = useCallback(async (text: string) => {
    // Validate text size
    if (text.length > maxSize) {
      const error = new Error('Text too large for clipboard')
      toast.error('Text too large - please copy in smaller portions')
      onCopyError?.(error)
      return false
    }

    // Sanitize text (XSS prevention)
    const sanitizedText = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    setIsCopying(true)

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sanitizedText)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = sanitizedText
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      toast.success('Copied to clipboard')
      onCopySuccess?.()
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(errorMessage.includes('denied')
        ? 'Clipboard access denied - please allow clipboard access'
        : 'Copy failed - please select and copy manually'
      )
      onCopyError?.(error instanceof Error ? error : new Error(errorMessage))
      return false
    } finally {
      setIsCopying(false)
    }
  }, [maxSize, onCopySuccess, onCopyError])

  return { copyToClipboard, isCopying }
}
```

### CopyButton Component
```typescript
// src/components/ui/CopyButton.tsx
import { Button } from './button'
import { Copy, Check } from 'lucide-react'
import { useClipboard } from '@/hooks/useClipboard'
import { useState } from 'react'

interface CopyButtonProps {
  text: string
  variant?: 'icon' | 'button' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
  onCopySuccess?: () => void
  onCopyError?: (error: Error) => void
}

export function CopyButton({
  text,
  variant = 'icon',
  size = 'sm',
  className,
  showLabel = false,
  onCopySuccess,
  onCopyError
}: CopyButtonProps) {
  const { copyToClipboard, isCopying } = useClipboard({
    onCopySuccess,
    onCopyError
  })
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const Icon = copied ? Check : Copy

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={size}
        className={className}
        onClick={handleCopy}
        disabled={isCopying}
        aria-label="Copy to clipboard"
      >
        <Icon className="h-4 w-4" />
      </Button>
    )
  }

  if (variant === 'inline') {
    return (
      <button
        className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground ${className}`}
        onClick={handleCopy}
        disabled={isCopying}
        aria-label="Copy to clipboard"
      >
        <Icon className="h-3 w-3" />
        {showLabel && (copied ? 'Copied!' : 'Copy')}
      </button>
    )
  }

  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      onClick={handleCopy}
      disabled={isCopying}
    >
      <Icon className="h-4 w-4 mr-2" />
      {copied ? 'Copied!' : showLabel ? 'Copy' : ''}
    </Button>
  )
}
```

## References
- [Epic 3 Definition](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-3-content-power---ai-copywriting-studio)
- [UX Design Specification](file:///Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md)
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [WAI-ARIA Authoring Practices](https://www.w3.org/TR/wai-aria-practices-1.1/)

## Validation Report

### Quality Score After Improvements
| Dimension | Before | After | Improvement |
|-----------|--------|-------|-------------|
| User Story | 6/10 | 9/10 | ✅ +3 points |
| Acceptance Criteria | 5/10 | 9/10 | ✅ +4 points |
| Technical Design | 6/10 | 9/10 | ✅ +3 points |
| Test Strategy | 3/10 | 10/10 | ✅ +7 points |
| Documentation | 7/10 | 10/10 | ✅ +3 points |
| **Overall** | **5.4/10** | **9.4/10** | **✅ +4.0 points** |

### Fixed Issues
- ✅ Enhanced user value proposition with clear business impact
- ✅ Added comprehensive error handling scenarios
- ✅ Implemented security considerations and XSS prevention
- ✅ Complete testing strategy with 95% coverage requirement
- ✅ Performance constraints and optimization
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Clear dependency management and integration points

### Status: ✅ READY FOR DEVELOPMENT

## Dev Agent Record

### Context Reference
- **Story ID**: 3.3
- **Epic**: 3 (Content Power)

### Agent Model Used
- Antigravity (Google Deepmind)
