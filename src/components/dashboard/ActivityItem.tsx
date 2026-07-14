"use client";

import { useRouter } from "next/navigation";
import { ActivityIcon } from "@/components/ActivityIcon";
import { relativeTime, type Activity } from "@/lib/activity";

type Props = {
  activity: Activity;
  /** Referência de tempo vinda do servidor: mantém SSR e hidratação idênticos. */
  now: Date;
};

export function ActivityItem({ activity, now }: Props) {
  const router = useRouter();
  const clickable = activity.eventId !== null;

  function open() {
    if (activity.eventId) {
      router.push(`/eventos/${activity.eventId}`);
    }
  }

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (clickable && e.key === "Enter") open();
      }}
      className={`flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors ${
        clickable ? "cursor-pointer hover:bg-stone-50" : "hover:bg-stone-50/60"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <ActivityIcon category={activity.category} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-stone-900">
            {activity.title}
          </p>
          <p className="shrink-0 text-xs text-stone-400">
            {relativeTime(activity.createdAt, now)}
          </p>
        </div>
        {activity.description && (
          <p className="text-sm leading-snug text-stone-600">
            {activity.description}
          </p>
        )}
        {activity.eventName && (
          <p className="mt-0.5 truncate text-xs text-stone-400">
            {activity.eventName}
          </p>
        )}
      </div>
    </div>
  );
}
