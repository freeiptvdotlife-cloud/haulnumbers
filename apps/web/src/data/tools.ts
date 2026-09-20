import type { IconName } from "../lib/icons";

/** Single source of truth for the calculators: navigation, homepage cards and related links all read this. */
export interface Tool {
  /** Path with leading and trailing slash. */
  path: string;
  name: string;
  /** Short label for the header navigation. */
  navLabel: string;
  /** One-sentence description for cards and related links. */
  blurb: string;
  icon: IconName;
  /** Which stage of the work this tool helps with (see TOOL_GROUPS). */
  group: ToolGroupId;
  /** When a driver would reach for it; shown on the calculators hub page. */
  useWhen: string;
  /** The guide that explains this tool in depth (path under /guides/). */
  guide?: string;
}

export type ToolGroupId = "price" | "paid" | "taxes";

export const TOOL_GROUPS: readonly { id: ToolGroupId; title: string; intro: string }[] = [
  { id: "price", title: "Price the load", intro: "Know your costs and your real profit before you say yes to a load." },
  { id: "paid", title: "Get paid what you are owed", intro: "Turn waiting time into an invoice line." },
  { id: "taxes", title: "Taxes and paperwork", intro: "Estimate fuel tax and deductions before you file." },
];

export const TOOLS: readonly Tool[] = [
  { path: "/cost-per-mile-calculator/", icon: "gauge", name: "Cost per mile calculator", navLabel: "Cost per mile", blurb: "Find your true cost per mile and the break-even and target rate you need to charge.", group: "price", useWhen: "Use it every month, and again whenever fuel or insurance costs change, so you always know the lowest rate you can accept.", guide: "/guides/how-to-calculate-cost-per-mile/" },
  { path: "/load-profit-calculator/", icon: "trend", name: "Load profit calculator", navLabel: "Load profit", blurb: "See your real profit per mile including deadhead, and the lowest pay worth accepting.", group: "price", useWhen: "Use it on every load offer before you agree, especially when the pickup is far from where you are.", guide: "/guides/deadhead-miles-explained/" },
  { path: "/detention-pay-calculator/", icon: "clock", name: "Detention pay calculator", navLabel: "Detention pay", blurb: "Work out what you are owed for waiting past free time, including waits past midnight.", group: "paid", useWhen: "Use it when a shipper or receiver keeps you waiting, to know what to invoice.", guide: "/guides/detention-pay-guide/" },
  { path: "/ifta-calculator/", icon: "fuel", name: "IFTA fuel tax calculator", navLabel: "IFTA", blurb: "Estimate your quarterly diesel fuel tax by state, using the official IFTA rates.", group: "taxes", useWhen: "Use it near the end of each quarter to estimate what you will owe, or get back, before you file.", guide: "/guides/ifta-explained/" },
  { path: "/per-diem-calculator/", icon: "calendar", name: "Per diem calculator", navLabel: "Per diem", blurb: "Estimate your meal per diem deduction using the IRS special rate for truckers.", group: "taxes", useWhen: "Use it at tax time, or through the year, to see what your days away from home are worth as a deduction.", guide: "/guides/trucker-per-diem-guide/" },
];
