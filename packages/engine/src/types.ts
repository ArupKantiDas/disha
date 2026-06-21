/**
 * The structured option the engine computes a footprint for.
 *
 * Gemini produces these (label, factorKey, quantities); it never produces a
 * carbon number. Exactly one quantity field is relevant per option, chosen by
 * the referenced factor's `unit`:
 * - per-pkm / per-vehicle-km transport -> distanceKm
 * - per-hour appliances -> hours
 * - per-meal diet -> meals
 * - per-unit goods -> units
 * - raw grid electricity -> kwh
 */
export interface Option {
  /** Stable id, useful when ranking a set. Optional. */
  id?: string;
  /** Human-facing label, e.g. "Train (AC)" or "Petrol car (solo)". */
  label: string;
  /** Free-form mode tag the UI/Gemini may set, e.g. "flight", "train", "car". */
  mode?: string;
  /** Dotted path into india-factors.json, e.g. "transport.flight_domestic". */
  factorKey: string;

  /** Trip distance in kilometres (transport factors). */
  distanceKm?: number;
  /** Hours of use (appliance factors). */
  hours?: number;
  /** Number of meal-portions (diet factors). */
  meals?: number;
  /** Number of units (goods factors). */
  units?: number;
  /** Kilowatt-hours (raw grid electricity). */
  kwh?: number;

  /**
   * Passengers sharing a vehicle (per-vehicle-km factors only). Falls back to
   * the factor's occupancy_default, then to 1 (solo). Ignored for per-pkm
   * factors, which are already per passenger.
   */
  occupancy?: number;

  /**
   * Present only when factorKey === "dynamic.lookup". Carries a factor
   * retrieved live via Google Search instead of from the seeded table.
   * The engine uses this in place of getFactorNode when set.
   */
  dynamicFactor?: {
    perUnitFactor: number;
    unit: string;
    source: string;
    sourceUrl?: string;
    confidence?: "high" | "medium" | "low";
  };
}

/** The transparent result of a footprint computation. */
export interface FootprintResult {
  /** kg CO2e for this option. Full precision; round only for display. */
  kgCO2e: number;
  /** Echo of the factor key used. */
  factorKey: string;
  /** Echo of the option label. */
  label: string;
  /** The factor's unit, e.g. "kg_co2e_per_pkm". */
  unit: string;
  /** The per-unit factor actually applied (post grid-derivation). */
  perUnitFactor: number;
  /** The quantity applied (km, hours, meals, units, or kwh). */
  quantity: number;
  /** Occupancy applied, if the factor is per-vehicle-km. */
  occupancy?: number;
  /** Plain-language explanation, e.g. "0.012 kg/pkm x 1870 km". */
  basis: string;
  /** True when the factor came from a live Google Search lookup, not the seeded table. */
  dynamic: boolean;
  /** Publisher + year of the dynamically retrieved factor, if dynamic. */
  factorSource?: string;
  /** URL of the grounding source page, if available. */
  factorSourceUrl?: string;
  /** Confidence tier of the dynamic factor. */
  confidence?: "high" | "medium" | "low";
}
