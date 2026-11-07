# Deploy settings (for Abdullah)

The api's settings a deploy must set, beyond the ones in `intelcost-app-fastapi/.env.example`'s defaults. Each
lives on the **api, worker and beat** services (they share the api's environment) and nowhere else: never in a
`VITE_*` or `NEXT_PUBLIC_*` variable, never in a repo, never in a log (hard rule 5). Stripe has its own
checklist: [tasks/F16_GO_LIVE.md](tasks/F16_GO_LIVE.md).

| Setting | What it is | Unset |
|---|---|---|
| `EIA_API_KEY` | EIA open data key, for the weekly fuel refresh (D-940) | the fuel snapshot stands |
| `BLS_API_KEY` | BLS public data key, for OEWS wages and the ECI escalation index (D-1030, D-1031). On the bench it lives in `intelcost-infra/.env.ai` (template `.env.ai.example`) | the files in `BLS_BULK_DIR` are read, with one warning (empty counts as unset) |
| `BLS_BULK_DIR` | where the BLS files sit: bulk downloads (`*.data.*`) and saved v2 answers (`*.json`), default `/test-data-local/wage/raw` | only used with no key |
| `MAXMIND_ACCOUNT_ID`, `MAXMIND_LICENSE_KEY` | geo detection for trial tiers | geo detection is inert (not broken) |

Check a BLS key after setting it: `docker compose exec api python scripts/bls_check.py` prints "BLS key works"
(never the key, never a figure).
