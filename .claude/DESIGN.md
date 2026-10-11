# Bin-It Design Reference (Raycast-derived)
> Midnight command center, coral neon

**Theme:** dark

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

Raycast reads as a dark power-tool cockpit: an almost-black canvas (#040506) with barely-visible elevation steps, a single warm coral accent (#ff6363) that carries brand identity, and quiet white/gray typography in Inter. Components are defined less by shadows and more by hairline borders, inset highlight strokes, and the distinctive 'keyboard key' inner-shadow treatment that makes cards feel pressed and tactile rather than floating. Color is rationed — the page is 98% achromatic, and the coral appears only in the logo, hero artwork, AI badge, and the occasional warm-tinted surface. Navigation floats with a glass-blur effect, and most interactive surfaces are neutral light-gray buttons on dark, not chromatic CTAs. The hero abandons the system entirely with large red/blue gradient geometry, then the rest of the page returns to the austere dark surface — contrast through atmosphere, not decoration.

## Bin-It implementation guide (read this first)

This file is the style reference for every Bin-It page outside the staff dashboard. The sections after this one are the original Raycast measurements; this section says how we apply them. When the two disagree, this section wins. The reference implementation is `apps/web/app/page.tsx` (landing page): copy its patterns rather than inventing new ones.

### Scope

| Surface | Style |
| --- | --- |
| Landing page `/` | This guide, fully |
| New marketing or info pages (about, how it works, FAQ) | This guide, fully |
| `/privacy`, `/terms` | Should adopt this guide (they are still light zinc); use the "Prose page" template below |
| Staff dashboard `/dashboard` | Keeps its own palette and components (`components/Dashboard.tsx`, `panel/`, `map/`). Do not restyle it with these tokens without asking |
| Mobile app (`apps/mobile`) | Its own theme (`lib/theme.ts`); this guide does not apply |

The page is dark throughout. Do not add light sections, alternating bands, or a light theme variant.

### Tokens (defined in `apps/web/app/globals.css`, use the Tailwind names)

| Tailwind name | Value | Use |
| --- | --- | --- |
| `bg-void-black` | `#040506` | Page canvas, the only page background |
| `bg-ink` | `#07080a` | Card / window surfaces |
| `bg-obsidian` | `#111214` | Recessed wells: command bar, icon containers, inputs |
| `bg-graphite` | `#1b1c1e` | Badge and tag fill |
| `text-white` | `#ffffff` | Headings, high-emphasis text |
| `text-ash` | `#9c9c9d` | Body copy, secondary text, nav links |
| `text-smoke` | `#6a6b6c` | Muted labels, eyebrows, meta strips |
| `bg-mist` + `text-iron` | `#e6e6e6` / `#454647` | The only filled button |
| `border-rc-border` | `#363739` | Every hairline border (nav, outlined buttons, tiles, dividers) |
| `bg-coral-pulse`, `text-coral-pulse` | `#ff6363` | Brand accent: logo diamond, one highlighted phrase, hero artwork, the selected row |
| `bg-ember-hush` | `#452324` | Warm notice surface (use at `/60`) |
| `electric-sky`, `cobalt-edge` | `#63a1ff`, `#143ca3` | Hero artwork only |

Coral is rationed: logo, one phrase in the hero headline, hero atmosphere, the active row in a product mockup, and the `bg-coral-pulse/15` tint behind it. Never for body text, links, borders, icons or buttons. No other hues. Success/warning colors are not part of this surface; if a page needs status, use text labels.

### Type

Target: Inter for text, Geist Mono (`font-mono`) for eyebrows, meta strips and technical labels. `--font-inter` is loaded in `layout.tsx`, but `globals.css` sets `body { font-family: Arial, Helvetica, sans-serif }` and the landing page does not override it, so today the page actually renders in Arial. To get Inter, add `font-[family-name:var(--font-inter)]` to the page root (new pages should do this); changing the global body font would also affect the dashboard, so do not do that without asking.

| Role | Classes | Notes |
| --- | --- | --- |
| Hero headline | `text-[40px] sm:text-[56px] font-normal leading-[1.1] sm:leading-[1.17] tracking-[0.22px]` | Weight 400, never bold. One coral phrase at most |
| Section heading | `text-[32px] font-normal leading-[1.15]`, `max-w-2xl` | One strong statement per section |
| Card title | `text-[20px] font-medium leading-[1.2]` | |
| Body | `text-[16px] leading-[1.5] text-ash`, `max-w-[480px]` in hero | |
| Small body | `text-[14px] leading-[1.6] text-ash` | Notices, stat labels |
| Stat number | `text-[32px] font-medium leading-none text-white` | Use `CountUp` |
| Eyebrow | `font-mono text-[11px] uppercase tracking-[0.073em] text-smoke` | Above every section heading |
| Meta strip | `font-mono text-[12px] text-smoke`, separated by `|` | Footers, hero footnote |

Letter-spacing on large text is slightly positive, never negative. No weights above 600.

### Layout and spacing

- Page container: `mx-auto w-full max-w-[1200px] px-6`.
- Sections: `py-24` (about 96 px) between sections; hero is `h-dvh max-h-[900px] min-h-[640px]`.
- Grids: 3 columns for feature cards (`sm:grid-cols-3`), 4 for stats (`grid-cols-2 lg:grid-cols-4`), gap `gap-4` for cards, `gap-2` for compact tiles.
- Stay on the 8 px grid (8/12/16/24/40/96).
- Anchored sections use `scroll-mt-24` so the fixed nav does not cover them.
- Mobile first: single column below `sm`; nav links hide below `sm`, keep logo and the action button.

### Radius

| Element | Radius |
| --- | --- |
| Floating nav | `rounded-full` (pill) |
| Buttons, inputs, list rows, compact tiles | `rounded-[8px]` |
| Badges / tags | `rounded-[6px]` |
| Product window frame | `rounded-[12px]` |
| Cards, command bar, notices | `rounded-[16px]` |
| Icon containers | `rounded-full` |

### Elevation

No drop shadows on cards. Elevation is the "key" stack, already wrapped in `KeyCard` (`components/ui/card-hover-effect.tsx`) and exported as `KEY_SHADOW` in the landing page:

```text
rgba(255,255,255,0.05) 0 1px 0 0 inset, rgba(255,255,255,0.25) 0 0 0 1px, rgba(0,0,0,0.2) 0 -1px 0 0 inset
```

The Mist button alone may carry the subtle lift `rgba(0,0,0,0.03) 0 7px 3px 0, rgba(0,0,0,0.25) 0 4px 4px 0`. Use a flat `border border-rc-border` for quiet tiles and outlined buttons. Do not mix the key stack and a border on the same element.

### Components (recipes)

Copy the markup from `app/page.tsx`; this table says where each lives.

| Component | Recipe |
| --- | --- |
| Glass nav | `fixed inset-x-0 top-4 z-50 flex justify-center px-4` > `nav.flex w-full max-w-[720px] items-center justify-between gap-4 rounded-full border border-rc-border bg-void-black/60 py-2 pl-5 pr-2 backdrop-blur-[48px]`. Logo diamond (`h-3 w-3 rotate-45 rounded-[2px] bg-coral-pulse`) + "Bin-It" 13px/500; links 13px/500 `text-ash hover:text-white`; one Mist action button on the right |
| Primary button | `h-10 rounded-[8px] bg-mist px-4 text-[14px] font-medium text-iron hover:opacity-90`. One per view |
| Secondary button | same size, `border border-rc-border text-ash hover:text-white`, transparent |
| Badge | `rounded-[6px] bg-graphite px-2 py-1 text-ash` (mono uppercase when it is a section tag) |
| Feature card | `HoverEffect` or `KeyCard`: 16 px radius, `p-6`, `bg-ink/60`, key shadow; icon in `h-12 w-12 rounded-full bg-obsidian text-mist`, 24 px stroke icon (1.6 stroke, round caps) |
| Stat card | `KeyCard` with `CountUp` (`components/reactbits/CountUp.tsx`) + 14 px ash label |
| Product window | Frame `rounded-[12px] bg-ink p-3` + key shadow; command bar `rounded-[16px] bg-obsidian px-4 py-3`; rows `rounded-[8px] px-3 py-2.5`; the selected row `bg-coral-pulse/15` with a coral dot. Always captioned as an illustration |
| City / link tile | `rounded-[8px] border border-rc-border p-4` with a Graphite badge on the right |
| Notice | `rounded-[16px] bg-ember-hush/60 p-6`, 16px/500 white title, 14px ash body. Use for caveats and "estimates, not measurements" |
| Hex grid | `components/landing/HexGrid.tsx`: decorative H3-style SVG, coral intensity, numbered pins, dashed under-reported rings. Always captioned "illustrative"; use `cover` for wide short thumbnails |
| Spotlight card | `components/landing/SpotlightCard.tsx`: key-shadow card with a cursor-following neutral highlight (no coral) |
| Bento | `components/landing/Bento.tsx`: report / rank / place / bias cards in a 3-column grid (two spanning 2) |
| Product window | `components/landing/ProductWindow.tsx`: dashboard mockup with hex map + ranked list; sits under the hero text |
| Built-on strip | `border-y border-rc-border/60`, mono 12px names in `text-smoke` |
| Footer | `border-t border-rc-border/60`, centered mono 12px meta strip: `© year Bin-It | Privacy | Terms | Dashboard` |

### Hero atmosphere

Depth comes from light, not shadow: a blue radial wash (`rgba(4,63,150,0.55)` to `rgba(6,18,37,0.25)` at about 50% 30%), two blurred coral bars rotated about -24 degrees (`bg-coral-pulse/45 blur-[60px]` and `/30 blur-[50px]`), and a bottom fade into `void-black`. Keep text centered over the calmest part. Use the hero treatment once per page and only on the first screen; inner pages get a plain `void-black` header with an eyebrow and a 32 px heading.

### Page templates

Marketing page: Nav, Hero (eyebrow badge, 56 px headline, one 480 px paragraph, primary + secondary button, mono meta line), then sections each shaped as eyebrow + 32 px heading + content (cards, window, stats, tiles), then the Notice if there are caveats, then Footer.

Prose page (privacy, terms): Nav, `max-w-3xl` column, eyebrow, 32 px heading (40/56 px if it is the page title), body 16 px ash with 24 px between paragraphs, `h2` 20 px white, hairline dividers `border-rc-border`, then Footer.

### Motion

- Section entrances use `FadeContent` (`components/reactbits/FadeContent.tsx`, scroll-triggered fade); numbers use `CountUp`. Nothing bounces, loops or autoplays except the optional hero Spotlight in `components/ui/spotlight.tsx`.
- Hover transitions are `transition-opacity` or `transition-colors`, about 150-200 ms. No scale or translate on hover.
- Every animation must degrade to the final state: content must be readable if JavaScript or WebGL fails. Honor `prefers-reduced-motion` for anything that loops.

### Content rules (project, not visual)

- Say "estimate" for every projected number and show assumptions (150 m threshold, Orlando model transferred from NYC and Chicago, lightly validated).
- Seeded or illustrative figures are labeled as an illustration or "demo data". Never present synthetic data as real.
- Only claim numbers that exist in our data (current counts: 3 cities, 16,744 hexagons, 50 sites per city, 5 photo classes). If a number changes with a data reload, say where it comes from.
- Privacy: no accounts, no names, no photos with faces or plates on marketing pages.
- One idea per section; plain language; no superlatives.

### Do and don't (Bin-It specific)

Do: reuse `KeyCard`, `HoverEffect`, `CountUp`, `FadeContent`; add new tokens to `globals.css` rather than hardcoding hex values; keep one primary action per view; link `Open dashboard` to `/dashboard`.

Don't: add chromatic buttons or colored status text; add new accent colors; use gradients on UI controls (only the hero artwork); use drop shadows on cards; set the page on a light surface; restyle `/dashboard` with these tokens.

### Where this differs from the Raycast reference

- The nav is a true pill (`rounded-full`); the reference says both "pill-shaped" and "8 px radius", we chose the pill and keep 8 px on buttons inside it.
- Section headings use 32 px / 400 with a mono eyebrow above them; the reference mostly shows 56 px hero type.
- We add an Ember Hush notice for caveats, and a product-window mockup of our own dashboard instead of Raycast's command bar.
- Fonts: Inter body, Geist Mono for technical text; SF Pro is not loaded, so stat numbers use the Inter/Geist stack.
- Icons are inline 24 px SVG strokes rather than SF glyphs.

### Maintenance

When a new page needs a pattern that is not listed (form, table, tabs), build it from the tokens above, add its recipe to the Components table, and note it in this section in the same change. Reference implementation files: `apps/web/app/page.tsx`, `apps/web/components/ui/*`, `apps/web/components/reactbits/*`, `apps/web/app/globals.css`.

---

## Raycast reference measurements
> The sections below are the original extracted style reference. Use them for values this guide does not cover.


## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Void Black | `#040506` | `--color-void-black` | Page canvas, dominant background — the near-pure-black base that most of the interface sits on |
| Ink | `#07080a` | `--color-ink` | Card surfaces, elevated panels, image backgrounds — one step up from the canvas for content blocks |
| Obsidian | `#111214` | `--color-obsidian` | Subtle surface tint, pressed states, input wells — used for slight depth on form fields and recessed containers |
| Graphite | `#1b1c1e` | `--color-graphite` | Neutral form states, badge text, and quiet UI feedback where color should stay understated. |
| Smoke | `#6a6b6c` | `--color-smoke` | Secondary body text, muted labels — the everyday reading color on dark surfaces |
| Ash | `#9c9c9d` | `--color-ash` | Light text on dark surfaces, inverse labels, and high-contrast captions. |
| Mist | `#e6e6e6` | `--color-mist` | Light neutral action fill for buttons on dark surfaces. |
| Iron | `#454647` | `--color-iron` | Button text on light fills, mid-gray borders — paired with Mist for filled button labels |
| Slate | `#2f3031` | `--color-slate` | Dark button borders and labels on ghost/dark buttons |
| Pure White | `#ffffff` | `--color-pure-white` | Headings, high-emphasis text, reversed text on light buttons — the loudest text color in the system |
| Coral Pulse | `#ff6363` | `--color-coral-pulse` | Brand accent — logo diamond, AI badge fill, hero artwork saturation, the single warm punctuation in an achromatic system |
| Ember Hush | `#452324` | `--color-ember-hush` | Warm-tinted card backgrounds, accent surface tints — desaturated coral used as a muted backdrop for coral-anchored content |
| Electric Sky | `#63a1ff` | `--color-electric-sky` | Hero illustration mid-tone, decorative gradient — appears only in the dramatic abstract hero artwork, not in interface controls |
| Cobalt Edge | `#143ca3` | `--color-cobalt-edge` | Hero illustration stroke, deep gradient anchor — paired with Electric Sky in the hero's blue geometry |
| Deep Space | `#02193b` | `--color-deep-space` | Hero illustration fill, darkest blue in the artwork gradient — not a UI token |
| Info Blue | `#56c2ff` | `--color-info-blue` | Blue wash for highlight backgrounds, decorative bands, and soft emphasis behind content. Use as a supporting accent, not as a status color |
| Success Green | `#59d499` | `--color-success-green` | Green wash for highlight backgrounds, decorative bands, and soft emphasis behind content. Use as a supporting accent, not as a status color |

## Tokens — Typography

### Inter — Primary interface typeface — body text at 16px/400, nav and card labels at 13–14px/500, subheadings at 18–22px/400, section headings at 32–56px in the 400–600 range, and display at 64px/600. Inter's neutral geometry carries the developer-tool seriousness; weight 400 at the 56px hero headline is an anti-convention choice — most brands shout with 700, Raycast whispers with regular weight and lets the size do the work · `--font-inter`
- **Substitute:** system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 11px, 12px, 13px, 14px, 16px, 18px, 20px, 22px, 24px, 32px, 56px, 64px
- **Line height:** 0.91–1.71
- **Letter spacing:** 0.0040em at 56px, 0.0100em at 20px, 0.0140em at 14px, 0.0080em at 13px, 0.0730em at 11px (uppercase eyebrow)
- **OpenType features:** `'calt', 'kern', 'liga', 'ss03'`
- **Role:** Primary interface typeface — body text at 16px/400, nav and card labels at 13–14px/500, subheadings at 18–22px/400, section headings at 32–56px in the 400–600 range, and display at 64px/600. Inter's neutral geometry carries the developer-tool seriousness; weight 400 at the 56px hero headline is an anti-convention choice — most brands shout with 700, Raycast whispers with regular weight and lets the size do the work

### GeistMono — Monospace for version strings, technical micro-labels, terminal-style text — appears in footer metadata (v1.104.21), command-line hints, and 10px uppercase eyebrow tags. Geist Mono's compact, slightly geometric forms make the tiny labels feel engineered rather than decorative · `--font-geistmono`
- **Substitute:** 'JetBrains Mono', Menlo, Monaco, Courier, monospace
- **Weights:** 300, 400, 500
- **Sizes:** 10px, 12px, 14px
- **Line height:** 1.00–1.60
- **Letter spacing:** 0.0170em at 12px, 0.0500em at 10px (uppercase)
- **OpenType features:** `'calt', 'kern', 'liga', 'ss03', 'ss09'`
- **Role:** Monospace for version strings, technical micro-labels, terminal-style text — appears in footer metadata (v1.104.21), command-line hints, and 10px uppercase eyebrow tags. Geist Mono's compact, slightly geometric forms make the tiny labels feel engineered rather than decorative

### SF Pro Text — System font used for icon glyphs and numeric stat callouts at 24–32px/500. Falls back to SF Pro on macOS for native feel — reinforces the 'this is a Mac app' identity · `--font-sf-pro-text`
- **Weights:** 500, 700
- **Sizes:** 16px, 24px, 32px
- **Line height:** 1.15
- **OpenType features:** `"calt", "kern", "liga", "ss03"`
- **Role:** System font used for icon glyphs and numeric stat callouts at 24–32px/500. Falls back to SF Pro on macOS for native feel — reinforces the 'this is a Mac app' identity

### SF Pro — SF Pro — detected in extracted data but not described by AI · `--font-sf-pro`
- **Weights:** 700
- **Sizes:** 13px
- **Line height:** 1.23
- **OpenType features:** `"calt", "kern", "liga", "ss03"`
- **Role:** SF Pro — detected in extracted data but not described by AI

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| eyebrow | — | — | 11px | 0.91 | 0.8px | `--text-eyebrow` |
| body | — | — | 16px | 1.15 | 0px | `--text-body` |
| body-lg | — | — | 18px | 1.15 | 0px | `--text-body-lg` |
| subheading | — | — | 20px | 1.2 | 0.2px | `--text-subheading` |
| heading-sm | — | — | 24px | 1.15 | 0px | `--text-heading-sm` |
| heading | — | — | 32px | 1.15 | 0px | `--text-heading` |
| heading-lg | — | — | 56px | 1.17 | 0.22px | `--text-heading-lg` |
| display | — | — | 64px | 1.1 | 0px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 8px

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 16 | 16px | `--spacing-16` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 56 | 56px | `--spacing-56` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |
| 96 | 96px | `--spacing-96` |
| 120 | 120px | `--spacing-120` |
| 224 | 224px | `--spacing-224` |

### Border Radius

| Element | Value |
|---------|-------|
| cards | 16px |
| pills | 9999px |
| badges | 6px |
| inputs | 8px |
| buttons | 8px |
| largeCards | 20px |
| iconContainers | 99999px |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| subtle | `rgba(0, 0, 0, 0.4) 0px 1.5px 0.5px 2.5px, rgb(0, 0, 0) 0p...` | `--shadow-subtle` |
| subtle-2 | `rgb(27, 28, 30) 0px 0px 0px 1px, rgb(7, 8, 10) 0px 0px 0p...` | `--shadow-subtle-2` |
| lg | `rgba(215, 201, 175, 0.05) 0px 0px 20px 5px, rgba(215, 201...` | `--shadow-lg` |
| subtle-3 | `rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset, rgba(255...` | `--shadow-subtle-3` |
| subtle-4 | `rgba(0, 0, 0, 0.03) 0px 7px 3px 0px, rgba(0, 0, 0, 0.25) ...` | `--shadow-subtle-4` |
| subtle-5 | `rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset` | `--shadow-subtle-5` |
| xl | `rgba(0, 0, 0, 0.4) 0px 4px 40px 8px, rgba(0, 0, 0, 0.8) 0...` | `--shadow-xl` |
| subtle-6 | `rgba(255, 255, 255, 0.15) 0px 1px 1px 0px inset` | `--shadow-subtle-6` |
| sm | `rgba(0, 0, 0, 0.25) 0px 4px 4px 0px` | `--shadow-sm` |
| subtle-7 | `rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(0, 0...` | `--shadow-subtle-7` |
| xl-2 | `rgba(255, 255, 255, 0.03) 0px 0px 40px 20px, rgba(255, 25...` | `--shadow-xl-2` |
| subtle-8 | `rgba(255, 255, 255, 0.19) 0px 0px 2px 0px, rgba(255, 255,...` | `--shadow-subtle-8` |
| subtle-9 | `rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(7, 1...` | `--shadow-subtle-9` |
| subtle-10 | `rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(0, 0...` | `--shadow-subtle-10` |
| subtle-11 | `rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(7, 1...` | `--shadow-subtle-11` |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 80-120px
- **Card padding:** 24px
- **Element gap:** 8-16px

## Components

### Glass Navigation Bar
**Role:** Top-level site navigation

Floating pill-shaped bar with backdrop-blur(48px), 1px solid border at #363739, 8px radius, transparent dark fill (sits over #040506). Logo at left (red diamond + 'Raycast' wordmark in white, 13px/500), nav links centered at 13–14px in #9c9c9d, and a light-gray Download button at right. Padding approximately 8px vertical, 16px horizontal internally.

### Neutral Filled Button (Download CTA)
**Role:** Primary download and action button

Light Mist (#e6e6e6) fill, Iron (#454647) text at 13–14px/500, 8px radius, 8px 12px padding. Sometimes paired with a small black/dark icon (Apple, Windows logo) at 15px. This is the only filled action surface in the system — deliberately neutral rather than chromatic, letting the dark page do the contrasting.

### Ghost Nav Link
**Role:** Navigation and inline links

Transparent background, Ash (#9c9c9d) text at 13–14px, no border, no padding. Hover state transitions to Pure White. 0px radius — the nav bar's outer pill provides the visual containment.

### Feature Card with Key Shadow
**Role:** Content card for features, extensions, and showcase blocks

16px radius, 24px padding, 8px internal padding on content blocks. Signature treatment uses the 'keyboard key' shadow stack: rgba(255,255,255,0.05) inset top highlight, rgba(255,255,255,0.25) outer 1px ring, rgba(0,0,0,0.2) inset bottom shadow. This creates a pressed, tactile surface — not a floating card but a recessed key cap. Background is transparent on the card surface so the canvas shows through.

### Edge-Highlight Card
**Role:** Hover or featured card variant

16–20px radius, transparent fill, defined by 1px solid #363739 border plus the inset highlight stack. Used when a card needs to be defined by edge rather than surface — the border does the work that a background would on a lighter system.

### Inset Input Field
**Role:** Text input, search, and form fields

8px radius, rgba(255,255,255,0.05) fill, 8px 12px padding, Pure White text at 16px/400. Sits recessed in the surface — the slight white tint reads as 'this is a well you can type into' against the dark canvas. Placeholder text in Ash.

### Badge Tag
**Role:** Inline metadata, version labels, category tags

Graphite (#1b1c1e) fill, Pure White text, 6px radius, 0 6px padding (tight horizontal pill). Used for version numbers, 'beta' tags, and category labels. Compact and quiet — never draws attention away from the content it annotates.

### Circular Icon Container
**Role:** App icon, extension icon, feature icon backing

99999px radius (perfect circle), 20px padding, subtle dark surface fill. Contains a 24–32px SF Pro Text glyph or product icon. The circular frame makes app/extension icons feel like dock items.

### Hero Gradient Banner
**Role:** Hero section atmospheric backdrop

Full-bleed dramatic composition using the red/blue gradient geometry: the radial gradient from rgba(4,63,150,0.7) to rgba(6,18,37,0.25) anchors a blue atmospheric wash, while diagonal red/coral shapes (Coral Pulse with 40px+ blur) cut across the center. This is the one place the system breaks its own rules — color, blur, and scale are cranked to maximum for a 'cinematic' moment before the page returns to the austere dark surface below.

### Footer Meta Strip
**Role:** Version, platform, and installation info

Centered row of Geist Mono 12px/400 text in Ash, separated by vertical pipe characters. Contains version string (v1.104.21), platform requirement (macOS 13+), and install command. Sits below the download buttons with 8px gap — the monospace treatment signals 'this is technical metadata' without needing a label.

### App Window Mockup
**Role:** Product screenshot, feature preview

Recreated app interface shown in screenshots — 12px radius outer frame, 16px radius for the command bar at top, 8px radius for result list items. Uses the 'keyboard key' inner shadow stack on the window chrome to make it feel like a physical object. Internal UI uses Pure White text on #07080a, with a single Coral Pulse highlight on the selected/active row.

## Do's and Don'ts

### Do
- Use #040506 as the only page background — never introduce lighter or grayer canvas colors
- Reserve #ff6363 (Coral Pulse) for the logo, hero artwork, AI badge, and warm-tinted card surfaces — never use it for general accent text, icons, or borders in the body of the page
- Use the 'keyboard key' inner shadow stack (rgba(255,255,255,0.05) inset top + rgba(255,255,255,0.25) outer ring + rgba(0,0,0,0.2) inset bottom) on all elevated cards and feature blocks
- Set hero headlines at 56px/400 in Inter with +0.22px letter-spacing — the regular weight at large size is a signature, not a mistake
- Use Mist (#e6e6e6) filled buttons with Iron (#454647) text for all primary actions — the system has no chromatic CTA
- Use 8px radius for buttons, inputs, and badges; 16–20px radius for cards; 9999px for pills; 99999px for circular icon containers
- Separate footer metadata with vertical pipes and render in Geist Mono 12px to signal technical information

### Don't
- Don't use chromatic action buttons — the CTA system is deliberately neutral (Mist on dark), not blue/red/green
- Don't add drop-shadows to cards or panels — elevation comes from the inset key shadow stack, not outer shadows
- Don't use negative letter-spacing on large display text — the system uses slightly positive tracking (0.0040em at 56px) which is anti-convention and intentional
- Don't introduce light theme sections or alternating light/dark bands — the page is dark throughout
- Don't use #ff6363 for body text, link colors, or general icon accents — it is a brand mark, not a functional color
- Don't use multiple accent colors in the same surface — the system is monochromatic with one coral accent, not a multi-hue palette
- Don't use SF Pro Text for body copy — reserve it for icons and numeric stat callouts at 24–32px; body text is always Inter
- Don't break the 8px spacing grid — all padding, gaps, and margins should snap to 8/12/16/24/40 values

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | `#040506` | The default page background — near-pure black that most UI sits on |
| 1 | Card | `#07080a` | Elevated content blocks, hero image backdrops, the first visible step up from the canvas |
| 2 | Recessed | `#111214` | Input fields, pressed or inset wells, subtle depth on form controls |
| 3 | Badge | `#1b1c1` | Dense tag surfaces, monogram tiles, the darkest intentional filled surface |
| 4 | Accent Tint | `#452324` | Warm coral-tinted backdrop for sections anchored to the brand color |

## Elevation

- **Hero atmospheric composition:** `No conventional shadow — instead uses multi-layer radial gradients and 37.5px blur filters to create depth through atmosphere`
- **Featured content cards:** `rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset — the 'key' treatment`
- **Download buttons:** `rgba(0,0,0,0.03) 0px 7px 3px 0px, rgba(0,0,0,0.25) 0px 4px 4px 0px — subtle lift on neutral filled surfaces`

## Imagery

Imagery is dominated by the hero: massive abstract red/blue geometric shapes (diagonal bars, radial glows) that feel like a motion-graphics title sequence rather than product photography. Below the hero, the system shifts to in-context product screenshots that show the actual app interface — a dark command bar, result list, and extension icons rendered as if floating on the page. Photography is absent. The visual density shifts dramatically from the cinematic hero to austere product mockups and then to text-heavy feature sections with no imagery at all. Icon style: SF Pro Text system glyphs at 16–24px, weight 500, rendered in Mist (#e6e6e6) on dark surfaces. No photographic, lifestyle, or stock imagery — the product UI is the hero.

## Layout

Page model is max-width ~1200px centered with generous horizontal padding, but the hero and atmospheric sections are full-bleed. The nav bar is a floating pill that sits over the hero with backdrop-blur. Hero is full-viewport height with centered headline (56px Inter 400) over a dramatic red/blue gradient composition. Below the hero, content shifts to contained max-width sections with generous vertical rhythm (80–120px between sections). Card grids appear for features and extensions — 3-column for compact tiles, 2-column for wider feature blocks. Section rhythm is consistent: dark-on-dark bands with hairline dividers, no alternating light/dark sections. Navigation is a single floating glass bar; no sidebar, no mega-menu. The overall density is spacious — the system prefers one strong typographic statement per section over dense information layout.

## Agent Prompt Guide

Quick Color Reference:
- text primary: #ffffff
- text secondary: #9c9c9d
- text muted: #6a6b6c
- background: #040506
- card surface: #07080a
- border: #363739
- brand accent: #ff6363
- primary action: #e6e6e6 (filled action)

Example Component Prompts:

1. Glass Navigation Bar: Floating pill nav with backdrop-filter blur(48px), 1px solid #363739 border, 8px radius, transparent dark fill. Left: red diamond logo (#ff6363) + 'Raycast' wordmark in #ffffff at 13px Inter 500. Center: ghost nav links in #9c9c9d at 13px Inter 500 (Store, Pro, AI, iOS, Windows, Teams, Enterprise, Blog, Pricing) with no padding. Right: neutral filled button — Mist #e6e6e6 fill, Iron #454647 text 'Download' at 13px/500, 8px radius, 8px 12px padding, with a 15px Apple icon.

2. Hero Section: Full-bleed dark (#040506) background. Centered headline 'Your shortcut to everything.' at 56px Inter 400, #ffffff, letter-spacing 0.22px. Subheadline at 16px Inter 400, #9c9c9d, max-width ~480px. Behind the text: large abstract red/blue gradient composition — diagonal coral (#ff6363 with 40px blur) bars cutting across, blue radial gradient wash (rgba(4,63,150,0.7) to rgba(6,18,37,0.25)) at 50% 26%. Below: two neutral filled buttons side by side (Mist fill, Iron text) with Apple/Windows icons, then a Geist Mono 12px footer line: 'v1.104.21 | macOS 13+ | Install via homebrew' in #6a6b6c.

3. Feature Card: 16px radius, transparent fill on #07080a card surface, 24px padding. Apply the 'key' shadow stack: rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset. Inside: 99999px-radius circular icon container (20px padding, dark fill) with a 24px SF Pro Text glyph in #e6e6e6, then a 20px Inter 500 subheading in #ffffff, then 16px Inter 400 body in #9c9c9d.

4. Extension Tile: 8px radius, 8px padding, 1px solid #363739 border. Circular icon container (99999px) with extension icon, extension name in 14px Inter 500 #ffffff, category in 12px Inter 400 #6a6b6c. Tight 8px gap between tiles in a grid.

5. Download Button Group: Two neutral filled buttons side by side with 8px gap. Each: Mist #e6e6e6 fill, Iron #454647 text at 13px Inter 500, 8px radius, 8px 12px padding. Left button: 15px black Apple icon + 'Download for Mac'. Right button: 15px Windows icon + 'Download for Windows (beta)'. Below: Geist Mono 12px version metadata in #6a6b6c, centered.

## Similar Brands

- **Linear** — Same dark-near-black canvas with single-hue accent strategy, same Inter-based typography, same restrained component library with hairline borders instead of heavy shadows
- **Vercel** — Same full-bleed dark hero with gradient/geometric backdrop, same max-width contained content sections below, same neutral filled button approach against dark surfaces
- **Arc Browser** — Same dramatic colored hero artwork on a dark canvas, same coral/warm accent that punctuates an otherwise achromatic system, same browser/product-as-artifact aesthetic
- **Cron (Notion Calendar)** — Same dark product-site language with clean Inter type, same hairline-bordered feature cards, same minimal navigation over atmospheric hero
- **Tana** — Same power-user productivity tool positioning with dark UI, same tight typographic scale, same use of subtle warm accents against near-black backgrounds

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-void-black: #040506;
  --color-ink: #07080a;
  --color-obsidian: #111214;
  --color-graphite: #1b1c1e;
  --color-smoke: #6a6b6c;
  --color-ash: #9c9c9d;
  --color-mist: #e6e6e6;
  --color-iron: #454647;
  --color-slate: #2f3031;
  --color-pure-white: #ffffff;
  --color-coral-pulse: #ff6363;
  --color-ember-hush: #452324;
  --color-electric-sky: #63a1ff;
  --color-cobalt-edge: #143ca3;
  --color-deep-space: #02193b;
  --color-info-blue: #56c2ff;
  --color-success-green: #59d499;

  /* Typography — Font Families */
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-geistmono: 'GeistMono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-sf-pro-text: 'SF Pro Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sf-pro: 'SF Pro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-eyebrow: 11px;
  --leading-eyebrow: 0.91;
  --tracking-eyebrow: 0.8px;
  --text-body: 16px;
  --leading-body: 1.15;
  --tracking-body: 0px;
  --text-body-lg: 18px;
  --leading-body-lg: 1.15;
  --tracking-body-lg: 0px;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: 0.2px;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.15;
  --tracking-heading-sm: 0px;
  --text-heading: 32px;
  --leading-heading: 1.15;
  --tracking-heading: 0px;
  --text-heading-lg: 56px;
  --leading-heading-lg: 1.17;
  --tracking-heading-lg: 0.22px;
  --text-display: 64px;
  --leading-display: 1.1;
  --tracking-display: 0px;

  /* Typography — Weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 8px;
  --spacing-8: 8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-96: 96px;
  --spacing-120: 120px;
  --spacing-224: 224px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 80-120px;
  --card-padding: 24px;
  --element-gap: 8-16px;

  /* Border Radius */
  --radius-lg: 8px;
  --radius-lg-2: 11px;
  --radius-2xl: 16px;
  --radius-2xl-2: 20px;
  --radius-3xl: 31px;
  --radius-3xl-2: 36px;
  --radius-3xl-3: 43px;
  --radius-full: 86px;
  --radius-full-2: 1000px;
  --radius-full-3: 9999px;
  --radius-full-4: 99999px;

  /* Named Radii */
  --radius-cards: 16px;
  --radius-pills: 9999px;
  --radius-badges: 6px;
  --radius-inputs: 8px;
  --radius-buttons: 8px;
  --radius-largecards: 20px;
  --radius-iconcontainers: 99999px;

  /* Shadows */
  --shadow-subtle: rgba(0, 0, 0, 0.4) 0px 1.5px 0.5px 2.5px, rgb(0, 0, 0) 0px 0px 0.5px 1px, rgba(0, 0, 0, 0.25) 0px 2px 1px 1px inset, rgba(255, 255, 255, 0.2) 0px 1px 1px 1px inset;
  --shadow-subtle-2: rgb(27, 28, 30) 0px 0px 0px 1px, rgb(7, 8, 10) 0px 0px 0px 1px inset;
  --shadow-lg: rgba(215, 201, 175, 0.05) 0px 0px 20px 5px, rgba(215, 201, 175, 0.05) 0px 0px 16px -7px;
  --shadow-subtle-3: rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset, rgba(255, 255, 255, 0.25) 0px 0px 0px 1px, rgba(0, 0, 0, 0.2) 0px -1px 0px 0px inset;
  --shadow-subtle-4: rgba(0, 0, 0, 0.03) 0px 7px 3px 0px, rgba(0, 0, 0, 0.25) 0px 4px 4px 0px;
  --shadow-subtle-5: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset;
  --shadow-xl: rgba(0, 0, 0, 0.4) 0px 4px 40px 8px, rgba(0, 0, 0, 0.8) 0px 0px 0px 0.5px, rgba(255, 255, 255, 0.3) 0px 0.5px 0px 0px inset;
  --shadow-subtle-6: rgba(255, 255, 255, 0.15) 0px 1px 1px 0px inset;
  --shadow-sm: rgba(0, 0, 0, 0.25) 0px 4px 4px 0px;
  --shadow-subtle-7: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.4) 0px 30px 50px 0px, rgba(3, 15, 129, 0.09) 0px 4px 24px 0px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;
  --shadow-xl-2: rgba(255, 255, 255, 0.03) 0px 0px 40px 20px, rgba(255, 255, 255, 0.3) 0px 0.5px 0px 0px inset;
  --shadow-subtle-8: rgba(255, 255, 255, 0.19) 0px 0px 2px 0px, rgba(255, 255, 255, 0.1) 0px 0.5px 0px 0px inset;
  --shadow-subtle-9: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(7, 13, 79, 0.1) 0px 0px 20px 3px, rgba(85, 0, 98, 0.1) 0px 0px 40px 20px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;
  --shadow-subtle-10: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.4) 0px 30px 50px 0px, rgba(51, 3, 129, 0.09) 0px 4px 24px 0px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;
  --shadow-subtle-11: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(7, 13, 79, 0.1) 0px 0px 20px 3px, rgba(7, 40, 79, 0.1) 0px 0px 40px 20px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;

  /* Surfaces */
  --surface-canvas: #040506;
  --surface-card: #07080a;
  --surface-recessed: #111214;
  --surface-badge: #1b1c1;
  --surface-accent-tint: #452324;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-void-black: #040506;
  --color-ink: #07080a;
  --color-obsidian: #111214;
  --color-graphite: #1b1c1e;
  --color-smoke: #6a6b6c;
  --color-ash: #9c9c9d;
  --color-mist: #e6e6e6;
  --color-iron: #454647;
  --color-slate: #2f3031;
  --color-pure-white: #ffffff;
  --color-coral-pulse: #ff6363;
  --color-ember-hush: #452324;
  --color-electric-sky: #63a1ff;
  --color-cobalt-edge: #143ca3;
  --color-deep-space: #02193b;
  --color-info-blue: #56c2ff;
  --color-success-green: #59d499;

  /* Typography */
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-geistmono: 'GeistMono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-sf-pro-text: 'SF Pro Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sf-pro: 'SF Pro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-eyebrow: 11px;
  --leading-eyebrow: 0.91;
  --tracking-eyebrow: 0.8px;
  --text-body: 16px;
  --leading-body: 1.15;
  --tracking-body: 0px;
  --text-body-lg: 18px;
  --leading-body-lg: 1.15;
  --tracking-body-lg: 0px;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: 0.2px;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.15;
  --tracking-heading-sm: 0px;
  --text-heading: 32px;
  --leading-heading: 1.15;
  --tracking-heading: 0px;
  --text-heading-lg: 56px;
  --leading-heading-lg: 1.17;
  --tracking-heading-lg: 0.22px;
  --text-display: 64px;
  --leading-display: 1.1;
  --tracking-display: 0px;

  /* Spacing */
  --spacing-8: 8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-96: 96px;
  --spacing-120: 120px;
  --spacing-224: 224px;

  /* Border Radius */
  --radius-lg: 8px;
  --radius-lg-2: 11px;
  --radius-2xl: 16px;
  --radius-2xl-2: 20px;
  --radius-3xl: 31px;
  --radius-3xl-2: 36px;
  --radius-3xl-3: 43px;
  --radius-full: 86px;
  --radius-full-2: 1000px;
  --radius-full-3: 9999px;
  --radius-full-4: 99999px;

  /* Shadows */
  --shadow-subtle: rgba(0, 0, 0, 0.4) 0px 1.5px 0.5px 2.5px, rgb(0, 0, 0) 0px 0px 0.5px 1px, rgba(0, 0, 0, 0.25) 0px 2px 1px 1px inset, rgba(255, 255, 255, 0.2) 0px 1px 1px 1px inset;
  --shadow-subtle-2: rgb(27, 28, 30) 0px 0px 0px 1px, rgb(7, 8, 10) 0px 0px 0px 1px inset;
  --shadow-lg: rgba(215, 201, 175, 0.05) 0px 0px 20px 5px, rgba(215, 201, 175, 0.05) 0px 0px 16px -7px;
  --shadow-subtle-3: rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset, rgba(255, 255, 255, 0.25) 0px 0px 0px 1px, rgba(0, 0, 0, 0.2) 0px -1px 0px 0px inset;
  --shadow-subtle-4: rgba(0, 0, 0, 0.03) 0px 7px 3px 0px, rgba(0, 0, 0, 0.25) 0px 4px 4px 0px;
  --shadow-subtle-5: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset;
  --shadow-xl: rgba(0, 0, 0, 0.4) 0px 4px 40px 8px, rgba(0, 0, 0, 0.8) 0px 0px 0px 0.5px, rgba(255, 255, 255, 0.3) 0px 0.5px 0px 0px inset;
  --shadow-subtle-6: rgba(255, 255, 255, 0.15) 0px 1px 1px 0px inset;
  --shadow-sm: rgba(0, 0, 0, 0.25) 0px 4px 4px 0px;
  --shadow-subtle-7: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.4) 0px 30px 50px 0px, rgba(3, 15, 129, 0.09) 0px 4px 24px 0px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;
  --shadow-xl-2: rgba(255, 255, 255, 0.03) 0px 0px 40px 20px, rgba(255, 255, 255, 0.3) 0px 0.5px 0px 0px inset;
  --shadow-subtle-8: rgba(255, 255, 255, 0.19) 0px 0px 2px 0px, rgba(255, 255, 255, 0.1) 0px 0.5px 0px 0px inset;
  --shadow-subtle-9: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(7, 13, 79, 0.1) 0px 0px 20px 3px, rgba(85, 0, 98, 0.1) 0px 0px 40px 20px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;
  --shadow-subtle-10: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.4) 0px 30px 50px 0px, rgba(51, 3, 129, 0.09) 0px 4px 24px 0px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;
  --shadow-subtle-11: rgba(255, 255, 255, 0.1) 0px 1px 0px 0px inset, rgba(7, 13, 79, 0.1) 0px 0px 20px 3px, rgba(7, 40, 79, 0.1) 0px 0px 40px 20px, rgba(255, 255, 255, 0.06) 0px 0px 0px 1px inset;
}
```
