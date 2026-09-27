// Parceiras (183, site navegável fase 3, 27/09/2026): as candidaturas da
// página /parceiras e, de cada aprovada, o link próprio, as etapas que o
// sistema comprova na conta dela e as contas que o link trouxe.

import Link from "next/link";
import { getParceiras, type ParceiraNoPainel } from "@/lib/supabase/admin-parceiras";
import { ENSINA } from "@/lib/parceiras";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { appUrl } from "@/lib/app-url";
import { aprovarParceira, recusarParceira } from "./actions";
import { CampoReels } from "./CampoReels";

export const dynamic = "force-dynamic";

function quando(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

function Insta({ arroba }: { arroba: string }) {
  const perfil = arroba.replace(/^@/, "");
  return (
    <a
      href={`https://instagram.com/${encodeURIComponent(perfil)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-2"
    >
      {arroba}
    </a>
  );
}

function Etapa({ ok, rotulo }: { ok: boolean; rotulo: string }) {
  return (
    <span
      className={
        ok
          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
          : "rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500"
      }
    >
      {ok ? "✓ " : ""}
      {rotulo}
    </span>
  );
}

function Candidata({ p }: { p: ParceiraNoPainel }) {
  const wa = linkWhatsapp(p.whatsapp, `Oi, ${p.nome.split(" ")[0]}! Aqui é do eOrganizei, sobre a sua candidatura de parceira.`);
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-stone-900">
          {p.nome} · <Insta arroba={p.instagram} />
        </p>
        <span className="text-xs text-stone-500">{quando(p.criadaEm)}</span>
      </div>
      <p className="text-xs text-stone-600">
        {ENSINA[p.ensina]} · {p.email}
        {p.empresa ? ` · já tem conta: ${p.empresa.nome}` : ""}
      </p>
      {p.sobre ? <p className="text-sm text-stone-700">“{p.sobre}”</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <form action={aprovarParceira}>
          <input type="hidden" name="id" value={p.id} />
          <button className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700">
            Aprovar e gerar o link
          </button>
        </form>
        <form action={recusarParceira}>
          <input type="hidden" name="id" value={p.id} />
          <button className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
            Recusar
          </button>
        </form>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
    </li>
  );
}

function Parceira({ p }: { p: ParceiraNoPainel }) {
  const link = `${appUrl()}/p/${p.slug}`;
  const wa = linkWhatsapp(
    p.whatsapp,
    `Oi, ${p.nome.split(" ")[0]}! Sua parceria com o eOrganizei foi aprovada. Este é o seu link: ${link}`
  );
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-stone-900">
          {p.nome} · <Insta arroba={p.instagram} />
        </p>
        <span className="text-xs text-stone-500">{ENSINA[p.ensina]}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <code className="rounded bg-stone-100 px-2 py-1 text-stone-800">{link}</code>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50"
          >
            Mandar o link no WhatsApp
          </a>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-stone-500">
          {p.empresa ? (
            <>
              Conta:{" "}
              <Link href={`/admin/contas/${p.empresa.id}`} className="font-medium text-stone-800 underline">
                {p.empresa.nome}
              </Link>
            </>
          ) : (
            `Ainda sem conta com ${p.email}`
          )}
        </span>
        <Etapa ok={p.etapas.eventoReal} rotulo="evento real (3 meses)" />
        <Etapa ok={p.etapas.reels} rotulo="Reels em collab (+3)" />
        <Etapa ok={p.etapas.diaPeloSistema} rotulo="dia pelo sistema (+6)" />
      </div>
      <p className="text-xs text-stone-600">
        Contas pelo link dela: <b className="text-stone-900">{p.trazidas}</b> · pagantes:{" "}
        <b className="text-stone-900">{p.pagantes}</b>
      </p>
      <CampoReels id={p.id} url={p.reelsUrl} />
    </li>
  );
}

export default async function ParceirasAdmin() {
  const todas = await getParceiras();

  if (todas === null) {
    return (
      <div data-adm-secao="parceiras" className="max-w-2xl">
        <h1 className="text-xl font-semibold text-stone-900">Parceiras</h1>
        <p className="mt-3 text-sm text-stone-600">
          Falta aplicar a migração <code>183_parceiras.sql</code> no Supabase. Depois dela, as candidaturas da página
          /parceiras aparecem aqui.
        </p>
      </div>
    );
  }

  const candidatas = todas.filter((p) => p.status === "candidata");
  const aprovadas = todas.filter((p) => p.status === "aprovada");
  const recusadas = todas.filter((p) => p.status === "recusada");

  return (
    <div data-adm-secao="parceiras" className="flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Parceiras</h1>
        <p className="mt-1 text-sm text-stone-600">
          Candidaturas da página{" "}
          <a href="/parceiras" target="_blank" className="underline">
            /parceiras
          </a>
          . As etapas saem da conta dela no sistema; a cortesia se dá em Contas, na assinatura dela.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Candidaturas · {candidatas.length}
        </h2>
        {candidatas.length ? (
          <ul className="flex flex-col gap-3">
            {candidatas.map((p) => (
              <Candidata key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Nenhuma candidatura esperando.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Parceiras · {aprovadas.length}</h2>
        {aprovadas.length ? (
          <ul className="flex flex-col gap-3">
            {aprovadas.map((p) => (
              <Parceira key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Nenhuma parceira aprovada ainda.</p>
        )}
      </section>

      {recusadas.length ? (
        <details className="text-sm text-stone-600">
          <summary className="cursor-pointer">Recusadas · {recusadas.length}</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {recusadas.map((p) => (
              <li key={p.id}>
                {p.nome} · {p.instagram} · {quando(p.criadaEm)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
