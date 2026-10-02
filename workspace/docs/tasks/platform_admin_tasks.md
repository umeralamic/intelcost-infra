# F16a: Platform admin, as legacy (spec)

> **Written 2026-10-02** from legacy's source on `UmeralamDEV` (`e99cddcb`), its plan files,
> and live legacy driven as its platform-admin account (the Developer menu, the Starter Pack
> picker). Decisions: D-233 (inventory, order, legacy's answers, pending founder review).
> Platform admin stays resolved in the permission layer (D-23): `user.is_platform_admin`,
> never a role; internal routes render the ordinary 404.

## The problem

Our own team cannot do from the product what legacy's team does: author the Starter Pack
every workspace reads, see who signed in and what changed across the platform, or set the
trial tiers, the country map, the blocklist, a workspace's limits and its lock without a
database console. → Legacy's platform-admin pieces, in its order of importance.

## Inventory: every platform-admin feature legacy has

| # | Legacy | Where in legacy | Ours before this spec | Here |
|---|---|---|---|---|
| 1 | **Starter Pack authoring**: "New starter assembly" in the library picker (Starter Pack only); a starter row's Rename, Properties…, Change classification…, Add / Manage sub-items…, Costs…, Delete assembly; a starter sub-item's Rename, Edit…, Costs…, Delete. No folders in the Starter Pack. Others see "Starter Pack assemblies are read-only — copy it to edit". | `AssembliesPanel.tsx`, `useAssemblyTemplates.ts`, plan `assemblies-starter-pack-source-dropdown-2026-08-13` | Read, Use on sheet, Copy to my assemblies; the read-only note; the api refuses every starter write | **Block A** |
| 2 | **Developer menu** in the app header: "Platform tools" › Activity, rule, AI economics, Billing tiers | `Dashboard.tsx`, plan `surface-the-ai-economics-page-in-the-developer-menu-2026-08-25` | `/platform` with two counts; no menu | **Block B** |
| 3 | **Activity** (`/platform/activity`): Audit log (Action contains, Entity type, Apply, rows When / Actor / Action / Entity / Workspace that open to Before / After / Metadata, 50 a page, Previous / Next) and Recent sign-ins (top 100 by last sign-in: Email, Provider, Last sign-in, Account created; Refresh) | `PlatformActivity.tsx`, `platform-recent-signins` | Each workspace's own feed (F3); `user.last_sign_in_at` | **Block B** |
| 4 | **Billing tiers** (`/platform/billing-tiers`), "Billing tiers, trials & abuse controls": Stripe & MaxMind (secrets present or not, never values), Country tiers (add, move →1/→2/→3, remove), Tier rules (per tier: trial days, restricted, five limits, Save Tier N), Email blocklist (add, remove, source) | `PlatformBillingTiers.tsx`, `platform-secret-status` | The three tables, read by signup (F2); no screen | **Block C** |
| 5 | **Billing tiers, continued**: Overrides (find a workspace, "+7 trial days", "Lift all restrictions"; the table; remove) and Flagged accounts (tier, VPN-forced, signals, trial end, measured, state; Clear flag, Lock / Unlock; Recent signals) | same, `effective_trial_limits`, `useWorkspaceLocked` | Nothing | **Block D** |
| 6 | **AI economics** (`/platform/ai-economics`): provider pricing per model, the serving-cost target and margin, top-up packs with Stripe prices | `PlatformAiEconomics.tsx` | Nothing | **Waits for F14** (its questions 1 to 3 decide the model, the pricing and the packs, D-233) |
| 7 | **Library admin**: bulk replace the shared library, the assembly tag list | `Library.tsx`, `AssemblyTagPicker.tsx` | No Library page | **Waits for the Library (P-09)** |
| 8 | **Community moderation**: set a post's status, delete anything, mark an answer | `CommunityPostView.tsx` | No Community | **Waits for F15 Community** (its questions) |
| 9 | Plan and trial masks lifted for a platform admin | `usePermissions.ts` | ✅ D-23, F3-S4, F5-S18 | — |
| 10 | Reports and AI Usage visible to a platform admin whatever the workspace setting | `Reports.tsx`, `Dashboard.tsx` | ✅ D-146 | — |
| 11 | Non-admins see the ordinary 404 on platform routes | `PlatformRoute.tsx` | ✅ F3-S4 | — |
| 12 | Granting platform admin: a row in `platform_admins` by migration; no screen | plan `give-touseef-…-2026-08-05` | ✅ the `user.is_platform_admin` column, set in the database; no screen | — (Ideas) |
| 13 | Super admin (`profiles.is_super_admin`): live only in Community's media rules; the rest is in retired pages | migrations | One flag (platform admin) | Folded into platform admin (D-233) |
| 14 | The CSI template loaded once from a seed | `load-csi-template` | ✅ seeded per system on first use (D-58) | — |
| 15 | Poisoned tiler sheets re-rendered | plan `tiler-poisoned-sheets-…` | No tiler (D-14) | Not applicable |
| 16 | Feature flags | `useFeatureFlag.ts`, no admin screen | ✅ read (F3-S13), no screen | — (Ideas) |

Retired and not live: `src/retired/pages/Admin*.tsx`, `DevMethod*.tsx`,
`PlatformIngestionHealth.tsx`.

## Block A: Starter Pack authoring

- **api** (`features/assembly/routes.py`): a starter template is writable by a platform
  admin, and by nobody else (legacy's access rule). Every write route that refused a
  starter row (`starter_ok=False`) now takes it for a platform admin; a workspace template
  keeps its own gates. `POST …/assembly/starter {name}` creates one as legacy's
  `createTemplate`: Area, SF, `#2563eb`, no workspace. A starter row has no folder: Move to
  folder is refused for it. Costs on a starter row need the platform admin only.
- **app** (`AssembliesPanel.tsx`): `isPlatformAdmin` from `usePermissions`; on Starter Pack
  a platform admin gets the full menus less Move to folder, and the picker gains a rule and
  "+ New starter assembly" (our prompt dialog in legacy's words: "Name of the new starter
  assembly"; toasts "Starter assembly created", "Create failed"). New folder stays on My
  Assemblies only.
- **Live:** changes publish `workspace.assembly.changed` on the author's workspace; other
  workspaces read the change on their next load (legacy has no realtime here).

## Block B: the Developer menu and Activity

- **App header:** a "Developer" menu for a platform admin only: "Platform tools", Activity,
  a rule, AI economics (disabled, "Waits for F14"), Billing tiers.
- **`/platform/activity`:** Back, "Activity" with a "Platform admin" badge and "Audit log
  and recent sign-ins across the platform."; tabs Audit log and Recent sign-ins as legacy.
  Our audit rows carry `action`, `target` and the actor's name; Entity shows the target.
- **api:** `GET /api/platform/audit?action=&entity=&page=` (51 read, 50 shown, as legacy's
  has-more), `GET /api/platform/signins` (top 100 by `last_sign_in_at`, provider "email").

## Block C: Billing tiers (secrets, countries, rules, blocklist)

- **`/platform/billing-tiers`**, legacy's header and its first four tabs.
- **Stripe & MaxMind:** presence of each named setting on the api, never its value.
- **Country tiers:** `billing_country_tier` gains `country_name` (legacy's column, so F17
  stays a copy); add or upsert, move, remove ("falls back to Tier 3").
- **Tier rules:** the three rows, edited and saved one tier at a time.
- **Email blocklist:** `disposable_email_domain` gains `source` and `created_at`; add
  (lowercased, leading @ dropped, must hold a dot), remove.

## Block D: Overrides, lock and flagged accounts

- `workspace_limit_override` (legacy's columns) and `workspace.locked`, `workspace.flags`.
- **Enforced now, as legacy:** extra trial days extend the trial window; a locked workspace
  reads as an expired trial (`useWorkspaceLocked` is `expired || locked`). The limits are
  stored and shown; F16 enforces them, as it does the tier rules.
- **Flagged accounts:** workspaces with a VPN-forced signup, a flag, or a lock; Clear flag,
  Lock / Unlock. **Recent signals:** our signups' recorded tier, country and VPN (D-18).

## Ideas (beyond legacy, not built)

- A "Platform admins" list to grant and revoke the flag from the screen, audited.
- A feature flag screen: global, per workspace.
- Workspace and user search with "open as support" (read-only), audited.
- Starter Pack changes live in every open workspace (a global topic).

## Progress

- [x] Block A, Starter Pack authoring (api `a690595`, app `90a767c`)
- [x] Block B, Developer menu and Activity (api `fbbdf6d`, app `87170e0`)
- [x] Block C, Billing tiers: secrets, countries, rules, blocklist (api `45d91c8`, app `d2908b1`)
- [x] Block D, Overrides, lock and flagged accounts (api `36007ee`, `933b772`; app `a273919`)
