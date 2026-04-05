# Thmanyah Commentator Tool — Design Guide

> Derived from **Thmanyah Brand Identity v2.0** (هوية ثمانية — الدليل الإرشادي — إصدار 2.0)
> This guide governs every UI decision in the Commentator Analysis Tool.

---

## 1. Brand Essence

**Thmanyah (ثمانية)** is a Saudi media company dedicated to enriching Arabic content on the internet. The brand identity is built on three core principles:

| Principle (Arabic) | Principle (English) | Meaning |
|---|---|---|
| وضوح بلا تعقيد | Clarity without complexity | No unnecessary words, no filler. Every element earns its place. |
| الفكرة قبل الأسلوب | Idea before style | Content leads design, not the other way around. No decorative fluff. |
| نبرة تشبهك | A tone that resembles you | Speak to users like a knowledgeable friend — warm, direct, respectful of their intelligence. |

**Application to our tool:** The Commentator Analysis Tool should feel clear, confident, and authoritative — like a trusted colleague reviewing match commentary. No unnecessary ornamentation, no clutter. Data speaks first, design amplifies it.

---

## 2. Logo

### 2.1 Text Logo (الشعار النصي)
- Arabic: **ثمانية** (derived from Naskh calligraphy)
- English: **thmanyah** (custom serif logotype)
- High contrast, sharp terminals, balanced proportions
- Used in headers, footers, and branding areas

### 2.2 Icon Logo (الشعار الأيقوني)
- Geometric symbol derived from the Arabic numeral **٨** (eight)
- A pointed, diamond-like star shape with concave curves
- Used as app icon, favicon, compact branding mark
- File: `Usable/thamanyah.png`

### 2.3 Logo Colors
| Context | Logo Color | Background |
|---|---|---|
| Primary (dark mode) | White `#FFFFFF` | Black `#000000` |
| Primary (light mode) | Black `#000000` | White `#FFFFFF` |
| On photography | White `#FFFFFF` | Image (ensure contrast) |

### 2.4 Safe Space
- Minimum clear space around the logo = **1x** the height of the letter **ث** in the Arabic logotype
- Never crowd the logo with other elements

### 2.5 Sub-brand Composition
- When pairing with sub-brands, use the icon logo + sub-brand name
- Icon sits to the right of the Arabic sub-brand name (RTL layout)
- Maintain consistent spacing between icon and text

---

## 3. Color Palette

All colors extracted directly from the brand guidelines PDF. The palette is inspired by nature — sky, earth, and everyday life.

### 3.1 Primary Colors

| Name | Hex | Pantone | Usage |
|---|---|---|---|
| **Thmanyah Black** | `#000000` | K100 | Primary text, dark backgrounds, logo |
| **Thmanyah Green** | `#00C17A` | — | Brand accent, section headers, CTAs, success states |
| **Thmanyah Green (Light)** | `#B5E8BE` | — | Light green backgrounds, section header labels |
| **Off-White / Warm White** | `#F7F4EE` | — | Page backgrounds, cards, light surfaces |
| **Warm Gray** | `#F2EDEA` | Pantone Cool Gray 1 C | Subtle backgrounds, dividers, sidebar |

### 3.2 Accent Colors (Brand Blue & Red)

| Name | Hex | Pantone | Usage |
|---|---|---|---|
| **Thmanyah Blue** | `#0072F9` | Pantone 300 C | Links, interactive elements, data highlights |
| **Thmanyah Red** | `#F24935` | Pantone 7417 C | Alerts, low scores, critical indicators, icon logo accent |

### 3.3 Extended Palette

