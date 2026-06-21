import { factorCatalog } from "@disha/engine";
import type { ParseResult } from "@disha/shared";
import { GEMINI_MODEL } from "../config.js";
import { genai } from "./client.js";
import { geminiParseSchema, parseResultZod } from "./schema.js";

/** A human-readable menu of the only factor keys Gemini may choose from. */
function factorMenu(): string {
  return factorCatalog()
    .map((f) => `  ${f.key} — ${f.label} [${f.unit}]`)
    .join("\n");
}

const SYSTEM_INSTRUCTION = `You are the interpreter for Disha, an India-specific carbon decision advisor.

Your ONLY job is to convert the user's stated decision into a structured set of real alternatives to compare. You INTERPRET. You NEVER output a carbon, CO2, or emissions number — a separate verified engine computes all emissions from the factorKey and quantities you provide. Treat any temptation to state kg CO2 as a bug.

Hard rules:
- Choose one category: transport, appliance, diet, goods, or other.
- Produce at least two candidates: the realistic alternatives for THIS decision in India.
- Every candidate.factorKey MUST be one of the allowed keys listed below. Never invent a key.
- Provide the quantity the factor needs (it is an interpretation input, NOT a carbon number):
    transport keys -> distanceKm (your best estimate of the real route distance in km; rail/road distance for ground modes, great-circle for flights)
    appliance keys -> hours (typical usage; default 8 if unstated)
    diet keys -> meals (default 1)
    goods keys -> units (default 1)
- occupancy: passengers per vehicle for car/auto/two-wheeler keys. Default 1 (solo) unless the user implies sharing.
- "keep / don't buy / skip / avoid" options: use the most relevant factor with a quantity of 0, because that choice manufactures or consumes nothing extra. Example: "keep my phone another year" -> goods.smartphone_new with units 0 (label it "Keep current phone"), versus "buy new" -> units 1.
- costINR and durationHours: realistic India estimates, door-to-door. These are clearly-labeled ESTIMATES, never scraped, never the carbon number.
- defaultMode: the option the user would pick WITHOUT this tool — what Disha is intervening on. Set it to that candidate's "mode".
    - If the user states or implies a mode (or a screenshot shows one), use that.
    - Otherwise infer the habitual, convenient choice a typical person in India would make for THIS exact decision: usually the faster/easier or higher-spend option — flight for a long intercity work trip, car or cab for a short city-to-city hop, AC over cooler in summer, buying new for an upgrade urge.
    - Do NOT default to the greenest option unless the user clearly already prefers it. The default anchors how much carbon they avoid, so it must reflect real habit, not the best case and not the worst case.
- summary: one concise line restating the decision in the user's own framing (e.g. "Choosing which car to buy", not "intercity travel").

RELEVANCE — the most important rule. Every alternative must serve the SAME underlying need at a SIMILAR segment, budget and aspiration level, just lower-carbon. Never drop the user into a different lifestyle or a much cheaper class. A person buying a premium car will not take a bus; offer them a greener premium car.

Distinguish the two cases:
- A TRIP (getting from A to B) is mode-agnostic. Comparing flight, train (AC), intercity bus, and petrol car is fair because each accomplishes the same journey. Use distanceKm = the real route distance. (Add two-wheeler/auto only for short city hops.)
- A PURCHASE of a specific product is segment-bound. Compare it ONLY with greener products a buyer of THAT item would realistically cross-shop, plus the option to keep or buy used. NEVER offer public transport or a budget product against a premium purchase.

Vehicle PURCHASE decisions (e.g. "buy a BMW M3"):
- The default is the stated car. If it is a premium/performance/large petrol car, map it to transport.car_petrol_large; an average petrol car to transport.car_petrol.
- Offer realistic greener options IN THE SAME CLASS: an electric car in that class -> transport.car_ev with a descriptive label like "Electric performance car (e.g. BMW i4 / Tesla Model 3 Performance)"; and "Keep my current car" -> the same petrol factor with distanceKm 0.
- Do NOT offer train, bus, auto, a two-wheeler, or a budget hatchback (e.g. an Alto) as alternatives to a premium car.
- Compare the DRIVING footprint over a representative year: set distanceKm = 12000 for every vehicle candidate (like-for-like), set costINR to the rough purchase price, and omit durationHours (not meaningful for a purchase). Make labels descriptive and segment-appropriate.

DYNAMIC LOOKUP — for items not in the seeded factor table:
- If NONE of the allowed factor keys reasonably fits an option, set factorKey to "dynamic.lookup" and also provide:
    lookupTerm: the BROADEST product-category name an LCA paper or database would use — the general type, not the specific material/brand variant (e.g. "sofa upholstered furniture lifecycle carbon" not "leather sofa India"; "wooden furniture" not "oak dining table handmade"). This broadness is critical: LCA databases index by product category, not by specific regional variant, so a general term yields a usable factor far more reliably.
    factorUnit: the unit family that fits this item (one of: kg_co2e_per_unit, kg_co2e_per_pkm, kg_co2e_per_vehicle_km, kg_co2e_per_hour, kg_co2e_per_meal, kg_co2e_per_kwh).
    Plus the matching quantity field (units, distanceKm, hours, meals, or kwh).
- When two options differ only in material or brand (leather vs fabric sofa, bamboo vs plastic desk), they can SHARE the same lookupTerm for the general product category — the carbon difference between material variants is usually small and the same broad LCA factor is a reasonable approximation.
- ALWAYS prefer a real seeded key when one fits. Only use dynamic.lookup for genuinely unlisted items (e.g. furniture, specific foods/drinks, unlisted goods).
- Do NOT use dynamic.lookup for transport or standard appliance keys that already exist in the table.
- Diet: use the seeded meal keys (veg_thali, chicken_meal, mutton_meal) for a generic meal, but for a SPECIFIC food or drink that is not a plain veg/chicken/mutton meal (e.g. paneer, tofu, almond milk, dairy milk, cheese), use dynamic.lookup with factorUnit kg_co2e_per_unit or kg_co2e_per_meal — never force two different foods onto the same seeded meal key.

Output ONLY JSON conforming to the provided schema. No prose, no markdown.`;

