"use client";

import { useState } from "react";
import DecisionInput from "./components/DecisionInput";
import ResultCard from "./components/ResultCard";
import SeedChips from "./components/SeedChips";
import ScreenshotUpload from "./components/ScreenshotUpload";
import { compare, compareImage } from "./lib/api";
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

  async function handleImage(file: File) {
    setState({ kind: "loading" });
    try {
      const data = await compareImage(file);
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

      <div className="mt-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-xs text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      <div className="mt-3 flex justify-center">
        <ScreenshotUpload
          onUpload={handleImage}
          disabled={state.kind === "loading"}
        />
      </div>

      <div className="mt-8">
        {state.kind === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Not sure where to start? Try one:</p>
            <SeedChips onPick={handleSubmit} disabled={false} />
          </div>
        )}

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

        {state.kind === "result" && (
          <>
            {state.data.source === "screenshot" && state.data.extraction && (
              <div className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                <span>📷 From your screenshot: {state.data.extraction.summary}</span>
                {state.data.extraction.priceINR !== undefined && (
                  <span> · ₹{state.data.extraction.priceINR.toLocaleString("en-IN")}</span>
                )}
              </div>
            )}
            <ResultCard data={state.data} />
          </>
        )}
      </div>

      <footer className="mt-12 border-t border-slate-100 pt-6 text-xs text-slate-400">
        Gemini interprets. The engine computes. Carbon math from verified CEA &amp;
        rail factors — never guessed.
      </footer>
    </main>
  );
}
