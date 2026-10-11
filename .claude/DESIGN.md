# Bin-It Design Reference: Daylight
> Warm paper, frosted glass, dot-matrix numerals

**Theme:** light. Daylight is the design for the whole project: the staff dashboard, the landing page, the legal pages and the 404 page are all built on it, and every new page follows it. The earlier dark Raycast-derived guide ("Midnight") has been retired; it lives in git history only.

Source: the Daylight canvas (Queue, Ticket, Bins, Scenario, Components and states, Tokens and rules) designed in Claude Design on 2026-10-11, ported to `apps/web`. The marketing pages were then carried over with the same tokens. Where this file and the code disagree, the code wins and this file gets fixed in the same change.

## Daylight guide (read this first)

Daylight reads as a daylight instrument panel: a warm paper ground, frosted rounded cards floating on it, pill-shaped controls, and one dark charcoal accent reserved for the single action and the result that matters. Color is rationed: sun yellow means selected or gained, coral means brand, new or error, and the map keeps its own data colors. Dots carry quantity (LED severity, dot bars, a dot gauge, dot-matrix numerals), which is the Nothing-style signature. Nothing is square: the smallest radius in the system is 18 px and controls are pills.

### Scope

| Surface | Style |
| --- | --- |
| Staff dashboard `/dashboard` | Daylight. Reference implementation: `apps/web/components/Dashboard.tsx` plus `components/dash/` |
| Landing page `/`, `/privacy`, `/terms`, the 404 page | Daylight (marketing and prose recipes below): `app/page.tsx`, `components/site/`, `components/landing/` |
| Any new web page | Daylight |
| Mobile app (`apps/mobile`) | Its own theme (`lib/theme.ts`); this guide does not apply |

Every page is light, whatever the OS theme: `.daylight` sets `color-scheme: light`. There is no dark variant. Do not add one without asking.

### Tokens (defined in `apps/web/app/globals.css`, use the Tailwind names)

