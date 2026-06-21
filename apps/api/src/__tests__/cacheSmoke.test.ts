import { describe, it, expect } from "vitest";
import { cacheKey } from "../factorCache.js";

describe("cacheKey", () => {
  it("normalises case and whitespace", () => {
    const a = cacheKey("Leather Sofa", "kg CO2e/item");
    const b = cacheKey(" leather sofa ", "kg CO2e/item");
    expect(a).toBe(b);
  });

  it("distinguishes different items", () => {
    const a = cacheKey("Leather Sofa", "kg CO2e/item");
    const b = cacheKey("Fabric Sofa", "kg CO2e/item");
    expect(a).not.toBe(b);
  });

  it("distinguishes different units", () => {
    const a = cacheKey("Sofa", "kg CO2e/item");
    const b = cacheKey("Sofa", "kg CO2e/unit");
    expect(a).not.toBe(b);
  });
});
