# Shared link: the full app in guest view-only mode (X2b)

_Spec written in the night run of 2026-10-15. **Not built.** The reasons are in "Why not tonight"
at the end. Status: Planned, awaiting Umer's go-ahead on the four questions in §6._

## 1. The ask (the founder, 2026-10-15)

Replace the cut-down share page (`/s/:token`, `GuestProject.tsx`) with the real takeoff screen,
exactly as a signed-in user sees it, view only:
- **Navigation:** the same toolbar, the tabs (Takeoff, Earthwork, Annotations, Estimating), and the
  Sheets and Takeoff panels with folders and classification. Takeoff and markups are drawn.
- **The profile circle:** shows "Guest", with a menu of Sign up and Log in. Where the trial-ended
  Upgrade button sits, "Sign up".
- **Enabled for guests:**
  - select, and view an item's details;
  - pan, zoom, fit and sheet switching;
  - layer and visibility toggles, and Show Linked EC;
  - 2D/3D switching and orbiting, and Find Text and search.
- **Everything else stays visible but greyed out,** with the tooltip "View only. Sign up to take off
  your own plans."
- **Estimating tab:** Search, Group by, filters and Excel export work. Nothing edits.
- **Grading report:** a download is allowed only if it changes nothing ("Use this view in report"
  is disabled).
- **"Show pricing"** in the share dialog, off by default. Off, guests see no money anywhere: not on
  screen, not in the Excel, not in the report.
- **The existing settings are kept:** password, expiry, revoke, watch live work (names hidden as
  User A/B), and save a copy (Professional only).
- **Security:** the api refuses every write from a share-link session, whatever the screen allows,
  proven with 5 direct writes.

## 2. What exists

- **The guest has no identity on any workspace route.** `resolve_guest` (`share/service.py:124`)
  is called inline in four `/api/share/{token}` routes.
  - `bundle` returns the sheets, signed assets, item details (filtered by layer) and cost rows.
  - Markups, earthwork, folders, layers, variables and components are not served to guests.
- **The takeoff screen loads about 30 queries and hooks,** all on `/api/workspace/{w}/…` behind
  `current_workspace`, which needs a signed-in member. It is gated by `usePermissions().can(...)`
  (`canEditTakeoff`, `canEditEstimates`, `canUseAnnotations`, …) and by `plan`.

## 3. Design (recommended)

**A guest access token, read-only by construction, checked in one place.**

1. **`POST /api/share/{token}/session`** (the `pass` route's sibling) runs `resolve_guest`, then mints
   a JWT:
   - `kind="share_guest"`, the link id, the project id, and `fp` (the pass's fingerprint, so
     regenerate, password change and revoke all kill it);
   - `pricing` (the link's new `show_pricing`) and a 12 h expiry.
2. **The api guard, one function** (`core/dependencies.py`, in the code path every workspace route
   already takes).
   - A bearer of kind `share_guest` resolves to a `WorkspaceContext` with role **guest**:
     - every capability is false;
     - `user` is a synthetic, never-persisted Guest whose id matches no row;
     - the project is pinned.
   - **Any method other than GET is refused with 403** (`code: share_view_only`) before the route
     runs, in middleware, so a route that forgets a capability check is still safe.
   - **A GET outside the pinned project is refused**, except an allowlist of workspace-level reads
     (capability, settings, currency, classification and nodes).
   - The link is re-read on every request: disabled, expired or revoked means 401.
3. **Money off, on the server.** With `pricing=false` the guest context strips money before the
   response leaves:
   - cost rows, rates, components, crews, bid summary, wage sets, and the result's price fields;
   - a typed "redacted" flag lets the app show "—".
   - Never trust the page to hide it.
4. **Per-user reads** (Estimating saved view, takeoff settings, Group by): a guest reads the
   defaults and writes nothing. Its view changes live in its own session storage.
5. **Realtime and presence:** the guest socket joins read-only, as `allow_presence` says today.
   Names follow `show_member_names` (User A/B).

**Frontend:**

1. `/s/:token` gets the guest token (password form as today) and holds it in sessionStorage, apart
   from a member's session (a signed-in member viewing a link keeps their own session untouched).
2. `ProjectTakeoff` is rendered inside a **GuestSession provider** that supplies `workspace`, `user`
   (Guest) and the token to the api client for this tree.
3. `usePermissions` returns `role: "guest"`, all false. Every disabled control's tooltip becomes
   "View only. Sign up to take off your own plans." when the role is guest (one helper, not per
   button).
4. **The header:** the avatar shows "Guest" with Sign up and Log in; "Sign up" sits where Upgrade sits.
5. **Estimating:** `readOnly` (exists). Export is allowed. Money cells read "—" from the redacted
   flag.
6. **Grading report:** a download is allowed; "Use this view in report" is disabled (`canEdit` false).
7. **The share dialog:** "Show pricing" (default off), next to the save-a-copy block.
   - Migration: `project_share_link.show_pricing boolean not null default false`.

## 4. Blocks and size

| Block | What | Size |
|---|---|---|
| A | Token, guard middleware, guest context, link re-check; the 5-write refusal proof | ½ day |
| B | Money redaction across the cost-bearing GETs; `show_pricing` column and dialog toggle | ½ day |
| C | The frontend guest session provider, rendering `ProjectTakeoff` and the header | ½–1 day |
| D | Tooltips, the read-only Estimating and report, the 3D view and orbit; screenshots; legacy comparison | ½ day |

## 5. Proof (when built)

- **Five direct api writes with a guest token are refused 403:**
  - create an item;
  - add a shape;
  - patch an item;
  - run Calculate (PUT result);
  - create a markup;
  - plus a DELETE.
- **A GET of another project refused.** A revoked link's token refused on its next request.
- **Pricing off:** no money field in any response the guest page makes (a HAR scan for `cost`,
  `rate`, `$`).
- **Screenshots:** Takeoff, Earthwork, Estimating with pricing off and on, the greyed tools with
  tooltip, the Guest menu.

## 6. Questions for Umer

1. **Guest identity.** Should a synthetic Guest user (above) be used, or a real "guest" member row
   per link? A row makes logging simpler, but it shows in member lists. Recommend synthetic.
2. **Per-user state.** Should a guest's Group by and view toggles be kept per browser (session
   storage) only? Recommend yes.
3. **Watch live work with pricing off.** Live cost edits by members would show as "—". Recommend
   yes.
4. **The old bundle route.** Should it be kept for old links until the new page ships, then
   removed? Recommend yes.

## Why not tonight

It is a security boundary across every workspace route plus the 8,700-line takeoff screen, about two
days of work. The night run's rule is no half-built commits, and an unattended guard that is 90 %
right is worse than none. Everything above is grounded in the code as read tonight (share routes,
`resolve_guest`, `current_workspace`, the takeoff screen's queries and `can()` gates).
