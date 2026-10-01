// Um site para revisar: a versão que a família mandou ao lado da que está
// no ar, desenhadas pelo mesmo componente que o convidado vê, na largura
// de um celular. O endereço aparece em cima porque vai ao ar junto e
// congela na aprovação. Antes das prévias, o que muda em palavras: a
// aparência, as fotos novas e os valores dos presentes.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteParaRevisar } from "@/lib/supabase/admin-sites";
import { assinarMidiaDoConvite, assinarMidiaDoSite } from "@/lib/supabase/assinar-midia-convite";
import { haQuanto } from "@/lib/comercial/pedidos";
import { quandoLegivel } from "@/lib/rsvp-convite";
import { PreviaDoSite } from "@/components/convite/PreviaDoSite";
import { DecisaoDoSite } from "../DecisaoDoSite";
import { FotosDaVersao, PresentesDaVersao, TrocaDeAparencia } from "@/components/admin/sites/MudancasDaVersao";

export const dynamic = "force-dynamic";

const ESTADO: Record<string, string> = {
  em_analise: "esperando revisão",
  aprovado: "aprovado",
  recusado: "recusado",
  rascunho: "rascunho",
};

export default async function SiteParaRevisarPage({ params }: { params: { id: string } }) {
  const r = await getSiteParaRevisar(params.id);
  if (!r) notFound();
  const [pend, noAr, urlsPend, urlsNoAr] = await Promise.all([
    r.pendente ? assinarMidiaDoConvite(r.pendente) : null,
    r.no_ar ? assinarMidiaDoConvite(r.no_ar) : null,
    r.pendente ? assinarMidiaDoSite(r.pendente) : {},
    r.no_ar ? assinarMidiaDoSite(r.no_ar) : {},
  ]);
  const base = r.pendente ?? r.no_ar;
  const agora = new Date();

  return (
    <div data-adm-secao="sites" className="flex flex-col gap-4">
      <Link href="/admin/sites" className="text-xs text-stone-500 hover:text-stone-800">
        ← Sites
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-stone-900">{base?.evento.anfitrioes ?? "Site"}</h1>
        <p className="text-xs text-stone-500">
          {[
            base?.empresa?.nome,
            base ? quandoLegivel(base.evento.data, base.evento.hora) : null,
            ESTADO[r.status] ?? r.status,
            r.enviada_em && r.status === "em_analise" ? `enviado ${haQuanto(r.enviada_em, agora)}` : null,
            r.retirado ? "tirado do ar por você" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-xs text-stone-500">
          Endereço: {r.slug ? <code className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-800">/c/{r.slug}</code> : "sem endereço"}
        </p>
      </header>

      <DecisaoDoSite eventId={params.id} versao={r.versao} emAnalise={r.status === "em_analise"} noAr={r.publicado} />

      {r.pendente && (
        <div className="flex flex-col gap-4">
          <TrocaDeAparencia pendente={r.pendente} noAr={r.no_ar} />
          <FotosDaVersao pendente={r.pendente} noAr={r.no_ar} urls={urlsPend} />
          <PresentesDaVersao pendente={r.pendente} noAr={r.no_ar} />
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        {r.pendente && pend && (
          <section className="flex w-[430px] min-w-0 max-w-full flex-col gap-2">
            <h2 className="text-sm font-semibold text-stone-700">Para aprovar</h2>
            <div className="max-h-[80vh] overflow-y-auto rounded-lg border-2 border-stone-900 bg-white">
              <PreviaDoSite dados={r.pendente} fotosAlbum={pend.fotosAlbum} fotoCasalUrl={pend.fotoCasalUrl} urls={urlsPend} modo="revisao" />
            </div>
          </section>
        )}
        {r.no_ar && noAr && (
          <section className="flex w-[430px] min-w-0 max-w-full flex-col gap-2">
            <h2 className="text-sm font-semibold text-stone-700">{r.publicado ? "No ar agora" : "A última versão aprovada (fora do ar)"}</h2>
            <div className="max-h-[80vh] overflow-y-auto rounded-lg border border-stone-200 bg-white">
              <PreviaDoSite dados={r.no_ar} fotosAlbum={noAr.fotosAlbum} fotoCasalUrl={noAr.fotoCasalUrl} urls={urlsNoAr} modo="revisao" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
