# Haul Numbers

Free, accurate calculators for owner-operator truckers, on the web (AdSense) and Android (AdMob).
Domain (planned): `haulnumbers.com` · Android package (planned): `com.haulnumbers.app`

## Repo layout
```
packages/core   Pure TypeScript calculation engine (no DOM, no I/O). Shared by web and app.
apps/web        Astro static site (SEO pages + calculator islands).
apps/mobile     Expo / React Native Android app (Phase 3, not yet created).
docs/           Planning and engineering docs (start here).
```

## Commands
```bash
npm install
npm test               # core unit tests + compliance-gate tests
npm run typecheck      # core + web
npm run dev:web        # local dev server
npm run build:web      # static build to apps/web/dist
npm run check:compliance   # AdSense compliance gate on the built site (see docs/05, docs/06)
npm run update:ifta-rates -w @haulnumbers/core -- 2026Q4   # refresh IFTA rates (see docs/06)
```

## Docs index
| Doc | Purpose |
|---|---|
| [00-overview](docs/00-overview.md) | Vision, audience, principles, success metrics |
| [01-roadmap](docs/01-roadmap.md) | All phases, tasks, exit criteria |
| [02-architecture](docs/02-architecture.md) | Stack, structure, data flow, performance budgets |
| [03-calculator-specs](docs/03-calculator-specs.md) | Formulas, inputs, edge cases per tool |
| [04-seo-plan](docs/04-seo-plan.md) | Keyword strategy, page templates, indexing |
| [05-monetization-compliance](docs/05-monetization-compliance.md) | **Verified AdSense/AdMob rules and how we comply**, consent, Play policy |
| [06-quality-and-ops](docs/06-quality-and-ops.md) | Testing, CI/CD, data freshness, risks |
| [07-decisions](docs/07-decisions.md) | Decision log and open questions |

## Status
Phase 0 complete. Phase 1 in progress: all five calculators are built (cost per mile, load profit, detention pay, IFTA, per diem; core + tests + web pages). Shared UI components and the calculators hub are done. Remaining: a11y/Lighthouse pass (needs a real browser), per-tool content review. See the roadmap.
