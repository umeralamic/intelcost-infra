# TypeScript / React (Vite) — code style

Applies to `intelcost-app`, and describes the shape the legacy `intelcost` SPA is
being ported into. Reads on top of [house_style.md](house_style.md).

**Installed toolchain, 2026-09-08:** Node 24.15.0, npm 11.13.0, Bun 1.3.13.
Target React 18, Vite 5, TypeScript 5, Tailwind 3 (per D-04).

---

## Layout

```
intelcost-app/
  src/
    main.tsx
    App.tsx                # router only
    index.css              # the tokens. The single source for colour, radius, shadow.
    config/                # env, routes, feature flags
    core/                  # shared, feature-agnostic
      api/                 # the generated client + the fetch wrapper. The only place fetch is called.
      auth/                # session context, guards
      hooks/
      utils/
    components/
      ui/                  # shadcn primitives. Unmodified where possible.
      <shared>/            # cross-feature composites
    features/
      <feature>/
        components/
        hooks/
        api.ts             # this feature's calls, built on core/api
        index.ts           # the public surface. Siblings import this and nothing deeper.
    lib/
      takeoff/             # THE CORE. No React, no network. See the rule below.
    pages/                 # one file per route, composition only
```

## Rules

1. **`src/lib/takeoff` is isomorphic and stays that way.** Zero React imports, zero
   `fetch`, zero client SDK. It takes data in and returns data out. This is what lets
   the same quantity math run in the canvas and later in a Celery worker. A lint rule
   guards it; do not weaken the rule to land a feature.
2. **Features import a sibling's `index.ts`, never its internals.** If you need
   something deeper, the surface is wrong, so fix the surface.
3. **`core/api` is the only module that calls `fetch`.** A component never builds a
   URL. A feature's `api.ts` composes the wrapper.
4. **Pages compose, they do not implement.** A page file wires layout and features
   together. Logic that grows in a page belongs in the feature.
5. **No hard-coded colour, radius or shadow.** Every value is a token from
   `index.css`, consumed through Tailwind. A hex in a component is a bug. See
   [design.md](design.md).
6. **Server state is TanStack Query.** Local state is `useState`. There is no third
   state library. A query key names the resource and its scope.
7. **Forms are schema-driven.** zod plus react-hook-form. Submit is disabled while
   pending and the form resets on success.
8. **Files and folders are `kebab-case`. Components are `PascalCase`.**

## UI completeness

Every asynchronous or stateful flow handles four states through one status field:
**loading, error, empty, success**. A screen that renders only the happy path is not
finished. Modals open, close on success, cancel, backdrop and escape, and reset
their state together. This is checked in the browser, not read from the source.

## The canvas is the exception that proves the rule

The takeoff canvas is performance-critical and does not follow ordinary React
patterns. It owns imperative state, uses refs over state deliberately, and batches
paints. That is allowed and intended. What is not allowed is letting that style leak
outward: everything outside `features/takeoff/canvas` is ordinary declarative React.

## Prose

No em dashes in comments or copy. Comments explain why, not what.
