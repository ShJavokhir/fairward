# Perplexity Finance Design System

A comprehensive design system analysis based on Perplexity AI's Finance/Predictions page.

---

## Color System

### Primary Colors (OKLCH Format)

| Name | OKLCH Value | Usage |
|------|-------------|-------|
| **Primary Text** | `oklch(0.3039 0.04 213.68)` | Headings, labels, body text |
| **Accent (Teal)** | `oklch(0.5527 0.086 208.61)` | Active states, links, highlights |
| **Background** | `rgb(252, 252, 249)` | Page background (warm off-white) |
| **Card Background** | `oklch(0.9962 0.004 106.47)` | Card surfaces, input containers |
| **Button Background** | `oklch(0.9902 0.004 106.47)` | Secondary buttons |

### Opacity Variants

| Name | Value | Usage |
|------|-------|-------|
| **Muted Text** | `oklch(0.3039 0.04 213.68 / 0.75)` | Secondary text, timestamps |
| **Subtle Text** | `oklch(0.3039 0.04 213.68 / 0.596)` | Tertiary information |
| **Border** | `oklch(0.3039 0.04 213.68 / 0.1)` | Card borders, dividers |
| **Border Hover** | `oklch(0.3039 0.04 213.68 / 0.16)` | Button borders, hover states |

### Accent Variants

| Name | Value | Usage |
|------|-------|-------|
| **Accent Background** | `oklch(0.5527 0.086 208.61 / 0.1)` | Active filter button bg |
| **Accent Border** | `oklch(0.5527 0.086 208.61 / 0.2)` | Active filter button border |

### Semantic Colors

| Name | OKLCH Value | Usage |
|------|-------------|-------|
| **Positive/Green** | `oklch(0.6541 0.1511 142.5)` | Gains, positive changes |
| **Negative/Red** | `oklch(0.5917 0.1728 22.33)` | Losses, negative changes |

### Input Colors

| Name | Value | Usage |
|------|-------|-------|
| **Input Background** | `oklch(0.6898 0.027 109.55 / 0.1)` | Search input backgrounds |

---

## Typography

### Font Stack

```css
font-family: fkGroteskNeue, ui-sans-serif, system-ui, -apple-system, "Segoe UI",
             Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
```

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| **Body** | 16px | 400 | 24px (1.5) | normal |
| **H2 / Section Heading** | 14px | 500 | 20px (1.43) | normal |
| **Card Title** | 14px | 500 | 20px | normal |
| **Card Description** | 14px | 400 | 20px | normal |
| **Small / Label** | 12px | 475 | - | normal |
| **Tab Text** | 14px | 500 | - | normal |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text, descriptions |
| Medium | 475 | Buttons, labels, badges |
| Semi-Bold | 500 | Headings, titles, tabs |

### Text Color Opacity for Data Confidence

Probability percentages use opacity to convey confidence:
- **High probability (90%+)**: ~99% opacity
- **Medium probability (50-90%)**: ~75-98% opacity
- **Low probability (<50%)**: ~58-75% opacity

```css
/* Example: 96% probability */
color: oklch(0.3039 0.04 213.68 / 0.989);

/* Example: 4% probability */
color: oklch(0.3039 0.04 213.68 / 0.584);
```

---

## Spacing System

| Size | Value | Usage |
|------|-------|-------|
| **xs** | 4px | Inner padding, tight gaps |
| **sm** | 8px | Card gaps, button padding, list item spacing |
| **md** | 10px | Button horizontal padding |
| **lg** | 14px | Tab vertical padding |
| **xl** | 16px | List item padding, input padding |
| **2xl** | 40px | Search input left padding (with icon) |

---

## Components

### Prediction Cards

```css
.prediction-card {
  background-color: oklch(0.9962 0.004 106.47);
  border: 1px solid oklch(0.3039 0.04 213.68 / 0.1);
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  transition: all;
}

.prediction-card:hover {
  /* Subtle shadow or border change on hover */
}
```

**Card Structure:**
- Title row: Question + Volume badge
- Options list: Option name + Probability % + Change %
- Description: AI-generated summary paragraph
- Footer: Source badges + Timestamp + External link

