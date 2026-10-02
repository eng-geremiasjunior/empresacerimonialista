// A casca do site navegável (27/09/2026): o cabeçalho com o menu do site e
// o rodapé, na linguagem da página de vendas (modelo 2). As páginas por
// evento, por funcionalidade e a de parcerias moram dentro dela.

import type { ReactNode } from "react";
import { MenuDoSite } from "./MenuDoSite";

const CSS = `
.ps{--eo-serif:var(--font-newsreader),Newsreader,Georgia,serif;--eo-sans:var(--font-ui),'Instrument Sans',system-ui,sans-serif;font-family:var(--eo-sans);font-weight:300;background:#FAF8F5;color:#221E1B;-webkit-font-smoothing:antialiased;overflow-x:clip;font-variant-numeric:lining-nums}
.ps *{box-sizing:border-box}
.ps a{color:inherit;text-decoration:none}
.ps a:hover{opacity:.75}
.ps h1,.ps h2,.ps h3,.ps p{margin:0;text-wrap:pretty}
.ps :focus-visible{outline:2px solid #6E2E34;outline-offset:2px}
.ps-g{max-width:1200px;margin:0 auto;padding-left:32px;padding-right:32px}
.ps-topo{position:sticky;top:0;z-index:20;background:rgba(250,248,245,.94);backdrop-filter:blur(8px);border-bottom:1px solid rgba(34,30,27,.1)}
.ps-topo .ps-g{padding-top:18px;padding-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
.ps-marca{display:flex;align-items:center;gap:10px;font:500 26px/1 var(--eo-serif);letter-spacing:.01em}
.ps-acoes{display:flex;gap:20px;align-items:center;font-size:14px}
.ps-cta{background:#6E2E34;color:#FAF8F5!important;padding:11px 20px;border-radius:2px;font-weight:400;letter-spacing:.03em}
.ps-heroi{padding-top:88px;padding-bottom:96px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:64px;align-items:center}
.ps-heroi[data-sem-foto="1"]{grid-template-columns:1fr;text-align:center;justify-items:center;padding-bottom:40px}
.ps-heroi[data-sem-foto="1"] .ps-botoes{justify-content:center}
.ps-sobre{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#6E2E34;font-weight:400}
.ps-heroi h1{font:400 clamp(44px,6vw,76px)/1.02 var(--eo-serif);letter-spacing:-.015em;margin-top:18px;max-width:880px}
.ps-heroi h1 em{font-style:italic;color:#6E2E34}
.ps-heroi .ps-sub{font-size:19px;line-height:1.55;color:#4A443F;margin-top:24px;max-width:560px}
.ps-botoes{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:34px}
.ps-botoes .ps-cta{padding:16px 28px;font-size:15px}
.ps-botoes .ps-sec{padding:16px 4px;font-size:15px;border-bottom:1px solid #221E1B}
.ps-foto{position:relative;aspect-ratio:4/5;overflow:hidden;background:#EDE7E0}
.ps-foto img{width:100%;height:100%;object-fit:cover}
.ps-lista{border-top:1px solid rgba(34,30,27,.1);padding-top:90px;padding-bottom:90px;display:flex;flex-direction:column;gap:30px}
.ps-lista h2{font:400 clamp(32px,4vw,46px)/1.08 var(--eo-serif)}
.ps-tipos{display:flex;flex-wrap:wrap;gap:10px}
.ps-tipos span{border:1px solid rgba(34,30,27,.2);padding:10px 18px;font:italic 400 20px/1 var(--eo-serif);color:#4A443F}
.ps-notas{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:28px}
.ps-notas p{font-size:16px;line-height:1.6;color:#4A443F;border-top:2px solid #6E2E34;padding-top:16px}
.ps-duvidas{max-width:900px;margin:0 auto;padding:100px 32px 110px}
.ps-duvidas h2{font:400 clamp(32px,4vw,46px)/1.08 var(--eo-serif);margin-bottom:26px}
.ps-duvidas details{border-top:1px solid rgba(34,30,27,.14);padding:20px 0}
.ps-duvidas details:last-child{border-bottom:1px solid rgba(34,30,27,.14)}
.ps-duvidas summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:20px;font:400 22px/1.3 var(--eo-serif)}
.ps-duvidas summary::-webkit-details-marker{display:none}
.ps-duvidas summary::after{content:"+";font-family:var(--eo-sans);color:#6E2E34}
.ps-duvidas details[open] summary::after{content:"–"}
.ps-duvidas details p{margin-top:12px;font-size:16px;line-height:1.6;color:#4A443F;max-width:720px}
.ps-chamada{background:#F2EEE9;text-align:center;padding:110px 32px}
.ps-chamada h2{font:400 clamp(36px,5vw,60px)/1.05 var(--eo-serif)}
.ps-chamada p{font-size:17px;color:#6B6259;margin-top:16px}
.ps-chamada .ps-botoes{justify-content:center}
.ps-rodape{border-top:1px solid rgba(34,30,27,.1);padding-top:60px;padding-bottom:60px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:32px;font-size:14px}
.ps-rodape div{display:flex;flex-direction:column;gap:12px}
.ps-rodape b{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#928A81;font-weight:400}
.ps-rodape small{color:#928A81;font-size:13px;line-height:1.6}
@media (max-width:760px){
  .ps-g{padding-left:20px;padding-right:20px}
  .ps-heroi{padding-top:44px;padding-bottom:56px;gap:36px}
  .ps-acoes>a:first-child{display:none}
  .ps-rodape{grid-template-columns:1fr 1fr}
  .ps-rodape>div:first-child{grid-column:1/-1}
  .ps-chamada{padding:80px 20px}
}
`;

