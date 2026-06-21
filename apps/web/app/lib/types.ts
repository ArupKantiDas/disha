export type DecisionCategory = "transport" | "appliance" | "diet" | "goods" | "other";

export interface Intent {
  category: DecisionCategory;
  summary: string;
  origin?: string;
  destination?: string;
  defaultMode?: string;
  notes?: string;
}

export interface RankedOption {
  id?: string;
  label: string;
  mode?: string;
  factorKey: string;
  distanceKm?: number;
  hours?: number;
  meals?: number;
  units?: number;
  kwh?: number;
  occupancy?: number;
  costINR?: number;
  durationHours?: number;
  kgCO2e: number;
  basis: string;
  rank: number;
  isRecommended: boolean;
  isDefault: boolean;
  kgVsDefault?: number;
}

export interface ScreenshotExtraction {
  origin?: string;
  destination?: string;
  mode: string;
  priceINR?: number;
  summary: string;
}

export interface CompareResponse {
  intent: Intent;
  options: RankedOption[];
  recommended: RankedOption;
  default?: RankedOption;
  nudge: string;
  source?: "text" | "voice" | "screenshot";
  extraction?: ScreenshotExtraction;
}

export interface LedgerState {
  kgAvoidedTotal: number;
  decisionCount: number;
}

export interface FactorRow {
  key: string;
  label: string;
  perUnitFactor: number | null;
  unit: string;
  source?: string;
  note?: string;
  verifiedAgainst?: string;
  verify?: boolean;
}
