# Component Inventory

**Generated On:** 2025-12-13

## UI Library (shadcn/ui)
Located in `src/components/ui/`. These are foundational primitives.

- `accordion`
- `alert-dialog`
- `aspect-ratio`
- `avatar`
- `button`
- `card`
- `checkbox`
- `collapsible`
- `dialog`
- `dropdown-menu`
- `hover-card`
- `input`
- `label`
- `menubar`
- `navigation-menu`
- `popover`
- `progress`
- `radio-group`
- `scroll-area`
- `select`
- `separator`
- `sheet` (implied by dialog/sidebar patterns)
- `slider`
- `switch`
- `tabs`
- `textarea`
- `toast` / `sonner`
- `toggle`
- `tooltip`

## Business Components (Implicit)
These components currently exist inside `App.tsx` and need to be extracted.

| Component Name | Description | Current Location | Target Location |
| :--- | :--- | :--- | :--- |
| **IconSidebar** | Left rail navigation | `App.tsx` | `src/components/layout/IconSidebar.tsx` |
| **CategorySidebar** | Category filtering | `App.tsx` | `src/components/business/Category/CategorySidebar.tsx` |
| **ProductGrid** | Main product list display | `App.tsx` | `src/components/business/Product/ProductGrid.tsx` |
| **ProductCard** | Individual item card | `App.tsx` | `src/components/business/Product/ProductCard.tsx` |
| **ProductDetail** | Full page product view | `App.tsx` | `src/components/business/Product/ProductDetail.tsx` |
| **SearchDialog** | Search modal | `App.tsx` | `src/components/shared/SearchDialog.tsx` |
| **HeroSection** | Landing page hero | `App.tsx` | `src/components/layout/HeroSection.tsx` |