| Name | Hex | Pantone | Usage |
|---|---|---|---|
| **Burgundy** | `#82003A` | Pantone 7421 C | Deep accent, critical warnings |
| **Hot Pink** | `#FF00B7` | Pantone 806 C | Highlights, decorative emphasis |
| **Amber / Gold** | `#FFBC0A` | Pantone 7408 C | Warnings, medium scores, highlights |
| **Charcoal** | `#2B2D3F` | — | Dark UI surfaces, secondary dark text |
| **Dark Slate** | `#111421` | Pantone 426 C | Deepest dark backgrounds |
| **Muted Indigo** | `#494C6B` | — | Secondary text on dark, subtle borders |
| **Lavender** | `#D1C4E2` | Pantone 270 C | Light decorative accent |
| **Light Pink** | `#FFA5C6` | Pantone 189 C | Soft accent, badges |
| **Rose** | `#FFC9D8` | — | Soft pink backgrounds |
| **Pale Yellow** | `#F9E59E` | Pantone 127 C | Highlight backgrounds, notes |
| **Bright Yellow** | `#FFDD56` | — | Bold highlights, attention grabbers |
| **Peach** | `#FF9172` | Pantone 1635 C | Warm accent, mid-range indicators |
| **Salmon** | `#FFBAA3` | — | Soft warm accent |
| **Blush** | `#FFD1C4` | Pantone 489 C | Soft warm backgrounds |
| **Mint** | `#B2E2BA` | Pantone 572 C | Positive indicators, success tints |
| **Sky Blue** | `#84DBE5` | Pantone 2975 C | Info states, cool accent |
| **Light Sky** | `#AFE2EA` | — | Cool light backgrounds |
| **Pale Aqua** | `#D1EDEF` | Pantone 5315 C | Very light info backgrounds |

### 3.4 Neutral System

| Name | Hex | Usage |
|---|---|---|
| **Pure Black** | `#000000` | Primary text, headings |
| **Dark Charcoal** | `#111421` | Deep backgrounds |
| **Charcoal** | `#2B2D3F` | Dark cards, nav backgrounds |
| **Muted** | `#494C6B` | Secondary text, placeholders |
| **Light Warm** | `#EFEDE2` | Borders, subtle dividers |
| **Cream** | `#F4F2ED` | Card backgrounds |
| **Off-White** | `#F7F4EE` | Page background |
| **Pure White** | `#FFFFFF` | Clean surfaces, modals |

### 3.5 Semantic Color Mapping (for the Commentator Tool)

| State | Color | Hex |
|---|---|---|
| **Excellent / High Score** | Thmanyah Green | `#00C17A` |
| **Good** | Mint | `#B2E2BA` |
| **Average / Warning** | Amber | `#FFBC0A` |
| **Below Average** | Peach | `#FF9172` |
| **Poor / Critical** | Thmanyah Red | `#F24935` |
| **Info / Neutral** | Sky Blue | `#84DBE5` |
| **Interactive / Link** | Thmanyah Blue | `#0072F9` |

---

## 4. Typography

### 4.1 Font Families

Three custom font families are available, all in the `Usable/` directory:

| Font Family | Files | Purpose | Character |
|---|---|---|---|
| **Thmanyah Serif Display** | `Thmanyahserifdisplay12-*.otf` | Headlines, hero text, section titles | Elegant, high-contrast serif with sharp terminals. Designed for impact. |
| **Thmanyah Serif Text** | `Thmanyahseriftext12-*.otf` | Body text, articles, long-form content | Optimized for readability at text sizes. Smooth and balanced. |
| **Thmanyah Sans** | `Thmanyahsans12-*.otf` | Digital UI, buttons, labels, data | Clean, modern sans-serif. No contrast. Perfect for screens. |

### 4.2 Available Weights

Each family comes in five weights:

| Weight | CSS weight | File suffix |
|---|---|---|
| Light | `300` | `-Light` |
| Regular | `400` | `-Regular` / `-Reg` |
| Medium | `500` | `-Medium` |
| Bold | `700` | `-Bold` |
| Black | `900` | `-Black` |

### 4.3 Numeral System

