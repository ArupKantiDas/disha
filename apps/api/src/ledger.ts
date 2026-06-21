import { FieldPath, FieldValue, Firestore } from "@google-cloud/firestore";
import { GOOGLE_CLOUD_PROJECT } from "./config.js";

let db: Firestore | null = null;

function firestore(): Firestore {
  if (!db) {
    db = new Firestore({ projectId: GOOGLE_CLOUD_PROJECT || undefined });
  }
  return db;
}

const COLLECTION = "ledgers";

/** A device's lifetime avoided total the counter that only ever grows. */
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

export interface RecentDecision {
  label: string | null;
  kgAvoided: number;
  at: string | null;
}

export interface StatsResult {
  totalKgAvoided: number;
  totalDecisions: number;
  totalUsers: number;
  avgPerUser: number;
  dailyTrend: { date: string; kg: number }[];
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
 * stated default clamped to >= 0 so the lifetime counter only grows and is
 * never inflated past a sane bound.
 */
export async function commitDecision(
  clientId: string,
  kgAvoided: number,
  meta: DecisionMeta = {},
): Promise<LedgerState> {
  const safe = Math.min(100_000, Math.max(0, Number(kgAvoided) || 0));
  const fs = firestore();
  const ref = fs.collection(COLLECTION).doc(clientId);

  // Check if this user's ledger exists before writing (for new-user detection).
  const existing = await ref.get();
  const isNewUser = !existing.exists;

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

  // Best-effort community aggregates never block the ledger response.
  const today = new Date().toISOString().slice(0, 10);
  const globalRef = fs.collection("aggregates").doc("global");
  const dailyRef = fs.collection("dailyStats").doc(today);

  const globalUpdate: Record<string, unknown> = {
    totalKgAvoided: FieldValue.increment(safe),
    totalDecisions: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (isNewUser) {
    globalUpdate.totalUsers = FieldValue.increment(1);
  }

  await Promise.all([
    globalRef.set(globalUpdate, { merge: true }),
    dailyRef.set(
      { kg: FieldValue.increment(safe), decisions: FieldValue.increment(1) },
      { merge: true },
    ),
  ]);

  return getLedger(clientId);
}

export async function getRecentDecisions(
  clientId: string,
  limit = 10,
): Promise<RecentDecision[]> {
  const snap = await firestore()
    .collection(COLLECTION)
    .doc(clientId)
    .collection("decisions")
    .orderBy("at", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    const at = d.at?.toDate ? (d.at.toDate() as Date).toISOString() : null;
    return {
      label: d.label ?? null,
      kgAvoided: Number(d.kgAvoided) || 0,
      at,
    };
  });
}

export async function getStats(): Promise<StatsResult> {
  const fs = firestore();

  // Use a date-range filter on the document ID so no composite index is needed.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  const startDate = cutoff.toISOString().slice(0, 10);

  const [globalSnap, dailySnap] = await Promise.all([
    fs.collection("aggregates").doc("global").get(),
    fs
      .collection("dailyStats")
      .where(FieldPath.documentId(), ">=", startDate)
      .get(),
  ]);

  const g = globalSnap.exists ? (globalSnap.data() ?? {}) : {};
  const totalKgAvoided = Number(g.totalKgAvoided) || 0;
  const totalDecisions = Number(g.totalDecisions) || 0;
  const totalUsers = Number(g.totalUsers) || 0;
  const avgPerUser =
    totalUsers > 0
      ? Math.round((totalKgAvoided / totalUsers) * 10) / 10
      : 0;

  const dailyTrend = dailySnap.docs
    .map((doc) => {
      const d = doc.data();
      return { date: doc.id, kg: Number(d.kg) || 0 };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalKgAvoided, totalDecisions, totalUsers, avgPerUser, dailyTrend };
}
