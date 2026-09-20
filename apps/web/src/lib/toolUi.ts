import { iconFor, svgIcon } from "./icons";

// Client-side helpers shared by the calculator pages. DOM output is built with textContent only
// (never innerHTML), so user input can never inject markup.

export type Row = [label: string, value: string, big?: boolean];

export const usd = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

/** A blank field is NaN, so validation rejects it. Number("") would silently be 0. */
export const num = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? Number.NaN : Number(v);
};

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** The visible label text of a field, for error messages like "Tolls: Must be 0 or more." */
export function fieldLabel(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name) as HTMLElement | null;
  return (el?.closest("label")?.firstChild?.textContent ?? name).trim();
}

export function clearInvalid(form: HTMLFormElement): void {
  for (const el of Array.from(form.querySelectorAll("[aria-invalid]"))) el.removeAttribute("aria-invalid");
}

export function markInvalid(form: HTMLFormElement, name: string): void {
  (form.elements.namedItem(name) as HTMLElement | null)?.setAttribute("aria-invalid", "true");
}

export function showErrors(err: HTMLElement, parts: string[]): void {
  err.hidden = false;
  err.textContent = "Please check your entries. " + parts.join(" ");
}

export function hideErrors(err: HTMLElement): void {
  err.hidden = true;
}

/** Fills a <dl> with metric tiles (icon + label + value); `big` rows get the headline style. */
export function renderRows(dl: HTMLElement, rows: Row[]): void {
  for (const [label, value, big] of rows) {
    const tile = document.createElement("div");
    tile.className = big ? "metric big" : "metric";
    const dt = document.createElement("dt");
    dt.append(svgIcon(iconFor(label)), document.createTextNode(label));
    const dd = document.createElement("dd");
    dd.textContent = value;
    tile.append(dt, dd);
    dl.append(tile);
  }
}

export interface GaugePart {
  label: string;
  /** Size of the segment; only the proportions matter. Negative values count as zero. */
  value: number;
  /** Formatted amount shown in the legend. */
  text: string;
  tone: "a" | "b" | "c" | "d" | "e";
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Proportional bar in pure inline SVG plus a text legend (the legend carries the numbers, so the graphic is decorative).
 * Segments are updated in place, so the widths animate when the inputs change. Pass null to clear it.
 */
export function renderGauge(el: HTMLElement, title: string, parts: GaugePart[] | null): void {
  const live = (parts ?? []).filter((p) => Number.isFinite(p.value) && p.value > 0);
  const total = live.reduce((a, p) => a + p.value, 0);
  if (!parts || total <= 0) {
    el.replaceChildren();
    return;
  }
  let svg = el.querySelector("svg");
  if (!svg || svg.childElementCount !== live.length || el.dataset.title !== title) {
    el.replaceChildren();
    el.dataset.title = title;
    const h = document.createElement("h3");
    h.textContent = title;
    const bar = document.createElement("div");
    bar.className = "bar";
    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("height", "14");
    for (const p of live) {
      const r = document.createElementNS(SVG_NS, "rect");
      r.setAttribute("height", "14");
      r.setAttribute("class", `f-${p.tone}`);
      svg.append(r);
    }
    bar.append(svg);
    const ul = document.createElement("ul");
    ul.className = "legend";
    el.append(h, bar, ul);
  }
  let x = 0;
  live.forEach((p, i) => {
    const w = (p.value / total) * 100;
    const r = svg!.children[i] as SVGRectElement;
    r.setAttribute("x", `${x.toFixed(3)}%`);
    r.setAttribute("width", `${w.toFixed(3)}%`);
    x += w;
  });
  const ul = el.querySelector("ul") as HTMLElement;
  ul.replaceChildren();
  for (const p of live) {
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = `sw f-${p.tone}`;
    sw.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.textContent = p.label;
    const v = document.createElement("span");
    v.className = "v";
    v.textContent = p.text;
    li.append(sw, name, v);
    ul.append(li);
  }
}

/** Recalculate on every input, block real submits, and render once on load. */
export function bindForm(form: HTMLFormElement, run: () => void): void {
  form.addEventListener("input", run);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  run();
}