| Tailwind name | Value | Use |
| --- | --- | --- |
| `paper`, `paper-warm`, `paper-sun` | `#E9E8E3`, `#F1EEE3`, `#F8EEBC` | The ground: a 135 degree gradient, applied by the `.daylight` class (never set per component) |
| `bg-glass` | white 74% | Cards in the side panel (with `backdrop-blur-[24px]`) |
| `bg-glass-strong` | white 86% | Tab bar, detail card, legend, menus |
| `bg-well` | `rgb(60 52 28 / 6%)` | Recessed tiles, tracks, quiet icon buttons |
| `border-rim` | `rgb(60 52 28 / 14%)` | The only hairline: outlined pills, selects, icon-button rings |
| `bg-led-off` | `rgb(60 52 28 / 16%)` | Empty LED dots |
| `text-strong` | `#1E1D1A` | Headings, values, row titles |
| `text-soft` | `#57544C` | Body copy, meta, inactive tabs |
| `text-quiet` | `#6E6B62` | Eyebrows, captions, counts on inactive tabs |
| `bg-charcoal`, `bg-charcoal-raised` | `#2A2926`, `#3B3A36` | The primary pill and its hover, the active tab, the result card |
| `text-on-charcoal`, `text-on-charcoal-quiet` | `#F6F3EA`, `#BDB9AC` | Text on charcoal (tooltips included) |
| `bg-sun` | `#F6C944` | Selection and estimated gain: the count chip, slider fill, "added" dots |
| `bg-sun-wash` | `#FCEFC2` | Selected row, reviewed status, staff-key chip |
| `sun-deep`, `text-sun-ink` | `#C99410`, `#4A3C0B` | Outline on sun dots, text on sun-wash |
| `coral-pulse` | `#FF6363` | Brand dot, "new since last poll" dot, error icon. Never text |
| `bg-coral-wash`, `text-coral-ink` | `#FFE7E3`, `#B8322B` | Error surface and error text |
| `moss`, `bg-moss-wash` | `#1F7A4F`, `#DDF2E4` | Improvements only (deltas, resolved status) |
| `success-green` | `#59D499` | The "Live" health dot only |
| `text-pink-ink` | `#9C1D5E` | Text on the under-reported badge (the badge outline is the map's `#E7298A`) |

Map data colors are not UI tokens and do not change: severity, risk ramp, under-reported outline, bins and sites live in `lib/labels.ts`. The UI reuses them where it points at the map: LED dots use the severity colors, rank badges use the site green (`#166534`), the legend and Layers menu draw the same swatches.

The older dark tokens (`void-black`, `ink`, `obsidian`, `graphite`, `smoke`, `ash`, `mist`, `iron`, `ember-hush`, `rc-border` and friends) were removed from `globals.css`; do not bring them back.

No text in sun or coral on a light surface. Use `text-soft`, `text-quiet` or `text-coral-ink`.

### Type

| Face | Class | Use |
| --- | --- | --- |
| Manrope 400 to 800 | `font-ui` (set on every page root) | Everything readable |
| Doto 700, round dots (`ROND` 100) | `.dot-num` | Numerals only: summary counts, slider value, result figures, ticket report count, the landing stats and the 404, plus the wordmark. 128 down to 22 px |
| Geist Mono 400 to 500 | `font-mono` | Eyebrows, chips, tile labels, footnote |

| Role | Size and weight |
| --- | --- |
| Detail title | 21 px / 800, tracking -0.01em |
| Row title | 15 px / 700 |
| Body | 13.5 to 14 px / 500, line height 1.5 |
| Meta | 12.5 px / 500, `text-soft` |
| Eyebrow | mono 11 px uppercase, tracking 0.08em, `text-quiet` (`eyebrow` in `dash/ui.tsx`) |
| Tile label | mono 10.5 px uppercase (`tileLabel`) |
| Chip | mono 10 px uppercase, tracking 0.07em |
| Footnote | mono 11 px, line height 1.55 |

Doto is for digits and the wordmark. Do not set sentences in it. Its percent sign reads like an X, so the unit is set beside the numeral in Manrope.

### Shape, spacing, elevation

| Token | Value | Use |
| --- | --- | --- |
| `rounded-full` | 999 px | Every control: buttons, tabs, selects, chips, inputs, the city group |
| `rounded-map` | 32 px | The map card |
| `rounded-card` | 28 px | Panel cards, the charcoal result card, the assumptions notice |
| `rounded-float` | 26 px | Legend, Layers menu |
| `rounded-row` | 22 px | List rows |
| `rounded-tile` | 20 px | Fact tiles inside a card |
| `rounded-thumb` | 18 px | Photo thumbnails |

Spacing: page padding 16 px, gap 12 px between panel cards, gap 16 px between map and panel. Separate cards with the gap, never with a border.

| Shadow | Use |
| --- | --- |
| `shadow-card` | Panel cards |
| `shadow-float` | Tab bar, legend, map controls |
| `shadow-pop` | Menus |
| `shadow-bar` | Header pills (city group, Layers, chips) |
| `shadow-primary` | Charcoal pills, the active tab |
| `shadow-charcoal` | The result card |

The large shadows have a negative spread so they fall below the surface, which keeps a scrolling column from clipping them. Glass surfaces carry a 1 px white inset highlight.

### Dot language

| Motif | Where | Rule |
| --- | --- | --- |
| LED meter (`Led`) | Severity | Three dots, filled count = severity, filled in the pin color. Always next to the word. `onDark` for dark chips |
| Dot bar (`DotBar`) | Estimated gain in the Bins list | 14 dots at 8 px, scaled to the best site. Always beside the number |
| Dot gauge (`DotGauge`) | Coverage in the Scenario result | 31 dots over 180 degrees. Charcoal = now, sun = estimated gain, faint = uncovered |
| Dot numerals (`.dot-num`) | Counts to land the eye on | Zero-padded to two digits in the queue summary |
| Dotted rule | Dividers inside cards | 2 px dotted `border-rim` |
| Dot grid (`.dot-grid`) | Charcoal cards only: the Scenario result card, the landing what-if card and closing call to action | 10 px pitch, white at 10% |
| Hex-dot mark (`HexMark`) | Logo | Six dots round a coral center: a map cell with one thing flagged |
| Dotted outline | `Demo data` chip, empty blocks | Dotted = illustrative. Dashed = a caveat or something needing input |

Dots carry meaning. Do not use them as decoration alone.

### Components

Shared building blocks: `components/dash/ui.tsx` (class recipes `card`, `float`, `tile`, `eyebrow`, `btnPrimary`, `btnSecondary`, `btnGhost`, `iconBtn`, `selectPill`, `inputPill`; `Segmented`, `Led`, `DotBar`, `DotGauge`) and `components/dash/icons.tsx` (stroke icons, `HexMark`, `HexOutline`, `DotSpinner`). Use them instead of repeating class strings.

| Component | Recipe |
| --- | --- |
| Primary button | `btnPrimary`: 48 px pill, charcoal, white 14 px / 700, optional sun disc with the icon at the left. One per view |
| Secondary button | `btnSecondary`: 40 px pill, white 85%, `border-rim` |
| Ghost button | `btnGhost`: no fill, `text-soft`, `bg-well` on hover |
| Icon button | `iconBtn`: 44 px circle on `bg-well`; the close button is a 38 px circle with `border-rim`. Always an `aria-label` |
| Segmented group | `Segmented` / `CitySwitcher`: pill group, selected = charcoal pill with white text. City names up to 4, more becomes a select pill. Status is the same group on a white track |
| Tab bar | Sticky pill at the top of the panel: hide-panel circle, then Queue, Bins, Scenario. The active tab is a charcoal pill that slides (`layoutId`) and carries a sun count chip |
| Select | `selectPill` inside a `relative` label with a chevron |
| Chip | Pill, mono 10 px uppercase. `Demo data` dotted, `Cold-start model` dashed with a sun dot, `Under-reported area` pink dashed, `Mock API data` on `bg-well`, `Cached data` on `bg-sun-wash` |
| Status pill | Received = hollow dot on a `border-rim` outline, Reviewed = sun dot on `bg-sun-wash`, Resolved = moss dot on `bg-moss-wash` |
| Summary card | Three dot numerals (in queue, high severity, reports merged) over a dotted rule. Shown only while nothing is selected; the detail card replaces it |
| List row | 22 px radius, 56 px thumbnail, title + `Demo data`, LED + severity + count + time, status pill. Selected = `bg-sun-wash` with a 1.5 px `sun-deep` ring. A coral dot on the thumbnail marks a new ticket |
| Detail card | `bg-glass-strong`, eyebrow + 21 px title + close, photo with overlay chips, 2 x 2 fact tiles, status group, Street View pill |
| Result cards | Coverage: white card with the dot gauge, a delta chip and a legend. Distance: charcoal card, dot grid, dot numeral, two dot bars. Both say "estimated" |
| Notice | `Assumptions`: sun at 20% with a dotted `sun-deep` border, dot bullets. Use for caveats and "estimates, not measurements" |
| Legend | Frosted float bottom-left of the map, one entry per visible layer, colors from `lib/labels.ts`. Collapses to a pill |
| Map controls | MapLibre zoom group as a vertical pill, attribution as a glass pill (CSS overrides under `.daylight` in `globals.css`) |
| Map hover card | `components/map/ReportHoverCard.tsx`: shown while the pointer is over a report pin. A `bg-glass-strong` float (`rounded-float`, `shadow-pop`) with a rounded photo, label and `Demo data` chip, LED severity, status, report count and last seen. Pointer-events off, kept inside the map box |
| Tooltip | `components/ui/tooltip-card.tsx`: charcoal, `text-on-charcoal` 12.5 px, follows the pointer. Use it for any explanation instead of `title=` |

### Dashboard layout

Root `.daylight` is a flex column with `p-4 gap-3`: header, main row, footer. The main row (`gap-4`) is the map card on the left, in the same place as before, and a 340 to 464 px side panel on the right (`clamp(340px,34vw,464px)`). The panel is a scrolling column of cards with the tab bar pinned. Below 700 px wide the map sits on top (55vh) and the page scrolls. The header wraps to two rows on a phone (brand and status chips, then city and layers) and the chips keep only their icons. The footer is a glass strip that states the estimate caveats (see Content rules).

### States

| State | Treatment |
| --- | --- |
| Loading | `Loading`: dot spinner (8 dots, steps) in a `bg-well` block. Static under reduced motion |
| Empty | `Empty`: dotted block with a bin icon, one sentence, and an action when there is one (clear filters) |
| Error and warning | `ErrorRetry`: `bg-coral-wash`, coral ring, coral disc with "!", message in dark red, Retry pill |
| Health | Dot + word, never color alone: Live (green), Degraded (amber), Offline (coral), Checking (hollow). Cached data is a sun chip |
| Staff key | Not set = dashed pill, entering = input + Save, set = chip with a clear button, rejected = coral ring and an inline message |
| Photo missing | Sand halftone with a bin icon (`Thumb`) |

### Motion

Calm. The tab pill slides, the detail card eases in, the Layers chevron turns. Nothing bounces or autoplays. The only loop is the loading spinner, and it stops under `prefers-reduced-motion`. Hover is a color change, never a scale or translate.

### Accessibility (measured)

On the glass surfaces (WCAG contrast): `text-strong` 16:1, `text-soft` 7.2:1, `text-quiet` 5.1:1. White on charcoal 14.6:1, `text-on-charcoal-quiet` on charcoal 7.4:1, `text-strong` on sun 10.7:1, `text-quiet` on sun-wash 4.6:1, `text-coral-ink` on coral-wash 5.0:1, moss text on moss-wash 6.6:1, `text-pink-ink` on white 7.6:1.

Known gap: the "Low" LED dot (`#FDAE61`) is 1.8:1 on glass, and sun on glass is 1.5:1. That is why color is never the only cue: LED dots sit next to the word and the dot count, the selected row also has a ring, and health states carry a word. Keep it that way. Every control is a real `button`, `a` or `input`; focus is a 2 px charcoal outline (`.daylight :focus-visible`); icon-only buttons have an `aria-label`.

### Content rules (project, not visual)

- Say "estimate" for every projected number and show assumptions (150 m threshold, Orlando model transferred from NYC and Chicago, lightly validated).
- Seeded or illustrative figures are labeled "Demo data" and never presented as real. The summary card shows the badge when every ticket is synthetic.
- Only claim numbers that exist in our data. If a number changes with a data reload, say where it comes from.
- Privacy: no accounts, no names, no photos with faces or plates.
- One idea per card; plain language; no superlatives.

### Do and don't

Do: use the tokens and `components/dash/ui.tsx` recipes; keep one charcoal primary per view; pair every color with a word, a dot count or an outline; keep the map's data colors exactly as in `lib/labels.ts`; add new tokens to `globals.css` instead of hardcoding hex.

Don't: add black panels (the only dark surfaces are the active tab, the primary pill, the tooltip, the result card and the landing page's closing call to action); use square corners or radii under 18 px on a surface (controls are pills); use hard borders to separate cards; put sun or coral on text; add a new accent hue; animate dots; set sentences in Doto.

