import { vi, describe, it, expect, beforeEach } from "vitest";

// vi.mock is hoisted before any import, so this intercepts the client module
// both here and inside resolveFactor.ts (same resolved path).
vi.mock("../gemini/client.js", () => ({
  genai: vi.fn(),
}));

// resolveFactor reads/writes the Firestore-backed factor cache; stub it so the
// test never touches Firestore (which would hang in CI with no credentials).
vi.mock("../factorCache.js", () => ({
  cacheKey: (lookupTerm: string, unit: string) => `${unit}:${lookupTerm}`,
  getCachedFactor: vi.fn(async () => null),
  putCachedFactor: vi.fn(async () => {}),
}));

import { resolveFactor } from "../gemini/resolveFactor.js";
import { genai } from "../gemini/client.js";

const mockGenerateContent = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(genai).mockReturnValue({
    models: { generateContent: mockGenerateContent },
  } as any);
});

function fakeResponse(payload: object, groundingUri?: string) {
  return {
    text: JSON.stringify(payload),
    candidates: groundingUri
      ? [{ groundingMetadata: { groundingChunks: [{ web: { uri: groundingUri } }] } }]
      : [],
  };
}

describe("resolveFactor", () => {
  it("returns null when confidence is 'low'", async () => {
    mockGenerateContent.mockResolvedValue(
      fakeResponse({ perUnitFactor: 0.5, unit: "kg_co2e_per_pkm", source: "unknown", confidence: "low" }),
    );
    expect(await resolveFactor("mystery item", "kg_co2e_per_pkm")).toBeNull();
  });

  it("returns null when perUnitFactor is null", async () => {
    mockGenerateContent.mockResolvedValue(
      fakeResponse({ perUnitFactor: null, unit: "kg_co2e_per_pkm", source: "not found", confidence: "low" }),
    );
    expect(await resolveFactor("unknown item", "kg_co2e_per_pkm")).toBeNull();
  });

  it("returns null when perUnitFactor is zero or negative", async () => {
    mockGenerateContent.mockResolvedValue(
      fakeResponse({ perUnitFactor: 0, unit: "kg_co2e_per_pkm", source: "test", confidence: "high" }),
    );
    expect(await resolveFactor("zero item", "kg_co2e_per_pkm")).toBeNull();
  });

  it("returns a valid object for a high-confidence result", async () => {
    mockGenerateContent.mockResolvedValue(
      fakeResponse(
        { perUnitFactor: 0.012, unit: "kg_co2e_per_pkm", source: "CEA 2023", confidence: "high" },
        "https://cea.nic.in/report",
      ),
    );
    const result = await resolveFactor("electric train India", "kg_co2e_per_pkm");
    expect(result).not.toBeNull();
    expect(result?.perUnitFactor).toBe(0.012);
    expect(result?.unit).toBe("kg_co2e_per_pkm");
    expect(result?.source).toBe("CEA 2023");
    expect(result?.confidence).toBe("high");
    expect(result?.sourceUrl).toBe("https://cea.nic.in/report");
  });

  it("returns a valid object for a medium-confidence result", async () => {
    mockGenerateContent.mockResolvedValue(
      fakeResponse({ perUnitFactor: 0.015, unit: "kg_co2e_per_pkm", source: "IMO 2020", confidence: "medium" }),
    );
    const result = await resolveFactor("cargo ship", "kg_co2e_per_pkm");
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("medium");
    expect(result?.sourceUrl).toBeUndefined();
  });

  it("returns null when the Gemini call throws", async () => {
    mockGenerateContent.mockRejectedValue(new Error("network error"));
    expect(await resolveFactor("whatever", "kg_co2e_per_pkm")).toBeNull();
  });

  it("returns null when the response contains invalid JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json at all", candidates: [] });
    expect(await resolveFactor("bad response", "kg_co2e_per_pkm")).toBeNull();
  });
});
