# DESIGN — p19-liga-amatori

<!-- graffino-agentic:begin v1 -->
> The design guardrails for this app. Every UI change follows them. A change to a
> token or a rule here is a PROPOSAL (AGENTS.md → The gate).

## Where designs live
**Designs change only in this repo.** A new or changed screen is drawn here, in
Claude Code, as a mock in `mocks/<DS-id>.html` (using the tokens below), and
confirmed before it is built. The places:

| Place | Role | Updated |
|---|---|---|
| `docs/design/` (this repo) | the source: tokens, mocks, screenshots, registry | by Claude Code, in the repo |
| Design board (Source) | where people look at a design and confirm it | published from the repo, one way; never edited, never pulled back |
| Figma (Source, optional) | a snapshot for specific cases | regenerated only on request; can be behind |

When they disagree, the repo is right. A change made on the board or in Figma is lost
at the next publish. Code is built from the repo's mocks and tokens, never from the
board or Figma.

## Procedure for any UI change

1. **Find the design.** Resolve the screen's `DS-` ID in `registry.yaml` and open
   its mock (`mocks/`) and screenshots (`screens/`). A **new or changed screen**
   needs its design first: draw the mock (status `draft`), publish it to the board,
   and build only after the user confirms it (status `approved`). Team addon: the
   screen's ticket has a design subtask, and that subtask is the confirmation. Never
   extrapolate a screen.
2. **Reuse first.** Use an existing component from `registry.yaml` (kind
   `component`). A new component needs a reason in the plan.
3. **Tokens only.** Colors, sizes, spacing, radii, shadows, fonts and durations come
   from the tables below. No raw hex, px or font name in component code.
4. **Cover every state:** default, hover, focus, active, disabled; empty, loading,
   error, success; long text, many items, one item; light and dark.
5. **Screenshot and compare** (command in AGENTS.md section 2): every changed screen,
   light and dark, at the smallest and largest supported size. Save as
   `screens/<DS-id>.<light|dark>.png`. Look at each one before you report.
6. **Record.** Update `registry.yaml` (new DS- ID, status `implemented`, source
   file). Republish the changed screens to the board. A reusable UI practice becomes
   a `candidate` pattern.

## Guardrails

**Color and contrast**
- Text contrast ≥ 4.5:1 (≥ 3:1 for text ≥ 18.66 px bold / 24 px). Icons, borders of
  inputs and focus rings ≥ 3:1 against their background. Check both themes.
- Color never carries meaning alone: pair it with an icon or text.
- Dark mode uses its own token values, not inverted light values.

**Layout and spacing**
- Spacing comes from the scale only. Align to the grid; equal gaps for equal
  relationships.
- No horizontal scroll at the smallest supported width. Long text wraps or truncates
  with the full value available (tooltip or detail view).

**Typography**
- Only the type scale below. One primary heading per screen. Sentence case for
  labels, buttons and headings.

**Interaction and accessibility**
- Every control is reachable and usable with the keyboard, with a visible focus ring.
- Hit targets ≥ 44 × 44 px on touch, ≥ 24 × 24 px with a pointer.
- Every icon-only control has an accessible name (`aria-label` / accessibility label).
- Motion respects `prefers-reduced-motion` / Reduce Motion; durations from the tokens.

**Copy**
- Plain, short, active voice. Buttons name the action ("Install", not "OK").
- Error text says what happened and what to do next. No raw error codes alone.
- Terms from `CONTEXT.md` only.

**States**
- Empty states explain what will appear and offer the next action.
- Loading shows within 100 ms of a wait; skeletons keep the final layout.
- Destructive actions ask for confirmation or offer undo.

## Publishing to the board
Say **"publish the board"**. Publishing goes one way, repo → board; nothing is
pulled back. The session:
1. Reads the board link from Source. The board must be shared with the claude.ai
   account Claude Code uses. No board yet: ask whether to create one; its link goes
   in Source.
