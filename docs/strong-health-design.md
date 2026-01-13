# Strong Health

## Essence

A clinical-editorial hybrid that balances medical precision with warmth and approachability. The system conveys authority through restrained typography and generous whitespace, while cerulean gradients and large numerical displays create moments of visual confidence. Data feels personal rather than sterile—more private health concierge than hospital portal.

## Color Palette

### Backgrounds

- **Primary**: `#FFFFFF` — Main content areas, cards
- **Secondary**: `#F7F7F5` — Page backgrounds, subtle surface distinction
- **Tertiary**: `#F2F0ED` — Inset areas, callout blocks
- **Dark Surface**: `#1A1A1A` — Hero cards, calendar widgets, navigation pills
- **Dark Elevated**: `#2A2A2A` — Hover states on dark surfaces

### Text

- **Primary**: `#1A1A1A` — Headlines, body copy
- **Secondary**: `#6B6B6B` — Subheadings, labels, metadata
- **Muted**: `#9B9B9B` — Tertiary information, placeholders
- **Inverse**: `#FFFFFF` — Text on dark/gradient backgrounds
- **Inverse Muted**: `rgba(255,255,255,0.6)` — Secondary text on dark backgrounds

### Accents (Cerulean Primary)

- **Primary Gradient Start**: `#0077B6` — Deep cerulean
- **Primary Gradient End**: `#00B4D8` — Bright cyan-cerulean
- **Primary Solid**: `#0096C7` — Single-color applications
- **Primary Muted**: `rgba(0,150,199,0.1)` — Subtle backgrounds, hover states

### Semantic (Status Indicators)

- **Optimal**: `#2ECC71` — In-range, healthy values
- **Normal/Borderline**: `#F1C40F` — Caution, within acceptable range
- **Out of Range**: `#E91E8C` — Magenta-pink, requires attention
- **Optimal Dark**: `#27AE60` — Darker variant for text
- **Out of Range Dark**: `#C2185B` — Darker variant for text

### Accent Secondary

- **Teal Surface**: `#0D7377` — Biological age cards, secondary feature areas
- **Teal Gradient End**: `#14A3A8` — Gradient termination

### Utility

- **Border**: `#E5E5E5` — Card borders, dividers
- **Border Subtle**: `#F0F0F0` — Hairline separators
- **Shadow**: `rgba(0,0,0,0.08)` — Card shadows

## Typography

### Families

- **Headings**: Serif with moderate x-height and editorial character (Tiempos Headline, Freight Display, or similar). Weights: 400 (regular), 500 (medium)
- **Body**: Clean geometric sans-serif (Inter, SF Pro, or similar). Weights: 400, 500, 600
- **Monospace**: For data values when tabular alignment needed (SF Mono, JetBrains Mono)

### Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 72px | 400 | 1.0 | Hero statistics, large numbers |
| H1 | 32px | 400 | 1.2 | Page titles ("Data", "Your action plan") |
| H2 | 24px | 400 | 1.3 | Section headers, card titles |
| H3 | 18px | 500 | 1.4 | Subsection headers |
| Body | 16px | 400 | 1.5 | Primary content |
| Body Small | 14px | 400 | 1.5 | Secondary content, descriptions |
| Caption | 12px | 500 | 1.4 | Labels, metadata, status text |
| Overline | 11px | 600 | 1.2 | Step indicators, category labels |

### Treatments

- **Italic serif** for primary navigation labels and key data section names ("Data", "Twin")
- **ALL CAPS with wide tracking** (`letter-spacing: 0.15em`) for step indicators and overlines
- **Tabular numerals** for data values requiring alignment
- **Large numerical displays** use serif at display size, often with "out of 100" or unit suffixes at caption size

## Spacing

### Base Unit

4px grid. All spacing derives from multiples of 4.

### Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4px | Inline icon gaps, tight padding |
| `space-sm` | 8px | Related element spacing |
| `space-md` | 16px | Standard padding, stack spacing |
| `space-lg` | 24px | Card padding, section gaps |
| `space-xl` | 32px | Major section separation |
| `space-2xl` | 48px | Page-level vertical rhythm |
| `space-3xl` | 64px | Hero sections, major breaks |

### Container

- Max content width: 1200px
- Card internal padding: 24px
- Mobile horizontal margins: 16px
- Desktop horizontal margins: 32px–64px

## Elevation

### Shadows

- **None**: Flat cards relying on background color distinction
- **Subtle**: `0 1px 3px rgba(0,0,0,0.08)` — Default card elevation
- **Medium**: `0 4px 12px rgba(0,0,0,0.1)` — Modals, dropdowns, floating elements
- **Heavy**: `0 8px 24px rgba(0,0,0,0.12)` — Popovers, elevated dialogs

### Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | Buttons, small chips |
| `radius-md` | 12px | Input fields, small cards |
| `radius-lg` | 16px | Standard cards |
| `radius-xl` | 24px | Hero cards, feature panels |
| `radius-full` | 9999px | Pills, avatars, circular buttons |

## Interactive States

### Buttons

**Primary (Solid)**
- Default: Cerulean gradient background (`#0077B6` → `#00B4D8`), white text, `radius-sm`
- Hover: Slight brightness increase, subtle lift shadow
- Active: Darken 10%, remove shadow
- Disabled: 40% opacity

**Secondary (Outline/Ghost)**
- Default: Transparent background, `#1A1A1A` border, dark text
- Hover: `#F7F7F5` background fill
- Active: `#E5E5E5` background
- Disabled: 40% opacity, no border

**Dark Surface Button**
- Default: White background, dark text, high contrast
- Hover: `#F0F0F0` background

### Navigation Pills

