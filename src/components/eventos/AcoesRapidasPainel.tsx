"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Upload,
} from "lucide-react";
import { ImportarEventosModal } from "@/components/eventos/ImportarEventosModal";

function Item({
  icon: Icon,
  children,
  href,
  onClick,
}: {
  icon: typeof FilePlus2;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50";
  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      {children}
    </>
  );
  if (href?.startsWith("/api")) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function AcoesRapidasPainel({ exportHref }: { exportHref: string }) {
  const [importar, setImportar] = useState(false);
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Ações rápidas</h3>
      <div className="mt-2 space-y-0.5">
        <Item icon={FilePlus2} href="/eventos/novo">
          Novo orçamento
        </Item>
        <Item icon={Upload} onClick={() => setImportar(true)}>
          Importar evento
        </Item>
        <Item icon={FileText} href={exportHref}>
          Relatório de eventos
        </Item>
        <Item icon={FileSpreadsheet} href={exportHref}>
          Exportar CSV
        </Item>
        <Item icon={CalendarDays} href="/calendario">
          Calendário
        </Item>
      </div>
      {importar && <ImportarEventosModal onClose={() => setImportar(false)} />}
    </section>
  );
}