**Default: Western Arabic (English) numerals** — `0 1 2 3 4 5 6 7 8 9`

All numbers displayed in the UI — scores, statistics, timestamps, percentages, dates — **must** use Western Arabic (English-style) numerals for consistency and data clarity. This applies to:
- Score displays (e.g., `82 / 100`, not `٨٢ / ١٠٠`)
- Progress percentages (e.g., `78%`, not `٧٨٪`)
- Timestamps (e.g., `12'`, `45:30`, not `١٢'`)
- Statistics and counts (e.g., `142 كلمة/دقيقة`)
- Dates (e.g., `8 فبراير 2026`)

Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) should **not** be used in the interface.

### 4.4 Font Usage Hierarchy

| Element | Font Family | Weight | Suggested Sizes |
|---|---|---|---|
| **Page Title / Hero** | Serif Display | Bold / Black | 36–48px |
| **Section Heading (H1)** | Serif Display | Bold | 28–32px |
| **Sub-heading (H2)** | Serif Display | Medium | 22–26px |
| **Card Title (H3)** | Sans | Bold | 18–20px |
| **Body Text** | Serif Text | Regular | 16–18px |
| **Small Body / Caption** | Sans | Regular | 14px |
| **Label / Tag** | Sans | Medium | 12–13px |
| **Button Text** | Sans | Bold | 14–16px |
| **Data / Numbers** | Sans | Medium / Bold | 14–24px (contextual) |
| **Score Display (large)** | Serif Display | Black | 48–72px |

### 4.5 CSS @font-face Setup

```css
/* Headlines — Thmanyah Serif Display */
@font-face {
  font-family: 'Thmanyah Serif Display';
  src: url('./Usable/Thmanyahserifdisplay12-Light.otf') format('opentype');
  font-weight: 300;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Display';
  src: url('./Usable/Thmanyahserifdisplay12-Reg.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Display';
  src: url('./Usable/Thmanyahserifdisplay12-Medium.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Display';
  src: url('./Usable/Thmanyahserifdisplay12-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Display';
  src: url('./Usable/Thmanyahserifdisplay12-Black.otf') format('opentype');
  font-weight: 900;
  font-style: normal;
}

/* Body Text — Thmanyah Serif Text */
@font-face {
  font-family: 'Thmanyah Serif Text';
  src: url('./Usable/Thmanyahseriftext12-Light.otf') format('opentype');
  font-weight: 300;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Text';
  src: url('./Usable/Thmanyahseriftext12-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Text';
  src: url('./Usable/Thmanyahseriftext12-Medium.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Text';
  src: url('./Usable/Thmanyahseriftext12-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Serif Text';
  src: url('./Usable/Thmanyahseriftext12-Black.otf') format('opentype');
  font-weight: 900;
  font-style: normal;
}

/* Digital / UI — Thmanyah Sans */
@font-face {
  font-family: 'Thmanyah Sans';
  src: url('./Usable/Thmanyahsans12-Light.otf') format('opentype');
  font-weight: 300;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Sans';
  src: url('./Usable/Thmanyahsans12-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Sans';
  src: url('./Usable/Thmanyahsans12-Medium.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Sans';
  src: url('./Usable/Thmanyahsans12-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Thmanyah Sans';
  src: url('./Usable/Thmanyahsans12-Black.otf') format('opentype');
  font-weight: 900;
  font-style: normal;
}
```

---

## 5. CSS Design Tokens

