"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export default function DecisionInput({ onSubmit, isLoading }: Props) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => {
    setHasSpeech(
      typeof window !== "undefined" &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    );
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text || isLoading) return;
    onSubmit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const toggleMic = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript as string | undefined;
      if (t) setValue((prev) => (prev ? `${prev} ${t}` : t));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="e.g. Kolkata to Bangalore for a 3-day work trip"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base text-coal placeholder-slate-400 shadow-sm transition-colors focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20 disabled:opacity-60"
        />
        {hasSpeech && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={isLoading}
            aria-label={listening ? "Stop listening" : "Speak your decision"}
            className={`absolute bottom-3 right-3 rounded-full p-2 transition-colors disabled:opacity-40 ${
              listening
                ? "animate-pulse bg-red-100 text-red-500"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            🎤
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim() || isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-leafdark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Comparing…
          </>
        ) : (
          "Compare options →"
        )}
      </button>
    </div>
  );
}
