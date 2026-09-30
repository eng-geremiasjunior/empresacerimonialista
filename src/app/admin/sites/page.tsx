// Os sites do eOrganizei (30/09/2026, migrações 185 e 186): a família
// publica e a versão espera aqui a revisão do dono antes de ir ao ar.
// Embaixo, os sites no ar — para tirar do ar se algo aparecer depois.

import Link from "next/link";
import { getFilaSites, getSitesNoAr } from "@/lib/supabase/admin-sites";
import { haQuanto } from "@/lib/comercial/pedidos";
import { publicBase } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const [fila, noAr] = await Promise.all([getFilaSites(), getSitesNoAr()]);
  const agora = new Date();
  const base = publicBase();

  return (
    <div data-adm-secao="sites" className="flex max-w-4xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-stone-900">
          Esperando revisão{fila.length > 0 ? ` (${fila.length})` : ""}
        </h1>
        {fila.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum site esperando revisão.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fila.map((s) => (
              <li key={s.event_id}>
                <Link
                  href={`/admin/sites/${s.event_id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-300"
                >
                  <span className="text-sm font-semibold text-stone-900">
                    {s.evento}
                    <span className="ml-2 font-normal text-stone-500">{s.empresa ?? ""}</span>
                  </span>
                  <span className="text-xs text-stone-500">
                    {s.enviada_em ? `enviado ${haQuanto(s.enviada_em, agora)}` : ""}
                    {s.no_ar ? " · há uma versão no ar" : " · primeira publicação"}
                    {s.slug ? ` · /c/${s.slug}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-stone-700">No ar</h2>
        {noAr.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum site no ar.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {noAr.map((s) => (
              <li key={s.event_id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <Link href={`/admin/sites/${s.event_id}`} className="text-sm text-stone-800 hover:underline">
                  {s.evento}
                  <span className="ml-2 text-stone-500">{s.empresa ?? ""}</span>
                </Link>
                <span className="text-xs text-stone-500">
                  {s.publicado_em ? `no ar ${haQuanto(s.publicado_em, agora)}` : "no ar"}
                  {s.slug && (
                    <>
                      {" · "}
                      <a href={`${base}/c/${s.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
                        abrir
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
