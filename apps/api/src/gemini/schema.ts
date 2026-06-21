import { Type } from "@google/genai";
import { listFactorKeys } from "@disha/engine";
import { z } from "zod";

const UNIT_FAMILIES = [
  "kg_co2e_per_unit",
  "kg_co2e_per_pkm",
  "kg_co2e_per_vehicle_km",
  "kg_co2e_per_hour",
  "kg_co2e_per_meal",
  "kg_co2e_per_kwh",
] as const;

// The closed set of factor keys plus the dynamic sentinel.
const _seededKeys = listFactorKeys();
const FACTOR_KEYS = [..._seededKeys, "dynamic.lookup"];
const factorKeyEnum = FACTOR_KEYS as [string, ...string[]];

const candidateZod = z
  .object({
    label: z.string().min(1),
    mode: z.string().min(1),
    factorKey: z.enum(factorKeyEnum),
    // Quantities are >= 0: a quantity of 0 expresses a "keep / avoid / skip"
    // baseline option (e.g. keeping your phone = 0 new units manufactured).
    distanceKm: z.number().nonnegative().optional(),
    hours: z.number().nonnegative().optional(),
    meals: z.number().nonnegative().optional(),
    units: z.number().nonnegative().optional(),
    kwh: z.number().nonnegative().optional(),
    occupancy: z.number().positive().optional(),
    costINR: z.number().nonnegative().optional(),
    durationHours: z.number().nonnegative().optional(),
    // Dynamic lookup fields — only required when factorKey === "dynamic.lookup".
    lookupTerm: z.string().optional(),
    factorUnit: z.enum([...UNIT_FAMILIES] as [string, ...string[]]).optional(),
  })
  .refine(
    (data) => {
      if (data.factorKey === "dynamic.lookup") {
        return (
          data.lookupTerm != null &&
          data.lookupTerm.length > 0 &&
          data.factorUnit != null
        );
      }
      return true;
    },
    {
      // Forces a re-ask when a dynamic candidate omits its lookup fields, which
      // reliably fills them on the retry. resolveDynamicFactors still drops any
      // stray incomplete candidate as a backstop.
      message:
        "When factorKey is 'dynamic.lookup', lookupTerm and factorUnit are required",
    },
  );

const intentZod = z.object({
  category: z.enum(["transport", "appliance", "diet", "goods", "other"]),
  summary: z.string().min(1),
  origin: z.string().optional(),
  destination: z.string().optional(),
  defaultMode: z.string().optional(),
  notes: z.string().optional(),
});

/** The strict contract. Malformed output is rejected, not guessed at. */
export const parseResultZod = z.object({
  intent: intentZod,
  candidates: z.array(candidateZod).min(2),
});

export type ParsedResult = z.infer<typeof parseResultZod>;

/** The Gemini structured-output schema mirroring the zod contract. */
export const geminiParseSchema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          enum: ["transport", "appliance", "diet", "goods", "other"],
        },
        summary: { type: Type.STRING },
        origin: { type: Type.STRING },
        destination: { type: Type.STRING },
        defaultMode: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ["category", "summary"],
    },
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          mode: { type: Type.STRING },
          factorKey: { type: Type.STRING, enum: [...FACTOR_KEYS] },
          distanceKm: { type: Type.NUMBER },
          hours: { type: Type.NUMBER },
          meals: { type: Type.NUMBER },
          units: { type: Type.NUMBER },
          kwh: { type: Type.NUMBER },
          occupancy: { type: Type.NUMBER },
          costINR: { type: Type.NUMBER },
          durationHours: { type: Type.NUMBER },
          lookupTerm: { type: Type.STRING },
          factorUnit: { type: Type.STRING, enum: [...UNIT_FAMILIES] },
        },
        required: ["label", "mode", "factorKey"],
      },
    },
  },
  required: ["intent", "candidates"],
};

export { FACTOR_KEYS, UNIT_FAMILIES };
