import { computeFootprint } from "@disha/engine";
import type {
  CompareResponse,
  ParseResult,
  RankedOption,
} from "@disha/shared";

const kg = (n: number) => Math.round(n);
const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function hours(n: number): string {
  if (n < 1) return `${Math.round(n * 60)} min`;
  const whole = Math.floor(n);
  const mins = Math.round((n - whole) * 60);
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
}

/**
 * Run each candidate through the engine, rank by carbon, and frame the result
 * against the user's stated default. The carbon number comes only from the
 * engine; ranking and nudges never invent one.
 */
export function compare(parsed: ParseResult): CompareResponse {
  const { intent, candidates } = parsed;

  // 1. Compute carbon for every candidate via the pure engine.
  const computed = candidates.map((c) => {
    const f = computeFootprint(c);
    return { ...c, kgCO2e: f.kgCO2e, basis: f.basis };
  });

  // 2. Rank ascending by carbon (greenest first).
  computed.sort((a, b) => a.kgCO2e - b.kgCO2e);

  // 3. Identify the user's default (what they were going to do).
  const defaultMode = intent.defaultMode?.toLowerCase();
  const defaultComputed = defaultMode
    ? computed.find((c) => c.mode?.toLowerCase() === defaultMode)
    : undefined;

  // 4. Build ranked options with deltas vs the default — never vs the worst.
  const options: RankedOption[] = computed.map((c, i) => ({
    ...c,
    rank: i + 1,
    isRecommended: i === 0,
    isDefault: defaultComputed ? c.mode === defaultComputed.mode : false,
    kgVsDefault: defaultComputed
      ? Math.max(0, defaultComputed.kgCO2e - c.kgCO2e)
      : undefined,
  }));

  const recommended = options[0];
  const defaultOption = options.find((o) => o.isDefault);

  return {
    intent,
    options,
    recommended,
    default: defaultOption,
    nudge: buildNudge(recommended, defaultOption),
  };
}

/** One plain-language line for the card. Deterministic, no model. */
function buildNudge(
  recommended: RankedOption,
  defaultOption?: RankedOption,
): string {
  if (!defaultOption || defaultOption.mode === recommended.mode) {
    return `You're already looking at the greenest option — ${recommended.label}.`;
  }

  const saved = kg(defaultOption.kgCO2e - recommended.kgCO2e);
  const parts: string[] = [
    `${recommended.label} saves about ${saved} kg CO₂ versus ${defaultOption.label.toLowerCase()}`,
  ];

  // Cost framing (only if both estimates exist).
  if (recommended.costINR != null && defaultOption.costINR != null) {
    const diff = recommended.costINR - defaultOption.costINR;
    if (diff < 0) parts.push(`it's ${rupees(-diff)} cheaper`);
    else if (diff > 0) parts.push(`it costs ${rupees(diff)} more`);
    else parts.push(`it costs about the same`);
  }

  // Time framing (only if both estimates exist).
  if (recommended.durationHours != null && defaultOption.durationHours != null) {
    const diff = recommended.durationHours - defaultOption.durationHours;
    if (diff > 0.1) parts.push(`but takes about ${hours(diff)} longer`);
    else if (diff < -0.1) parts.push(`and is about ${hours(-diff)} faster`);
  }

  return `${parts.join(", ")}.`;
}
