import { FactorNode, getFactorNode, gridFactor } from "./factors";
import type { FootprintResult, Option } from "./types";

/**
 * Resolve a node's per-unit factor. Either it's stated directly (`factor`), or
 * it's grid-derived (`energy_kwh_per_km` / `energy_kwh_per_hour` x grid). This
 * is where the India honesty angle lives: a grid-charged EV is NOT zero, it
 * inherits the coal-heavy grid intensity.
 */
function resolvePerUnitFactor(node: FactorNode, factorKey: string): number {
  if (typeof node.factor === "number") return node.factor;
  if (typeof node.energy_kwh_per_km === "number") {
    return node.energy_kwh_per_km * gridFactor();
  }
  if (typeof node.energy_kwh_per_hour === "number") {
    return node.energy_kwh_per_hour * gridFactor();
  }
  throw new Error(
    `factorKey "${factorKey}" has neither a direct factor nor a grid-derived energy value`,
  );
}

function requirePositive(
  value: number | undefined,
  field: string,
  factorKey: string,
): number {
  if (value == null || Number.isNaN(value)) {
    throw new Error(`Option for "${factorKey}" is missing required "${field}"`);
  }
  if (value < 0) {
    throw new Error(`Option "${field}" must be >= 0 for "${factorKey}"`);
  }
  return value;
}

const round = (n: number, dp = 4): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/**
 * Pure, deterministic carbon math. Same option in -> same number out, always.
 * No I/O, no randomness, no model. The full credibility core of Disha.
 */
export function computeFootprint(option: Option): FootprintResult {
  const node = getFactorNode(option.factorKey);
  const perUnitFactor = resolvePerUnitFactor(node, option.factorKey);
  const unit = node.unit ?? inferUnit(node);

  let quantity: number;
  let occupancy: number | undefined;
  let kgCO2e: number;
  let basis: string;

  switch (unit) {
    case "kg_co2e_per_pkm": {
      quantity = requirePositive(option.distanceKm, "distanceKm", option.factorKey);
      kgCO2e = perUnitFactor * quantity;
      basis = `${perUnitFactor} kg/pkm x ${quantity} km`;
      break;
    }
    case "kg_co2e_per_vehicle_km": {
      quantity = requirePositive(option.distanceKm, "distanceKm", option.factorKey);
      occupancy = option.occupancy ?? node.occupancy_default ?? 1;
      if (occupancy <= 0) {
        throw new Error(`occupancy must be > 0 for "${option.factorKey}"`);
      }
      kgCO2e = (perUnitFactor * quantity) / occupancy;
      basis = `${perUnitFactor} kg/veh-km x ${quantity} km / ${occupancy} pax`;
      break;
    }
    case "kg_co2e_per_hour": {
      quantity = requirePositive(option.hours, "hours", option.factorKey);
      kgCO2e = perUnitFactor * quantity;
      basis = `${perUnitFactor} kg/hr x ${quantity} hr`;
      break;
    }
    case "kg_co2e_per_meal": {
      quantity = requirePositive(option.meals, "meals", option.factorKey);
      kgCO2e = perUnitFactor * quantity;
      basis = `${perUnitFactor} kg/meal x ${quantity} meal(s)`;
      break;
    }
    case "kg_co2e_per_unit": {
      quantity = requirePositive(option.units, "units", option.factorKey);
      kgCO2e = perUnitFactor * quantity;
      basis = `${perUnitFactor} kg/unit x ${quantity} unit(s)`;
      break;
    }
    case "kg_co2e_per_kwh": {
      quantity = requirePositive(option.kwh, "kwh", option.factorKey);
      kgCO2e = perUnitFactor * quantity;
      basis = `${perUnitFactor} kg/kWh x ${quantity} kWh`;
      break;
    }
    default:
      throw new Error(
        `Unsupported unit "${unit}" for factorKey "${option.factorKey}"`,
      );
  }

  return {
    kgCO2e: round(kgCO2e),
    factorKey: option.factorKey,
    label: option.label,
    unit,
    perUnitFactor: round(perUnitFactor, 6),
    quantity,
    occupancy,
    basis,
  };
}

/**
 * Computed-only nodes (e.g. car_ev, appliances) omit `unit`. Infer it from the
 * energy shape so the table can stay terse.
 */
function inferUnit(node: FactorNode): string {
  if (typeof node.energy_kwh_per_km === "number") return "kg_co2e_per_vehicle_km";
  if (typeof node.energy_kwh_per_hour === "number") return "kg_co2e_per_hour";
  throw new Error("Cannot infer unit for factor node without a unit field");
}
