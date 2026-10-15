# Parity check: umer-dev against legacy, 2026-10-15

Read-only. App `4e8d264`, api `3d834ed` (both `umer-dev`, 2026-10-14); legacy `UmeralamDEV` at
`e99cddcb` (2026-09-27, local, not re-fetched). Checked in code only. The bench was not driven,
so nothing here was run in a browser.

## 1. Billing tiers and trials

| # | Item | State | What's there / missing |
|---|---|---|---|
| 1a | Three country tiers; unlisted = T3; failed geo = T1 | done | `auth/tier.py` `resolve`: country absent from `billing_country_tier` → 3, no country and no VPN → 1, every layer fails open |
| 1b | MaxMind lookup + VPN forces T3 | done | `maxmind_insights` (Insights v2.1); any of 5 anonymiser traits → T3. Platform headers answer first and skip the paid call (D-18 divergence). Inert on the bench, no key |
| 1c | Trial 14 / 7 / 5 by tier | done | Seeded in migration `b17d4e90c3a2` (`billing_tier_rule`); one resolver serves register and `/trial-length` |
| 1d | Tier 3 mid-trial caps | done | `billing/caps.py`: 1 project, 500 MB, 1,000 measurements, 30 AI credits; 409 `trial_cap`; per-workspace overrides and "lift all" |
| 1e | View-only lock at trial end | done | `core/dependencies.py` view-only refusal (trial ended / unpaid / ended); app `LockedDialog` + `core/api/locked.ts` |
| 1f | Disposable email blocked at every tier | done | `tier.is_disposable` used in `auth/service.py` at every tier (D-19 changed this from legacy's T3-only rule); blocklist editable on the platform page |
| 1g | PDF render throttle on Tier 3 | done | 1,200 ms seeded; app-side only (`lib/billing/pdfThrottle.ts`, `raster.ts`), not enforced by the api, by design |
| 1h | Platform page for tiers / prices (price id only) | partly | `PlatformBillingTiers` edits the country map, tier rules, blocklist and overrides. `PlatformSubscriptions` edits price ids **and** dollar amounts, so "price id only" is not met |

## 2–4. Takeoff tools

| # | Item | State | What's there / missing |
|---|---|---|---|
| 2 | Auto Count: vector mode | done | `lib/takeoff/autoCount/vectorMatch.ts`, quarter turns and mirror; vector index stored through the api (D-304) |
| 2 | Auto Count: image mode | done | `imageMatch.ts` + OpenCV peaks, WASM scorer, symmetry, fill check, valley review (D-299..348) |
| 2 | Image speed, E101 office | measured | Last benchmark (D-327, one kept OpenCV worker): **18.2 s first / 14.4 s next**; "C" with tag 27.1 / 23.3 s. Not re-run today |
| 3 | Auto Trace (contour stitching) | partly | Auto Trace is built (`earthwork/trace/*`, worker and cache); F19 sheet stitching is built in `site/SiteView.tsx`. Legacy's trace **style filter** is still missing |
| 4 | Library page | missing | No `/library` route or page, as expected. Assemblies panel and Starter Pack authoring exist; Library admin is missing too |

## 5. In legacy, not in the new app

Taken from `PARITY_GAPS.md` (2026-10-07). Each line below was checked in today's code with a grep.

| Gap | One line |
|---|---|
| Project map / address lookup | No Show Map, deferred to P-17 (D-28); legacy's lookup never located anything anyway |
| Old legacy URLs | `/invite/:token`, `/projects/:id/takeoff`, `/library?…` etc. have no redirects |
| Drawing folder delete rule / move | Rename exists; "Move or remove its contents first" guard and folder move not found |
| Read-only sheet viewer | Legacy `/projects/:id/sheets/:sheetId/viewer` has no equivalent page |
| Markup Properties panel | Not found |
| Auto Trace style filter | Not found (see 3) |
| Library + Library admin | Missing (see 4) |
| Daily rollup / retention compaction | No api job found |
| Granting platform admin from the UI | Still a database flag (psql) |
| Build stamp in the console | Not found |
| Installable app (PWA) | No manifest or service worker |
| Legacy data migration | No import script; needed before cutover |
| End-to-end against real Stripe / AI against a real model | Code is there but has never run against live Stripe or a provider key |
| Unverified rows in PARITY_GAPS | Double-click to finish, shape-edit save status, starter-pack layers, shared equipment, default earthwork folder: not rechecked |

Closed since 2026-10-07: guest presence (`GuestProject`), box-select, ellipse handles.
