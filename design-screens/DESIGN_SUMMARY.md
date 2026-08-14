# DESIGN SUMMARY — LENS & LIGHT Photography Portfolio

Extracted from 5 Stitch-generated HTML screens. Design system: **Material 3 (M3) with a sage-green nature photography theme**.

---

## 1. COLOR PALETTE

### Primary Group (Deep Forest Green)

| Token | Hex Value |
|---|---|
| `primary` | `#163828` |
| `primary-container` | `#2d4f3e` |
| `primary-fixed` | `#c5ebd4` |
| `primary-fixed-dim` | `#a9cfb9` |
| `on-primary` | `#ffffff` |
| `on-primary-container` | `#9ac0aa` |
| `on-primary-fixed` | `#002113` |
| `on-primary-fixed-variant` | `#2c4e3d` |
| `inverse-primary` | `#a9cfb9` |

### Secondary Group (Muted Green)

| Token | Hex Value |
|---|---|
| `secondary` | `#316944` |
| `secondary-container` | `#b1eebe` |
| `secondary-fixed` | `#b4f1c1` |
| `secondary-fixed-dim` | `#98d4a6` |
| `on-secondary` | `#ffffff` |
| `on-secondary-container` | `#366e47` |
| `on-secondary-fixed` | `#00210d` |
| `on-secondary-fixed-variant` | `#16512e` |

### Tertiary Group (Deep True Green)

| Token | Hex Value |
|---|---|
| `tertiary` | `#003b0b` |
| `tertiary-container` | `#005514` |
| `tertiary-fixed` | `#94f990` |
| `tertiary-fixed-dim` | `#78dc77` |
| `on-tertiary` | `#ffffff` |
| `on-tertiary-container` | `#69cd6a` |
| `on-tertiary-fixed` | `#002204` |
| `on-tertiary-fixed-variant` | `#005313` |

### Error Group (Red)

| Token | Hex Value |
|---|---|
| `error` | `#ba1a1a` |
| `error-container` | `#ffdad6` |
| `on-error` | `#ffffff` |
| `on-error-container` | `#93000a` |

### Surface / Background Hierarchy

| Token | Hex Value | Role |
|---|---|---|
| `background` | `#f8faf8` | Page background (light sage off-white) |
| `on-background` | `#191c1b` | Text on background |
| `surface` | `#f8faf8` | Surface color |
| `surface-bright` | `#f8faf8` | Bright surface variant |
| `surface-dim` | `#d8dad9` | Dimmed surface variant |
| `surface-variant` | `#e1e3e1` | Surface variant |
| `surface-container` | `#eceeec` | Container surface |
| `surface-container-low` | `#f2f4f2` | Low-emphasis container |
| `surface-container-lowest` | `#ffffff` | Lowest-emphasis container |
| `surface-container-high` | `#e6e9e7` | High-emphasis container |
| `surface-container-highest` | `#e1e3e1` | Highest-emphasis container |
| `surface-tint` | `#436653` | Surface tint overlay |

### On-Surface Text

| Token | Hex Value |
|---|---|
| `on-surface` | `#191c1b` |
| `on-surface-variant` | `#414844` |
| `inverse-surface` | `#2e3130` |
| `inverse-on-surface` | `#eff1ef` |

### Outline / Border

| Token | Hex Value |
|---|---|
| `outline` | `#727973` |
| `outline-variant` | `#c1c8c2` |

### Brand Accent Colors

| Token | Hex Value | Notes |
|---|---|---|
| `border-subtle` | `#E2E8E2` | Primary border color |
| `mint-accent` | `#D1E7D3` | Mint green accent (tags, backgrounds) |
| `deep-charcoal` | `#1A1C1A` | Dark mode surface |

---

## 2. TYPOGRAPHY

### Font Families

