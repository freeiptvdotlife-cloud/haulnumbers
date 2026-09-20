import { asRecord, pickOneOf, pickStrings } from "./snapshot";

const defaults = { miles: "10000", mpg: "6.5" };

describe("pickStrings", () => {
  it("takes known string values and defaults the rest", () => {
    expect(pickStrings(defaults, { miles: "9000" })).toEqual({ miles: "9000", mpg: "6.5" });
  });
  it("ignores unknown keys, wrong types and absurdly long values", () => {
    expect(pickStrings(defaults, { miles: 9000, mpg: "x".repeat(33), extra: "boo" })).toEqual(defaults);
  });
  it("copes with non-objects", () => {
    for (const bad of [null, undefined, 5, "s", []]) expect(pickStrings(defaults, bad)).toEqual(defaults);
  });
  it("allows an empty string (a deliberately blank field)", () => {
    expect(pickStrings(defaults, { miles: "" }).miles).toBe("");
  });
});

describe("pickOneOf", () => {
  it("accepts only allowed values", () => {
    expect(pickOneOf("oconus", ["conus", "oconus"] as const, "conus")).toBe("oconus");
    expect(pickOneOf("mars", ["conus", "oconus"] as const, "conus")).toBe("conus");
    expect(pickOneOf(3, ["conus", "oconus"] as const, "conus")).toBe("conus");
  });
});

describe("asRecord", () => {
  it("returns objects and an empty object otherwise", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null)).toEqual({});
    expect(asRecord("x")).toEqual({});
  });
});
