# [FOLDER]: frontend/src/components/ui
Base Design System Components (Low-level).

## [SCOPE]
- **Primitive UI**: Atomic components (Buttons, Inputs, Dialogs).
- **Styling**: TailwindCSS via `class-variance-authority` (cva).
- **Accessibility**: Radix UI primitives wrapping.
- **No Business Logic**: pure presentation components.

## [STRUCTURE]
- `button.tsx`: Polymorphic button component.
- `input.tsx`, `textarea.tsx`: Form controls.
- `card.tsx`: Layout container.
- `dialog.tsx`: Modals/Popups.
- `alert.tsx`: Alert banners (default/destructive).
- `skeleton.tsx`: Loading placeholder blocks.
- `dropdown-menu.tsx`: Dropdown menu primitives (Radix).

## [PROTOCOLS]
1. **Shadcn Convention**: Keep consistent with shadcn/ui Registry.
2. **Accessibilty First**: Must forward refs and support ARIA attributes.
3. **Theming**: Use CSS variables for colors (e.g., `bg-primary`).