### Marketing and prose pages

Same tokens, same root (`daylight font-ui antialiased` on the page's outer element, `min-h-dvh` flex column). Recipes:

| Part | Recipe |
| --- | --- |
| Nav | `SiteNav`: fixed glass pill (`bg-glass-strong shadow-float`), hex-dot mark and Doto wordmark at the left, anchor links in `text-soft`, one charcoal "Open dashboard" pill at the right |
| Footer | `SiteFooter`: a mono 12 px meta strip on a white 55% pill, items separated by dots: `© year Bin-It · Privacy · Terms · Dashboard` |
| Hero | Paper ground, one blurred sun shape behind the headline, a faint charcoal dot grid masked toward the center. Eyebrow chip (dashed, sun dot), 60 px / 800 headline with one phrase on a sun highlight (text stays `text-strong`), 17 px `text-soft` paragraph, primary charcoal pill plus a white secondary pill, mono meta line |
| Product window | `ProductWindow`: a miniature of the real dashboard (city group, tabs, map card, ranked sites, charcoal what-if card) on `bg-glass`, `rounded-map`. Captioned as illustrative |
| Hex art | `HexGrid`: the map's blue risk ramp at 62%, pink dashed rings for under-reported cells, white discs with a green ring for ranked sites. Always on a `#f4f0e8` basemap-colored frame and captioned "illustrative" |
| Section | Mono eyebrow, then a 32 px / 800 heading (`max-w-2xl`), then cards. `py-24` between sections, content `max-w-[1200px] px-6`. Scroll-triggered `FadeContent` is the only entrance motion |
| Feature card | `SpotlightCard`: `rounded-card bg-glass shadow-card`, `p-6`, mono eyebrow, 24 px / 800 title, `text-soft` body. A neutral white highlight follows the cursor |
| Stat card | One glass card, four dot-numeral cells split by dotted rules. 46 px numerals (30 px on a phone), 14 px `text-soft` label |
| City tile | Glass card with a `HexGrid` thumbnail in a 22 px frame, name, and a chip: sun-wash for the home city, `bg-well` for ported ones |
| Notice | Estimates and caveats: `bg-sun/20` with a dotted `sun-deep` border, 16 px / 800 title, 14 px body (same as the Scenario assumptions) |
| Closing call to action | The charcoal card with the dot grid, white 32 px / 800 heading and a sun pill button. This is the one place a button is sun, because a charcoal button would vanish |
| Prose page | `ProsePage` / `ProseSection`: nav, one glass card (`max-w-3xl`) with a "← Home" pill, mono eyebrow, 40 / 56 px title, a quiet note, sections split by 2 px dotted rules (20 px / 800 heading, 16 px `text-soft` body at 1.65). Emphasis is `Em` (strong ink); links are `ProseLink` (ink with a sun underline) |
| 404 | Paper ground and sun glow, the hex-dot mark, a 128 px dot-matrix "404", a 34 px headline with "empty" on a sun highlight, primary and secondary pills |

On a phone the nav keeps the mark, wordmark and button (anchor links hide below `sm`), the bento and city grids go to one column, and the stat card to two columns.

### Maintenance

When a new pattern is needed (form, table, chart), build it from the tokens above, add its recipe to Components, and note it here in the same change. Reference implementation files: `apps/web/components/Dashboard.tsx`, `apps/web/components/dash/*`, `apps/web/components/panel/*`, `apps/web/components/site/*`, `apps/web/components/landing/*`, `apps/web/app/globals.css`.