### Card Grid Layout

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* ~361.5px each */
  gap: 8px;
}
```

### Filter Buttons (Tags/Pills)

**Active State:**
```css
.filter-active {
  background-color: oklch(0.5527 0.086 208.61 / 0.1);
  color: oklch(0.5527 0.086 208.61);
  border: 1px solid oklch(0.5527 0.086 208.61 / 0.2);
  border-radius: 8px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 475;
}
```

**Inactive State:**
```css
.filter-inactive {
  background-color: transparent;
  color: oklch(0.3039 0.04 213.68);
  border: none;
  border-radius: 0;
}
```

### Navigation Tabs

```css
.tab {
  color: oklch(0.3039 0.04 213.68);
  font-size: 14px;
  font-weight: 500;
  padding: 14px 0;
  border-bottom: none;
}

.tab-selected {
  /* Selected indicator via underline or different styling */
}
```

### Search Input

```css
.search-input {
  background-color: oklch(0.6898 0.027 109.55 / 0.1);
  color: oklch(0.3039 0.04 213.68);
  border: none;
  border-radius: 8px;
  padding: 0 16px 0 40px; /* Left padding for icon */
  font-size: 14px;
}

.search-input::placeholder {
  color: oklch(0.3039 0.04 213.68 / 0.5);
}
```

### Secondary Button (View More)

```css
.btn-secondary {
  background-color: oklch(0.9902 0.004 106.47);
  color: oklch(0.3039 0.04 213.68 / 0.75);
  border: 1px solid oklch(0.3039 0.04 213.68 / 0.16);
  border-radius: 8px;
  padding: 0 10px;
  font-size: 14px;
  font-weight: 475;
}
```

### Stock List Item

```css
.stock-item {
  display: flex;
  padding: 8px 16px;
  cursor: pointer;
}

.stock-item:hover {
  /* Subtle background change */
}
```

### Volume Badge

```css
.volume-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: oklch(0.3039 0.04 213.68 / 0.75);
  font-size: 12px;
}
```

### Source Badge / Favicon Group

```css
.source-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: oklch(0.3039 0.04 213.68 / 0.75);
  font-size: 14px;
}

