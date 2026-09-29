# Legacy comparison

_The standing procedure before building any new screen, or any part of one (the founder,
2026-09-28). The spec says what a screen must do; live legacy says what it looks like and
how it behaves, down to the words. Build to the list this produces, not only to the spec._

## When

Before the first line of a new screen, a new panel, a new menu or a new dialog, and again
at the end of the block that builds it.

## Which legacy

**Live legacy is the `UmeralamDEV` branch of `intelcost/`** (the founder, 2026-09-29). The
local checkout tracks `origin/UmeralamDEV` on a local `UmeralamDEV` branch; refresh it
with `git -C intelcost fetch origin && git -C intelcost pull` before reading. It is
read-only: its push URL is disabled, and nothing is ever pushed to legacy. `main` and
`umer-dev` in that repo are stale (`umer-dev` stopped at `12dd119b`, 2026-09-24); what
changed since is in [tasks/LEGACY_UMERALAMDEV_DIFF.md](tasks/LEGACY_UMERALAMDEV_DIFF.md).

## How

0. **Read legacy first: its source and its plan files.** Legacy's features were improved
   over time and `intelcost/.lovable/plan/*.md` records each change (the founder,
   2026-09-28). For every topic, read the legacy source that implements it and every plan
   file that touches it (search the plan directory by keyword: `grep -il <keyword>
   intelcost/.lovable/plan/*.md`); the latest plan file on a topic wins over an older one
   and over the spec. Then drive it live (step 1).
1. **Drive the same screen in live legacy and in the new app**, from the bench's
   Playwright container (`intelcost-infra`, the `browser` service), in the same window
   size (1440 × 900). The new app runs on the bench (`http://localhost:5173`), signed in
   as a throwaway account seeded with `scripts/seed.py --reset`, never the seeded account.
2. **List every visible thing, both sides:** each control (buttons, toggles, carets,
   inputs), each menu item in order, each label and title (tooltip), each panel and its
   sections, each default (what is on, selected or filled when the screen opens), and each
   state change (what a click, a key or a right-click changes, and what it says).
3. **Take throwaway screenshots of both** into `intelcost-infra/browser/shots/`
   (git-ignored), look at them side by side, and delete them when the report is written.
4. **Report every difference**: missing, extra, reworded, reordered, different default,
   different behaviour. A difference kept on purpose names the decision (`D-NN`) that
   keeps it.
5. **Build to the list.** A difference not kept by a decision is work: it goes into the
   block, or, if it belongs to another feature, into that feature's spec or PARITY line.

## Legacy access

- **Credentials** live in `intelcost-infra/.env.legacy`: `LEGACY_URL`, `LEGACY_EMAIL`,
  `LEGACY_PASSWORD`. The file is git-ignored. **Never print, commit or copy them**: pass
  them into the container as environment variables without echoing them
  (`set -a; . ./.env.legacy; set +a` then `-e LEGACY_URL -e LEGACY_EMAIL -e LEGACY_PASSWORD`),
  and never write them into a script, a log, a screenshot name or a report.
- Legacy is in testing with no real customers. Create, edit and delete are allowed,
  preferably in its dedicated test project (**"Bench comparison"**), never in anyone
  else's.
- A comparison script is throwaway: written into `intelcost-infra/browser/`, run once,
  deleted with its screenshots. It is a way of looking, not a test (hard rule 8): it
  asserts nothing and is never kept.

```bash
cd intelcost-infra
set -a; . ./.env.legacy; set +a
docker compose --profile browser run --rm -e LEGACY_URL -e LEGACY_EMAIL -e LEGACY_PASSWORD \
  browser node scripts/<throwaway>.mjs
```

## Where the findings go

The session's report lists every difference. Each one that is not kept by a decision
becomes a line in the feature's spec (its block's work) or its PARITY line.
