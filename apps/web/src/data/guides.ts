import type { Source } from "./site";

/** The guides. The index page, nav, related links and sitemap all read this list. */
export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** ISO date of the last substantive review. Bump it when the content or its sources change. */
  updated: string;
  /**
   * ISO date the content was last checked against `sources` below. Optional for now: existing
   * guides don't have sourced content yet (that backfill is Phase 1 of the content pipeline
   * build, docs/strategy/04-content-pipeline.md section 11) — this just adds the capability.
   */
  reviewed?: string;
  /** Official sources the guide cites. Optional for the same reason as `reviewed`. */
  sources?: Source[];
  /** Calculator pages this guide should link to. */
  tools: string[];
}

export const GUIDES: readonly Guide[] = [
  {
    slug: "how-to-calculate-cost-per-mile",
    title: "How to Calculate Cost Per Mile as an Owner-Operator",
    description: "Step-by-step guide to your trucking cost per mile, break-even rate and target rate, with a worked example and the mistakes that make the number wrong.",
    updated: "2026-09-20",
    tools: ["/cost-per-mile-calculator/", "/load-profit-calculator/"],
  },
  {
    slug: "deadhead-miles-explained",
    title: "Deadhead Miles: How Empty Miles Change What You Earn",
    description: "What deadhead miles really cost, how to work out your all-in rate per mile, and the rate per loaded mile you need to ask for.",
    updated: "2026-09-20",
    tools: ["/load-profit-calculator/", "/cost-per-mile-calculator/"],
  },
  {
    slug: "ifta-explained",
    title: "IFTA Explained: How the Quarterly Fuel Tax Return Works",
    description: "How an IFTA return is worked out: fleet MPG, taxable gallons, credits, the Kentucky and Virginia surcharges, rounding, and the mistakes to avoid.",
    updated: "2026-09-20",
    tools: ["/ifta-calculator/"],
  },
  {
    slug: "detention-pay-guide",
    title: "Detention Pay for Truckers: How It Works and How to Document It",
    description: "How detention pay is calculated, why free time is counted per stop, and what records and timing help you get paid for waiting.",
    updated: "2026-09-20",
    tools: ["/detention-pay-calculator/", "/load-profit-calculator/"],
  },
  {
    slug: "trucker-per-diem-guide",
    title: "Trucker Per Diem: The IRS Special Rate and the 80% Rule",
    description: "Who can use the IRS special per diem rate for transportation workers, how days are counted, why 80% is deductible, and what to keep on record.",
    updated: "2026-09-20",
    tools: ["/per-diem-calculator/"],
  },
];
