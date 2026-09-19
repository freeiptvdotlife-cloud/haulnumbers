import type { FieldError } from "@haulnumbers/core";

/** Turns core field errors into "Label: message" lines and the set of input names to highlight. */
export function describeErrors(errors: FieldError[], toInput: (coreField: string) => string, labels: Record<string, string>) {
  const bad = new Set<string>();
  const messages = errors.map((e) => {
    const name = toInput(e.field);
    bad.add(name);
    return `${labels[name] ?? name}: ${e.message}`;
  });
  return { messages, bad };
}
