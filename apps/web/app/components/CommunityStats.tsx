"use client";

import { useEffect, useState } from "react";
import { getStats } from "../lib/api";
import type { StatsResult } from "../lib/types";

export default function CommunityStats() {
  const [stats, setStats] = useState<StatsResult | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="rounded-2xl border border-leaf/20 bg-leaf/5 px-4 py-4 animate-pulse">
        <div className="h-8 w-32 bg-leaf/20 rounded mb-2" />
        <div className="h-4 w-48 bg-leaf/10 rounded" />
      </div>
    );
  }

  const trees = Math.round(stats.totalKgAvoided / 21);
  // km of petrol driving avoided — meaningful at every scale (unlike whole flights).
  const kmDriving = Math.round(stats.totalKgAvoided / 0.17);
  const plural = (n: number, one: string, many: string) =>
    `${n.toLocaleString()} ${n === 1 ? one : many}`;

  // Sparkline for last 30 points
  const trend = stats.dailyTrend.slice(-30);
  const maxKg = Math.max(...trend.map((d) => d.kg), 0.1);
  const W = 280;
  const H = 48;
  const pts = trend.map((d, i) => {
    const x = trend.length < 2 ? W / 2 : (i / (trend.length - 1)) * W;
    const y = H - (d.kg / maxKg) * H * 0.9;
    return `${x},${y}`;
  });
  const areaPath =
    pts.length > 0
      ? `M${pts[0]} L${pts.join(" L")} L${W},${H} L0,${H} Z`
      : "";
  const linePath = pts.length > 0 ? `M${pts[0]} L${pts.join(" L")}` : "";

  return (
    <div className="rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-4 space-y-3">
      <div>
        <p className="text-3xl font-bold text-coal">
          {Math.round(stats.totalKgAvoided)} kg
        </p>
        <p className="mt-0.5 text-sm font-semibold text-leaf">CO₂ avoided together</p>
        <p className="mt-1 text-xs text-slate-500">
          {plural(stats.totalDecisions, "decision", "decisions")} ·{" "}
          {plural(stats.totalUsers, "person", "people")}
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-white/60 px-3 py-2 text-center">
          <p className="text-lg font-bold text-coal">~{trees}</p>
          <p className="text-xs text-slate-500">trees (approx)</p>
        </div>
        <div className="flex-1 rounded-xl bg-white/60 px-3 py-2 text-center">
          <p className="text-lg font-bold text-coal">~{kmDriving.toLocaleString()}</p>
          <p className="text-xs text-slate-500">km of driving (approx)</p>
        </div>
      </div>

      {trend.length > 1 && (
        <div aria-label="Daily trend sparkline" role="img">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height={H}
            preserveAspectRatio="none"
          >
            <path d={areaPath} fill="#16a34a" fillOpacity="0.15" />
            <path
              d={linePath}
              fill="none"
              stroke="#16a34a"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-xs text-slate-400 text-right">last 30 days</p>
        </div>
      )}
    </div>
  );
}
