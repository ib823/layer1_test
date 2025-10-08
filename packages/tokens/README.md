# @sap-framework/tokens

Design tokens for the ABeam DataBridge GRC Platform.

## What are Design Tokens?

Design tokens are the atomic building blocks of our design system. They define colors, spacing, typography, and other visual properties as reusable variables, ensuring consistency across the entire platform.

## Usage

### In CSS/SCSS

```css
@import '@sap-framework/tokens/tokens.css';

.my-button {
  background-color: var(--brand-primary);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-6);
  color: var(--text-inverse);
  transition: all var(--transition-base) var(--ease-in-out);
}

.my-button:hover {
  background-color: var(--brand-primary-hover);
}
```

### In TypeScript/JavaScript

```typescript
import { tokens, getCSSVariable } from '@sap-framework/tokens';

// Access token values
const primaryColor = tokens.brand.primary; // '#2563EB'
const mediumSpacing = tokens.spacing[4]; // '12px'

// Access CSS variables at runtime
const currentPrimary = getCSSVariable('--brand-primary');
```

### In Tailwind Config

```typescript
import { tokens } from '@sap-framework/tokens';

export default {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          // ... other brand colors
        },
      },
      borderRadius: {
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      spacing: {
        // Map to our 8px-based scale
      },
    },
  },
};
```

## Token Categories

### Brand Colors
Primary brand colors for buttons, links, and key UI elements.
- `--brand-primary` through `--brand-900`

### Text Colors
For all text content with hierarchy.
- `--text-primary`, `--text-secondary`, `--text-tertiary`

### Surface Colors
Background colors for containers, cards, and panels.
- `--surface-base`, `--surface-secondary`, `--surface-tertiary`

### Status Colors
For success, warning, danger, and info states.
- `--status-success`, `--status-warning`, `--status-danger`, `--status-info`

### Risk Levels
Specific to SoD violation risk levels.
- `--risk-critical`, `--risk-high`, `--risk-medium`, `--risk-low`

### Spacing
8px-based spacing scale from 0 to 64px.
- `--space-0` through `--space-12`

### Typography
Font families, sizes, weights, and line heights.
- `--font-family-sans`, `--font-size-*`, `--font-weight-*`

### Border Radius
Consistent corner rounding.
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`

### Shadows
Elevation shadows for depth.
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`

### Z-Index
Layering scale for modals, dropdowns, tooltips.
- `--z-dropdown`, `--z-modal`, `--z-tooltip`

### Transitions
Consistent animation timing and easing.
- `--transition-fast`, `--transition-base`, `--transition-slow`
- `--ease-in-out`, `--ease-out`, `--ease-in`

## Dark Mode

Dark mode tokens are automatically applied when `.dark` class is present on the root element:

```html
<html class="dark">
  <!-- Dark mode tokens active -->
</html>
```

## Rules

1. **Never hardcode values** - Always use tokens via CSS variables
2. **Use the right token** - Don't use brand colors for text, or spacing for z-index
3. **Consistent naming** - Follow the established naming conventions
4. **No magic numbers** - All values should come from tokens

## Migration from Hardcoded Values

Before:
```css
.button {
  background: #2563EB;
  padding: 12px 24px;
  border-radius: 6px;
}
```

After:
```css
.button {
  background: var(--brand-primary);
  padding: var(--space-4) var(--space-7);
  border-radius: var(--radius-md);
}
```

## Token Reference

### Brand Colors
| Token | Light Value | Usage |
|-------|-------------|-------|
| `--brand-primary` | `#2563EB` | Primary actions, links |
| `--brand-secondary` | `#64748B` | Secondary actions |
| `--brand-accent` | `#7C3AED` | Highlights, badges |

### Risk Levels (GRC-specific)
| Token | Value | Usage |
|-------|-------|-------|
| `--risk-critical` | `#DC2626` | Critical violations |
| `--risk-high` | `#EA580C` | High-risk issues |
| `--risk-medium` | `#F59E0B` | Medium-risk issues |
| `--risk-low` | `#16A34A` | Low-risk issues |

### Spacing (8px base grid)
| Token | Value | Usage |
|-------|-------|-------|
| `--space-0` | `0px` | No spacing |
| `--space-1` | `2px` | Hairline spacing |
| `--space-2` | `4px` | Tight spacing |
| `--space-3` | `8px` | Base unit |
| `--space-4` | `12px` | Small spacing |
| `--space-5` | `16px` | Medium spacing |
| `--space-6` | `20px` | Large spacing |
| `--space-7` | `24px` | Extra large |
| `--space-8` | `32px` | 4x base |
| `--space-9` | `40px` | 5x base |
| `--space-10` | `48px` | 6x base |
| `--space-11` | `56px` | 7x base |
| `--space-12` | `64px` | 8x base |

### Typography
| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | `12px` | Captions, helper text |
| `--font-size-sm` | `14px` | Body small |
| `--font-size-base` | `16px` | Body text |
| `--font-size-lg` | `18px` | Large text |
| `--font-size-xl` | `20px` | Subheadings |
| `--font-size-2xl` | `24px` | Headings |
| `--font-size-3xl` | `30px` | Large headings |

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Popovers |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small corners |
| `--radius-md` | `6px` | Default corners |
| `--radius-lg` | `10px` | Large corners |
| `--radius-xl` | `16px` | Extra large |
| `--radius-full` | `9999px` | Pills, circles |

## Contributing

When adding new tokens:
1. Follow the existing naming convention
2. Add both light and dark mode values
3. Document the token's purpose
4. Update this README
5. Add to the TypeScript token object
6. Add ESLint rule if needed to enforce usage

## License

Proprietary - ABeam Consulting © 2025
