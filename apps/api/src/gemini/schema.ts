import { Type } from "@google/genai";
import { listFactorKeys } from "@disha/engine";
import { z } from "zod";

// The closed set of factor keys. Gemini cannot invent one; zod rejects any
// stray value and we re-ask.
const FACTOR_KEYS = listFactorKeys();
const factorKeyEnum = [...FACTOR_KEYS] as [string, ...string[]];

const candidateZod = z.object({
  label: z.string().min(1),
  mode: z.string().min(1),
  factorKey: z.enum(factorKeyEnum),
  distanceKm: z.number().positive().optional(),
  hours: z.number().positive().optional(),
  meals: z.number().positive().optional(),
  units: z.number().positive().optional(),
  kwh: z.number().positive().optional(),
  occupancy: z.number().positive().optional(),
  costINR: z.number().nonnegative().optional(),
  durationHours: z.number().nonnegative().optional(),
});

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
          factorKey: { type: Type.STRING, enum: FACTOR_KEYS },
          distanceKm: { type: Type.NUMBER },
          hours: { type: Type.NUMBER },
          meals: { type: Type.NUMBER },
          units: { type: Type.NUMBER },
          kwh: { type: Type.NUMBER },
          occupancy: { type: Type.NUMBER },
          costINR: { type: Type.NUMBER },
          durationHours: { type: Type.NUMBER },
        },
        required: ["label", "mode", "factorKey"],
      },
    },
  },
  required: ["intent", "candidates"],
};

export { FACTOR_KEYS };
