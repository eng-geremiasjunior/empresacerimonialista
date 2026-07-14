"use client";

import { EventTypeIcon } from "@/components/EventTypeIcon";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

type Props = {
  selected: EventType | null;
  onSelect: (type: EventType) => void;
};

const ORDER: EventType[] = [
  "casamento",
  "debutante",
  "formatura",
  "aniversario",
  "corporativo",
  "cha_revelacao",
  "batizado",
  "bodas",
  "outro",
];

export function StepTipoEvento({ selected, onSelect }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">
        Que tipo de evento é?
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Isso define o checklist, as fases e a timeline sugeridos.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ORDER.map((type) => {
          const active = selected === type;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`flex flex-col items-center gap-3 rounded-xl border bg-white p-5 text-center transition ${
                active
                  ? "border-2 border-indigo-500 bg-indigo-50"
                  : "border border-gray-200 hover:border-indigo-300 hover:shadow-sm"
              }`}
            >
              <EventTypeIcon
                type={type}
                size={28}
                className={active ? "text-indigo-600" : "text-gray-700"}
              />
              <span className="text-sm font-medium text-gray-900">
                {EVENT_TYPE_LABELS[type]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
