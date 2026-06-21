"use client";

import { useEffect, useState } from "react";
import { getFactors } from "../lib/api";
import type { FactorRow } from "../lib/types";

export default function HowWeCalculate() {
  const [factors, setFactors] = useState<FactorRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getFactors()
      .then(setFactors)
      .catch(() => setError(true));
  }, []);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-600 hover:text-coal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf rounded-2xl">
        How we calculate (sourced factors)
      </summary>

      <div className="border-t border-slate-100 px-4 py-3">
        {error && (
          <p className="text-xs text-slate-400">Could not load factors right now.</p>
        )}
        {!error && factors === null && (
          <p className="text-xs text-slate-400">Loading…</p>
        )}
        {factors && factors.length === 0 && (
          <p className="text-xs text-slate-400">No factors available.</p>
        )}
        {factors && factors.length > 0 && (
          <ul className="space-y-3">
            {factors.map((f) => (
              <li key={f.key} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-coal">{f.label}</span>
                  {f.verify === false ? (
                    <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-xs font-semibold text-leafdark">
                      ✓ verified
                    </span>
                  ) : f.verify === true ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      seed
                    </span>
                  ) : null}
                </div>
                {f.perUnitFactor != null && (
                  <p className="text-xs text-slate-500">
                    {f.perUnitFactor} {f.unit}
                  </p>
                )}
                {f.source && (
                  <p className="mt-0.5 text-xs text-slate-400">{f.source}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
