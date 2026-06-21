import { computeFootprint } from "../computeFootprint";
import { listFactorKeys } from "../factors";
import type { Option } from "../types";

/**
 * Phase 8 credibility guardrails. These are invariants the whole product rests
 * on: the engine must be deterministic and direction-correct, with no exception.
 * If any of these fail, a carbon claim somewhere is no longer trustworthy.
 */

// Build a valid option for any factor key by supplying the quantity its unit needs.
function optionFor(factorKey: string, quantity: number, occupancy?: number): Option {
  const base: Option = { label: factorKey, factorKey, occupancy };
  if (factorKey.startsWith("transport.")) return { ...base, distanceKm: quantity };
  if (factorKey.startsWith("appliances.")) return { ...base, hours: quantity };
  if (factorKey.startsWith("diet.")) return { ...base, meals: quantity };
  if (factorKey.startsWith("goods.")) return { ...base, units: quantity };
  if (factorKey === "grid.electricity_kwh") return { ...base, kwh: quantity };
  return base;
}

describe("guardrail: determinism", () => {
  test("every factor returns an identical number across repeated calls", () => {
    for (const key of listFactorKeys()) {
      const opt = optionFor(key, 7);
      const first = computeFootprint(opt).kgCO2e;
      for (let i = 0; i < 25; i++) {
        expect(computeFootprint(opt).kgCO2e).toBe(first);
      }
    }
  });
});

describe("guardrail: monotonic in quantity (more activity is never less carbon)", () => {
  test("carbon is non-decreasing as quantity grows", () => {
    for (const key of listFactorKeys()) {
      let prev = -1;
      for (const q of [0, 1, 5, 10, 50, 100]) {
        const kg = computeFootprint(optionFor(key, q)).kgCO2e;
        expect(kg).toBeGreaterThanOrEqual(prev);
        prev = kg;
      }
    }
  });
});

describe("guardrail: direction-correct ranking for transport", () => {
  // Same trip for everyone: equal distance, solo, so per-unit factor ordering
  // must equal carbon ordering with no inversions.
  const D = 1200;
  const transportKeys = listFactorKeys().filter((k) => k.startsWith("transport."));

  test("a lower per-unit factor never produces higher carbon at equal inputs", () => {
    const rows = transportKeys.map((key) => {
      const r = computeFootprint(optionFor(key, D, 1));
      return { key, perUnit: r.perUnitFactor, kg: r.kgCO2e };
    });
    const byFactor = [...rows].sort((a, b) => a.perUnit - b.perUnit);
    const byCarbon = [...rows].sort((a, b) => a.kg - b.kg);
    expect(byCarbon.map((r) => r.key)).toEqual(byFactor.map((r) => r.key));
  });

  test("the train is greener than the flight, always", () => {
    const train = computeFootprint(optionFor("transport.train_ac_electric", D)).kgCO2e;
    const flight = computeFootprint(optionFor("transport.flight_domestic", D)).kgCO2e;
    expect(train).toBeLessThan(flight);
  });
});

describe("guardrail: occupancy reduces per-passenger carbon for vehicles", () => {
  test("more passengers never increases per-passenger car carbon", () => {
    let prev = Infinity;
    for (const occ of [1, 2, 3, 4, 5]) {
      const kg = computeFootprint(optionFor("transport.car_petrol", 1000, occ)).kgCO2e;
      expect(kg).toBeLessThanOrEqual(prev);
      prev = kg;
    }
  });
});

describe("guardrail: grid-derived options inherit the coal-heavy grid", () => {
  test("an EV is never modelled as zero-carbon on the Indian grid", () => {
    const ev = computeFootprint(optionFor("transport.car_ev", 1000, 1)).kgCO2e;
    expect(ev).toBeGreaterThan(0);
  });
});
