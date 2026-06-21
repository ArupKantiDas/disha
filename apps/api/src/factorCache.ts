import { createHash } from "node:crypto";
import { FieldValue, Firestore } from "@google-cloud/firestore";
import { GOOGLE_CLOUD_PROJECT } from "./config.js";

let db: Firestore | null = null;

function firestore(): Firestore {
  if (!db) {
    db = new Firestore({ projectId: GOOGLE_CLOUD_PROJECT || undefined });
  }
  return db;
}

const COLLECTION = "factorCache";

export type CachedFactor = {
  perUnitFactor: number;
  unit: string;
  source: string;
  sourceUrl?: string;
  confidence: "high" | "medium" | "low";
};

export function cacheKey(lookupTerm: string, unit: string): string {
  return createHash("sha1")
    .update(`${unit}::${lookupTerm.trim().toLowerCase()}`)
    .digest("hex");
}

export async function getCachedFactor(key: string): Promise<CachedFactor | null> {
  try {
    const snap = await firestore().collection(COLLECTION).doc(key).get();
    if (!snap.exists) return null;
    const d = snap.data() ?? {};
    if (!d.perUnitFactor || !d.unit || !d.confidence) return null;
    return {
      perUnitFactor: Number(d.perUnitFactor),
      unit: String(d.unit),
      source: String(d.source ?? "unknown source"),
      sourceUrl: d.sourceUrl ? String(d.sourceUrl) : undefined,
      confidence: d.confidence as "high" | "medium" | "low",
    };
  } catch {
    return null;
  }
}

export async function putCachedFactor(
  key: string,
  value: CachedFactor & { lookupTerm: string },
): Promise<void> {
  try {
    await firestore()
      .collection(COLLECTION)
      .doc(key)
      .set({
        perUnitFactor: value.perUnitFactor,
        unit: value.unit,
        source: value.source,
        sourceUrl: value.sourceUrl ?? null,
        confidence: value.confidence,
        lookupTerm: value.lookupTerm,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch {
    // best-effort; ignore write errors
  }
}
