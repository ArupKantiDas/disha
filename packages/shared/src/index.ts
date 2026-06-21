import type { Option } from "@disha/engine";

/** What kind of decision the user is making. */
export type DecisionCategory =
  | "transport"
  | "appliance"
  | "diet"
  | "goods"
  | "other";

/**
 * The normalised intent. All three front doors (type, talk, screenshot) produce
 * this same object before anything hits /compare.
 */
export interface Intent {
  category: DecisionCategory;
  /** One-line restatement of what the user is deciding. */
  summary: string;
  origin?: string;
  destination?: string;
  /**
   * The option the user is already leaning toward (e.g. the flight in their
   * screenshot, or "I usually fly"). The avoided-counter is measured against
   * THIS, not against the worst option. Matches a candidate's `mode`.
   */
  defaultMode?: string;
  /** Free notes — trip purpose, duration, occupancy hints. */
  notes?: string;
}

/**
 * A real alternative to compare. Extends the engine's pure Option with cost and
 * time, which are clearly-labeled ESTIMATES for demo routes — never scraped,
 * never the carbon number.
 */
export interface Candidate extends Option {
  /** Estimated cost in INR. A labeled estimate, not a live quote. */
  costINR?: number;
  /** Estimated door-to-door duration in hours. A labeled estimate. */
  durationHours?: number;
}

/** Gemini's interpretation output: intent + the set of candidates. */
export interface ParseResult {
  intent: Intent;
  candidates: Candidate[];
}

/** A candidate after the engine has computed its carbon and ranked it. */
export interface RankedOption extends Candidate {
  /** kg CO2e from the engine. The only source of this number. */
  kgCO2e: number;
  /** Transparent basis string, e.g. "0.012 kg/pkm x 1870 km". */
  basis: string;
  /** 1-based rank by carbon (1 = greenest). */
  rank: number;
  /** The engine's recommended pick (greenest, with cost/time framing). */
  isRecommended: boolean;
  /** Whether this is the user's stated default. */
  isDefault: boolean;
  /**
   * kg CO2e avoided versus the user's default. Positive when this option is
   * greener than the default; undefined when there is no known default.
   */
  kgVsDefault?: number;
}

/** The /compare response the result card renders. */
export interface CompareResponse {
  intent: Intent;
  options: RankedOption[];
  recommended: RankedOption;
  /** The user's default option, if one was identified. */
  default?: RankedOption;
  /** One plain-language nudge line for the card. */
  nudge: string;
}
