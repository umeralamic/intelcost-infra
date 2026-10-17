# F29 and everything since the last staging merge: notes for promotion

_For Abdullah. Written 2026-10-17 from the repos (read-only, after a `git fetch`). Docs only:
nothing here has been run against staging or production._

## Where things stand

- **Staging's last merge** was on 2026-10-15 for both repos:
  - **api:** PR #6, `d90a405`, base `dd3e303`; staging's alembic head is `f2c9a7d4e1b8`;
  - **app:** PR #3, `d89865b`.
- **Since then on `umer-dev`:**
  - **api:** 33 commits, ending at today's day-run commits;
  - **app:** 60 commits.
- **`main`** still has no merge from `umer-dev`. Promoting to `main` carries everything in this note and in the
  earlier notes:
  - `2026-10-12_f25_data_migrations_for_abdullah.md`;
  - `2026-10-14_earthwork_out_of_date_after_d470_for_abdullah.md`;
  - `2026-10-15_promotion_since_staging_merge_for_abdullah.md`.
- **The 2026-10-16 note** (`2026-10-16_f29_block05_and_block1_migrations_for_abdullah.md`) listed three of the
  migrations below. This note supersedes it.

## 1. Migrations (api): 14, one straight chain

They run from staging's head `f2c9a7d4e1b8` to the new head **`d584a1c3e5f7`**. Staging's `scripts/deploy.sh`
runs `alembic upgrade head` on every push, so a merge applies them by itself.

Every one adds tables, columns or indexes. None rewrites an existing row's data, and none changes a stored quantity.

| # | Revision | After | What it does | Decision |
|---|---|---|---|---|
| 1 | `a7e3c5b9d2f4` | `f2c9a7d4e1b8` | Table `project_share_invite`: email invites to a share link, one per recipient | D-519 |
| 2 | `b8f4d6c1e3a5` | `a7e3c5b9d2f4` | `project_share_link.password_sealed` (text, null): the link's password, sealed for its invite emails | D-520 |
| 3 | `c9a5e7d2f4b6` | `b8f4d6c1e3a5` | `project_share_link`: when its access key or expiry last changed | D-521 |
| 4 | `d529a4e7c1b3` | `c9a5e7d2f4b6` | `takeoff_item.earthwork_retired` (boolean, default false) | D-529 |
| 5 | `d532b7e3f0a9` | `d529a4e7c1b3` | Tables `earthwork_soil_layer`, `earthwork_bore`, `earthwork_bore_layer`, `earthwork_bore_water`; `earthwork_assumptions.water_buffer_ft` (default 1.0) and `.slope_rule` (JSONB, null) | D-532 |
| 6 | `d537c4a9e2f1` | `d532b7e3f0a9` | `earthwork_bore_layer.soil_layer_id`'s foreign key made DEFERRABLE INITIALLY DEFERRED | D-537 |
| 7 | `d545b2c8e7a1` | `d537c4a9e2f1` | `earthwork_assumptions`: who last changed the slope rule or the water buffer, and when | D-546 |
| 8 | `d549c1e7a2b4` | `d545b2c8e7a1` | `earthwork_result`: the Calculate's own inputs (JSONB, null) | D-549 |
| 9 | `d553e4b7a1c9` | `d549c1e7a2b4` | `earthwork_review`: the project's Trace rules (JSONB, default `{}`), with who changed them and when | D-553 |
| 10 | `d554b2f8c6e3` | `d553e4b7a1c9` | `earthwork_site_result`: the site Calculate's own inputs (JSONB, null) | D-554 |
| 11 | `d570a3c1e9b2` | `d554b2f8c6e3` | Utility runs: table `utility_run`; `takeoff_item.is_utility`, `earthwork_variant`, `work_scope_id`, `work_type` and `work_kind`; `takeoff_folder.auto_key`; `earthwork_assumptions.utility_settings`. It rebuilds the two unique indexes on Calculate lines with the variant added. | D-570 |
| 12 | `d570b8e2f4c6` | `d570a3c1e9b2` | Work scopes: tables for the workspace's work scopes and their mapping to a node per classification system | D-570 |
| 13 | `d581c4e7a2b9` | `d570b8e2f4c6` | Table `utility_structure`: one row per structure mark, beside its count item | D-581 |
| 14 | `d584a1c3e5f7` | `d581c4e7a2b9` | Over-excavation: the undercut's mode, layer, slope, stack and geosynthetic columns on `takeoff_item` (all null) | D-584 |

