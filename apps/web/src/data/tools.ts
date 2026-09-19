/** Single source of truth for the calculators: navigation, homepage cards and related links all read this. */
export interface Tool {
  /** Path with leading and trailing slash. */
  path: string;
  name: string;
  /** Short label for the header navigation. */
  navLabel: string;
  /** One-sentence description for cards and related links. */
  blurb: string;
}

export const TOOLS: readonly Tool[] = [
  { path: "/cost-per-mile-calculator/", name: "Cost per mile calculator", navLabel: "Cost per mile", blurb: "Find your true cost per mile and the break-even and target rate you need to charge." },
  { path: "/load-profit-calculator/", name: "Load profit calculator", navLabel: "Load profit", blurb: "See your real profit per mile including deadhead, and the lowest pay worth accepting." },
  { path: "/detention-pay-calculator/", name: "Detention pay calculator", navLabel: "Detention pay", blurb: "Work out what you are owed for waiting past free time, including waits past midnight." },
  { path: "/ifta-calculator/", name: "IFTA fuel tax calculator", navLabel: "IFTA", blurb: "Estimate your quarterly diesel fuel tax by state, using the official IFTA rates." },
  { path: "/per-diem-calculator/", name: "Per diem calculator", navLabel: "Per diem", blurb: "Estimate your meal per diem deduction using the IRS special rate for truckers." },
];
