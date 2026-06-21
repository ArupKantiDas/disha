"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type State =
  | { kind: "loading" }
  | { kind: "ok"; message: string }
  | { kind: "error"; detail: string };

export default function HealthPing() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled)
          setState({ kind: "ok", message: data.message ?? "ok" });
      })
      .catch((e) => {
        if (!cancelled)
          setState({ kind: "error", detail: e.message ?? "unreachable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return <p className="text-slate-500">Pinging API…</p>;
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-1">
        <p className="font-medium text-red-600">⚠ API unreachable</p>
        <p className="text-sm text-slate-500">
          {state.detail}. Is the API running at{" "}
          <code className="rounded bg-slate-100 px-1">{API_URL}</code>?
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="font-medium text-leafdark">✓ API connected</p>
      <p className="text-sm text-slate-500">{state.message}</p>
    </div>
  );
}
