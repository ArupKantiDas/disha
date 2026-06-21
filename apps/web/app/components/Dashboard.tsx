"use client";

import type { LedgerState, StatsResult } from "../lib/types";

interface Props {
  ledger: LedgerState;
  stats: StatsResult | null;
  displayName: string | null;
}

export default function Dashboard({ ledger, stats, displayName }: Props) {
  const yourTotal = ledger.kgAvoidedTotal;
  const avg = stats?.avgPerUser ?? 0;
  const ratio = avg > 0 ? yourTotal / avg : null;

  // Scale bars relative to whichever is higher
  const maxVal = Math.max(yourTotal, avg, 0.01);
  const yourPct = Math.round((yourTotal / maxVal) * 100);
  const avgPct = Math.round((avg / maxVal) * 100);

  return (
    <div className="rounded-2xl border border-leaf/30 bg-white px-4 py-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Your impact</p>
          {displayName && (
            <p className="text-sm text-slate-600 mt-0.5">{displayName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-coal">{Math.round(yourTotal)} kg</p>
          <p className="text-xs text-leaf font-medium">CO₂ avoided</p>
          <p className="text-xs text-slate-400">{ledger.decisionCount} decision{ledger.decisionCount === 1 ? "" : "s"}</p>
        </div>
      </div>

      {stats && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">You vs community average</p>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-coal font-medium">You</span>
                <span className="text-slate-500">{Math.round(yourTotal)} kg</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-leaf transition-all duration-500"
                  style={{ width: `${yourPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-500">Avg user</span>
                <span className="text-slate-500">{Math.round(avg)} kg</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-300 transition-all duration-500"
                  style={{ width: `${avgPct}%` }}
                />
              </div>
            </div>
          </div>
          {ratio !== null && (
            <p className="text-xs text-slate-600 pt-0.5">
              {ratio >= 1
                ? `${ratio.toFixed(1)}× the average user`
                : `${(ratio * 100).toFixed(0)}% of the average user`}
            </p>
          )}
        </div>
      )}

      {ledger.recent && ledger.recent.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Recent greener choices</p>
          <ul className="space-y-1.5">
            {ledger.recent.slice(0, 5).map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 truncate mr-2">{r.label}</span>
                <span className="shrink-0 text-xs font-semibold text-leaf">
                  +{r.kgAvoided.toFixed(2)} kg
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
