import { computeFootprint } from "../computeFootprint";
import { gridFactor } from "../factors";
import type { Option } from "../types";

// Helper to keep the known-value assertions readable.
const co2 = (o: Option) => computeFootprint(o).kgCO2e;

describe("computeFootprint — known routes (known in, known out)", () => {
  test("domestic flight: 0.246 kg/pkm x 1000 km = 246 kg", () => {
    expect(
      co2({ label: "Flight", factorKey: "transport.flight_domestic", distanceKm: 1000 }),
    ).toBe(246);
  });

  test("AC train: 0.012 kg/pkm x 1000 km = 12 kg", () => {
    expect(
      co2({ label: "Train", factorKey: "transport.train_ac_electric", distanceKm: 1000 }),
    ).toBe(12);
  });

  test("intercity bus: 0.03 kg/pkm x 1000 km = 30 kg", () => {
    expect(
      co2({ label: "Bus", factorKey: "transport.bus_intercity", distanceKm: 1000 }),
    ).toBe(30);
  });

  test("petrol car solo (occupancy 1): 0.17 x 1000 = 170 kg", () => {
    expect(
      co2({
        label: "Car (solo)",
        factorKey: "transport.car_petrol",
        distanceKm: 1000,
        occupancy: 1,
      }),
    ).toBe(170);
  });

  test("petrol car at default occupancy 1.5: ~113.33 kg", () => {
    const r = computeFootprint({
      label: "Car",
      factorKey: "transport.car_petrol",
      distanceKm: 1000,
    });
    expect(r.occupancy).toBe(1.5);
    expect(r.kgCO2e).toBeCloseTo(113.3333, 3);
  });

  test("veg thali: 0.7 kg/meal", () => {
    expect(co2({ label: "Veg thali", factorKey: "diet.veg_thali", meals: 1 })).toBe(0.7);
  });

  test("mutton meal: 5.5 kg/meal", () => {
    expect(co2({ label: "Mutton", factorKey: "diet.mutton_meal", meals: 1 })).toBe(5.5);
  });

  test("new smartphone embodied: 70 kg/unit", () => {
    expect(co2({ label: "New phone", factorKey: "goods.smartphone_new", units: 1 })).toBe(70);
  });
});

describe("computeFootprint — grid-derived (the India honesty angle)", () => {
  test("grid factor is the CEA seed value 0.72", () => {
    expect(gridFactor()).toBe(0.72);
  });

  test("EV solo: 0.15 kWh/km x grid x 1000 km = 108 kg, NOT zero", () => {
    const r = computeFootprint({
      label: "EV (solo)",
      factorKey: "transport.car_ev",
      distanceKm: 1000,
      occupancy: 1,
    });
    expect(r.kgCO2e).toBe(108); // 0.15 * 0.72 * 1000
    expect(r.perUnitFactor).toBeCloseTo(0.108, 6);
  });

  test("window AC 1 ton, 5 hours: 1.0 kWh/hr x grid x 5 = 3.6 kg", () => {
    expect(
      co2({ label: "AC", factorKey: "appliances.ac_window_1ton", hours: 5 }),
    ).toBe(3.6);
  });

  test("air cooler, 5 hours: 0.15 kWh/hr x grid x 5 = 0.54 kg", () => {
    expect(
      co2({ label: "Cooler", factorKey: "appliances.air_cooler", hours: 5 }),
    ).toBe(0.54);
  });
});

describe("computeFootprint — determinism", () => {
  test("same option in -> identical number out, repeatedly", () => {
    const o: Option = {
      label: "Train",
      factorKey: "transport.train_ac_electric",
      distanceKm: 1872,
    };
    const runs = Array.from({ length: 50 }, () => computeFootprint(o).kgCO2e);
    expect(new Set(runs).size).toBe(1);
  });

  test("result carries a transparent basis string", () => {
    const r = computeFootprint({
      label: "Train",
      factorKey: "transport.train_ac_electric",
      distanceKm: 1000,
    });
    expect(r.basis).toContain("kg/pkm");
    expect(r.basis).toContain("1000");
  });
});

