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
  verified_against?: string;
  verify?: boolean;
}

export type FactorTable = typeof factorsJson;

export const factors = factorsJson as FactorTable;

/** The Indian grid carbon intensity (kg CO2e/kWh) the load-bearing number. */
export function gridFactor(): number {
  return factors.grid.electricity_kwh.factor;
}

/** Top-level sections of the table that hold factor nodes. */
const FACTOR_SECTIONS = ["grid", "transport", "appliances", "diet", "goods"] as const;

/** True if a node looks like a usable factor (direct or grid-derived). */
function isFactorNode(node: unknown): node is FactorNode {
  if (node == null || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  return "factor" in n || "computed" in n || "unit" in n;
}

/**
 * All valid dotted factor keys, e.g. "transport.flight_domestic". Used to
 * constrain Gemini to real keys (it cannot invent one) and to render the
 * "how we calculate" credibility panel.
 */
export function listFactorKeys(): string[] {
  const keys: string[] = [];
  for (const section of FACTOR_SECTIONS) {
    const node = (factors as Record<string, unknown>)[section];
    if (node == null || typeof node !== "object") continue;
    for (const [child, value] of Object.entries(node)) {
      if (isFactorNode(value)) keys.push(`${section}.${child}`);
    }
  }
  return keys;
}

/** A flat, display-ready view of every factor for the credibility panel. */
export function factorCatalog(): Array<{
  key: string;
  label: string;
  perUnitFactor: number | null;
  unit: string;
  source?: string;
  note?: string;
  verifiedAgainst?: string;
  verify?: boolean;
}> {
  return listFactorKeys().map((key) => {
    const node = getFactorNode(key);
    const perUnitFactor =
      typeof node.factor === "number"
        ? node.factor
        : typeof node.energy_kwh_per_km === "number"
          ? node.energy_kwh_per_km * gridFactor()
          : typeof node.energy_kwh_per_hour === "number"
            ? node.energy_kwh_per_hour * gridFactor()
            : null;
    return {
      key,
      label: node.label ?? key,
      perUnitFactor,
      unit: node.unit ?? "(grid-derived)",
      source: node.source,
      note: node.note ?? node.honesty_note,
      verifiedAgainst: node.verified_against,
      verify: node.verify,
    };
  });
}

/**
 * Resolve a dotted factor key (e.g. "transport.flight_domestic") to its node.
 * Throws on an unknown key a missing factor is a bug, never a guess.
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
