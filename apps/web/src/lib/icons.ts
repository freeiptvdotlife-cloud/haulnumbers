/** Feather/Lucide-style 24x24 stroke icons as raw path data, shared by server components and client scripts. No dependency. */
export const ICONS = {
  truck: ["M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2", "M15 18H9", "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14", "M19 18a2 2 0 1 0-4 0a2 2 0 1 0 4 0", "M9 18a2 2 0 1 0-4 0a2 2 0 1 0 4 0"],
  dollar: ["M12 2v20", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
  fuel: ["M3 22h12", "M4 9h10", "M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18", "M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"],
  clock: ["M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20", "M12 6v6l4 2"],
  calendar: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
  route: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z", "M15 10a3 3 0 1 0-6 0a3 3 0 1 0 6 0"],
  trend: ["M22 7l-8.5 8.5-5-5L2 17", "M16 7h6v6"],
  gauge: ["M12 14l4-4", "M3.34 19a10 10 0 1 1 17.32 0"],
  percent: ["M19 5L5 19", "M8.5 6.5a2 2 0 1 1-4 0a2 2 0 1 1 4 0", "M19.5 17.5a2 2 0 1 1-4 0a2 2 0 1 1 4 0"],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  calc: ["M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M8 6h8", "M8 10h.01", "M12 10h.01", "M16 10h.01", "M8 14h.01", "M12 14h.01", "M16 14h.01", "M8 18h.01", "M12 18h.01"],
  alert: ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M18 6L6 18", "M6 6l12 12"],
  arrow: ["M5 12h14", "M12 5l7 7-7 7"],
  sun: ["M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z", "M12 1v2", "M12 21v2", "M4.22 4.22l1.42 1.42", "M18.36 18.36l1.42 1.42", "M1 12h2", "M21 12h2", "M4.22 19.78l1.42-1.42", "M18.36 5.64l1.42-1.42"],
  moon: ["M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z"],
} as const;

export type IconName = keyof typeof ICONS;

/** Picks an icon for a label such as "Fuel cost" or "Deadhead share of miles". */
export function iconFor(label: string): IconName {
  const t = label.toLowerCase();
  if (/profit|savings/.test(t)) return "trend";
  if (/fuel|gallon|mpg|diesel/.test(t)) return "fuel";
  if (/time|hour|wait|detention|layover|free/.test(t)) return "clock";
  if (/\bday|per diem/.test(t)) return "calendar";
  if (/tax|deduct|percent|%|margin|share/.test(t)) return "percent";
  if (/deadhead/.test(t)) return "route";
  if (/rate|pay|cost|gross|fee|total|owed|usd/.test(t)) return "dollar";
  if (/mile/.test(t)) return "route";
  if (/truck|insurance|permit|maintenance|tire|fixed/.test(t)) return "truck";
  return "dollar";
}

const NS = "http://www.w3.org/2000/svg";

/** Builds an icon element with DOM calls only (no innerHTML). Decorative: hidden from assistive tech. */
export function svgIcon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false", class: "ico" })) svg.setAttribute(k, v);
  for (const d of ICONS[name]) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}
