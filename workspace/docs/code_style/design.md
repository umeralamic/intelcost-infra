# IntelCost — design base

The shared visual system. Both frontends inherit this and extend it in their own
`design.md`. Neither forks a parallel base.

| Repo | Token file | Tailwind | Extends with |
|---|---|---|---|
| `intelcost-market-next` | `src/app/globals.css` (`@theme`) | 4.3, CSS | nothing; it uses a subset |
| `intelcost-app` | `src/index.css` + `tailwind.config.ts` | 3.4, JS config | canvas, earthwork, sidebar, tree tokens |

The token **values** are identical across both. Only the mechanism differs, because
Tailwind 4 moved theme definition into CSS. When a base value changes, it changes in
both files in the same pull request.

---

## The brief

**Palette.** Safety orange on near-black over warm white. Primary is `21 90% 48%`
(#ea580c), the colour of a hi-vis vest. It is used for actions and emphasis only,
never for large fields. Text is `ink` at 9% lightness, `ink-muted` at 35% for
secondary copy. Surfaces are warm: `surface` at `30 25% 98%` carries a faint peach
cast rather than a clinical grey. The peach `accent` (`30 100% 83%`) appears in the
closing CTA band and the hero gradient, nowhere else. All colour is HSL, declared as
three space-separated values so Tailwind can compose opacity.

**Type.** Archivo for display (600 to 900), Inter for body, JetBrains Mono for
numbers. Headings are extrabold at `-0.025em` tracking. The voice is blunt and
structural and the type carries that. Any number a reader compares (a price, a seat
total, a quantity, a coordinate) uses tabular figures so digits line up between rows.

**Spacing.** A 1280px container with a 1.5rem gutter. Sections separate with a 1px
`border-border` rule, not with a shadow or a colour change. Both products read as a
stack of plain horizontal bands. Radius is a single `--radius: 0.5rem` with `sm` and
`md` derived from it.

**Motion.** Restrained on purpose. `transition-colors` on links and buttons, roughly
150ms. No scroll-triggered reveals, no parallax. A contractor scanning a drawing at
7am does not need choreography. `prefers-reduced-motion` cuts animation and smooth
scrolling to near zero, everywhere, always.

**Tone.** Plain, specific, no hype. "Measure straight off the drawing", not
"Revolutionise your workflow". Every claim points at a real screen. No em dashes.

---

## Base tokens

Owned here, present in both repos.

| Group | Tokens |
|---|---|
| Ground | `background`, `foreground`, `card`, `popover`, `border`, `input`, `ring` |
| Brand | `primary`, `primary-hover`, `primary-foreground`, `secondary`, `accent`, `accent-foreground` |
| Text and surface | `ink`, `ink-muted`, `muted`, `muted-foreground`, `surface`, `surface-strong` |
| Feedback | `destructive`, `success` |
| Shape | `radius`, `shadow-card`, `shadow-bold`, `gradient-hero`, `gradient-warm` |

Dark values exist for every one of them under `.dark`.

## App-only extensions

These belong to `intelcost-app` and must not be copied into marketing. They describe
a drawing surface, and marketing has no drawing surface.

| Group | Tokens | Why |
|---|---|---|
| Canvas | `canvas-surface`, `tool-active`, `tool-hover` | The grey surround behind the white PDF page, and the active-tool tint |
| Earthwork | `earthwork-eg`, `earthwork-fg`, `earthwork-boundary`, `earthwork-error` | Industry convention: existing grade red, finished grade green, crossing contours blue |
| Shell | `sidebar-background`, `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, `sidebar-border`, `sidebar-ring` | The app has a sidebar |
| Tree | `folder` (manila gold), `row-selected` (PlanSwift blue bar) | The file tree and the takeoff tree |

If a marketing page ever needs one of these, copy the value from the app rather than
inventing a near-match.

---

## Dark mode

Tokens are complete in both repos. Marketing stages it but does not switch it on. The
app ships the toggle. A new token is not finished until its `.dark` value exists.

## UI states

Every interactive element answers for all of these. The browser check before hand-off
drives them. A green build does not.

| State | How it reads |
|---|---|
| Rest | Primary buttons are solid orange. Outline is a 2px border on background. |
| Hover | `primary-hover`, 6% darker. Outline fills with `surface`. Links move `ink-muted` to `ink`. |
| Focus | 2px `ring` outline at 2px offset, on every focusable element. Never removed, never only-on-mouse. |
| Active | Nav carries `aria-current="page"` and sits at full `ink`. |
| Loading | Skeleton at `muted`, matching the final layout box so nothing jumps. Buttons disable and keep their width. |
| Empty | A sentence saying what would be here and the one action that fills it. Never a bare blank panel. |
| Error | `destructive` text with the actual reason and a retry. Never a raw stack trace, never "something went wrong" alone. |
| Disabled | 50% opacity, `cursor-not-allowed`, and the reason available on hover or nearby. |

A screen that renders only the happy path is not finished.

## The canvas is measured, not decorated

The takeoff canvas is a working instrument. Contrast against the white page beats
brand expression: measurement colours are chosen so a thin line stays visible over
printed linework, and the surround stays neutral grey so the page reads as paper.
Brand orange does not go on the canvas except as the active-tool tint. This is the
one place where the design system defers to legibility, deliberately.