```css
:root {
  /* ── Primary ── */
  --color-black: #000000;
  --color-white: #FFFFFF;
  --color-green: #00C17A;
  --color-green-light: #B5E8BE;
  --color-green-pale: #B2E2BA;

  /* ── Brand Accents ── */
  --color-blue: #0072F9;
  --color-red: #F24935;

  /* ── Extended Palette ── */
  --color-burgundy: #82003A;
  --color-hot-pink: #FF00B7;
  --color-amber: #FFBC0A;
  --color-yellow-bright: #FFDD56;
  --color-yellow-pale: #F9E59E;
  --color-peach: #FF9172;
  --color-salmon: #FFBAA3;
  --color-blush: #FFD1C4;
  --color-pink-light: #FFA5C6;
  --color-rose: #FFC9D8;
  --color-lavender: #D1C4E2;
  --color-sky-blue: #84DBE5;
  --color-sky-light: #AFE2EA;
  --color-aqua-pale: #D1EDEF;
  --color-mint: #B2E2BA;

  /* ── Neutrals ── */
  --color-dark-slate: #111421;
  --color-charcoal: #2B2D3F;
  --color-muted: #494C6B;
  --color-warm-gray: #EFEDE2;
  --color-cream: #F4F2ED;
  --color-off-white: #F7F4EE;
  --color-warm-white: #F2EDEA;

  /* ── Semantic ── */
  --color-success: #00C17A;
  --color-warning: #FFBC0A;
  --color-error: #F24935;
  --color-info: #0072F9;

  /* ── Score Gradation ── */
  --score-excellent: #00C17A;
  --score-good: #B2E2BA;
  --score-average: #FFBC0A;
  --score-below-average: #FF9172;
  --score-poor: #F24935;

  /* ── Typography ── */
  --font-display: 'Thmanyah Serif Display', 'Georgia', serif;
  --font-body: 'Thmanyah Serif Text', 'Georgia', serif;
  --font-ui: 'Thmanyah Sans', 'Segoe UI', 'Helvetica Neue', sans-serif;

  /* ── Spacing (8px grid) ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ── Border Radius (soft rounded corners per brand) ── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

---

## 6. Visual Style Rules

### 6.1 Highlight Style (أسلوب الهاي لايت)
The brand's signature design element. A colored background highlight is placed behind key text to draw attention.

**Implementation:**
- Use a soft, semi-transparent or solid pastel color behind important text
- Apply with `background-color` and slight padding
- Colors typically: light green `#B5E8BE`, pale yellow `#F9E59E`, blush `#FFD1C4`, light pink `#FFA5C6`
- Use for: score labels, key metrics, commentator names, important findings

```css
.highlight {
  background-color: var(--color-green-light);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline;
}
```

### 6.2 Soft Rounded Shapes (الإطار)
Geometric shapes with soft/rounded corners are a fundamental brand element.

**Rules:**
- All cards, containers, buttons, and frames use rounded corners (`border-radius: 12–16px`)
- No sharp 90-degree corners on interactive or content elements
- Backgrounds for content blocks use soft rectangles
- Image containers should also have rounded corners

### 6.3 Layout Direction
- **RTL (Right-to-Left)** is the primary direction since the tool serves Arabic-speaking users
- Set `dir="rtl"` on the root HTML element
- Ensure all layouts mirror correctly for RTL
- English text within an RTL layout should naturally flow LTR where appropriate

### 6.4 Background Philosophy
| Surface | Color |
|---|---|
| Page background | `#F7F4EE` (Off-White) or `#FFFFFF` |
| Sidebar / Navigation | `#000000` or `#111421` (Dark) |
| Cards | `#FFFFFF` with subtle shadow |
| Section headers | `#00C17A` (Green) with white text |
| Modal overlays | Semi-transparent black `rgba(0,0,0,0.5)` |
| Data tables | Alternating `#FFFFFF` and `#F7F4EE` |

### 6.5 Dark Mode (Optional)
| Surface | Color |
|---|---|
| Page background | `#111421` |
| Cards | `#2B2D3F` |
| Primary text | `#F7F4EE` |
| Secondary text | `#494C6B` becomes lighter |
| Accent colors | Same green, blue, red — slightly desaturated if needed |

---

## 7. Iconography

### 7.1 Style
- **Line icons** with consistent 2px stroke weight
- Simple, clean, minimal detail
- Rounded terminals matching the brand's soft geometry
- Consistent sizing: 24x24px default, 20x20px small, 32x32px large