| Token | Font Family | Google Fonts Import |
|---|---|---|
| `display-lg` | Hanken Grotesk | `wght@500;600` |
| `headline-lg` | Hanken Grotesk | `wght@500;600` |
| `headline-lg-mobile` | Hanken Grotesk | `wght@500;600` |
| `body-md` | Inter | `wght@400` |
| `metadata-sm` | JetBrains Mono | `wght@400;700` |
| `label-caps` | JetBrains Mono | `wght@400;700` |

### Font Size Scale

| Token | Size | Line Height | Letter Spacing | Weight |
|---|---|---|---|---|
| `display-lg` | 64px | 1.1 | -0.02em | 600 |
| `headline-lg` | 32px | 1.2 | (default) | 500 |
| `headline-lg-mobile` | 24px | 1.2 | (default) | 500 |
| `body-md` | 16px | 1.6 | (default) | 400 |
| `metadata-sm` | 12px | 1.4 | 0.05em | 400 |
| `label-caps` | 10px | 1.0 | 0.1em | 700 |

### Icon Fonts

- **Material Symbols Outlined**: `wght,FILL@100..700,0..1` — variable icon font with adjustable fill.

---

## 3. SPACING & ROUNDNESS

### Spacing Tokens

| Token | Value | CSS Custom Property |
|---|---|---|
| `base` | 8px | `--spacing-base` |
| `gutter` | 24px | `--spacing-gutter` |
| `grid-margin` | 40px | `--spacing-grid-margin` |
| `section-gap` | 120px | `--spacing-section-gap` |

### Border Radius (Roundness)

| Token | Value | CSS |
|---|---|---|
| `DEFAULT` | 0.125rem | 2px |
| `lg` | 0.25rem | 4px |
| `xl` | 0.5rem | 8px |
| `full` | 0.75rem | 12px |

**Overall roundness level**: `ROUND_TWO` equivalent — very subtle, almost sharp corners for a technical/precision aesthetic.

---

## 4. LAYOUT STRUCTURE

### Grid System

- **Framework**: Tailwind CSS utility-first
- **Base grid**: 12-column responsive grid (`grid-cols-12` / `md:grid-cols-12`)
- **Gutter**: 24px (`gap-gutter`)
- **Page margins**: 40px left/right (`px-grid-margin`)
- **Max content width**: `max-w-7xl` (1280px) centered with `mx-auto`
- **Section vertical padding**: 120px (`py-section-gap`)

### Layout Patterns Used

| Pattern | Usage | Screens |
|---|---|---|
| **Single-column mobile, multi-column desktop** | `grid-cols-1 md:grid-cols-12` | All screens |
| **Asymmetric bento grid** | Varying column spans (col-span-8, col-span-6, col-span-10, col-span-2, col-span-4) | Homepage (01) |
| **Sidebar + Main** | `col-span-8` main + `col-span-4` sidebar with `border-l` | Photo Detail (02), Photo Mgmt (05) |
| **Full-viewport map + overlay** | `absolute inset-0` map with `absolute` positioned glass-panel sidebar | Map Page (04) |
| **Centered card** | `flex items-center justify-center` + `max-w-md` glass panel | Admin Login (03) |
| **Sticky nav + scroll content** | `sticky top-0 z-50` nav + `flex-grow` main | All screens |

### Special Layout Techniques

- **Glassmorphism panels**: `backdrop-filter: blur(20-24px)` + `rgba(248, 250, 248, 0.7-0.8)` — used on admin login card and map sidebar.
- **Grid background patterns**: Subtle engineering-blueprint style repeating grid lines using `linear-gradient`, sized at 40px (`grid-margin`).
- **Hero radial gradient**: `radial-gradient(circle at right, mint-accent 0%, transparent 40%)` at 30% opacity.
- **CSS Grid background**: Custom `.bg-grid-pattern` class using 12-column proportional grid lines.
- **Sticky sidebar**: `sticky top-[100px]` for EXIF data sidebar (Photo Detail).

---

