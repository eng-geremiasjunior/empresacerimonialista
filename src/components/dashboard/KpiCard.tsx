import type { LucideIcon } from "lucide-react";
import type { Kpi } from "@/lib/dashboard-mock";

const TONE_STYLES: Record<Kpi["tone"], string> = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-gray-400",
};

export function KpiCard({ kpi, icon: Icon }: { kpi: Kpi; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-600">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <p className="text-sm text-gray-500">{kpi.title}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
        {kpi.value}
      </p>
      <p className={`mt-1 text-sm ${TONE_STYLES[kpi.tone]}`}>{kpi.sub}</p>
    </div>
  );
}
