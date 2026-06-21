import { z } from "zod";
import { GEMINI_MODEL } from "../config.js";
import { genai } from "./client.js";

const SYSTEM_INSTRUCTION =
  'You retrieve ONE carbon emission factor for a specific item using Google Search. You do not compute totals. Rules: find the emission factor for the item described, expressed in the requested unit. Strongly prefer India-specific, authoritative sources (CEA, India GHG Programme, government, peer-reviewed LCA); if only global/Western data exists, use it and set confidence to "medium" (NOT "low"), noting the source region in the \'source\' field. Use confidence "high" only for India-specific authoritative sources. Use confidence "low" ONLY when no credible emission factor can be found at all. Return a single representative mid value, not a range. Output ONLY JSON, no markdown, no prose: {"perUnitFactor": number, "unit": string, "source": "publisher + year", "confidence": "high"|"medium"|"low", "basis": "one line"}. If you cannot find any credible factor, return {"perUnitFactor": null, "unit": "<requested unit>", "source": "not found", "confidence": "low", "basis": "no data"}';

const responseSchema = z.object({
  perUnitFactor: z.number().nullable(),
  unit: z.string(),
  source: z.string().nullable().transform((s) => s ?? "unknown source"),
  confidence: z.enum(["high", "medium", "low"]),
  basis: z.string().optional(),
});

type ResolvedFactor = {
  perUnitFactor: number;
  unit: string;
  source: string;
  sourceUrl?: string;
  confidence: "high" | "medium" | "low";
};

/**
 * Retrieve an emission factor for the given item via a grounded Gemini call
 * (Google Search tool). Returns null when no credible factor is found or when
 * confidence is "low".
 *
 * NOTE: responseMimeType / responseSchema must NOT be set together with the
 * googleSearch tool — Vertex rejects the combination. We instruct JSON-only in
 * the system prompt and parse leniently instead.
 */
export async function resolveFactor(
  lookupTerm: string,
  unit: string,
): Promise<ResolvedFactor | null> {
  const ai = genai();

  let res: Awaited<ReturnType<typeof ai.models.generateContent>>;
  try {
    res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Item: ${lookupTerm}\nRequired unit: ${unit}\nReturn the JSON.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0,
        tools: [{ googleSearch: {} }],
      },
    });
  } catch (err) {
    console.warn("[resolveFactor] Gemini call failed:", err);
    return null;
  }

  const raw = res.text ?? "";

  // Strip markdown code fences that the model may wrap the JSON in.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  // Fallback: find the outermost JSON object.
  let jsonStr = cleaned;
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    jsonStr = cleaned.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.warn("[resolveFactor] Could not parse JSON from response:", raw);
    return null;
  }

  const validated = responseSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn("[resolveFactor] Schema validation failed:", validated.error.issues);
    return null;
  }

  const data = validated.data;

  // Reject null, zero, or negative factors, and low-confidence results.
  if (data.perUnitFactor == null || data.perUnitFactor <= 0) return null;
  if (data.confidence === "low") return null;

  // Capture the first grounding URL from the search metadata.
  const chunks =
    (res as any).candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sourceUrl: string | undefined = chunks.find(
    (c: any) => c?.web?.uri,
  )?.web?.uri;

  return {
    perUnitFactor: data.perUnitFactor,
    unit: data.unit,
    source: data.source,
    sourceUrl,
    confidence: data.confidence,
  };
}
