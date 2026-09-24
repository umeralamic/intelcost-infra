# TypeScript / Next.js — code style

Applies to `intelcost-market-next`. Reads on top of
[house_style.md](house_style.md).

**Stack:** Next.js 16 (App Router), React 19, Tailwind 4, TypeScript 5 strict.
Node 24.15.0 installed.

---

## Layout

```
intelcost-market-next/
  src/
    app/
      globals.css          # @theme tokens. The single source.
      (marketing)/         # the public routes
      api/demo-request/    # the one route that leaves the building
    components/
    config/
      site.ts              # ROUTES. The sitemap reads this list.
      content.ts           # all copy and media references
      plans.ts             # price mirror of the app catalogue
    assets/media/          # static imports for next/image
```

## Rules

1. **Pages stay static.** `npm run build` must report every marketing route as
   `○ (Static)`. A route that flips to `ƒ (Dynamic)` has a request-time dependency
   that needs finding, not accepting.
2. **Client components are the exception.** Only add `"use client"` for a real
   interaction. Today there are four: `SiteHeader`, `CtaPair`, `PricingSection`,
   `RequestDemoDialog`.
3. **A new public page means editing `ROUTES` in `src/config/site.ts`.** The sitemap
   reads that list, so a page missing from it is a page Google is never told about.
4. **Copy and media live in `src/config/content.ts`.** A wording change is a
   constants edit, not a component rewrite.
5. **Images are static imports** from `src/assets/media`, never a bare `public/`
   path and never a raw `<img>`, so `next/image` reserves the box and CLS stays at
   zero. Alt text describes what the capture shows.
6. **No hard-coded colour.** Every colour is a token in `globals.css`. Same for the
   type ramp and the radii.
7. **This repo owns no session, no database, no money.** No auth client, no Stripe.
   If a task seems to need a database call here, it is the wrong repo. Lead capture
   through `/api/demo-request` is the single exception.
8. **`NEXT_PUBLIC_*` ships to the browser.** `LEADS_TOKEN` must never gain that prefix.
9. **Never print a number we cannot honour.** Trial length stays neutral copy; the
   app resolves the real regional value behind auth. Prices come from `plans.ts` and
   must match the app catalogue, changed in the same pull request.

## Prose

No em dashes, in code or in marketing copy.
