/** Single source of truth for the calculators: navigation, homepage cards and related links all read this. */
export interface Tool {
  /** Path with leading and trailing slash. */
  path: string;
  name: string;
  /** Short label for the header navigation. */
  navLabel: string;
  /** One-sentence description for cards and related links. */
  blurb: string;
  /** Which stage of the work this tool helps with (see TOOL_GROUPS). */
  group: ToolGroupId;
  /** When a driver would reach for it; shown on the calculators hub page. */
  useWhen: string;
}

export type ToolGroupId = "price" | "paid" | "taxes";

export const TOOL_GROUPS: readonly { id: ToolGroupId; title: string; intro: string }[] = [
  { id: "price", title: "Price the load", intro: "Know your costs and your real profit before you say yes to a load." },
  { id: "paid", title: "Get paid what you are owed", intro: "Turn waiting time into an invoice line." },
  { id: "taxes", title: "Taxes and paperwork", intro: "Estimate fuel tax and deductions before you file." },
];

export const TOOLS: readonly Tool[] = [
  { path: "/cost-per-mile-calculator/", name: "Cost per mile calculator", navLabel: "Cost per mile", blurb: "Find your true cost per mile and the break-even and target rate you need to charge.", group: "price", useWhen: "Use it every month, and again whenever fuel or insurance costs change, so you always know the lowest rate you can accept." },
  { path: "/load-profit-calculator/", name: "Load profit calculator", navLabel: "Load profit", blurb: "See your real profit per mile including deadhead, and the lowest pay worth accepting.", group: "price", useWhen: "Use it on every load offer before you agree, especially when the pickup is far from where you are." },
  { path: "/detention-pay-calculator/", name: "Detention pay calculator", navLabel: "Detention pay", blurb: "Work out what you are owed for waiting past free time, including waits past midnight.", group: "paid", useWhen: "Use it when a shipper or receiver keeps you waiting, to know what to invoice." },
  { path: "/ifta-calculator/", name: "IFTA fuel tax calculator", navLabel: "IFTA", blurb: "Estimate your quarterly diesel fuel tax by state, using the official IFTA rates.", group: "taxes", useWhen: "Use it near the end of each quarter to estimate what you will owe, or get back, before you file." },
  { path: "/per-diem-calculator/", name: "Per diem calculator", navLabel: "Per diem", blurb: "Estimate your meal per diem deduction using the IRS special rate for truckers.", group: "taxes", useWhen: "Use it at tax time, or through the year, to see what your days away from home are worth as a deduction." },
];
