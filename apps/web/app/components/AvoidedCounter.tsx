"use client";

interface Props {
  kgAvoidedTotal: number;
  decisionCount: number;
}

export default function AvoidedCounter({ kgAvoidedTotal, decisionCount }: Props) {
  if (kgAvoidedTotal === 0 && decisionCount === 0) {
    return (
      <div className="rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm text-slate-600">
        Make a greener choice below and watch this grow.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-4">
      <p className="text-3xl font-bold text-coal">
        {Math.round(kgAvoidedTotal)} kg
      </p>
      <p className="mt-0.5 text-sm font-medium text-leaf">CO₂ avoided · lifetime</p>
      <p className="mt-1 text-xs text-slate-500">
        {decisionCount} greener decision{decisionCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
