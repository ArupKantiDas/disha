// The single source of truth lives at the repo root and is committed as the
// thing we defend to judges. The engine reads it; it never hardcodes a number.
import factorsJson from "../../../india-factors.json";

/** A single factor node from india-factors.json. Heterogeneous by design. */
export interface FactorNode {
  label?: string;
  /** Direct per-unit factor, when present. */
  factor?: number;
  /** Unit string, e.g. "kg_co2e_per_pkm". Absent on computed-only nodes. */
  unit?: string;
  /** Marks a node whose factor is derived from the grid. */
  computed?: string;
  /** kWh per km, for grid-charged vehicles (computed nodes). */
  energy_kwh_per_km?: number;
  /** kWh per hour, for appliances (computed nodes). */
  energy_kwh_per_hour?: number;
  /** Default passengers for per-vehicle-km factors. */
  occupancy_default?: number;
  note?: string;
  honesty_note?: string;
  source?: string;
  verify?: boolean;
}

export type FactorTable = typeof factorsJson;

export const factors = factorsJson as FactorTable;

/** The Indian grid carbon intensity (kg CO2e/kWh) — the load-bearing number. */
export function gridFactor(): number {
  return factors.grid.electricity_kwh.factor;
}

/**
 * Resolve a dotted factor key (e.g. "transport.flight_domestic") to its node.
 * Throws on an unknown key — a missing factor is a bug, never a guess.
 */
export function getFactorNode(factorKey: string): FactorNode {
  const parts = factorKey.split(".");
  let cursor: unknown = factors;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== "object" || !(part in cursor)) {
      throw new Error(`Unknown factorKey: "${factorKey}" (failed at "${part}")`);
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  if (cursor == null || typeof cursor !== "object") {
    throw new Error(`factorKey "${factorKey}" did not resolve to a factor node`);
  }
  return cursor as FactorNode;
}
