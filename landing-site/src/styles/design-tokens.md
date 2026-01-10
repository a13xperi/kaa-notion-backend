# Unified Design Tokens

This document describes the unified design system shared between the KAA Portal React application and the Astro landing site.

## Color Palette

### Accent Colors (Teal)
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--accent-primary` | `#2C7A7B` | `#38b2ac` | Primary accent, CTAs |
| `--accent-secondary` | `#10b981` | `#48bb78` | Secondary accent |
| `--accent-hover` | `#059669` | `#38a169` | Hover states |

### Brand Colors (Purple Gradient)
| Token | Value | Usage |
|-------|-------|-------|
| `--brand-primary` | `#667eea` | Gradient start |
| `--brand-secondary` | `#764ba2` | Gradient end |

### Primary Gradient
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Background Colors
| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--bg-primary` | `#ffffff` | `#1a202c` |
| `--bg-secondary` | `#f8f9fa` | `#2d3748` |
| `--bg-tertiary` | `#e9ecef` | `#4a5568` |

### Text Colors
| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--text-primary` | `#212529` | `#f7fafc` |
| `--text-secondary` | `#6c757d` | `#e2e8f0` |
| `--text-muted` | `#adb5bd` | `#a0aec0` |

### Semantic Colors
| Name | Value | Usage |
|------|-------|-------|
| Success | `#4ade80` | Success states |
| Warning | `#fbbf24` | Warnings |
| Error | `#dc2626` | Errors, destructive |
| Info | `#60a5fa` | Information |

## Typography

### Font Families
```css
/* Primary */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;

/* Display */
font-family: 'Noir Pro', sans-serif;

/* Monospace */
font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
```

## Shadows
| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--shadow-light` | `rgba(0, 0, 0, 0.1)` | `rgba(0, 0, 0, 0.3)` |
| `--shadow-medium` | `rgba(0, 0, 0, 0.15)` | `rgba(0, 0, 0, 0.4)` |

## Border Radius
- Small: `4px`
- Default: `8px`
- Medium: `12px`
- Large: `16px`
- XL: `20px`
- 2XL: `24px`

## Usage in Tailwind

The Astro landing site uses Tailwind CSS with these tokens configured in `tailwind.config.mjs`. Use the following classes:

```html
<!-- Backgrounds -->
<div class="bg-bg-primary dark:bg-bg-primary">
<div class="bg-gradient-primary">

<!-- Text -->
<p class="text-text-primary">
<p class="text-text-secondary">

<!-- Buttons -->
<button class="btn-primary">Primary Button</button>
<button class="btn-secondary">Secondary Button</button>
<button class="btn-accent">Accent Button</button>

<!-- Cards -->
<div class="card">Card content</div>
```

## Usage in React (CSS Variables)

The React portal uses CSS variables defined in `src/index.css`. Use them directly:

```css
.my-component {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
```

## Dark Mode

Both applications support dark mode with the `.dark` class on the root element:

- **React:** Uses `DarkModeContext` to toggle and persist preference
- **Astro:** Uses JavaScript to toggle `.dark` class and persist to localStorage

Both respect the user's system preference on initial load via `prefers-color-scheme`.
