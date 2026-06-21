import type { Candidate, ParseResult } from "@disha/shared";
import { resolveFactor } from "./gemini/resolveFactor.js";

/**
 * For every candidate whose factorKey is "dynamic.lookup", call resolveFactor
 * to retrieve a live emission factor via Google Search.
 *
 * - Success: attach candidate.dynamicFactor so the engine can compute with it.
 * - Failure: drop the candidate from the list (never surface a shaky number).
 * - Seeded candidates are passed through untouched.
 *
 * Resolution runs concurrently across all dynamic candidates.
 */
export async function resolveDynamicFactors(
  parsed: ParseResult,
): Promise<ParseResult> {
  const resolved = await Promise.all(
    parsed.candidates.map(async (c): Promise<Candidate | null> => {
      if (c.factorKey !== "dynamic.lookup") return c;

      const lookupTerm = c.lookupTerm;
      const factorUnit = c.factorUnit;

      if (!lookupTerm || !factorUnit) {
        console.warn(
          "[resolveDynamic] dynamic.lookup candidate missing lookupTerm or factorUnit dropping",
          c.label,
        );
        return null;
      }

      const factor = await resolveFactor(lookupTerm, factorUnit);
      if (!factor) {
        console.warn(
          "[resolveDynamic] Could not resolve factor for:",
          lookupTerm,
          " dropping candidate",
          c.label,
        );
        return null;
      }

      return { ...c, dynamicFactor: factor };
    }),
  );

  const candidates = resolved.filter((c): c is Candidate => c !== null);

  if (candidates.length < 2) {
    throw new Error(
      `Dynamic factor resolution left fewer than 2 candidates (${candidates.length} survived). ` +
        "Cannot produce a meaningful comparison.",
    );
  }

  return { ...parsed, candidates };
}
