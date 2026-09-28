# Changed since the fixture archive

The fixture suite was archived at tag `fixtures-archive-2026-09-28` (D-68). Everything below
changed after that tag, and was proved only by the gates, the shared quantity table and a
throwaway smoke check. **The full run restored from the tag, required before any deploy to
testers or promotion to `main`, must cover every row**, and the fixtures a row names may
need updating before they pass.

Restore steps: `intelcost-infra/README.md`, "The fixture suite, archived".

| Date | Feature | What changed | Smoke check | Archived fixtures likely affected |
|---|---|---|---|---|
