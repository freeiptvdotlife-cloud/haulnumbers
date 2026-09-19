import { int, num, numOr0, pct, usd } from "./format";

describe("format", () => {
  it("formats dollars like the website", () => {
    expect(usd(1266.62)).toBe("$1,266.62");
    expect(usd(-314.38)).toBe("-$314.38");
    expect(usd(1.267, 3)).toBe("$1.267");
    expect(usd(1234567.891)).toBe("$1,234,567.89");
    expect(usd(0)).toBe("$0.00");
    expect(usd(999)).toBe("$999.00");
  });

  it("never shows a negative zero", () => {
    expect(usd(-0)).toBe("$0.00");
    expect(usd(-0.004)).toBe("$0.00");
    expect(usd(-0.0004, 3)).toBe("$0.000");
  });

  it("groups whole numbers", () => {
    expect(int(10000)).toBe("10,000");
    expect(int(-1250)).toBe("-1,250");
    expect(int(7)).toBe("7");
  });

  it("treats a blank field as NaN (an error), never as zero", () => {
    expect(Number.isNaN(num(""))).toBe(true);
    expect(Number.isNaN(num("   "))).toBe(true);
    expect(num("6.5")).toBe(6.5);
    expect(Number.isNaN(num("abc"))).toBe(true);
  });

  it("treats a blank optional field as zero", () => {
    expect(numOr0("")).toBe(0);
    expect(numOr0(" 12 ")).toBe(12);
  });

  it("formats fractions as percentages", () => {
    expect(pct(0.2)).toBe("20%");
    expect(pct(0.1234)).toBe("12.3%");
    expect(pct(0)).toBe("0%");
  });
});
