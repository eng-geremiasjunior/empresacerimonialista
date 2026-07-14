"use client";

type Props = {
  steps: string[];
  current: number; // 1-based
};

export function WizardProgress({ steps, current }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${
                active
                  ? "bg-stone-900 text-white"
                  : done
                    ? "bg-emerald-500 text-white"
                    : "bg-stone-200 text-stone-500"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span
              className={
                active ? "font-medium text-stone-900" : "text-stone-400"
              }
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="text-stone-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