## 5. COMPONENT PATTERNS

### 5.1 TopNavBar (All Screens)

```html
<nav class="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 border-b border-border-subtle 
     flex justify-between items-center px-grid-margin py-4 w-full">
```
- **Layout**: Flex row, space-between (logo | nav links | CTA)
- **Logo**: `font-display-lg text-headline-lg tracking-tighter text-primary` — "LENS & LIGHT"
- **Nav links**: `font-label-caps text-label-caps` — JetBrains Mono 10px caps
  - Active state: `border-b-2 border-primary pb-1`
  - Inactive: `text-on-surface-variant` with `hover:text-primary`
  - Hover background: `hover:bg-mint-accent/10`
- **Glassmorphism**: `bg-surface/80 backdrop-blur-xl` for frosted-glass effect
- **Height**: explicit `h-[72px]` on Photo Management screen

### 5.2 Footer (All Screens)

```html
<footer class="bg-background border-t border-border-subtle w-full">
  <div class="grid grid-cols-1 md:grid-cols-4 gap-gutter px-grid-margin py-section-gap max-w-7xl mx-auto">
```
- **Grid**: 4-column desktop, 1-column mobile
- **Brand column** (col-span-2): `font-label-caps text-label-caps font-bold text-primary` + copyright text
- **Nav columns** (col-span-1 each): Stacked `font-metadata-sm` links with hover states
- **Copyright**: "© 2024 PRECISION CAPTURE. ALL RIGHTS RESERVED."

### 5.3 Hero Section (Homepage 01)

```html
<section class="px-grid-margin pt-section-gap pb-grid-margin max-w-7xl mx-auto 
     border-x border-border-subtle min-h-[614px] flex flex-col justify-center relative">
  <div class="absolute inset-0" style="background: radial-gradient(circle at right, theme('colors.mint-accent') 0%, transparent 40%); opacity: 0.3;"></div>
```
- **Min height**: 614px
- **Typography cascade**: `display-lg` (64px) heading → `body-md` (16px) paragraph with left border → `label-caps` (10px) tag chips
- **Radial gradient overlay**: Mint accent radiating from right side at 30% opacity
- **Animation**: `animate-reveal` keyframes — fade-in + slide-up (0.8s cubic-bezier), staggered with `.delay-100` through `.delay-500`
- **Tag chips**: Inline `bg-mint-accent` and `border border-border-subtle` pill labels

### 5.4 Photography Grid Cards (Homepage 01)

```html
<div class="col-span-1 md:col-span-8 group relative overflow-hidden border border-border-subtle bg-surface">
  <div class="aspect-[16/9] w-full bg-surface-dim relative overflow-hidden">
    <img class="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"/>
    <!-- Hover overlay -->
    <div class="absolute inset-0 bg-primary/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
      <span class="font-label-caps text-label-caps text-white">CAPTURE DATE</span>
      <span class="font-metadata-sm text-metadata-sm text-mint-accent">2024.10.15 // 06:42 AM</span>
      <div class="mt-4 border-t border-white/20 pt-4 flex justify-between items-center">
        <span class="font-headline-lg-mobile text-headline-lg-mobile text-white">Title</span>
        <span class="material-symbols-outlined text-white">arrow_outward</span>
      </div>
    </div>
  </div>
</div>
```
- **Aspect ratios**: `aspect-[16/9]`, `aspect-[4/5]`, `aspect-[21/9]` — varied for asymmetric layout
- **Image treatment**: Desaturated (`grayscale`) by default, full color on hover + slight scale-up (`scale-105`)
- **Hover overlay**: `bg-primary/60` (60% opacity primary) with `backdrop-blur-md`, fades in via `opacity` transition (500ms)
- **Overlay content**: Label (10px caps white) → Metadata (12px mono mint) → Separator (white/20 border) → Title (24px) + arrow icon
- **Staggered animations**: Items have ascending delays creating cascade reveal

