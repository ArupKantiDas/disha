"use client";

import type { CompareResponse, RankedOption } from "../lib/types";

function round(n: number): number {
  return Math.round(n);
}

function formatCost(costINR?: number): string {
  if (costINR == null) return "—";
  return `₹${Math.round(costINR).toLocaleString("en-IN")}`;
}

function formatDuration(hours?: number): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function OptionCard({ option }: { option: RankedOption }) {
  return (
    <div
      className={`rounded-xl bg-white p-4 shadow-sm ${
        option.isRecommended
          ? "border-2 border-leaf"
          : "border border-slate-200"
      }`}
    >
      {/* Header: rank + label + badges */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-slate-400">
            #{option.rank}
          </span>
          <span className="font-semibold leading-snug text-coal">
            {option.label}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {option.isRecommended && (
            <span className="rounded-full bg-leaf px-2 py-0.5 text-xs font-semibold text-white">
              🌿 Greener pick
            </span>
          )}
          {option.isDefault && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              Your usual
            </span>
          )}
        </div>
      </div>

      {/* Three axes */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="mb-0.5 text-xs text-slate-500">🌿 Carbon</p>
          <p className="text-lg font-bold leading-none text-coal">
            {round(option.kgCO2e)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">kg CO₂</p>
        </div>
        <div>
          <p className="mb-0.5 text-xs text-slate-500">💰 Cost</p>
          <p className="text-lg font-bold leading-none text-coal">
            {formatCost(option.costINR)}
          </p>
        </div>
        <div>
          <p className="mb-0.5 text-xs text-slate-500">⏱ Time</p>
          <p className="text-lg font-bold leading-none text-coal">
            {formatDuration(option.durationHours)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResultCard({ data }: { data: CompareResponse }) {
  const { intent, options, recommended, nudge } = data;

  return (
    <div className="space-y-5">
      {/* Intent summary */}
      <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
        {intent.summary}
      </p>

      {/* Hero recommended block */}
      <div className="rounded-2xl bg-leaf p-5 text-white shadow-md">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-green-200">
          Recommended
        </p>
        <h2 className="mb-2 text-xl font-bold">{recommended.label}</h2>
        <p className="text-sm leading-relaxed text-green-100">{nudge}</p>
        {recommended.kgVsDefault != null && recommended.kgVsDefault > 0 && (
          <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1.5 text-sm font-bold">
            Saves ~{round(recommended.kgVsDefault)} kg CO₂
          </span>
        )}
      </div>

      {/* Ranked list */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          All options · greenest first
        </p>
        {options.map((option) => (
          <OptionCard key={`${option.factorKey}-${option.rank}`} option={option} />
        ))}
      </div>
    </div>
  );
}
