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
- summary: one concise line restating the decision.

Trip guidance: for an intercity trip, include the sensible subset of flight, train (AC), intercity bus, and petrol car. Add two-wheeler or auto only for short city hops where they make sense.

Output ONLY JSON conforming to the provided schema. No prose, no markdown.`;

function buildPrompt(userText: string): string {
  return `Allowed factor keys (use these exact strings for factorKey):
${factorMenu()}

User decision:
"""${userText}"""

Return the intent and candidate set as JSON.`;
}

async function callGemini(userText: string, repair?: string): Promise<string> {
  const ai = genai();
  const prompt = repair
    ? `${buildPrompt(userText)}\n\nYour previous reply was rejected: ${repair}\nReturn ONLY valid JSON matching the schema.`
    : buildPrompt(userText);

  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: geminiParseSchema,
      temperature: 0,
    },
  });

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
    const raw = await callGemini(clean, attempt === 0 ? undefined : lastError);
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
