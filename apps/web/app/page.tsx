import HealthPing from "./HealthPing";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-5 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Disha <span className="text-leaf">·</span>
        </h1>
        <p className="text-slate-600">
          Tell us a trip or a purchase. We rank your real options across{" "}
          <span className="font-semibold text-coal">carbon</span>,{" "}
          <span className="font-semibold text-coal">cost</span>, and{" "}
          <span className="font-semibold text-coal">time</span> — before you
          spend a rupee.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Phase 0 · connectivity
        </h2>
        <HealthPing />
      </section>

      <footer className="mt-auto text-xs text-slate-400">
        Gemini interprets. The engine computes. Carbon math from verified CEA &
        rail factors — never guessed.
      </footer>
    </main>
  );
}