### 7.2 Recommended Icon Categories for Commentator Tool
- **Microphone** — represents commentary/audio
- **Play/Pause** — audio playback controls
- **Chart/Graph** — analytics and scores
- **Clock** — timing, match duration
- **Star/Trophy** — ratings and excellence
- **Warning triangle** — issues identified
- **Checkmark** — passed criteria
- **X mark** — failed criteria
- **Search** — finding specific moments
- **Download/Export** — report generation
- **Settings/Gear** — configuration

---

## 8. Component Design Patterns

### 8.1 Score Cards
Large numerical score displayed prominently using **Serif Display Black** at 48–72px, with a colored background indicator:

```
┌─────────────────────────────┐  radius: 16px
│                             │  bg: #FFFFFF
│      ╭─────────╮            │
│      │  85/100  │            │  Score: Serif Display Black, 48px
│      ╰─────────╯            │  Highlight: #B5E8BE (green-light)
│                             │
│  Overall Performance        │  Label: Sans Medium, 14px, #494C6B
│  Commentator: أحمد الطيب     │  Name: Sans Bold, 16px, #000000
└─────────────────────────────┘
```

### 8.2 Metric Bars
Horizontal progress bars with rounded ends:

```
Label ████████████████░░░░░░ 78%
      ╰── filled: #00C17A ──╯╰─ empty: #EFEDE2 ─╯
      border-radius: 9999px (full)
      height: 8px
```

### 8.3 Data Tables
- Header row: `#000000` background, white text, Sans Bold
- Body rows: alternating `#FFFFFF` and `#F7F4EE`
- Cell padding: 12–16px
- Border-radius on outer container: 12px
- No visible cell borders — use row background alternation for separation

### 8.4 Buttons
| Type | Background | Text | Border |
|---|---|---|---|
| Primary | `#000000` | `#FFFFFF` | none |
| Secondary | `#FFFFFF` | `#000000` | 1px solid `#EFEDE2` |
| Accent | `#00C17A` | `#FFFFFF` | none |
| Danger | `#F24935` | `#FFFFFF` | none |
| Ghost | transparent | `#000000` | none |

All buttons: `border-radius: 9999px` (pill shape), `padding: 10px 24px`, Sans Bold 14px.

### 8.5 Navigation Sidebar
- Dark background: `#000000` or `#111421`
- Active item: highlighted with `#00C17A` accent (left/right border or background tint)
- Icons: white, 24px
- Text: Sans Medium, white, 14px
- Logo icon at top

### 8.6 Audio Player Component
- Dark bar at bottom or embedded in analysis view
- Waveform visualization using brand green `#00C17A`
- Play/pause button: circular, `#00C17A` background
- Progress bar: `#00C17A` fill on `#2B2D3F` track
- Timestamps: Sans Regular, 12px

---

## 9. Page Layout Guidelines

### 9.1 Grid System
- 12-column grid for desktop
- 16px gutters
- Max content width: 1280px
- Sidebar: 260px fixed width

### 9.2 Spacing
Follow an **8px base grid**. All spacing values should be multiples of 4px or 8px:
- Tight: 4px, 8px
- Default: 16px, 24px
- Loose: 32px, 48px
- Section gaps: 48px, 64px

### 9.3 Card Layout
- Cards sit on the `#F7F4EE` page background
- Cards have `#FFFFFF` background with `var(--shadow-sm)` shadow
- Border-radius: 16px
- Internal padding: 24px
- Gap between cards: 16–24px

---

## 10. Brand Application: Commentator Tool Specific