**Notes on the migrations:**
- **No. 11, the index rebuild:** the old unique key is (sheet or site, region, role). The new one adds the variant,
  as `coalesce(variant, '')`. Every existing line has no variant and was already unique without it, so the rebuild
  cannot fail on existing data. On a large `takeoff_item` table it holds a lock while the two partial indexes build.
- **No. 11's downgrade** deletes every line that has a variant (the utility lines). Only a downgrade does this; the
  upgrade deletes nothing.

## 2. Settings, packages and images

- **New api package:** `cryptography>=44.0.0` (D-520). **Rebuild the api image** before the deploy.
- **New setting, `SHARE_PASSWORD_KEY`** (secret, optional; D-520):
  - **What it does:** seals a share link's password so its invite emails can include it.
  - **When unset:** the key is derived from `JWT_SECRET`.
  - **Production:** set its own value **before the first deploy**. A key changed later can't open the passwords
    sealed before. They aren't lost: the link still checks its own hash, but its invites stop quoting the password
    until the owner sets it again.
- **New setting, `LOCKED_PROJECTS` (bench only, D-592, D-601):** a project lock used only by the bench. **Leave it
  unset on staging and production.**
  - **When unset:** the middleware passes every request untouched (`app/core/project_lock.py`). Staging and
    production need nothing.
  - **On the bench:** it locks the 3D test copy to the founder's two accounts.
  - **Cost when unset:** one dictionary check per request.
- **The app:** no new packages and no new `VITE_*` since staging.

## 3. What a deploy does to existing data, and what users will see

1. **Work scopes are seeded on first use (D-570, D-590, D-599).**
   - **When:** a workspace's first Calculate after the deploy creates its 19 default work scopes, each mapped to its
     CSI codes where the workspace's own tree has them.
   - **What it never does:** overwrite a mapping a user has already set (fixed in D-599).
   - **Existing lines:** there is no backfill. Each project's earthwork lines move onto work scopes at its next
     Calculate, with the same codes, folders and rates. On the bench this was checked on 84 lines:
     `scripts/check_scopes.py` compares a digest taken before and after.
   - **What you need to do:** nothing. The seed runs inside the Calculate's own transaction.
2. **D-470: out-of-date results, on `main` only.** Staging already has D-470, so it affects only a promotion to
   `main`.
   - **What users see:** every saved earthwork result opens as "Out of date: … press Calculate" until its next
     Calculate.
   - **What is written:** nothing.
   - **More detail:** `2026-10-14_earthwork_out_of_date_after_d470_for_abdullah.md`.
3. **D-528: results with an undercut read out of date once,** on staging and on `main`.
   - **Which results:** only those with a Site Feature undercut. Their version key gains a "u" (`v6u`, or `v5u` for
     a site).
   - **What users see:** "Out of date: calculated before an undercut…" until the next Calculate.
   - **What is written:** nothing. This is D-470's mechanism.
4. **F29's version key gains a part only on a project with bores** (U-UT40). On staging and production no project
   has bores yet, so no other result reads out of date.
5. **Share links (D-519 to D-521).**
   - **Existing links:** they keep working.
   - **A password set before D-520:** it has no sealed copy, so its invites don't quote it until the owner sets the
     password again.

## 4. Order to apply

1. **Set `SHARE_PASSWORD_KEY`** in the api's environment on the box. Leave `LOCKED_PROJECTS` unset.
2. **Rebuild the api image**, for `cryptography`.
3. **Merge `umer-dev` into `staging`,** api and app together. The app's F29 screens call the new api routes, so the
   app must not go out ahead of the api.
4. **Let `deploy.sh` run `alembic upgrade head`** (14 revisions). Check that the head reads `d584a1c3e5f7`.
5. **Smoke on staging:**
   - Calculate on one project with an earthwork result: its lines keep their codes, and the workspace now lists 19
     work scopes;
   - one share link: open it as a guest, then send an invite.
6. **Promote `staging` to `main`:** a separate act, with the earlier notes' steps (D-470's out-of-date results, F25's
   data migrations).
