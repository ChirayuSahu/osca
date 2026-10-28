# OSCA UI guidelines

OSCA's look: a dark-first, emerald-accented interface with italic display headings, a
1-bit emerald dither that reacts to the pointer, and fluid, quiet motion (no glows,
gradients or blur). Every screen keeps that
language, built from the shared components in `src/components/ui`, and works in both
light and dark mode (theme switcher in the top bar).

## Design language (keep it)

- **Display type.** Page titles are Playfair Display italic (`PageHeader` does this:
  `font-serif italic text-[40px]` + bold subtitle). Body is Manrope, code/numbers JetBrains Mono.
- **Emerald accent.** Primary actions are solid emerald buttons (`Button` default).
  Accents, active states, links and highlights use emerald.
- **Dither, not glow.** Decoration is 1-bit ordered dither in emerald (`Dither`,
  `DitheredImage`). Use `direction="radial"` (or a mask) so patterns fade out on every side —
  never a hard-edged block. Repo/user logos appear only as dithered backgrounds, never as
  foreground images in cards.
- **Minimal cards.** Show only what's needed to decide (name, one-line description, one
  meta line). Hover is quiet: border to `hover:border-foreground/20` and the dither firms up —
  no lifts, glows, colour shifts or sliding arrows.
- **Motion.** Content fades/slides in (`animate-in fade-in slide-in-from-bottom-2`),
  lists stagger with `style={{ animationDelay }}`, hovers transition over 200–300ms,
  live states can `animate-ping` / `animate-pulse` sparingly (one per view).
- **Shapes.** Everything is `rounded-md`: cards, panels, dialogs, inputs and buttons (incl. custom ones).
  `rounded-full` only for avatars, dots and status chips — never buttons.
- **Readability.** Buttons over decoration must be opaque (`Button` outline has a solid background).
- **Cursor.** Every enabled interactive element shows a pointer (global rule in `globals.css`);
  clickable non-button elements (e.g. a card with `onClick`) add `cursor-pointer`.

## Theme-aware colour rules

The emerald look must read well in light mode too:

| Use | Class |
|---|---|
| Surfaces | `bg-background`, `bg-card`, `bg-muted` (never `bg-black`, `#0a0a0a`, `bg-neutral-*`) |
| Text | `text-foreground`, `text-muted-foreground` (never `text-white`, `text-neutral-*`) |
| Borders | `border` / `border-border`, hover `hover:border-foreground/15` (never `border-white/[..]`) |
| Emerald text | `text-emerald-600 dark:text-emerald-400` (500/600 for light, 300/400 for dark) |
| Emerald fills/tints | `bg-emerald-500`, `bg-emerald-500/10`, `border-emerald-500/20–40` (fine in both themes) |
| Glows | `shadow-[0_0_Npx_rgba(16,185,129,a)]` emerald glows are allowed; no white/black glows |
| Status | `text-warning`/`bg-warning/10`, `text-destructive`, success = emerald |

## Layout and spacing

- Every dashboard page: `<PageContainer>` → `<PageHeader title description actions />` → content.
  Same width (`max-w-7xl`), padding (`px-4 md:px-6 pt-8 pb-16`) and section gap (`gap-8`) everywhere.
- Grids: `grid gap-6 sm:grid-cols-2 xl:grid-cols-3`. Inside cards use `Card` parts
  (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).
- The app shell (sidebar + top bar with title and theme toggle) is in `app/dashboard/layout.tsx`.

## Components

`Button`, `Badge`, `Card`, `Input`, `Textarea`, `Label`, `Select`, `Switch`, `Checkbox`,
`Tabs`, `Dialog`, `Sheet`, `DropdownMenu`, `Tooltip`, `Avatar`, `Alert`, `Skeleton`,
`Progress`, `EmptyState`, `ErrorState`, `toast()` (sonner), `GithubIcon` (`components/icons`).
Icons: lucide-react.

## Rules of thumb

- One primary action per view; never two buttons doing the same thing in one view.
- Show real data only. No placeholder numbers, fake scores or invented text.
- Confirm destructive actions with a `Dialog`; report outcomes with `toast()`, never `alert()`.