### 5.5 Glass Panel Card (Admin Login 03, Map 04, Photo Mgmt 05)

```css
.glass-panel {
    background: rgba(248, 250, 248, 0.7);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--border-subtle, #E2E8E2);
}
```
- **Login variant**: Centered `max-w-md` card with `p-10`, lock icon, headline, "Protected Area" badge, form inputs
- **Map variant**: `w-80` absolute-positioned sidebar with scrollable location list
- **Shadow**: `shadow-[0_20px_40px_rgba(45,79,62,0.05)]` — subtle green-tinted drop shadow

### 5.6 Form Inputs (Admin Login 03, Photo Mgmt 05)

```html
<input class="w-full bg-transparent border-0 border-b border-border-subtle 
     focus:border-primary focus:ring-0 px-0 py-2 font-metadata-sm text-on-surface 
     placeholder:text-outline-variant"/>
```
- **Style**: Border-bottom underline only (no box border), transparent background
- **Placeholder**: `text-outline-variant`
- **Focus**: Border changes to `primary` color, no ring
- **Label**: `font-metadata-sm text-metadata-sm text-on-surface-variant uppercase` (JetBrains Mono 12px uppercase)
- **Textarea variant**: Uses full `border border-border-subtle` instead of border-bottom

### 5.7 Action Buttons

```html
<!-- Primary CTA -->
<button class="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 
     hover:bg-primary-container transition-all duration-300 flex items-center justify-center gap-2">
  <span class="material-symbols-outlined text-[16px]">publish</span>
  Publish to Portfolio
</button>

<!-- Outlined/Accent -->
<button class="font-label-caps text-label-caps text-primary bg-mint-accent px-4 py-2 
     border border-primary hover:bg-primary hover:text-white transition-all duration-300 
     ease-in-out transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md">
  Admin Login
</button>
```
- **Primary button**: Full-width, `bg-primary` with `py-4` padding, icon + text, uppercase JetBrains Mono 10px
- **Accent button**: `bg-mint-accent` with `border border-primary`, scale animation on hover
- **Icon button**: Icon-only `rounded-full p-2` with hover background (nav actions)
- **Status badges**: `bg-mint-accent text-primary px-2 py-1` (Published) or `bg-surface-variant text-on-surface-variant` (Draft)

### 5.8 EXIF / Metadata Data Block (Photo Detail 02, Photo Mgmt 05)

```html
<div class="bg-surface-container-low border border-border-subtle p-6 flex flex-col gap-4">
  <h2 class="font-label-caps text-label-caps text-secondary tracking-widest border-b border-border-subtle pb-2">
    EXIF & TECHNICAL
  </h2>
  <div class="grid grid-cols-2 gap-y-4 gap-x-2 font-metadata-sm text-metadata-sm text-on-surface">
    <div class="flex flex-col">
      <span class="text-outline text-[10px] mb-1">CAMERA</span>
      <span>Sony A7IV</span>
    </div>
    <!-- ... 6 items total in 2-column grid -->
  </div>
</div>
```
- **Container**: `bg-surface-container-low` with border, `p-6` padding
- **Header**: `label-caps` style with `tracking-widest`, secondary color, bottom border
- **Grid**: 2 columns, 4px row gap, 8px column gap
- **Labels**: 10px text in `outline` color, JetBrains Mono
- **Values**: 12px `metadata-sm` text in `on-surface` color

### 5.9 Map Markers & Popups (Map Page 04)

```html
<div class="absolute top-[30%] left-[20%] map-marker group">
  <div class="w-3 h-3 bg-primary rounded-full ring-2 ring-background shadow-md"></div>
</div>
```
- **Marker**: 12px circle (w-3 h-3 = 12px), `bg-primary`, with `ring-2 ring-background` white outline
- **Hover**: `scale(1.2)` via CSS transition
- **Popup**: `glass-panel` absolute positioned tooltip above marker, shows image thumbnail + location name + coordinates + camera/lens
- **Positioning**: JavaScript calculates position from marker bounding rect, `transform: translate(-50%, calc(-100% - 16px))`

