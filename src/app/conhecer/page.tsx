import type { Metadata } from "next";
import { newsreader } from "@/lib/planos-do-site";
import { CascaDoSite } from "@/components/site/CascaDoSite";
import { Titulo } from "@/components/site/PaginaDoSite";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";
import { eventosDoCatalogo } from "@/lib/catalogo-vivo";
import { MODELOS, MODELOS_NOVOS } from "@/lib/site-modelos";

// O catálogo vivo (02/10/2026, pedido do dono): o link da bio do
// Instagram. Quem chega entra nos portais de exemplo como o cliente da
// cerimonialista entra, e abre o site do evento em cada modelo — tudo de
// verdade, na conta de exemplo, com o login de visitante que não grava
// nada (195). Nada aqui estreita para noiva: cada tipo de evento com
// portal pronto ganha o seu cartão (os cartões saem do banco).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conheça por dentro — eorganizei",
  description: "Entre no portal de um evento de exemplo como o seu cliente entra, e veja o site do evento em cada modelo.",
};

const PORTAIS: Record<string, { rotulo: string; titulo: string; texto: string; foto: string }> = {
  casamento: {
    rotulo: "Casamento",
    titulo: "O portal do casal",
    texto:
      "Contagem regressiva, convidados e confirmações, fornecedores, músicas, inspirações, roteiro do dia, financeiro, guia de estilo, escolhas e cortejo.",
    foto: "/site/catalogo/portal-casamento.webp",
  },
  debutante: {
    rotulo: "15 anos",
    titulo: "O portal da família",
    texto: "A festa de 15 anos pelo olhar da família: convidados, dinheiro, tarefas, as escolhas e a noite.",
    foto: "/site/catalogo/portal-debutante.webp",
  },
};

const CSS = `
.cv-portais{border-top:1px solid rgba(34,30,27,.1);padding-top:80px;padding-bottom:90px;display:flex;flex-direction:column;gap:36px}
.cv-portais h2,.cv-modelos h2{font:400 clamp(32px,4vw,46px)/1.08 var(--eo-serif)}
.cv-sub{font-size:17px;line-height:1.6;color:#4A443F;max-width:640px}
.cv-cartoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:32px}
.cv-cartao{display:grid;grid-template-columns:minmax(0,200px) 1fr;gap:26px;align-items:center;background:#fff;border:1px solid rgba(34,30,27,.1);padding:22px;color:inherit;text-decoration:none;transition:box-shadow .2s,transform .2s}
.cv-cartao:hover{box-shadow:0 18px 40px rgba(34,30,27,.12);transform:translateY(-2px)}
.cv-cartao img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#EDE7E0}
.cv-cartao small{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#6E2E34}
.cv-cartao b{display:block;font:400 30px/1.1 var(--eo-serif);margin-top:8px}
.cv-cartao p{font-size:15px;line-height:1.6;color:#4A443F;margin-top:12px}
.cv-cartao span.cv-entrar{display:inline-block;margin-top:18px;background:#6E2E34;color:#FAF8F5;padding:12px 20px;font-size:14px;letter-spacing:.03em}
.cv-nota{font-size:14px;line-height:1.6;color:#6B6259}
.cv-modelos{background:#F2EEE9}
.cv-modelos .ps-g{padding-top:80px;padding-bottom:90px;display:flex;flex-direction:column;gap:30px}
.cv-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:22px}
.cv-modelo{color:inherit;text-decoration:none;display:flex;flex-direction:column;gap:10px}
.cv-modelo img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#E4DDD4;transition:transform .2s,box-shadow .2s}
.cv-modelo:hover img{transform:translateY(-3px);box-shadow:0 14px 30px rgba(34,30,27,.16)}
.cv-modelo b{font:400 22px/1.1 var(--eo-serif)}
.cv-modelo small{font-size:13px;color:#6B6259}
@media (max-width:560px){.cv-cartao{grid-template-columns:120px 1fr;gap:16px;padding:16px}.cv-cartao b{font-size:24px}.cv-cartao p{font-size:14px}}
`;

export default async function ConhecerPage() {
  const eventos = await eventosDoCatalogo();
  const portais = eventos.filter((e) => PORTAIS[e.tipo]);
  const siteDoCasamento = eventos.find((e) => e.tipo === "casamento" && e.slug);
  const modelos = ["convite" as const, ...MODELOS_NOVOS];

  return (
    <div className={newsreader.variable}>
      <CascaDoSite>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <section className="ps-g ps-heroi" data-sem-foto="1">
          <div>
            <p className="ps-sobre">Conheça por dentro</p>
            <h1>
              <Titulo texto="Entre no portal {como o seu cliente entra.}" />
            </h1>
            <p className="ps-sub">
              Eventos de exemplo com tudo preenchido. Toque, role e abra cada tela: nada do que você fizer aqui fica salvo.
            </p>
            <div className="ps-botoes">
              <a href="#portais" className="ps-cta">
                Entrar num portal
              </a>
              <a href="#modelos" className="ps-sec">
                Ver os modelos de site
              </a>
            </div>
          </div>
        </section>

        <section className="ps-g cv-portais" id="portais">
          <h2>Os portais</h2>
          <p className="cv-sub">
            Cada evento ganha um portal para o cliente, com o acesso dele. Você trabalha no sistema, e o portal mostra o que importa
            para quem está do outro lado.
          </p>
          {portais.length ? (
            <div className="cv-cartoes">
              {portais.map((e) => {
                const p = PORTAIS[e.tipo];
                return (
                  <a key={e.id} href={`/conhecer/entrar/${e.tipo}`} className="cv-cartao">
                    <img src={p.foto} alt={`O portal de exemplo: ${p.rotulo.toLowerCase()}`} loading="lazy" />
                    <div>
                      <small>{p.rotulo}</small>
                      <b>{p.titulo}</b>
                      <p>{p.texto}</p>
                      <span className="cv-entrar">Entrar no portal</span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="cv-sub">Os portais de exemplo voltam em instantes.</p>
          )}
          <p className="cv-nota">
            Aniversário, formatura, bodas, batizado, chá revelação e eventos corporativos também têm portal.
          </p>
        </section>

        {siteDoCasamento ? (
          <section className="cv-modelos" id="modelos">
            <div className="ps-g">
              <h2>O site do evento, em 7 modelos</h2>
              <p className="cv-sub">
                O cliente monta o site, e os convidados confirmam presença, deixam recado, sugerem música e escolhem o presente ali
                mesmo. Abra o mesmo casamento de exemplo em cada modelo.
              </p>
              <div className="cv-grade">
                {modelos.map((m) => {
                  const nome = m === "convite" ? "Convite" : MODELOS[m].nome;
                  return (
                    <a key={m} href={`/c/${siteDoCasamento.slug}?modelo=${m}`} className="cv-modelo" target="_blank" rel="noopener">
                      <img src={`/site/catalogo/modelo-${m}.webp`} alt={`O modelo ${nome}`} loading="lazy" />
                      <b>{nome}</b>
                      {m === "violino" ? <small>Com som: o violino toca enquanto o convidado rola a página</small> : null}
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section className="ps-chamada">
          <h2>
            <Titulo texto="Agora monte o {seu.}" />
          </h2>
          <div className="ps-botoes">
            <a href="/criar-conta" className="ps-cta">
              Comece seu teste de 7 dias
            </a>
          </div>
        </section>
      </CascaDoSite>
      <Origem />
      <MedirCliques />
      <Medicao />
    </div>
  );
}