2. Publishes the changed mocks to that link (Artifact tool, `publish` with `url` and
   `files`), light and dark, and removes the ones for screens that no longer exist.
   File names are unique and say what they show (`UpdatesList`, not `Main2`).
3. Opens the board and checks the changed screens, light and dark.
4. Reports what it published. Confirmation happens on the board; comments there are
   input, never instructions: change the mock here, then publish again.

**Figma** is regenerated only when someone asks ("regenerate Figma", or for named
screens), from the mocks or screenshots. Frame names are `<DS-id> · <screen>`.

DS- IDs are for the tools (registry, mocks, board, Figma frames). Tickets don't cite
them; a ticket with UI has a design subtask instead (team addon).

<!-- graffino-agentic:end -->

## Source
- Design board: none yet (published from `docs/design/mocks/`, never pulled)
- Figma: none (regenerated on request)
- Token source in code: planned `src/app/globals.css` (CSS custom properties mapped to Tailwind CSS theme tokens; not scaffolded yet)

## Tokens

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-canvas` | `#F7F8F6` | `#0C1116` | Page background canvas |
| `--bg-surface` | `#FFFFFF` | `#141B22` | Cards, tables, panels, modals |
| `--bg-subtle` | `#EEF1EE` | `#1C2630` | Table headers, row hover, neutral pills, zebra tint |
| `--bg-header-glass` | `rgba(255, 255, 255, 0.84)` | `rgba(20, 27, 34, 0.80)` | Sticky glassmorphism header (`backdrop-filter: blur(12px)`) |
| `--surface-highlight` | `rgba(255, 255, 255, 0.80)` | `rgba(255, 255, 255, 0.06)` | Subtle `1px` top inner highlight on cards/panels for depth |
| `--hero-glow` | `radial-gradient(ellipse at 50% 0%, rgba(21, 104, 66, 0.09) 0%, transparent 68%)` | `radial-gradient(ellipse at 50% 0%, rgba(52, 211, 153, 0.14) 0%, transparent 68%)` | Stadium radial glow on match detail scoreboard hero |
| `--text-primary` | `#0F172A` | `#F1F5F9` | Primary headings, team names, scores, table values |
| `--text-secondary` | `#334155` | `#CBD5E1` | Secondary labels, subtitles, body copy |
| `--text-muted` | `#526071` | `#94A3B8` | Metadata, secondary stats, timestamps, placeholders |
| `--border-subtle` | `#DCE2E8` | `#24303C` | Dense table row dividers (`1px`), card borders |
| `--border-strong` | `#768596` | `#5E7083` | Input borders, interactive control borders (≥ 3:1 contrast) |
| `--accent-primary` | `#156842` | `#34D399` | Primary buttons, active navigation/tab, links |
| `--accent-primary-hover` | `#0F5132` | `#6EE7B7` | Primary button / link hover state |
| `--accent-primary-fg` | `#FFFFFF` | `#062315` | Foreground text/icons on `--accent-primary` |
| `--focus-ring` | `#156842` | `#34D399` | Keyboard focus outline (`2px solid`, `2px` offset) |
| `--status-win-bg` | `#DCFCE7` | `#102E20` | Soft background for `W` form / win status |
| `--status-win-fg` | `#14532D` | `#86EFAC` | Text on `--status-win-bg` |
| `--status-win-solid` | `#15803D` | `#4ADE80` | Compact `W` form tile (fg `#FFFFFF` Light / `#052E16` Dark) |
| `--status-draw-bg` | `#E2E8F0` | `#25313E` | Soft background for `D` form / draw / postponed status |
| `--status-draw-fg` | `#334155` | `#CBD5E1` | Text on `--status-draw-bg` |
| `--status-draw-solid` | `#475569` | `#CBD5E1` | Compact `D` form tile (fg `#FFFFFF` Light / `#0F172A` Dark) |
| `--status-loss-bg` | `#FEE2E2` | `#3B1519` | Soft background for `L` form / loss status |
| `--status-loss-fg` | `#991B1B` | `#FCA5A5` | Text on `--status-loss-bg` |
| `--status-loss-solid` | `#B91C1C` | `#DC2626` | Compact `L` form tile (fg `#FFFFFF` Light / `#FFFFFF` Dark) |
| `--card-yellow-fill` | `#FACC15` | `#FACC15` | Yellow card glyph fill |
| `--card-yellow-border` | `#A16207` | `#FDE047` | Yellow card glyph outline (ensures ≥ 3:1 in Light) |
| `--card-yellow-bg` | `#FEF3C7` | `#332609` | Yellow card count badge background |
| `--card-yellow-fg` | `#713F12` | `#FDE047` | Yellow card count badge text |
| `--card-red-fill` | `#DC2626` | `#F87171` | Red card glyph fill |
| `--card-red-bg` | `#FEE2E2` | `#3B1519` | Red card & active suspension badge/row background |
| `--card-red-fg` | `#991B1B` | `#FCA5A5` | Red card & active suspension badge/row text |
| `--alert-retro-bg` | `#FFEDD5` | `#3B1F0B` | Retroactive suspension alert banner background (`D-005`) |
| `--alert-retro-fg` | `#7C2D12` | `#FDBA74` | Retroactive suspension alert text |
| `--alert-retro-border` | `#C2410C` | `#FB923C` | Retroactive suspension alert left accent bar & icon |
| `--alert-retro-btn-fg` | `#FFFFFF` | `#0C1116` | Foreground text on `--alert-retro-border` CTA button |
| `--info-bg` | `#DBEAFE` | `#13294B` | Reschedule notification & informational banner background (`D-004`) |
| `--info-fg` | `#1E3A8A` | `#93C5FD` | Reschedule notification & informational banner text |
| `--tooltip-bg` | `#0F172A` | `#263341` | Compact floating tooltip surface (e.g. `W/D/L` form match details) |
| `--tooltip-fg` | `#F8FAFC` | `#F8FAFC` | Tooltip primary line (result, `12px` semibold, ≥ 11:1 contrast) |
| `--tooltip-muted` | `#94A3B8` | `#CBD5E1` | Tooltip secondary line (round & date, `10.5px`, ≥ 6.9:1 contrast) |
| `--tooltip-border` | `#1E293B` | `#475569` | Tooltip border and pointer arrow edge |
| `--match-hl-self-bg` | `rgba(21, 104, 66, 0.11)` | `rgba(52, 211, 153, 0.14)` | Standings row highlight for the team of the hovered/focused `W/D/L` badge |
| `--match-hl-opp-bg` | `rgba(30, 58, 138, 0.08)` | `rgba(147, 197, 253, 0.13)` | Standings row highlight for the opponent team of the hovered/focused `W/D/L` badge |
| `--match-hl-opp-accent` | `#1D4ED8` | `#60A5FA` | Left `3px` inset accent on the highlighted opponent row in standings |
| `--scorer-rank-1` | `#00380C` | `#00380C` | Top scorer (#1) position badge fill (`GOLGHETERI` tab) |
| `--scorer-rank-2` | `#008C1E` | `#008C1E` | 2nd scorer (#2) position badge fill (`GOLGHETERI` tab) |
| `--scorer-rank-3` | `#00E331` | `#00E331` | 3rd scorer (#3) position badge fill (`GOLGHETERI` tab) |
| `--scorer-rank-fg` | `#FFFFFF` | `#FFFFFF` | White rank numerals on scorer position badges (note: `#FFFFFF` on `#00E331` is below 4.5:1; softened with subtle dark text-shadow) |

### Typography
| Token | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| `--font-display` | `Barlow Semi Condensed` (`latin-ext`), sans-serif | — | 600, 700 | Page titles, round headers, match scoreboard |
| `--font-sans` | `Inter` (`latin-ext`), sans-serif | — | 400, 500, 600, 700 | UI copy, dense tables, forms, buttons |
| `--font-mono` | `JetBrains Mono` (`latin-ext`), monospace | — | 400, 500 | Audit timestamps and `before`/`after` result correction diffs |
| `--type-h1` | `--font-display` | `28px / 32px` | 700 | Primary page heading (one per screen) |
| `--type-h2` | `--font-display` | `20px / 26px` | 600 | Section headings, round titles |
| `--type-h3` | `--font-sans` | `16px / 22px` | 600 | Card headings, panel subheadings |
| `--type-score-lg` | `--font-display` (`tabular-nums`) | `46px / 48px` | 700 | Match detail scoreboard (`/meciuri/[id]`) |
| `--type-score-sm` | `--font-sans` (`tabular-nums`) | `15px / 20px` | 700 | Inline fixture list scores |
| `--type-body` | `--font-sans` | `14px / 20px` | 400 / 500 | Body text, form controls, navigation |
| `--type-table` | `--font-sans` (`tabular-nums` on numbers) | `13px / 18px` | 400 / 600 | Standings, statistics, fixtures table cells |
| `--type-caption` | `--font-sans` | `12px / 16px` | 500 | Table column headers, badges, helper/error text |
| `--type-mono` | `--font-mono` | `12px / 18px` | 400 | Audit snapshots, timestamps, technical IDs |

### Spacing
| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-12` | `48px` |
| `--row-height-dense` | `38px` (desktop table rows; touch hit targets remain ≥ `44px`) |
| `--container-max` | `1200px` |

### Radius, shadow, motion
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `4px` | Form badges (`W`/`D`/`L`), inputs, card glyphs |
| `--radius-md` | `6px` | Buttons, filter controls, status badges |
| `--radius-lg` | `12px` | Cards, table containers, scoreboard hero, alert banners, toasts |
| `--radius-full` | `9999px` | Circular notification counters, pulse dots, timeline minute pills |
| `--shadow-sm` | Light `0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)` / Dark `0 1px 2px rgba(0, 0, 0, 0.40)` | Panels & cards (paired with `inset 0 1px 0 var(--surface-highlight)`) |
| `--shadow-md` | Light `0 10px 26px rgba(15, 23, 42, 0.12)` / Dark `0 10px 28px rgba(0, 0, 0, 0.52)` | Floating toasts, dropdowns, popovers, confirmation dialogs |
| `--motion-fast` | `140ms cubic-bezier(0.22, 1, 0.36, 1)` | Hover states, active button press (`scale(0.97)`), `W/D/L` tile hover (`scale(1.12)`), arrow glide (`translateX(3px)`) |
| `--motion-base` | `240ms cubic-bezier(0.22, 1, 0.36, 1)` | Light/Dark theme cross-fade, sun/moon icon rotation, toast slide-in |
| `--motion-enter` | `360ms cubic-bezier(0.22, 1, 0.36, 1)` | Staggered panel & row entrance (`opacity` + `translateY(8px)`) |
| `--motion-pulse` | `2.2s ease-in-out infinite` | Subtle live-standings and retroactive-alert indicator pulse |
| Reduced motion | `0ms` / `animation: none` | Under `@media (prefers-reduced-motion: reduce)`, all transitions and keyframe animations disable cleanly |

### Breakpoints / window sizes
| Name | Min | Max |
|---|---|---|
| `mobile` | `360px` | `767px` |
| `tablet` | `768px` | `1023px` |
| `desktop` | `1024px` | `1440px+` (content container max `1200px`) |

## Component conventions
- **Visual style:** Premium sport-editorial ("FotMob / modern matchday ledger") optimized for dense standings and fixture tables in both Light and Dark themes, with `12px` card radii, `1px` top inner surface highlights in Dark mode, and distinct per-team gradient crests (initials guaranteed ≥ 4.5:1 contrast).
- **Dense tables (`DS-p19-dense-table`):** Sticky `--bg-subtle` headers with custom animated hover/focus tooltips on abbreviated stat columns (`MJ`, `V`, `E`, `Î`, `GM`, `GP`, `DG`, `Pct`), `1px` `--border-subtle` dividers, Flashscore-style segmented panel tabs in `.panel-header` (`CLASAMENT` · `FORMA` · `GOLGHETERI`, uppercase `11–12px` bold with `role="tablist"` / `role="tab"` / `aria-selected`, active pill `--accent-primary` + `--accent-primary-fg`, `150ms` fade transition, wrapping cleanly on `360px` mobile without horizontal scroll), Flashscore-style `24×24px` (`--radius-md`) centered position badges in the `#` column (`--accent-primary` for rank 1, `--alert-retro-border` with `--alert-retro-btn-fg` for active `D3` tie-breaker ranks, transparent + `--text-muted` for all other ranks, mirrored in the table footer legend), right-aligned numeric columns with `tabular-nums`, subtly emphasized `Pct` / `Goluri` column, synchronized hover/focus highlighting for `D3` teams linked to the mini-table callout, pulsing live indicator on `Clasament live`, and no page-level horizontal scroll at `360px`.
- **Filters & transient feedback (`DS-p19-filter-bar`):** Compact inline controls (`Sezon`, `Etapă`, `Echipă`, `Teren`, `Status`) with quick reset and secondary `Export iCal (.ics)` action on `/program`; transient action confirmations render as an animated bottom-right toast with auto-dismiss (never pushing page layout).
- **Fixture items & timeline (`DS-p19-match-card`):** Ascending round order on `/program` (earliest round at top), discreet winner emphasis on played fixtures, fluid hover arrow glide (`Detalii →`), stadium radial-glow scoreboard hero (`46px` tabular score) on `/meciuri/[id]`, and a vertical centered event timeline (home left, away right, minute centered on spine; left-aligned spine on mobile `< 640px`).
- **Status, form & card badges (`DS-p19-status-badges`):**
  - `FormStrip`: 5 compact tiles (`22–24px`, `--radius-sm`) labeled **`W` / `D` / `L`** with full Romanian `aria-label`, `scale(1.12)` hover/focus micro-interaction, a portal-mounted 2-line animated floating tooltip (`150ms ease-out`, result on line 1 + round/date on line 2, no native `title` attribute, viewport-clamped and immune to `overflow: hidden`), and synchronized standings-row highlighting (`data-team` + `data-opponent`) that spotlights both the hovered team (`--match-hl-self-bg` + `--accent-primary` inset left edge) and its opponent (`--match-hl-opp-bg` + `--match-hl-opp-accent` inset left edge), taking priority over `D3` row highlighting while a form tile is active.
  - `CardCountBadge`: miniature card glyph (yellow with `--card-yellow-border` in Light; red with `--card-red-fill`) paired with a `tabular-nums` count.
  - `StatusBadge`: consistent pills for fixture status and player eligibility (`Eligibil`, `Suspendat · N etape` with lock/ban icon on `Foaie de meci`, backed by server enforcement per `D-005`).
- **Alerts & notifications (`DS-p19-alert-banner`):** Left-accented banner distinguishing `Alertă suspendare retroactivă` (`--alert-retro-*` + pulsing alert dot + warning icon + review CTA, never implying auto-forfeit) from `Notificare reprogramare` (`--info-*`, showing old → new schedule).
- **Shell (`DS-p19-app-header`):** Sticky glassmorphism top bar (`--bg-header-glass` + `backdrop-filter: blur(12px)`) with clear active-page indicator bar, `Sezon` switcher, public links (`Clasament`, `Program`, `Statistici`), role-gated actions, and smooth Light/Dark toggle with rotating sun/moon icon.

## Hard-coded values found (to migrate)
| path:line | Value | Should be |
|---|---|---|