### 5.10 Drag & Drop Upload Zone (Photo Mgmt 05)

```html
<div class="border border-border-subtle border-dashed p-12 flex flex-col items-center justify-center 
     text-center bg-surface hover:bg-mint-accent/10 transition-all duration-300 cursor-pointer 
     min-h-[300px] relative overflow-hidden group">
  <span class="material-symbols-outlined text-4xl text-outline mb-4">cloud_upload</span>
  <p class="font-body-md text-on-surface mb-2">Drag and drop raw files here</p>
  <p class="font-metadata-sm text-metadata-sm text-outline uppercase">or click to browse local storage</p>
  <input type="file" accept="image/*" multiple class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
</div>
```
- **Border**: Dashed `border-border-subtle`
- **Min height**: 300px
- **Hover**: Background shifts to `mint-accent/10`
- **Hidden input**: Absolutely positioned transparent file input overlaying entire zone

### 5.11 Data Table / Management List (Photo Mgmt 05)

```html
<div class="flex flex-col border border-border-subtle">
  <!-- Header -->
  <div class="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 
       font-label-caps text-label-caps text-outline bg-surface-bright">
    <div class="col-span-2">Preview</div>
    <div class="col-span-4">Title</div>
    ...
  </div>
  <!-- Row -->
  <div class="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 items-center 
       hover:bg-mint-accent/5 transition-colors">
    <div class="col-span-2"><div class="w-16 h-16 bg-surface-container overflow-hidden border">
      <img class="w-full h-full object-cover"/>
    </div></div>
    <div class="col-span-4 font-body-md text-on-surface">Title</div>
    <div class="col-span-2 font-metadata-sm text-metadata-sm">Date</div>
    <div class="col-span-2"><span class="font-label-caps bg-mint-accent">Status</span></div>
    <div class="col-span-2 flex justify-end gap-2">Edit/Delete icons</div>
  </div>
</div>
```
- **Grid**: 12-column CSS grid for table layout
- **Header row**: `bg-surface-bright` with `label-caps` 10px uppercase text in `outline` color
- **Row hover**: `hover:bg-mint-accent/5` subtle green tint
- **Status badges**: `bg-mint-accent text-primary` (Published) or `bg-surface-variant text-on-surface-variant` (Draft)
- **Action icons**: 18px Material Symbols with `hover:text-primary` / `hover:text-error` states

### 5.12 Back Navigation (Photo Detail 02)

```html
<a class="inline-flex items-center gap-2 font-label-caps text-label-caps 
   text-on-surface-variant hover:text-primary transition-colors">
  <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
  Back to Gallery
</a>
```
- **Typography**: `label-caps` (JetBrains Mono 10px), on-surface-variant color
- **Icon**: 16px Material Symbol, inline-flex with 8px gap

### 5.13 Tag Chips

```html
<!-- Accent tag -->
<span class="px-3 py-1 bg-mint-accent/20 border border-mint-accent font-label-caps text-label-caps text-primary">
  URBAN
</span>

<!-- Location tag with icon -->
<span class="px-3 py-1 bg-surface-container border border-border-subtle font-label-caps text-label-caps 
     text-on-surface-variant flex items-center gap-1">
  <span class="material-symbols-outlined" style="font-size: 14px;">location_on</span>
  SF, CA
</span>

<!-- Hero badge -->
<span class="font-label-caps text-label-caps bg-mint-accent px-2 py-1 text-primary">PORTFOLIO '25</span>
<span class="font-label-caps text-label-caps border border-border-subtle px-2 py-1 text-on-surface-variant">LATEST WORK</span>
```

### 5.14 Separators / Dividers

