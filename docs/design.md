# Trang chủ – Netflix Design System

## Overview

Netflix is the pioneer of immersive, cinematic streaming interfaces. The base atmosphere is a **dark canvas** (`{colors.canvas}` — #141414) — distinctly cinematic, optimized for media viewing in low-light environments, and deliberately anti-glare. Typography runs entirely on the custom **Netflix Sans** across all weights, providing a clean, utilitarian, yet highly recognizable brand voice that doesn't distract from the artwork.

Brand voltage comes from the **Netflix Red** (`{colors.primary}` — #e50914). It is used strictly for primary brand moments (the wordmark/N-logo), active loading states (spinners), and primary destructive/action CTAs. The system relies heavily on high-contrast imagery (movie posters, billboards) to do the heavy visual lifting, while the UI chrome remains almost invisible.

The system has three primary surface modes that overlap:
1. **Dark canvas** (`{colors.canvas}`) — default background floor for the entire app.
2. **Elevated dark cards** (`{colors.surface-elevated}`) — hover states, modals, and dropdown menus.
3. **Transparent vignettes** (`{colors.gradient-vignette}`) — gradients overlaid on hero imagery to ensure text and navigation legibility.

**Key Characteristics:**
- Cinematic dark canvas (`{colors.canvas}` — #141414) with pure white primary text (`{colors.text-primary}` — #ffffff).
- Netflix Red primary accent (`{colors.primary}` — #e50914). 
- Utilitarian sans-serif via **Netflix Sans** (Regular, Medium, Bold). 
- Heavy reliance on **motion and scale**. Movie cards transform and scale up on hover (`scale(1.5)` approximately) to reveal metadata and action buttons.
- Border radius is minimal: `{rounded.sm}` (4px) for cards, profiles, and buttons, giving a sharp, content-focused feel.
- Dense, horizontal-scrolling UI: Content is organized in slider rows (carousels) with small internal gaps (`{spacing.xs}` 8px).

## Colors

### Brand & Accent
- **Primary Red** (`{colors.primary}` — #e50914): The signature Netflix red. Used for the logo, active states, and primary standalone CTAs.
- **Red Hover** (`{colors.primary-hover}` — #f40612): The hover state for primary red buttons.
- **Red Active** (`{colors.primary-active}` — #bb0a12): The pressed/active state for primary buttons.

### Surface
- **Canvas** (`{colors.canvas}` — #141414): The default page floor. Pure cinematic dark gray/black.
- **Surface Card** (`{colors.surface-card}` — #181818): Standard dark background for inner elevated elements or empty states.
- **Surface Elevated** (`{colors.surface-elevated}` — #2f2f2f): Hover state backgrounds, tooltips, and modal surfaces.
- **Surface Overlay** (`{colors.surface-overlay}` — rgba(0, 0, 0, 0.75)): Black overlays for modals or behind text on imagery.
- **Hairline** (`{colors.hairline}` — #333333): Subtle dividers, row borders, and inactive input borders.

### Text
- **Primary** (`{colors.text-primary}` — #ffffff): All headlines, hero text, and active navigation links.
- **Secondary** (`{colors.text-secondary}` — #e5e5e5): Sub-headlines, descriptions.
- **Muted** (`{colors.text-muted}` — #808080): Footer text, placeholder text, and inactive metadata.
- **Success / Match** (`{colors.text-success}` — #46d369): Used specifically for the "New" or "% Match" text on movie hover cards.

## Typography

### Font Family
The system strictly runs on **Netflix Sans** as the universal typeface. The fallback stack walks `Netflix Sans, Helvetica Neue, Segoe UI, Roboto, Ubuntu, sans-serif`. It is a geometric, clean sans-serif designed for legibility on screens ranging from mobiles to 4K TVs.

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `{typography.display-xl}` | ~48px (3vw) | 700 | 1.1 | Hero billboard titles (if text-based) |
| `{typography.display-lg}` | 24px | 500 | 1.2 | Page headers (e.g., "Quản lý hồ sơ") |
| `{typography.title-lg}` | 1.4vw (max 24px) | 700 | 1.3 | Slider row titles ("Mới và phổ biến") |
| `{typography.title-md}` | 16px | 500 | 1.4 | Hover card titles, secondary headers |
| `{typography.body-lg}` | 1.2vw (max 18px) | 400 | 1.5 | Hero billboard synopsis |
| `{typography.body-md}` | 16px | 400 | 1.4 | Default text, settings labels |
| `{typography.body-sm}` | 14px | 400 | 1.4 | Hover card metadata, navigation links |
| `{typography.caption}` | 12px | 400 | 1.4 | Footer text, maturity ratings |

### Note on Font Substitutes
Since Netflix Sans is proprietary, **Inter** or **Helvetica Neue** are the exact structural substitutes for implementation. Use `font-sans` in Tailwind.

## Layout

### Spacing System
- **Tokens:** `{spacing.xs}` 4px/8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.screen}` 4% to 60px.
- **Screen Padding:** The main layout uses a percentage-based padding `px-[4%]` (or roughly 60px on desktop) to allow sliders to bleed off the edges gracefully.
- **Row Gap:** Vertical spacing between movie sliders is generous (approx 3vw to 4vw).

### Grid & Container
- **Hero Billboard:** Full bleed width, 16:9 aspect ratio container (using `padding-top: 56.25%` or modern `aspect-video`).
- **Slider Grids:** Display 6-up on large desktop, 5-up on desktop, 4-up on tablet, 2-up or 3-up on mobile.
- **Profile Grid:** Centered flex container for "Who's watching?", max 5 profiles.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, pure `#141414` | Default page background, slider cards |
| Top Nav | Gradient to transparent | Navbar over the hero billboard |
| Scrolled Nav | Solid `#141414` + subtle shadow | Navbar when scrolled down |
| Hover Card | `{colors.surface-card}` + massive drop shadow `0 8px 16px rgba(0,0,0,0.7)` | The scaled-up movie preview on hover |

## Shapes

### Border Radius Scale
| Token | Value | Use |
|---|---|---|
| `{rounded.none}`| 0px | Full bleed billboard images |
| `{rounded.sm}` | 4px | Standard movie cards, primary/secondary buttons, profile avatars |
| `{rounded.md}` | 8px | Hover elevated cards |
| `{rounded.full}`| 50% | Circular icon buttons (Play, Add, Like on hover cards) |

## Components

*(Note: Implement mock JSON data arrays to loop through movies, categories, and profiles for these components)*

### Global Navigation
**`top-nav`** — Pinned to top. Transparent background overlaid with a top-to-bottom black gradient. Transitions to solid `#141414` on scroll. Left: Netflix Logo (Red) + Primary links (Home, TV Shows, Movies). Right: Search icon, Notifications (Bell), Profile avatar dropdown. Text in `{typography.body-sm}`.

### Profiles
**`profile-gate`** — The "Who's watching?" screen. Centered layout. Avatar is a perfect square with `{rounded.sm}`.
**`profile-avatar-hover`** — On hover, avatar border becomes 2px solid white, and the name below turns from `{colors.text-muted}` to `{colors.text-primary}`.
**`profile-edit-button`** — Semi-transparent button superimposed on avatars in "Quản lý hồ sơ" mode with a pencil icon.

### Buttons
**`button-play`** — The primary functional CTA. Background white, text black. Hover: `#c2c2c2` background. Padding 8px 24px, `{rounded.sm}`. Carries a black play icon.
**`button-secondary`** — Used for "More Info". Background `rgba(109, 109, 110, 0.7)`, text white. Hover: lighter gray overlay. Carries an info (i) icon.
**`button-icon-circular`** — 36px or 40px circular buttons used inside hover cards (Play, Add to List, Like, Episodes). Border 2px solid `rgba(255, 255, 255, 0.5)`, background `rgba(42,42,42,.6)`. Hover: Border turns pure white, background turns slightly lighter.

### Cards & Sliders
**`hero-billboard`** — 100% width, ~80vh height. Contains a background image/video. Bottom carries a vignette gradient to blend seamlessly into the `#141414` canvas. Text and buttons sit in the bottom-left quadrant.
**`slider-row`** — A horizontal scrolling container with `overflow-x-visible`. Hidden scrollbars. Contains a title (`{typography.title-lg}`) that reveals a "Explore All" caret on row hover.
**`movie-card`** — 16:9 thumbnail. No border radius on some screens, `{rounded.sm}` on others. Flat elevation.
**`movie-card-hover`** — The core Netflix micro-interaction. Triggered after ~300ms delay on `movie-card` hover. 
- Transforms: `scale(1.5)` originating from the card's center.
- Contains: A video trailer playing (mock with GIF/image), a row of `{button-icon-circular}`, and metadata (Match %, Age Rating box, Duration, HD badge, Genres separated by dots).

### Tags & Badges
**`badge-maturity`** — Age rating (e.g., T16, 18+). Solid background `#333` with 1px border, white text, padding 2px 4px.
**`badge-top10`** — Red block with "TOP 10" in white, overlaid on thumbnails.

## Do's and Don'ts

### Do
- Use `#141414` for the background canvas, never pure black (`#000000`) unless it's an overlay or gradient stop.
- Keep border radii strictly at 4px (`rounded-sm`) for almost all UI elements to retain the TV-first interface feel.
- Ensure the hover transition on movie cards is smooth (duration ~300ms to 400ms).
- Mock data must be realistic: use real-looking movie titles, horizontal 16:9 placeholder images, and realistic genres.
- Ensure high contrast. White text on dark canvas. 

### Don't
- Don't overuse the Netflix Red. It should NOT be used for general buttons or text links. Only for the logo, badges, active states, and destructive actions.
- Don't use Serif fonts. Everything must be strict Sans-serif.
- Don't wrap movie rows into a grid by default. They must be horizontal sliders (`whitespace-nowrap`, `flex-row`).
- Don't put heavy padding inside the movie cards. The image should be full-bleed to the edges of the card.

## Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Top nav links collapse into a "Browse" dropdown. Movie slider shows 2-3 items. Hero billboard buttons span full width. Hover scale effect is disabled (tap to open modal instead). |
| Tablet | 768–1024px | Sliders show 4 items. Hover effects enabled. |
| Desktop | > 1024px | Full nav visible. Sliders show 5 to 6 items. Hero layout splits: Title/Buttons left, empty space right. |

## Expected Output / Iteration Guide
1. **Initialize Stack:** Use React + Tailwind CSS. Set `bg-[#141414]` and `text-white` globally.
2. **Build Mock Data:** Create a JSON array for profiles and nested arrays for movie categories (e.g., "Mới và phổ biến", "Phim hành động").
3. **Component 1: Navbar & Profiles:** Implement the Profile selection gate and the global scrolling Navbar.
4. **Component 2: Hero Billboard:** Build the featured movie with vignette overlay and Play/More Info buttons.
5. **Component 3: Slider & Cards:** Build the horizontal scrolling rows.
6. **Component 4: Hover Card (Crucial):** Implement the complex CSS absolute positioning and `scale` transform for the `movie-card-hover` state based on the "Hover chuột vào phim.html" structure.

## Known Gaps
- Netflix's proprietary video player and DRM are out of scope. Use static images or silent looping GIFs for trailers.
- The complex infinite-looping logic of the Netflix carousel (where scrolling past the end loops back to the start smoothly) can be simplified to standard native horizontal scrolling for this clone.
- Focus-visible (Keyboard navigation) is heavily customized on actual Netflix for TV remotes. Standard web `focus:ring-white` can be used as a substitute.