describe("computeFootprint — direction-correct (greener is always lower)", () => {
  const D = 1500; // a fixed comparison distance

  const at = (factorKey: string, occupancy?: number) =>
    computeFootprint({ label: factorKey, factorKey, distanceKm: D, occupancy }).kgCO2e;

  test("for the same trip: train < bus < EV(solo) < petrol(solo) < flight", () => {
    const train = at("transport.train_ac_electric");
    const bus = at("transport.bus_intercity");
    const evSolo = at("transport.car_ev", 1);
    const petrolSolo = at("transport.car_petrol", 1);
    const flight = at("transport.flight_domestic");

    expect(train).toBeLessThan(bus);
    expect(bus).toBeLessThan(evSolo);
    expect(evSolo).toBeLessThan(petrolSolo);
    expect(petrolSolo).toBeLessThan(flight);
  });

  test("EV is cleaner than petrol at equal occupancy — but not by a Western margin", () => {
    const evSolo = at("transport.car_ev", 1);
    const petrolSolo = at("transport.car_petrol", 1);
    expect(evSolo).toBeLessThan(petrolSolo);
    // Honesty: on the coal-heavy grid the EV still emits well over half of petrol.
    expect(evSolo / petrolSolo).toBeGreaterThan(0.5);
  });

  test("appliance: air cooler always beats AC for equal hours", () => {
    const ac = computeFootprint({
      label: "AC",
      factorKey: "appliances.ac_window_1ton",
      hours: 8,
    }).kgCO2e;
    const cooler = computeFootprint({
      label: "Cooler",
      factorKey: "appliances.air_cooler",
      hours: 8,
    }).kgCO2e;
    expect(cooler).toBeLessThan(ac);
  });

  test("higher occupancy strictly lowers per-passenger car carbon", () => {
    const solo = at("transport.car_petrol", 1);
    const shared = at("transport.car_petrol", 4);
    expect(shared).toBeLessThan(solo);
  });
});

describe("computeFootprint — dynamicFactor (live-retrieved factor path)", () => {
  test("uses perUnitFactor × quantity and returns dynamic:true", () => {
    const r = computeFootprint({
      label: "Leather sofa",
      factorKey: "dynamic.lookup",
      units: 1,
      dynamicFactor: {
        perUnitFactor: 250,
        unit: "kg_co2e_per_unit",
        source: "IPCC AR6 (2021)",
        confidence: "medium",
      },
    });
    expect(r.kgCO2e).toBe(250);
    expect(r.dynamic).toBe(true);
    expect(r.factorSource).toBe("IPCC AR6 (2021)");
    expect(r.confidence).toBe("medium");
  });

  test("quantity scaling works: 2 units × 125 kg/unit = 250 kg", () => {
    const r = computeFootprint({
      label: "Fabric sofa",
      factorKey: "dynamic.lookup",
      units: 2,
      dynamicFactor: {
        perUnitFactor: 125,
        unit: "kg_co2e_per_unit",
        source: "Test",
        confidence: "high",
      },
    });
    expect(r.kgCO2e).toBe(250);
  });

  test("determinism holds for dynamic options", () => {
    const o: Option = {
      label: "Leather sofa",
      factorKey: "dynamic.lookup",
      units: 1,
      dynamicFactor: {
        perUnitFactor: 250,
        unit: "kg_co2e_per_unit",
        source: "Test",
        confidence: "high",
      },
    };
    const runs = Array.from({ length: 30 }, () => computeFootprint(o).kgCO2e);
    expect(new Set(runs).size).toBe(1);
  });

  test("seeded option returns dynamic:false", () => {
    const r = computeFootprint({
      label: "Train",
      factorKey: "transport.train_ac_electric",
      distanceKm: 1000,
    });
    expect(r.dynamic).toBe(false);
    expect(r.factorSource).toBeUndefined();
  });

  test("dynamicFactor.perUnitFactor <= 0 throws", () => {
    expect(() =>
      computeFootprint({
        label: "Bad",
        factorKey: "dynamic.lookup",
        units: 1,
        dynamicFactor: {
          perUnitFactor: 0,
          unit: "kg_co2e_per_unit",
          source: "Test",
        },
      }),
    ).toThrow(/perUnitFactor must be > 0/);
  });
});

describe("computeFootprint — guards (a missing factor is a bug, not a guess)", () => {
  test("unknown factorKey throws", () => {
    expect(() =>
      computeFootprint({ label: "x", factorKey: "transport.teleporter", distanceKm: 10 }),
    ).toThrow(/Unknown factorKey/);
  });

  test("missing required quantity throws", () => {
    expect(() =>
      computeFootprint({ label: "Flight", factorKey: "transport.flight_domestic" }),
    ).toThrow(/missing required "distanceKm"/);
  });

  test("negative quantity throws", () => {
    expect(() =>
      computeFootprint({
        label: "Flight",
        factorKey: "transport.flight_domestic",
        distanceKm: -5,
      }),
    ).toThrow(/must be >= 0/);
  });
});
