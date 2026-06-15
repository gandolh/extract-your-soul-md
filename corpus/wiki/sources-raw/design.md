---
name: Clinical Voice Instrument
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#564241'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#897170'
  outline-variant: '#dcc0be'
  surface-tint: '#a13d3d'
  primary: '#7d2325'
  on-primary: '#ffffff'
  primary-container: '#9c3a3a'
  on-primary-container: '#ffc5c2'
  inverse-primary: '#ffb3af'
  secondary: '#655c5b'
  on-secondary: '#ffffff'
  secondary-container: '#eadddb'
  on-secondary-container: '#6a615f'
  tertiary: '#004e3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#00684f'
  on-tertiary-container: '#91e4c4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3af'
  on-primary-fixed: '#410006'
  on-primary-fixed-variant: '#812628'
  secondary-fixed: '#ece0de'
  secondary-fixed-dim: '#d0c4c2'
  on-secondary-fixed: '#201a19'
  on-secondary-fixed-variant: '#4d4544'
  tertiary-fixed: '#a0f3d3'
  tertiary-fixed-dim: '#84d6b7'
  on-tertiary-fixed: '#002117'
  on-tertiary-fixed-variant: '#00513d'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  surface-card: '#ffffff'
  text-primary: '#1a1714'
  text-secondary: '#5a554e'
  text-faint: '#8f8a82'
  border-hairline: '#e6e3dd'
typography:
  eyebrow-mono:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  button-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  metadata-mono:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  max-width: 960px
  unit: 4px
  gutter: 16px
  section-padding: 32px
---

## Brand & Style

This design system is engineered for a clinical and precise voice-profile instrument. The brand personality is analytical, authoritative, and scientific, prioritizing data density and clarity over decorative flair. It evokes the feeling of a professional laboratory tool or a high-end audio workstation.

The aesthetic follows a **Modern Clinical** approach:
- **Precision:** High-density layouts with disciplined alignment.
- **Instrument Edge:** Utilizing monospaced type and hairline borders to mimic physical diagnostic displays.
- **Functional Minimalism:** A neutral canvas with a singular high-contrast accent (Oxblood) to indicate state, action, or significant data points.
- **Data-Forward:** Information is prioritized through a strict typographic hierarchy and a "no-frills" container strategy.

## Colors

The palette is anchored by a sterile, near-white background to ensure maximum legibility and a professional atmosphere. 

- **Oxblood (#9c3a3a):** Used sparingly as the primary functional accent for call-to-actions, active states, and critical data markers.
- **Oxblood Wash (#f3e6e4):** Used for subtle backgrounds, hover states on primary elements, or to highlight specific sections without the visual weight of the solid primary color.
- **Text Tiers:** A disciplined three-tier grayscale ensures that information hierarchy is immediately scannable. Primary text handles core data, Secondary for descriptions, and Faint for auxiliary metadata or inactive states.
- **Borders:** Hairline borders in #e6e3dd provide structure without adding visual bulk, maintaining the "instrument" aesthetic.

## Typography

The typographic system utilizes a dual-font strategy to balance readability with technical precision.

- **Inter (Sans-Serif):** Employed for headings, body copy, and input text. It provides a neutral, highly legible foundation for reading complex data.
- **JetBrains Mono (Monospace):** Reserved for "the machine layer"—labels, eyebrows, metadata, and button text. 
- **Styling Rules:** All monospaced elements (excluding data values) should utilize uppercase styling and increased letter-spacing to emphasize their role as structural indicators or functional controls. 
- **Scale:** The scale is intentionally compact (13-14px for body) to allow for high data density characteristic of professional instruments.

## Layout & Spacing

This design system uses a **Fixed-Width Centered Column** model to maintain focus and control the optical line length of clinical data.

- **Grid:** The primary layout is constrained to a 960px maximum width.
- **Rhythm:** A 4px baseline grid governs all spacing. Vertical margins between sections are generous (32px), while internal component spacing is tight (4px, 8px, 12px) to maintain a sense of density and "instrument" utility.
- **Sectioning:** Every major section must be preceded by a Monospace Eyebrow.
- **Mobile:** On screens smaller than 960px, the layout transitions to a fluid model with 16px side margins. Cards and containers should maintain their structured edges without additional rounding on mobile.

## Elevation & Depth

Depth is conveyed through subtle tonal layering rather than dramatic shadows. 

- **Surface Strategy:** The base layer is #fafafa. Active workspace cards or data modules are pure #ffffff. This creates a natural "stacked" look without requiring heavy borders.
- **Shadows:** Use a single, razor-thin shadow for cards: `0 1px 3px rgba(26, 23, 20, 0.05)`. This adds just enough definition to separate the white card from the near-white background.
- **Interactions:** Depth does not change on hover (no "lift" effects). Instead, state changes are signaled via border color shifts or background tinting (Oxblood Wash) to maintain the clinical, flat-plane instrument feel.

## Shapes

The shape language is disciplined and geometric. 

- **Corners:** A uniform radius of 4px to 6px is applied to all cards, buttons, and input fields. This "Soft" setting removes the harshness of 0px corners while avoiding the consumer-friendly look of "bubble" or highly rounded cards.
- **Borders:** All containers and interactive elements utilize a 1px hairline border (#e6e3dd). 
- **Consistency:** Avoid pill-shaped buttons or circular elements unless they represent specific audio-visual data (like a recording indicator). Functional UI should remain rectangular with soft corners.

## Components

- **Buttons:** Use Monospace Uppercase text. Primary buttons are solid Oxblood with White text. Secondary buttons use Oxblood Wash with Oxblood text. Ghost buttons use Faint text and hairline borders.
- **Inputs:** Sans-serif text for user entry. Hairline borders that darken slightly on focus. Labels must be Monospace Eyebrows positioned above the input field.
- **Cards:** Pure white background, hairline border, subtle shadow. No internal padding should exceed 24px to keep the layout dense.
- **Chips/Badges:** Small, monospaced text, 2px radius, using either a light gray wash or Oxblood wash depending on significance.
- **Progress Bars / Spectrograms:** These should use the Oxblood accent color against the Oxblood Wash background. Avoid rounded caps on bars; use sharp or 2px rounded ends for a more technical appearance.
- **Lists:** Clean rows separated by hairline borders. Use monospaced font for numbers or timestamps to ensure alignment.
