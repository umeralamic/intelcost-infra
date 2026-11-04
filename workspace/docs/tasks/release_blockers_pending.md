# Release blockers pending: for the next release queue

Written 2026-11-04 from the founder's answers to the 2026-11-03 report. Each is to be done in the next
release queue, before `./fx-suite.sh release` runs. Nothing here was done in the 2026-11-04 queue (no fx release
ran in it).

| Q | Item | What to do |
|---|---|---|
| Q142 | fx apis without watchfiles in a release | `api-fx` and `api-fx-b` run uvicorn under watchfiles; its ENOMEM killed api-fx twice on 2026-11-03. Give the apis the workers' `FX_WATCH=0` switch (Q122): with it, `exec uvicorn` directly. `revive` keeps covering them. |
| Q144 | Raise the Docker VM's inotify limits | The ENOMEM came with over 6 GB free: the watcher's own allocation. Raise `fs.inotify.max_user_watches` and `fs.inotify.max_user_instances` in the Docker VM (WSL `.wslconfig` kernel command line or a sysctl at boot), and note the values in `intelcost-infra/README.md`. |
| Q145 | Update c32, c36, c46, c17 | They assert figures and a label changed on purpose: A1's tier (1,200 a day with 3 ADTs), the project's 8-hour day (A3 at 504), "Stripping" renamed "Site Prep". Update them in `fx-suite-updates/` as Q120's two were, before the release. |
| Q146 | c44, f5-big | c44 steps 2 and 7 time out waiting for the lines to change; f5-big draws in 24.1 s against D-43's 10 s bound while thumbnails are made. Both failed alone on 2026-11-02 and 2026-11-03. Find the cause before deploy. |
| Q147 | f4-s2, f5-s3, f7-a dev-server timeouts | `page.goto` to the :5176 dev server times out after 30 s waiting for "load", alone too; the HTML answers in under 10 ms, so the wait is Vite's module compile. Time a cold `/dev/ui` load on app-fx first. |