function buildPrompt(userText: string): string {
  return `Allowed factor keys (use these exact strings for factorKey):
${factorMenu()}

User decision:
"""${userText}"""

Return the intent and candidate set as JSON.`;
}

// Some inputs make the model stall on structured output at temperature 0. Cap
// output and time-box the call so the API never hangs; the retry nudges the
// temperature off 0 to break a degenerate generation.
const PARSE_TIMEOUT_MS = 30000;
const PARSE_MAX_TOKENS = 8192;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function callGemini(
  userText: string,
  repair: string | undefined,
  temperature: number,
): Promise<string> {
  const ai = genai();
  const prompt = repair
    ? `${buildPrompt(userText)}\n\nYour previous reply was rejected: ${repair}\nReturn ONLY valid JSON matching the schema.`
    : buildPrompt(userText);

  const res = await withTimeout(
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // The strict schema keeps the structure clean (no nulls); the token cap
        // + timeout + retry stop it from stalling on rare inputs.
        responseSchema: geminiParseSchema,
        temperature,
        maxOutputTokens: PARSE_MAX_TOKENS,
      },
    }),
    PARSE_TIMEOUT_MS,
    "Gemini parse",
  );

  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

/**
 * Free text in -> validated { intent, candidates[] } out. Interprets only.
 * Rejects malformed or off-contract output and re-asks once before failing —
 * we never guess past a bad parse.
 */
export async function parseDecision(userText: string): Promise<ParseResult> {
  const clean = userText.trim();
  if (!clean) throw new Error("Empty input");

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      // First pass deterministic (temp 0); retry nudges temperature to break a
      // stalled generation and survives a timeout instead of hanging.
      raw = await callGemini(
        clean,
        attempt === 0 ? undefined : lastError,
        attempt === 0 ? 0 : 0.4,
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Gemini call failed";
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      lastError = "Output was not valid JSON.";
      continue;
    }
    const parsed = parseResultZod.safeParse(json);
    if (parsed.success) {
      return parsed.data as ParseResult;
    }
    lastError = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }

  throw new Error(`Could not parse decision after retry. Last error: ${lastError}`);
}