- Default: `#1A1A1A` background, muted white text
- Selected: White background, dark text
- Transition: 200ms ease-out

### Form Inputs

- Default: White background, `#E5E5E5` border, `radius-md`
- Focus: `#0096C7` border (2px), subtle cerulean glow (`0 0 0 3px rgba(0,150,199,0.15)`)
- Error: `#E91E8C` border, pink glow
- Disabled: `#F7F7F5` background, muted text

### Links

- Default: `#0096C7` (cerulean)
- Hover: Underline, darken to `#0077B6`
- Visited: `#0077B6`

### Cards

- Default: White background, subtle shadow or border
- Hover (if interactive): Lift with medium shadow, slight scale (`transform: scale(1.01)`)
- Transition: 150ms ease-out

## Motion

### Principles

Restrained and purposeful. Motion supports comprehension of data changes rather than delighting for its own sake. Transitions feel immediate but not jarring—professional, not playful.

### Timing

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `instant` | 100ms | ease-out | Micro-interactions, button presses |
| `fast` | 150ms | ease-out | Hover states, small reveals |
| `normal` | 200ms | ease-in-out | Tab switches, card transitions |
| `slow` | 300ms | ease-in-out | Modal opens, major state changes |
| `deliberate` | 500ms | cubic-bezier(0.4, 0, 0.2, 1) | Page transitions, data loading |

### Patterns

- **Fade in**: Content appears with opacity 0→1 over 200ms
- **Slide up**: Cards/modals enter from 16px below with fade, 300ms
- **Progress bars**: Animate width over 500ms with ease-out for data updates
- **Number counters**: Large statistics can count up for emphasis, 800ms
- **Skeleton loading**: Subtle shimmer gradient animation, 1.5s infinite

## Data Visualization

### Status Bar (Segmented)

Horizontal bar divided into segments representing optimal/borderline/out-of-range counts.

- Height: 8px
- Border radius: 4px (ends only)
- Segments: Hard edges between colors (no gaps)
- Colors: Optimal green → Borderline yellow → Out of range magenta

### Range Indicators

Mini sparkline showing value position relative to optimal range.

- Optimal zone: Vertical green line or shaded region
- Current value: Dot on the line in status color
- Historical points: Connected line chart, muted colors
- Dimensions: ~100px wide × 32px tall

### Score Rings

Circular progress indicator for aggregate scores.

- Track: `#E5E5E5` (unfilled)
- Fill: Gradient matching card theme (cerulean or teal)
- Stroke width: 8–12px
- Number centered inside at display size

## Components (Structural Patterns)

### Hero Stat Card

Large gradient card displaying primary metrics.

- Full gradient background (cerulean or teal)
- Large display number (60–80px)
- Supporting label below
- Optional progress ring or trend indicator
- Border radius: `radius-xl`

### Data Row

List item for biomarker display.

- Left: Metric name (body), category below (caption, muted)
- Center: Status dot + status text
- Right: Value with unit, mini range chart
- Divider: Hairline border below
- Height: ~72px

### Calendar Strip

Horizontal date selector on dark background.

- Pill-shaped date cells
- Selected state: White background, dark text
- Marker dots below dates for events
- Contained in rounded dark card

### Bottom Navigation (Mobile)

Floating pill-shaped bar.

- Background: `#1A1A1A`
- Icons: White, 24px
- Active indicator: Filled vs outline icon variants
- Border radius: `radius-full`
- Position: Fixed bottom, centered with margin

## Design Principles

1. **Data confidence**: Large numbers, clear status colors, and decisive visual hierarchy make health metrics feel comprehensible rather than overwhelming.

2. **Editorial restraint**: Serif headings and generous whitespace borrow from magazine layouts, lending authority without clinical coldness.

3. **Status at a glance**: The tri-color system (green/yellow/magenta) provides instant feedback; users should never need to read to understand severity.

4. **Depth through color, not shadow**: Dark cards and gradient surfaces create hierarchy primarily through color contrast rather than layered shadows.

5. **Personal, not clinical**: Warm photography textures in backgrounds, conversational microcopy, and human-scale pacing differentiate from sterile medical interfaces.

## Implementation Notes

### CSS Custom Properties Structure

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F7F7F5;
  --color-bg-tertiary: #F2F0ED;
  --color-bg-dark: #1A1A1A;
  
  /* Text */
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #6B6B6B;
  --color-text-muted: #9B9B9B;
  --color-text-inverse: #FFFFFF;
  
  /* Accent */
  --color-accent-start: #0077B6;
  --color-accent-end: #00B4D8;
  --color-accent-solid: #0096C7;
  
  /* Semantic */
  --color-status-optimal: #2ECC71;
  --color-status-normal: #F1C40F;
  --color-status-alert: #E91E8C;
  
  /* Spacing */
  --space-unit: 4px;
  --space-xs: calc(var(--space-unit) * 1);
  --space-sm: calc(var(--space-unit) * 2);
  --space-md: calc(var(--space-unit) * 4);
  --space-lg: calc(var(--space-unit) * 6);
  --space-xl: calc(var(--space-unit) * 8);
  
  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-subtle: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-medium: 0 4px 12px rgba(0,0,0,0.1);
  
  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-default: ease-out;
}
```

### Gradient Utility

```css
.gradient-primary {
  background: linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end));
}

.gradient-teal {
  background: linear-gradient(135deg, #0D7377, #14A3A8);
}
```

### Font Loading

Recommend loading serif (headings) at weights 400–500, sans-serif (body) at 400–600. Use `font-display: swap` for performance.

### Status Dot Pattern

```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot--optimal { background: var(--color-status-optimal); }
.status-dot--normal { background: var(--color-status-normal); }
.status-dot--alert { background: var(--color-status-alert); }
```