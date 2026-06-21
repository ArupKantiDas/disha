import { describe, it, expect } from "vitest";
import { compare } from "../compare.js";
import type { ParseResult } from "@disha/shared";

// Real seeded factors (from india-factors.json):
// transport.flight_domestic : 0.246 kg/pkm
// transport.train_ac_electric: 0.012 kg/pkm <- greenest of the three
// transport.bus_intercity : 0.030 kg/pkm
//
// At DISTANCE_KM = 500:
// train ~ 6 kg (rank 1)
// bus ~ 15 kg (rank 2)
// flight ~ 123 kg (rank 3)
const DISTANCE_KM = 500;

function threeModeParsed(defaultMode?: string): ParseResult {
  return {
    intent: {
      category: "transport",
      summary: "Mumbai to Delhi journey",
      defaultMode,
    },
    candidates: [
      {
        label: "Flight",
        mode: "flight",
        factorKey: "transport.flight_domestic",
        distanceKm: DISTANCE_KM,
      },
      {
        label: "Train (AC)",
        mode: "train",
        factorKey: "transport.train_ac_electric",
        distanceKm: DISTANCE_KM,
      },
      {
        label: "Bus",
        mode: "bus",
        factorKey: "transport.bus_intercity",
        distanceKm: DISTANCE_KM,
      },
    ],
  };
}

describe("compare - ordering and ranks", () => {
  it("sorts options ascending by kgCO2e (greenest first)", () => {
    const { options } = compare(threeModeParsed());
    for (let i = 1; i < options.length; i++) {
      expect(options[i].kgCO2e).toBeGreaterThanOrEqual(options[i - 1].kgCO2e);
    }
  });

  it("assigns 1-based ranks matching sort order", () => {
    const { options } = compare(threeModeParsed());
    options.forEach((o, i) => expect(o.rank).toBe(i + 1));
  });

  it("sets isRecommended only on rank-1 option", () => {
    const { options } = compare(threeModeParsed());
    expect(options[0].isRecommended).toBe(true);
    options.slice(1).forEach((o) => expect(o.isRecommended).toBe(false));
  });

  it("recommended equals options[0]", () => {
    const result = compare(threeModeParsed());
    expect(result.recommended).toBe(result.options[0]);
  });

  it("train is the greenest option (rank 1)", () => {
    const { options } = compare(threeModeParsed());
    expect(options[0].mode).toBe("train");
  });
});

describe("compare - default mode handling", () => {
  it("flags the default mode candidate as isDefault", () => {
    const { options } = compare(threeModeParsed("flight"));
    const def = options.find((o) => o.mode === "flight");
    expect(def?.isDefault).toBe(true);
    options.filter((o) => o.mode !== "flight").forEach((o) => {
      expect(o.isDefault).toBe(false);
    });
  });

  it("default candidate has kgVsDefault === 0", () => {
    const { options } = compare(threeModeParsed("flight"));
    const def = options.find((o) => o.isDefault);
    expect(def?.kgVsDefault).toBe(0);
  });

  it("greener options have kgVsDefault > 0 and never negative", () => {
    const { options } = compare(threeModeParsed("flight"));
    const nonDefault = options.filter((o) => !o.isDefault);
    nonDefault.forEach((o) => {
      expect(o.kgVsDefault).toBeGreaterThan(0);
    });
  });

  it("kgVsDefault is undefined when no defaultMode is set", () => {
    const { options } = compare(threeModeParsed());
    options.forEach((o) => expect(o.kgVsDefault).toBeUndefined());
  });
});

describe("compare - nudge", () => {
  it("nudge is a non-empty string mentioning the recommended label", () => {
    const result = compare(threeModeParsed("flight"));
    expect(typeof result.nudge).toBe("string");
    expect(result.nudge.length).toBeGreaterThan(0);
    expect(result.nudge).toContain(result.recommended.label);
  });

  it("nudge mentions 'already greenest' when recommended equals default", () => {
    // Make train the only candidate and also the default
    const parsed: ParseResult = {
      intent: { category: "transport", summary: "test", defaultMode: "train" },
      candidates: [
        { label: "Train (AC)", mode: "train", factorKey: "transport.train_ac_electric", distanceKm: 100 },
        { label: "Bus", mode: "bus", factorKey: "transport.bus_intercity", distanceKm: 100 },
      ],
    };
    const result = compare(parsed);
    // Train is greenest AND default => nudge uses the "already looking at" branch
    expect(result.nudge).toMatch(/already/i);
  });
});

describe("compare - dynamic factor pass-through", () => {
  it("passes dynamic, factorSource, factorSourceUrl, confidence from a dynamic candidate", () => {
    const parsed: ParseResult = {
      intent: { category: "transport", summary: "cargo comparison" },
      candidates: [
        {
          label: "Cargo ship",
          mode: "ship",
          factorKey: "dynamic.lookup",
          distanceKm: 1000,
          dynamicFactor: {
            perUnitFactor: 0.015,
            unit: "kg_co2e_per_pkm",
            source: "IMO 2023",
            sourceUrl: "https://example.com/imo",
            confidence: "medium",
          },
        },
        {
          label: "Flight",
          mode: "flight",
          factorKey: "transport.flight_domestic",
          distanceKm: 1000,
        },
      ],
    };

    const { options } = compare(parsed);
    const ship = options.find((o) => o.mode === "ship");
    expect(ship?.dynamic).toBe(true);
    expect(ship?.factorSource).toBe("IMO 2023");
    expect(ship?.factorSourceUrl).toBe("https://example.com/imo");
    expect(ship?.confidence).toBe("medium");
  });
});
