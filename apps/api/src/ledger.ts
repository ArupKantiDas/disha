import { FieldValue, Firestore } from "@google-cloud/firestore";
import { GOOGLE_CLOUD_PROJECT } from "./config.js";

let db: Firestore | null = null;

function firestore(): Firestore {
  if (!db) {
    db = new Firestore({ projectId: GOOGLE_CLOUD_PROJECT || undefined });
  }
  return db;
}

const COLLECTION = "ledgers";

/** A device's lifetime avoided total — the counter that only ever grows. */
export interface LedgerState {
  kgAvoidedTotal: number;
  decisionCount: number;
}

/** Metadata stored with each committed decision (for an honest audit trail). */
export interface DecisionMeta {
  label?: string;
  factorKey?: string;
  summary?: string;
  defaultLabel?: string;
}

function emptyState(): LedgerState {
  return { kgAvoidedTotal: 0, decisionCount: 0 };
}

export async function getLedger(clientId: string): Promise<LedgerState> {
  const snap = await firestore().collection(COLLECTION).doc(clientId).get();
  if (!snap.exists) return emptyState();
  const d = snap.data() ?? {};
  return {
    kgAvoidedTotal: Number(d.kgAvoidedTotal) || 0,
    decisionCount: Number(d.decisionCount) || 0,
  };
}

/**
 * Log a chosen greener decision. kgAvoided is the saving versus the user's
 * stated default — clamped to >= 0 so the lifetime counter only grows and is
 * never inflated past a sane bound.
 */
export async function commitDecision(
  clientId: string,
  kgAvoided: number,
  meta: DecisionMeta = {},
): Promise<LedgerState> {
  const safe = Math.min(100_000, Math.max(0, Number(kgAvoided) || 0));
  const ref = firestore().collection(COLLECTION).doc(clientId);

  await ref.set(
    {
      kgAvoidedTotal: FieldValue.increment(safe),
      decisionCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await ref.collection("decisions").add({
    kgAvoided: safe,
    label: meta.label ?? null,
    factorKey: meta.factorKey ?? null,
    summary: meta.summary ?? null,
    defaultLabel: meta.defaultLabel ?? null,
    at: FieldValue.serverTimestamp(),
  });

  return getLedger(clientId);
}
