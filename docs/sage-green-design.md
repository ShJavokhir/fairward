# Sage Green Design System

## Essence

A serene, academically-rooted design system that balances technical credibility with approachable warmth. Soft sage greens evoke growth and intelligence, while generous whitespace and elegant serif typography project clarity and expertise. The aesthetic feels like a well-curated research publication brought to life—trustworthy, modern, and quietly confident. Watercolor illustrations add an organic, human touch to the technical subject matter.

## Color Palette

### Backgrounds
- Primary: `#FFFFFF` — main page background, cards, navigation
- Soft Green: `#F2FBEF` — hero sections, content areas
- Lighter Green: `#E9FAE7` — alternate sections, subtle emphasis
- Light Gray: `#F9FAFB` — subtle card backgrounds

### Text
- Primary: `#000000` — main headings
- Secondary: `#17270C` — body text, subheadings (dark olive)
- Dark Green: `#092A09` — emphasized text
- Muted: `#6B7280` — captions, metadata (Tailwind gray-500)
- Inverse: `#FFFFFF` — text on dark backgrounds

### Accents
- Brand Teal: `#002125` — primary buttons, interactive elements
- Deep Teal: `#012E33` — hover states, emphasis
- Mint: `#98FB98` — highlights, decorative accents
- Light Mint: `#CEFDCE` — button text, icon fills
- Olive: `#819640` — secondary accent

### Decorative
- Watercolor illustrations use teal, coral, magenta, and sage tones
- Abstract wave patterns in muted greens and cream

## Typography

### Families
- Headings: **PT Serif** (weight 400)
- Body: **Schibsted Grotesk** (weight 400)
- Fallback: `ui-sans-serif, system-ui, sans-serif`

### Scale

| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| H1 | 56px | 400 | 70px (1.25) | -1.4px | Hero headlines |
| H2 | 48px | 400 | 48px (1.0) | -0.96px | Section headings |
| H3 | 28px | 400 | 31px (1.1) | -0.56px | Card titles, subsections |
| H4 | 24px | 400 | 28px | -0.48px | Feature headings |
| Body | 16px | 400 | 24px (1.5) | normal | Paragraphs, descriptions |
| Small | 12px | 400 | 16px | normal | Captions, fine print |
| Nav | 16px | 400 | — | normal | Navigation links |

### Treatments
- Headings use tight negative letter-spacing for elegant compression
- Section headings often render in `#17270C` (olive) rather than pure black
- Accent words in headlines use `#98FB98` mint green for emphasis
- Body text maintains generous 1.5 line-height for readability

## Spacing

### Base Unit
4px base with consistent 4-8px increments.

### Common Values
- xs: `4px`
- sm: `8px`
- md: `16px`
- lg: `24px`
- xl: `40px`
- 2xl: `64px`
- 3xl: `80px`

### Container
- Max width: `1280px`
- Horizontal padding: `16px` (mobile), `24px` (desktop)

## Elevation

### Shadows
- None by default — the system relies on background color contrast rather than shadows
- Cards use color fills (`#FFFFFF` on `#F2FBEF`) for depth

### Border Radii
- xs: `6px` — small inputs, pills
- sm: `12px` — buttons, small cards
- md: `14px` — medium elements
- lg: `16px` — feature cards
- xl: `24px` — large cards, sections
- full: `9999px` — pill buttons, avatars

### Borders
- Primary: `1px solid #E5E7EB` — subtle card borders
- Dividers: `1px solid #ECECEC` — section separators

## Interactive States

### Buttons (Primary)
- Default: `#002125` background, `#CEFDCE` text, `9999px` radius
- Padding: `6px 6px 6px 24px` (asymmetric for arrow icon)
- Hover: Subtle darkening to `#012E33`
- Transition: `all` (typically 150-200ms)
- Cursor: `pointer`
- Arrow icon in circular `#98FB98` badge

### Buttons (Secondary/Navigation)
- Menu button: `#98FB98` background, `#002125` text
- Pill shape with hamburger icon

### Links
- Default: Inherit text color, no underline
- Hover: Underline appears
- Color: `#17270C` (olive)

### Cards
- Default: White background on soft green page
- Clickable cards have arrow icon indicator
- Hover: No visible state change (subtle cursor change)

### Carousel Navigation
- Circle buttons: `#002125` background, white arrow
- Size: ~56px diameter

## Motion

### Principles
Smooth and purposeful. Animations guide attention without demanding it. The motion language feels measured and professional, not playful.

### Patterns
- **Page load**: Staggered fade-in reveals for content sections
- **Carousel**: Horizontal slide with momentum easing
- **Marquee**: Continuous horizontal scroll for logo strips
- **Hover**: Minimal—primarily cursor changes

### Timing
- Content reveals: `300-600ms`
- Stagger delay: `100-163ms` between siblings
- Transitions: `150-200ms` for interactive feedback
- Easing: `ease-out` for entrances

## Iconography

### Style
- Line-art icons with minimal stroke weight
- Geometric, abstract representations
- Green fills (`#98FB98`) for emphasis
- Consistent sizing within context

### Common Icons
- Arrow (→) in circular badge for CTAs
- Hamburger menu (≡)
- Social icons: LinkedIn, X/Twitter, Discord
- Compliance badges: SOC 2, HIPAA (with brand colors)

## Illustrations

### Style
- Organic watercolor aesthetic
- Teal, coral/peach, magenta, and cream palette
- Abstract flowing forms and wave patterns
- Positioned asymmetrically, often in corners

### Usage
- Hero sections as decorative backgrounds
- Section dividers with chevron patterns
- Flowcharts with soft green highlighted nodes

## Design Principles

1. **Academic credibility**: Serif headings and systematic hierarchy project expertise
2. **Organic warmth**: Soft greens and watercolor illustrations humanize technical content
3. **Generous breathing room**: Ample whitespace lets content speak without competition
4. **Understated interaction**: Minimal hover effects keep focus on content
5. **Consistent restraint**: Limited color palette applied systematically

## Implementation Notes

### CSS Architecture
- Built with Tailwind CSS
- Custom fonts loaded via Next.js font optimization (`__PT_Serif`, `__Schibsted_Grotesk`)
- Uses CSS custom properties for theming

### Font Loading
```css
/* Headings */
font-family: '__PT_Serif_7dbc8c', '__PT_Serif_Fallback_7dbc8c', serif;

/* Body */
font-family: '__Schibsted_Grotesk_dd6c87', '__Schibsted_Grotesk_Fallback_dd6c87', sans-serif;
```

### Key Tailwind Classes
- Container: `max-w-7xl mx-auto px-4 sm:px-6`
- Soft background: `bg-[#F2FBEF]`
- Primary button: `bg-[#002125] text-[#CEFDCE] rounded-full`
- Heading text: `text-[#17270C]`

### Responsive Behavior
- Mobile-first approach
- Navigation collapses to hamburger menu
- Footer sections become accordions on mobile
- Single-column layouts on small screens

### Animation Implementation
- Use Framer Motion or CSS animations for staggered reveals
- Marquee: CSS animation with duplicated content for seamless loop
- Respect `prefers-reduced-motion`