/** The calculators, in the order they are listed. `route` is the expo-router path. */
export interface Tool {
  route: string;
  name: string;
  blurb: string;
}

export const TOOLS: readonly Tool[] = [
  { route: "/cost-per-mile", name: "Cost per mile", blurb: "Your true cost per mile and the rate you need to charge." },
  { route: "/load-profit", name: "Load profit", blurb: "Real profit per mile including deadhead, and the lowest pay worth accepting." },
  { route: "/detention", name: "Detention pay", blurb: "What you are owed for waiting past free time, including past midnight." },
  { route: "/ifta", name: "IFTA fuel tax", blurb: "Estimate quarterly diesel fuel tax by state with the official IFTA rates." },
  { route: "/per-diem", name: "Per diem", blurb: "Estimate your meal per diem deduction using the IRS special trucker rate." },
];
