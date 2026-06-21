import type { Candidate, CompareResponse } from "@disha/shared";
import { compare } from "./compare.js";
import { extractScreenshot } from "./gemini/extractScreenshot.js";
import { parseDecision } from "./gemini/parseDecision.js";
import { resolveDynamicFactors } from "./resolveDynamic.js";

// Natural-language word for each extracted mode, used to phrase the synthesized
// decision text the parser then expands into a full candidate set.
const MODE_WORD: Record<string, string> = {
  flight: "flight",
  train: "train",
  bus: "bus",
  car: "car or cab",
  two_wheeler: "two-wheeler",
  auto: "auto-rickshaw",
  other: "option",
};

// Token used to find the matching candidate by factorKey.
const MODE_TOKEN: Record<string, string> = {
  flight: "flight",
  train: "train",
  bus: "bus",
  car: "car",
  two_wheeler: "two_wheeler",
  auto: "auto",
};

function findDefaultCandidate(
  candidates: Candidate[],
  mode: string,
): Candidate | undefined {
  const token = MODE_TOKEN[mode];
  if (!token) return undefined;
  return (
    candidates.find((c) => c.factorKey.includes(token)) ??
    candidates.find((c) => c.mode?.toLowerCase().includes(token))
  );
}

/**
 * Door C end-to-end: read the screenshot, treat the read option as the user's
 * DEFAULT, then run the SAME /compare core to surface greener alternatives the
 * screenshot never showed. No server-side fetch, no per-site parsing.
 */
export async function compareFromScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<CompareResponse> {
  const ex = await extractScreenshot(imageBase64, mimeType);

  const route = [ex.origin, ex.destination].filter(Boolean).join(" to ");
  const priceBit = ex.priceINR ? ` for around Rs ${ex.priceINR}` : "";
  const modeWord = MODE_WORD[ex.mode] ?? ex.mode;
  const text = route
    ? `I am about to book a ${modeWord} from ${route}${priceBit}. Compare greener ways to make this trip.`
    : `${ex.summary}. I am about to take the ${modeWord} option${priceBit}. Compare greener alternatives.`;

  let parsed = await parseDecision(text);

  // The screenshot IS what they were going to do — anchor it as the default,
  // and trust the real fare from the image over the model's estimate.
  const def = findDefaultCandidate(parsed.candidates, ex.mode);
  if (def) {
    parsed.intent.defaultMode = def.mode;
    if (ex.priceINR != null) def.costINR = ex.priceINR;
  }

  parsed = await resolveDynamicFactors(parsed);

  const result = compare(parsed);
  return { ...result, source: "screenshot", extraction: ex };
}
