"use client";

// A apresentação do site (27/09/2026, pedido do dono com a wedy.com de
// referência): o celular fica preso na tela e o texto passa ao lado; a
// cada etapa a tela de dentro troca e um recorte sobe ao lado, como se
// alguém estivesse mostrando o sistema.
//
// Telas REAIS, da conta-vitrine e do portal de exemplo
// (ferramentas/video/cenas/site-apresentacao.mjs e portal-debutante.mjs).
// O recorte é um pedaço da mesma tela, nunca uma interface inventada
// (a demo estilizada foi recusada: "vê uma coisa, assina e chega lá é
// outra").
//
// No celular não há palco preso: cada etapa traz a própria tela e o
// recorte, e aparece ao rolar. Com movimento reduzido, tudo fica parado.

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { PASSOS_DA_HOME, type PassoDaApresentacao } from "@/lib/site-paginas";

const CSS = `
.ap{border-top:1px solid rgba(34,30,27,.1);background:#FAF8F5}
.ap-in{max-width:1200px;margin:0 auto;padding:110px 32px 40px}
.ap-cab{display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center;margin-bottom:24px}
.ap-sobre{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#6E2E34;font-weight:400}
.ap-cab h2{font:400 clamp(34px,4.4vw,52px)/1.08 var(--eo-serif);letter-spacing:-.01em;max-width:760px}
.ap-grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px}
.ap-passo{min-height:82vh;display:flex;flex-direction:column;justify-content:center;gap:16px;max-width:460px;opacity:.28;transition:opacity .5s ease}
.ap-passo[data-ativo="1"]{opacity:1}
.ap-num{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#928A81}
.ap-num b{color:#6E2E34;font-weight:500}
.ap-passo h3{font:400 clamp(30px,3.2vw,42px)/1.1 var(--eo-serif);letter-spacing:-.01em}
.ap-passo p{font-size:17px;line-height:1.6;color:#4A443F;font-weight:300}
.ap-palco{position:sticky;top:84px;height:calc(100vh - 104px);display:flex;align-items:center;justify-content:center;padding-right:24%}
.ap-cena{position:relative;height:min(78vh,720px);aspect-ratio:1080/2339}
.ap-cel{position:absolute;inset:0;border-radius:13% / 6%;background:#171311;padding:3.2%;box-shadow:0 40px 90px rgba(60,35,50,.22),0 8px 24px rgba(34,30,27,.14)}
.ap-vidro{position:relative;width:100%;height:100%;border-radius:10.5% / 4.9%;overflow:hidden;background:#FAF8F5}
.ap-vidro img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;opacity:0;transform:scale(1.015);transition:opacity .55s ease,transform .8s ease}
.ap-vidro img[data-ativo="1"]{opacity:1;transform:none}
.ap-ilha{position:absolute;top:1.1%;left:50%;width:20%;height:2.5%;margin-left:-10%;border-radius:99px;background:#171311;z-index:2}
.ap-recorte{position:absolute;right:-58%;bottom:14%;width:92%;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 28px 60px rgba(60,35,50,.24),0 0 0 1px rgba(34,30,27,.08);animation:apSobe .6s cubic-bezier(.2,.8,.2,1) both}
.ap-recorte img{display:block;width:100%;height:auto}
@keyframes apSobe{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:none}}
.ap-pontos{position:absolute;left:-44px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px}
.ap-pontos a{width:8px;height:8px;border-radius:50%;background:rgba(34,30,27,.16);transition:background .3s,transform .3s}
.ap-pontos a[data-ativo="1"]{background:#6E2E34;transform:scale(1.35)}
.ap-so-cel{display:none}
@media (max-width:900px){
  .ap-in{padding:80px 20px 24px}
  .ap-grade{grid-template-columns:1fr;gap:0}
  .ap-palco{display:none}
  .ap-passo{min-height:0;max-width:none;opacity:1;padding:44px 0;border-top:1px solid rgba(34,30,27,.08)}
  .ap-so-cel{display:block;position:relative;margin:18px auto 0;width:min(72%,300px)}
  .ap-so-cel .ap-cena{height:auto;width:100%}
  .ap-so-cel .ap-vidro img{opacity:1;transform:none}
  .ap-so-cel .ap-recorte{position:relative;right:auto;bottom:auto;width:118%;margin:-38% 0 0 -9%;animation:none}
  .ap-passo[data-visto="0"] .ap-so-cel{opacity:0;transform:translateY(30px)}
  .ap-so-cel{transition:opacity .7s ease,transform .7s ease}
}
@media (prefers-reduced-motion:reduce){
  .ap *{transition:none!important;animation:none!important}
  .ap-passo[data-visto="0"] .ap-so-cel{opacity:1;transform:none}
}
`;

function Celular({ passos, ativo }: { passos: PassoDaApresentacao[]; ativo: number }) {
  return (
    <div className="ap-cel">
      <div className="ap-ilha" />
      <div className="ap-vidro">
        {passos.map((p, i) => (
          <img key={p.id} src={p.tela} alt="" data-ativo={i === ativo ? "1" : "0"} loading={i < 2 ? "eager" : "lazy"} />
        ))}
      </div>
    </div>
  );
}

export function Apresentacao({
  passos = PASSOS_DA_HOME,
  sobre = "Por dentro",
  titulo = "Do primeiro contato ao fim da festa, cada evento num lugar só.",
}: {
  passos?: PassoDaApresentacao[];
  sobre?: string;
  titulo?: string;
}) {
  const [ativo, setAtivo] = useState(0);
  const [vistos, setVistos] = useState<Set<number>>(() => new Set([0]));
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // a etapa ativa é a que cruza o meio da tela
    const meio = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setAtivo(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-48% 0px -48% 0px" }
    );
    // no celular, cada etapa aparece quando entra na tela
    const entra = new IntersectionObserver(
      (es) => {
        const novos = es.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.i));
        if (novos.length) setVistos((v) => new Set([...v, ...novos]));
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    for (const el of refs.current) {
      if (!el) continue;
      meio.observe(el);
      entra.observe(el);
    }
    return () => {
      meio.disconnect();
      entra.disconnect();
    };
  }, []);

  const r = passos[ativo].recorte;

  return (
    <section className="ap" id="apresentacao">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ap-in">
        <div className="ap-cab">
          <p className="ap-sobre">{sobre}</p>
          <h2>{titulo}</h2>
        </div>
        <div className="ap-grade">
          <div>
            {passos.map((p, i) => (
              <article
                key={p.id}
                id={`ap-${p.id}`}
                data-i={i}
                data-ativo={i === ativo ? "1" : "0"}
                data-visto={vistos.has(i) ? "1" : "0"}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className="ap-passo"
              >
                <p className="ap-num">
                  <b>{String(i + 1).padStart(2, "0")}</b> · {p.rotulo}
                </p>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
                <div className="ap-so-cel" aria-hidden>
                  <div className="ap-cena">
                    <Celular passos={[p]} ativo={0} />
                  </div>
                  <div className="ap-recorte">
                    <img src={p.recorte.src} alt="" width={p.recorte.largura} height={p.recorte.altura} loading="lazy" />
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="ap-palco" aria-hidden>
            <div className="ap-cena">
              <nav className="ap-pontos">
                {passos.map((p, i) => (
                  <a key={p.id} href={`#ap-${p.id}`} data-ativo={i === ativo ? "1" : "0"} tabIndex={-1} />
                ))}
              </nav>
              <Celular passos={passos} ativo={ativo} />
              <div className="ap-recorte" key={passos[ativo].id}>
                <img src={r.src} alt="" width={r.largura} height={r.altura} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