### 10.1 Analysis Report Layout
```
┌──────────────────────────────────────────────────────┐
│ ◆ Thmanyah Logo    Commentator Analysis Tool   [⚙]  │  Top bar: black bg
├───────┬──────────────────────────────────────────────┤
│       │                                              │
│ NAV   │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│       │  │ Overall   │  │ Voice    │  │ Language  │   │  Score cards row
│ ■ Home│  │ Score: 82 │  │ Score: 78│  │ Score: 90│   │
│ ■ Ana │  └──────────┘  └──────────┘  └──────────┘   │
│ ■ Rep │                                              │
│ ■ Set │  ┌────────────────────────────────────────┐  │
│       │  │ Detailed Breakdown                     │  │  Analysis section
│       │  │ ═══════════════════════════════════════ │  │
│       │  │ Criteria 1   ████████████░░░░  75%     │  │
│       │  │ Criteria 2   █████████████████  92%    │  │
│       │  │ Criteria 3   ██████░░░░░░░░░░  38%     │  │
│       │  └────────────────────────────────────────┘  │
│       │                                              │
│       │  ┌────────────────────────────────────────┐  │
│       │  │ 🎙 Audio Timeline                      │  │  Audio player
│       │  │ ▶ ═══●══════════════════════  12:34    │  │
│       │  └────────────────────────────────────────┘  │
└───────┴──────────────────────────────────────────────┘
```

### 10.2 Voice & Tone in UI Copy
Following Thmanyah's brand voice:
- **Be direct:** "Score: 82/100" not "The commentator achieved a score of approximately 82 out of 100 points"
- **Be warm:** "Great performance in vocabulary diversity" not "Vocabulary diversity metric: PASS"
- **Be respectful:** Frame feedback constructively — "Room for improvement in pacing" not "Failed: pacing"
- **Use Arabic naturally:** Primary language is Arabic. All labels, instructions, and feedback in Arabic first.

### 10.3 Score Presentation
- Scores displayed as large numbers with the highlight style behind them
- Color-coded based on the semantic mapping (Section 3.5)
- Circular or radial progress indicators use `#00C17A` as the fill color
- Background track: `#EFEDE2`

---

## 11. Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Desktop (Large) | ≥1280px | Sidebar + 3-column content |
| Desktop | ≥1024px | Sidebar + 2-column content |
| Tablet | ≥768px | Collapsible sidebar + single column |
| Mobile | <768px | Bottom navigation + stacked cards |

---

## 12. Asset Reference

| Asset | Path | Notes |
|---|---|---|
| Logo (PNG) | `Usable/thamanyah.png` | White icon on black, for dark backgrounds |
| Serif Display fonts | `Usable/Thmanyahserifdisplay12-*.otf` | 5 weights |
| Serif Text fonts | `Usable/Thmanyahseriftext12-*.otf` | 5 weights |
| Sans fonts | `Usable/Thmanyahsans12-*.otf` | 5 weights |
| Brand Guidelines PDF | `Usable/هوية ثمانية  (1).pdf` | 52-page source document |

---

## 13. Do's and Don'ts

### Do:
- Use generous whitespace — let content breathe
- Apply the highlight style to draw attention to key metrics
- Use rounded corners (12–16px) on all containers
- Keep the color palette restrained — mostly neutrals with green/blue/red accents
- Prioritize RTL layout with proper Arabic typography
- Use the Thmanyah Sans font for all UI elements and data
- Use Thmanyah Serif Display for impactful headlines and scores
- Maintain high contrast between text and background

### Don't:
- Don't use sharp corners on cards, buttons, or containers
- Don't use colors outside the defined palette
- Don't crowd the interface — every element needs space
- Don't use decorative elements that don't serve a purpose
- Don't modify the logo proportions, colors, or add effects to it
- Don't use more than 2–3 accent colors on a single screen
- Don't mix font families within a single text block
- Don't use the logo smaller than the minimum safe size

---

*This guide should be consulted for every UI component, page layout, and design decision in the Thmanyah Commentator Analysis Tool. When in doubt, refer back to the three core principles: clarity, substance over style, and warmth.*