export const Simbolo = () => (
  <svg width="28" height="28" viewBox="0 0 64 64" style={{ flex: "none" }} aria-hidden>
    <rect width="64" height="64" rx="13" fill="#6E2E34" />
    <g fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round">
      <path d="M18 33H46" />
      <path d="M46 33A14 14 0 1 0 41.9 42.9" />
    </g>
  </svg>
);

export function CascaDoSite({ children, hrefConta = "/criar-conta" }: { children: ReactNode; hrefConta?: string }) {
  return (
    <div className="ps">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="ps-topo">
        <div className="ps-g">
          <a href="/planos" className="ps-marca">
            <Simbolo />
            eOrganizei
          </a>
          <MenuDoSite hrefConta={hrefConta} />
          <div className="ps-acoes">
            <a href="/login">Entrar</a>
            <a href={hrefConta} className="ps-cta">
              Começar com 1 evento
            </a>
          </div>
        </div>
      </header>
      {children}
      <footer className="ps-g ps-rodape">
        <div>
          <span className="ps-marca">
            <Simbolo />
            eOrganizei
          </span>
          <small>O sistema das cerimonialistas e assessorias de eventos.</small>
        </div>
        <div>
          <b>Eventos</b>
          <a href="/para/casamento">Casamento</a>
          <a href="/para/15-anos">15 anos</a>
          <a href="/para/outros-eventos">Corporativo e outros</a>
        </div>
        <div>
          <b>Funcionalidades</b>
          <a href="/funcionalidades/roteiro-do-dia">Roteiro do dia</a>
          <a href="/funcionalidades/portal-da-familia">Portal da família</a>
          <a href="/funcionalidades/planejamento">Planejamento</a>
          <a href="/funcionalidades/financeiro">Financeiro</a>
        </div>
        <div>
          <b>eOrganizei</b>
          <a href="/conhecer">Conheça por dentro</a>
          <a href="/planos#a-planos">Planos</a>
          <a href="/parceiras">Parcerias</a>
        </div>
        <div>
          <b>Contato</b>
          <a href="https://wa.me/5533999478774" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a href="https://instagram.com/eorganizei" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href="/login">Entrar</a>
        </div>
        <div>
          <b>Legal</b>
          <a href="/termos">Termos e condições</a>
          <a href="/privacidade">Privacidade</a>
        </div>
      </footer>
    </div>
  );
}
