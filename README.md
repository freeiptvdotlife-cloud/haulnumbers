# Haul Numbers

Free, accurate calculators for owner-operator truckers, on the web (AdSense) and Android (AdMob).
Domain (planned): `haulnumbers.com` · Android package (planned): `com.haulnumbers.app`

## Repo layout
```
packages/core   Pure TypeScript calculation engine (no DOM, no I/O). Shared by web and app.
apps/web        Astro static site (SEO pages + calculator islands).
apps/mobile     Expo (SDK 57) Android app: the five calculators plus consent-gated AdMob.
docs/           Planning and engineering docs (start here).
```

## Commands
```bash
npm install
npm test               # core + compliance-gate + mobile tests
npm run typecheck      # core + web + mobile
npm run bundle:mobile  # full Android Hermes bundle (proves the shared core bundles)
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
| [08-launch-checklist](docs/08-launch-checklist.md) | **Everything that needs your domain or approvals, step by step** |
| [store/listing.md](docs/store/listing.md) | Google Play listing draft, data-safety notes, assets |

## Status (2026-09-20)
Phase 0 complete. Phase 1 in progress: all five calculators are built (cost per mile, load profit, detention pay, IFTA, per diem; core + tests + web pages). Shared UI components and the calculators hub are done. Phase 3 in progress: the Android app has all five calculators and the consent-gated ad layer (tests and bundle green); a native build and on-device checks are pending. See the roadmap.
