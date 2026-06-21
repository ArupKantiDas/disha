import { describe, it, expect } from "vitest";
import { parseResultZod } from "../gemini/schema.js";

const validIntent = {
  category: "transport" as const,
  summary: "Mumbai to Pune",
};

const flightCandidate = {
  label: "Flight",
  mode: "flight",
  factorKey: "transport.flight_domestic",
  distanceKm: 500,
};

const trainCandidate = {
  label: "Train (AC)",
  mode: "train",
  factorKey: "transport.train_ac_electric",
  distanceKm: 500,
};

describe("parseResultZod - valid input", () => {
  it("accepts a minimal valid {intent, candidates[2]}", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [flightCandidate, trainCandidate],
    });
    expect(result.success).toBe(true);
  });

  it("accepts all intent categories", () => {
    const categories = ["transport", "appliance", "diet", "goods", "other"] as const;
    for (const category of categories) {
      const result = parseResultZod.safeParse({
        intent: { category, summary: "test" },
        candidates: [flightCandidate, trainCandidate],
      });
      expect(result.success, `category "${category}" should be valid`).toBe(true);
    }
  });

  it("accepts optional intent fields (origin, destination, defaultMode, notes)", () => {
    const result = parseResultZod.safeParse({
      intent: {
        ...validIntent,
        origin: "Mumbai",
        destination: "Pune",
        defaultMode: "flight",
        notes: "business trip",
      },
      candidates: [flightCandidate, trainCandidate],
    });
    expect(result.success).toBe(true);
  });

  it("accepts more than 2 candidates", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [
        flightCandidate,
        trainCandidate,
        { label: "Bus", mode: "bus", factorKey: "transport.bus_intercity", distanceKm: 500 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("parseResultZod - unknown factorKey", () => {
  it("rejects a candidate with an unknown factorKey", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [
        { label: "Magic carpet", mode: "carpet", factorKey: "transport.magic_carpet", distanceKm: 500 },
        trainCandidate,
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("parseResultZod - dynamic.lookup refine", () => {
  it("rejects dynamic.lookup without lookupTerm and factorUnit", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [
        { label: "Cargo ship", mode: "ship", factorKey: "dynamic.lookup", distanceKm: 1000 },
        trainCandidate,
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects dynamic.lookup with lookupTerm but missing factorUnit", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [
        {
          label: "Cargo ship",
          mode: "ship",
          factorKey: "dynamic.lookup",
          distanceKm: 1000,
          lookupTerm: "cargo ship per tonne km",
          // factorUnit deliberately omitted
        },
        trainCandidate,
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts dynamic.lookup with both lookupTerm and factorUnit", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [
        {
          label: "Cargo ship",
          mode: "ship",
          factorKey: "dynamic.lookup",
          distanceKm: 1000,
          lookupTerm: "cargo ship emission factor per tonne km",
          factorUnit: "kg_co2e_per_pkm",
        },
        trainCandidate,
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("parseResultZod - minimum candidates", () => {
  it("rejects fewer than 2 candidates", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [flightCandidate],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty candidates array", () => {
    const result = parseResultZod.safeParse({
      intent: validIntent,
      candidates: [],
    });
    expect(result.success).toBe(false);
  });
});