- **Horizontal rule**: `<div class="w-full h-[1px] bg-subtle my-2"></div>` — 1px line in border-subtle color
- **Border top separator**: `border-t border-border-subtle` with padding
- **Inline border left accent**: `border-l-2 border-primary pl-4` — 2px left accent bar

---

## 6. ANIMATIONS & TRANSITIONS

| Element | Animation |
|---|---|
| **Reveal animation** | `@keyframes reveal` — opacity 0→1 + translateY(20px→0), 0.8s cubic-bezier(0.16, 1, 0.3, 1) |
| **Image card hover** | `grayscale→grayscale-0`, `scale-105`, transition 700ms ease-out |
| **Overlay fade** | `opacity-0→opacity-100`, transition 500ms |
| **Overlay content slide** | `translate-y-4→translate-y-0`, transition 500ms with staggered delays |
| **Button hover** | `hover:scale-105 active:scale-95`, transition 300ms ease-in-out |
| **Nav link hover** | `transition-colors` + `transition-all duration-300` |
| **Map marker hover** | `transform: scale(1.2)`, transition 300ms ease |
| **Marker popup** | opacity transition 200ms |

---

## 7. DARK MODE TOKENS

Each color has dark mode overrides using Tailwind's `dark:` prefix:
- `dark:bg-deep-charcoal/80` → `#1A1C1A` at 80% opacity
- `dark:text-primary-fixed-dim` → `#a9cfb9`
- `dark:text-tertiary-fixed-dim` → `#78dc77`
- `dark:border-outline-variant/20` → borders at 20% opacity
- `dark:text-outline-variant` for inactive text
- `dark:bg-primary-container/20` for hover states

Dark mode is controlled via `class` strategy (`darkMode: "class"`).

---

## 8. SCREEN-BY-SCREEN COMPONENT INVENTORY

### 01 — Homepage (index)
- TopNavBar (sticky, glass)
- WebGL shader background (flowing ribbons, #f8faf8 base, #2d4f3e lines)
- Hero section (radial gradient, reveal animation, display-lg heading)
- Asymmetric photography grid (3 items: 16:9/8col, 4:5/6col, 21:9/10col)
- Footer (4-column)

### 02 — Photo Detail
- TopNavBar (sticky, glass)
- Back navigation
- Bento grid: large image (8-9 cols) + EXIF sidebar (3-4 cols, sticky)
- EXIF data block (6-field, 2-column grid)
- Tag chips (accent + location with icon)
- Footer (4-column)

### 03 — Admin Login
- Grid-pattern background
- Gradient overlay (transparent→mint-accent/20)
- Glass panel card (centered, max-w-md)
- Lock icon + headline + "Protected Area" badge
- Form: username + password (border-bottom inputs)
- Submit button (full-width, primary)

### 04 — Map Page (Footprints)
- TopNavBar (fixed, glass, h-20)
- Full-viewport placeholder map (gradient background)
- 4 map markers with hover scale
- Photo popup tooltip (glass panel, JS-positioned)
- Sidebar overlay (glass panel, w-80, scrollable)
  - Location list items (city name, photo count, thumbnail grid)
  - 3 locations: Tokyo (12 photos), Reykjavik (8 photos), New York (24 photos)
- Footer bar (total entries + filter button)
- Mobile FAB button (list icon)

### 05 — Photo Management (Admin)
- TopNavBar (sticky, glass, h-[72px])
- Page header (display-lg "Upload New Capture")
- Drag & drop zone (dashed border, cloud icon, 300px min-height, hidden file input)
- Image preview placeholder (desaturated, "No Preview Available" overlay)
- EXIF metadata sidebar (6 fields: Camera, Lens, Aperture, Shutter, ISO, Focal Length)
- Title + Description form inputs
- Publish button (full-width, publish icon)
- Recent Uploads table (12-col grid, 2 rows: "Concrete Geometry Study #04" & "Winter Morning Frost")
- Footer (4-column variant)
