"use client";

interface Seed {
  emoji: string;
  label: string;
  text: string;
}

const SEEDS: Seed[] = [
  { emoji: "✈️", label: "Flight vs train", text: "Kolkata to Bangalore for a 3-day work trip" },
  { emoji: "❄️", label: "AC vs cooler", text: "Run the AC or the air cooler tonight for 8 hours" },
  { emoji: "🚗", label: "EV vs petrol", text: "Drive to Jaipur in my petrol car or an EV" },
  { emoji: "🍛", label: "Mutton vs veg", text: "Mutton curry or a veg thali for dinner" },
  { emoji: "📱", label: "New phone vs keep", text: "Buy a new phone or keep my old one another year" },
];

interface Props {
  onPick: (text: string) => void;
  disabled?: boolean;
}

export default function SeedChips({ onPick, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEEDS.map((seed) => (
        <button
          key={seed.label}
          type="button"
          onClick={() => onPick(seed.text)}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-coal transition-colors hover:border-leaf hover:bg-leaf/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">{seed.emoji}</span>
          <span>{seed.label}</span>
        </button>
      ))}
    </div>
  );
}
