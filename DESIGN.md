# Meta Design System (DESIGN.md)

Meta hardware commerce (Quest, Ray-Ban Meta AI) & interface canvas design system.

## 1. Color Palette

### Brand & Accent
- **Cobalt Primary**: `#0064e0` (Buy-now / Commerce / Key CTA)
- **Deep Cobalt**: `#0457cb` (Pressed / Hover state)
- **Soft Cobalt 15%**: `rgba(0, 100, 224, 0.15)`
- **Facebook Blue**: `#1876f2` (Input focus ring, active controls)
- **Meta Link Blue**: `#385898`
- **Oculus Purple**: `#a121ce`

### Surfaces & Dark Canvas
- **Page Background (Canvas Dark)**: `#0a0d10` (Meta dark mode deep charcoal ink, NOT pure pitch black)
- **Surface / Card Background**: `#14181d` (Elevated dark card surface)
- **Surface Raised / Header / Nav**: `#1a1f26` (Higher contrast raised panel)
- **Surface Soft / Input**: `#181d24`
- **Hairline / Border**: `#242c36` (Hairline soft separator)
- **Hairline Strong / Input Border**: `#303945`

### Surfaces (Light Reference)
- **Canvas White**: `#ffffff`
- **Soft Cloud**: `#f1f4f7`
- **Hairline Gray**: `#ced0d4`
- **Hairline Soft**: `#dee3e9`

### Typography & Ink Hierarchy
- **Deep Ink (Headlines / Display)**: `#f7f9fa` (Dark mode primary text, stark and crisp)
- **Ink (Body Text)**: `#e4e7eb` (Dark mode readable body copy)
- **Charcoal (Tertiary Text)**: `#9aa8b6` (Muted labels, secondary descriptions)
- **Steel (Captions)**: `#788696` (Microcopy, timestamps, hints)
- **Stone (Disabled)**: `#515b67` (Disabled elements)

### Semantic Status
- **Success**: `#31a24c`
- **Attention / Warning**: `#f2a918` / `#f7b928`
- **Critical / Destructive**: `#e41e3f` / `#f0284a`

---

## 2. Typography Scale

- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Code / Mono**: "SF Mono", "IBM Plex Mono", Menlo, Consolas, monospace
- **Letter Spacing**:
  - Headings: `-0.02em` to `-0.01em` (Tight, confident wordmark feel)
  - Body copy: `-0.16px` (`-0.01em`)
  - Captions / Meta pills: `0.02em`
- **Heading Styles**: `font-weight: 600` or `700`, line-height `1.2`–`1.3`.

---

## 3. Component & Geometry Rules

- **Buttons**:
  - `button-buy-cta` / `primary`: Full pill (`rounded-full`), `#0064e0` background, `#ffffff` text, hover `#0457cb`, active scale `0.98`.
  - `button-secondary` / `marketing`: Full pill (`rounded-full`), border `2px solid currentColor` or subtle outline.
  - Ghost & Icon buttons: `rounded-full`.
- **Badges**:
  - Pill geometry (`rounded-full`), `px-2.5 py-0.5`, font-size 11px / 10px font-medium.
- **Cards & Panels**:
  - `rounded-2xl` (16px) or `rounded-3xl` (24px) for feature containers.
  - Border: 1px solid `var(--border)`.
  - Background: `var(--card)`.
- **Forms & Inputs**:
  - Height 40px/44px, `rounded-xl` (12px), background `var(--input-bg)`.
  - Focus state: `2px solid #1876f2` (Facebook Blue ring) with zero offset.
