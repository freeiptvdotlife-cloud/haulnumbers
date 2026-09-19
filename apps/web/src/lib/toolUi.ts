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

/** Fills a <dl> with label/value rows; `big` rows get the headline style. */
export function renderRows(dl: HTMLElement, rows: Row[]): void {
  for (const [label, value, big] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    if (big) dd.className = "big";
    dl.append(dt, dd);
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
