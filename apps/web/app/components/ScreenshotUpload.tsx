"use client";

import { useRef, useState } from "react";

interface Props {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export default function ScreenshotUpload({ onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedName(file.name);
    onUpload(file);
    // Reset so the same file can be re-picked if needed
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Upload a booking screenshot"
        onChange={handleChange}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-leaf hover:bg-leaf/10 hover:text-leaf disabled:cursor-not-allowed disabled:opacity-50"
      >
        📷 Share a screenshot
      </button>
      {pickedName && (
        <p className="text-xs text-slate-400 truncate max-w-xs">{pickedName}</p>
      )}
    </div>
  );
}
