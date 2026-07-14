"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildEventosHref, type EventosParams } from "@/lib/eventos-url";

const PER_PAGE_OPTIONS = [20, 50, 100];

export function EventosPaginacao({
  current,
  total,
}: {
  current: EventosParams;
  total: number;
}) {
  const router = useRouter();
  const perPage = Number(current.perPage) || 20;
  const page = Math.max(1, Number(current.page) || 1);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (total === 0) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  // Janela de até 5 números de página centrada na atual.
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => windowStart + i
  ).filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-1 py-3 text-sm">
      <p className="text-gray-500">
        Mostrando {from}–{to} de {total} evento{total === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-gray-500">
          Por página
          <select
            value={perPage}
            onChange={(e) =>
              router.push(
                buildEventosHref(current, { perPage: e.target.value, page: "1" })
              )
            }
            className="rounded-md border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700 focus:border-gray-500 focus:outline-none"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <Link
            href={buildEventosHref(current, { page: String(Math.max(1, page - 1)) })}
            aria-disabled={page === 1}
            className={`flex items-center rounded-md p-1.5 ${
              page === 1
                ? "pointer-events-none text-gray-300"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft size={16} />
          </Link>
          {pages.map((p) => (
            <Link
              key={p}
              href={buildEventosHref(current, { page: String(p) })}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium ${
                p === page
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p}
            </Link>
          ))}
          <Link
            href={buildEventosHref(current, {
              page: String(Math.min(totalPages, page + 1)),
            })}
            aria-disabled={page === totalPages}
            className={`flex items-center rounded-md p-1.5 ${
              page === totalPages
                ? "pointer-events-none text-gray-300"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
