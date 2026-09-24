# House Style

Abdullah's cross-cutting coding principles. They apply to every workspace
and every stack (Python, TypeScript, Rust), above any single-language
guide. On design philosophy these win; on language mechanics the
per-language guide still wins.

Overwatch propagates this file verbatim into each workspace's
`docs/code_style/house_style.md`. Sentinel checks repo code against it and
reports drift. Edit the user-level canonical at
`~/.claude/skills/overwatch/templates/house_style.md`, not the per-workspace
copies.

## P1. Cohesion: related things live together

One concept has one home. A feature's models sit in a single `models.py`.
The provider implementations of one service sit in one package. Sibling
units (for example agents) live under one parent app. A file becomes a
package only along a real sub-concern (for example `schemas/person.py`
plus `schemas/company.py`, or `routes/person_route.py` plus
`routes/company_route.py`), never to chase a line count. Reading the tree,
related code should be adjacent, not scattered.

## P2. Abstract base classes for shared structure (without `abc`)

Shared structure goes into a base class that is abstract by intent: not
meant to be instantiated on its own, only specialized. This is built with
plain base classes and mixins, not the `abc` module. No `ABC`, no
`@abstractmethod`, no `Protocol`, no `Generic` ceremony.

- ORM: every model carries `ModelMixin` (id, uuid, timestamps). Never
  re-declare those fields.
- Schemas: an `<Entity>Base` holds the shared fields; `Create`, `Read`,
  and `Update` extend it; a richer view extends a simpler one (for example
  `Detail` extends `Read`).
- Real is-a hierarchies use inheritance at the data layer too, for example
  a joined-table `Profile` base with `UserProfile` and `CompanyProfile`
  children.

The base owns what is shared. Children add only what is theirs.

## P3. One surface per concern

Each shared concern exposes a single entry point, and callers depend on
that surface, not its internals. One data-access call (for example
`build_context(session)`) rather than each caller reading tables directly.
A dispatcher hides which provider runs. A registry hides the list. If a
caller reaches past the surface into internals, the surface is wrong.

## P4. Reuse over duplication

Build a mechanism once and reuse it. One generic `runs` / `run_steps`
serves every agent, not per-agent run tables. One shared bundle feeds many
consumers. One shared UI primitive is written once. When two places need
the same shape or logic, lift it into a base or a shared module instead of
copying it.

## P5. API and naming conventions

- Endpoints are singular unless a plural is explicitly meaningful:
  `/api/profile/person`, `/api/profile/company`, not `/api/profiles`.
- Public surfaces expose `uuid`, never the internal `id`.
- Files and directories: `snake_case` (Python), `kebab-case` (TypeScript).
  Classes `PascalCase`. Functions `snake_case` or `camelCase` per language.
- Services are functions, not one-method classes. The only classes are
  models, schemas, and abstract bases.

## P6. Prose in code and docs

No em dashes anywhere (comments, docstrings, commit messages, docs). Use
periods, commas, colons, or parentheses. Calm, plain, exact. The full
writing voice lives in the global working contract.
