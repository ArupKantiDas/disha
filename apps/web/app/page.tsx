"use client";

import { useState } from "react";
import DecisionInput from "./components/DecisionInput";
import ResultCard from "./components/ResultCard";
import { compare } from "./lib/api";
import type { CompareResponse } from "./lib/types";

type PageState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "result"; data: CompareResponse };

export default function Home() {
  const [state, setState] = useState<PageState>({ kind: "idle" });

  async function handleSubmit(text: string) {
    setState({ kind: "loading" });
    try {
      const data = await compare(text);
      setState({ kind: "result", data });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-coal">
          Disha <span className="text-leaf">·</span>
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Tell us a trip or a purchase. We rank your real options across{" "}
          <span className="font-semibold text-coal">carbon</span>,{" "}
          <span className="font-semibold text-coal">cost</span>, and{" "}
          <span className="font-semibold text-coal">time</span> — before you
          spend a rupee.
        </p>
      </header>

      <DecisionInput
        onSubmit={handleSubmit}
        isLoading={state.kind === "loading"}
      />

      <div className="mt-8">
        {state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-leaf border-t-transparent" />
            <p className="text-sm text-slate-500">Crunching carbon numbers…</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">Something went wrong</p>
            <p className="mt-1 text-sm text-red-600">{state.message}</p>
          </div>
        )}

        {state.kind === "result" && <ResultCard data={state.data} />}
      </div>

      <footer className="mt-12 border-t border-slate-100 pt-6 text-xs text-slate-400">
        Gemini interprets. The engine computes. Carbon math from verified CEA &amp;
        rail factors — never guessed.
      </footer>
    </main>
  );
}