.source-favicon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}
```

### External Link (Polymarket)

```css
.external-link {
  color: oklch(0.3039 0.04 213.68 / 0.75);
  font-size: 12px;
  font-weight: 475;
}
```

### Sector/Change Badge (Pill with Background)

**Positive:**
```css
.badge-positive {
  background-color: oklch(0.6541 0.1511 142.5 / 0.15);
  color: oklch(0.6541 0.1511 142.5);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
```

**Negative:**
```css
.badge-negative {
  background-color: oklch(0.5917 0.1728 22.33 / 0.15);
  color: oklch(0.5917 0.1728 22.33);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
```

### Chat/Ask Input Container

```css
.ask-container {
  background-color: oklch(0.9902 0.004 106.47);
  border-radius: 12px;
  padding: 12px 16px;
}

.ask-placeholder {
  color: oklch(0.3039 0.04 213.68 / 0.5);
  font-size: 16px;
}
```

---

## Layout Structure

### Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Logo + Search + Actions                                  │
├────────┬──────────────────────────────────────────┬─────────────┤
│        │  Tab Navigation                          │ Sentiment   │
│ Side   │  (US Markets | Crypto | Earnings | ...)  │ Status      │
│ bar    ├──────────────────────────────────────────┼─────────────┤
│        │  Section Header + Search + Filters       │ Create      │
│ Nav    │                                          │ Watchlist   │
│        │  ┌─────────────┐ ┌─────────────┐        │             │
│ Icons  │  │ Prediction  │ │ Prediction  │        │ Stock List  │
│        │  │ Card 1      │ │ Card 2      │        │             │
│        │  └─────────────┘ └─────────────┘        │ Gainers/    │
│        │  ┌─────────────┐ ┌─────────────┐        │ Losers Tabs │
│        │  │ Prediction  │ │ Prediction  │        │             │
│        │  │ Card 3      │ │ Card 4      │        │ Equity      │
│        │  └─────────────┘ └─────────────┘        │ Sectors     │
│        │                                          │             │
│        │  [View More Button]                      │ Crypto      │
│        │                                          │             │
│        │  ┌──────────────────────────────┐       │ Fixed       │
│        │  │ Ask anything about...        │       │ Income      │
│        │  └──────────────────────────────┘       │             │
│        │                                          │ Footer      │
└────────┴──────────────────────────────────────────┴─────────────┘
```

### Column Widths

| Element | Width |
|---------|-------|
| Left Sidebar | ~73px |
| Main Content | Flexible |
| Right Sidebar | ~280px |
| Card in Grid | ~361.5px |

---

## Borders & Shadows

### Border Radius Scale

| Size | Value | Usage |
|------|-------|-------|
| **sm** | 4px | Small badges, avatars |
| **md** | 6px | Inline elements |
| **lg** | 8px | Buttons, inputs, tags |
| **xl** | 12px | Cards, containers |

### Box Shadows

The design uses minimal shadows, relying on borders and subtle background colors for depth:

```css
/* Cards have no shadow by default */
box-shadow: none;

/* Subtle elevation on hover (if any) */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
```

---

## Contrast & Accessibility

### Text Contrast Ratios

| Combination | Approximate Ratio |
|-------------|-------------------|
| Primary text on Background | ~12:1 (AAA) |
| Muted text on Background | ~8:1 (AAA) |
| Accent text on Background | ~5:1 (AA) |
| White text on Accent | ~4.5:1 (AA) |

### Opacity-Based Hierarchy

Text hierarchy is achieved through opacity rather than color variation:
- **100%** - Primary headings, important data
- **75%** - Secondary labels, metadata
- **~60%** - Tertiary, low-confidence values
- **50%** - Placeholder text, disabled states

---

## Icons & Visual Elements

### Arrow Indicators

- **Up Arrow**: Used with positive percentage changes
- **Down Arrow**: Used with negative percentage changes
- **Size**: Small inline (~12-14px)
- **Color**: Inherits from parent (green/red context)

### Favicons

- **Size**: 16x16px
- **Border Radius**: 2px
- **Spacing**: Overlapping stack with -4px margin

### Logo/Brand

- Monochrome icon in header
- Teal accent color for brand identity

---

## Responsive Considerations

- Cards collapse to single column on smaller screens
- Right sidebar becomes hidden or bottom sheet on mobile
- Tab navigation may become scrollable or hamburger menu
- Touch-friendly tap targets (minimum 44px)

---

## Animation & Transitions

```css
/* Default transition for interactive elements */
transition: all 150ms ease;

/* Hover state transitions */
transition: background-color 150ms ease,
            border-color 150ms ease,
            color 150ms ease;
```

---

## CSS Custom Properties (Recommended)

```css
:root {
  /* Colors */
  --color-primary: oklch(0.3039 0.04 213.68);
  --color-accent: oklch(0.5527 0.086 208.61);
  --color-background: rgb(252, 252, 249);
  --color-surface: oklch(0.9962 0.004 106.47);
  --color-positive: oklch(0.6541 0.1511 142.5);
  --color-negative: oklch(0.5917 0.1728 22.33);

  /* Opacity variants */
  --color-muted: oklch(0.3039 0.04 213.68 / 0.75);
  --color-subtle: oklch(0.3039 0.04 213.68 / 0.6);
  --color-border: oklch(0.3039 0.04 213.68 / 0.1);
  --color-border-hover: oklch(0.3039 0.04 213.68 / 0.16);

  /* Typography */
  --font-family: fkGroteskNeue, ui-sans-serif, system-ui, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;

  --font-weight-regular: 400;
  --font-weight-medium: 475;
  --font-weight-semibold: 500;

  --line-height-tight: 1.25;
  --line-height-normal: 1.43;
  --line-height-relaxed: 1.5;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 10px;
  --space-4: 14px;
  --space-5: 16px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* Transitions */
  --transition-fast: 150ms ease;
}
```

---

## Key Design Principles

1. **Minimal shadows** - Depth through subtle borders and backgrounds
2. **OKLCH color space** - Perceptually uniform colors with easy opacity
3. **Opacity-based hierarchy** - Single hue, multiple opacities for text levels
4. **Compact information density** - Small text sizes (12-14px) for data-heavy UI
5. **Warm neutrals** - Off-white backgrounds instead of pure white
6. **Semantic color usage** - Green/red only for positive/negative indicators
7. **Rounded corners everywhere** - Consistent 8-12px radius for soft, modern feel
8. **Clear visual grouping** - Cards and sections with subtle borders
