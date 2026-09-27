import type { Metadata } from "next";
import { newsreader } from "@/lib/planos-do-site";
import { CascaDoSite } from "@/components/site/CascaDoSite";
import { Titulo } from "@/components/site/PaginaDoSite";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";
import { FormParceira } from "./FormParceira";

// A página de parcerias (site navegável, fase 3, 27/09/2026): para quem
// ensina cerimonial. É a página que o dono manda no direct. O sistema vem
// em etapas (evento real, Reels em collab, o dia do evento pelo sistema);
// comissão e condição para alunas ainda não foram decididas, e por isso
// não aparecem aqui. Sem a palavra "grátis".

export const metadata: Metadata = {
  title: "Parcerias para quem ensina cerimonial — eorganizei",
  description: "Para quem forma cerimonialistas: use o eorganizei nos seus eventos e leve para as suas alunas.",
};

const ETAPAS: [string, string, string][] = [
  ["01", "Um evento seu", "Você cria a sua conta e monta um evento real seu. Ganha 3 meses de sistema."],
  ["02", "Um Reels em collab", "Você mostra no Instagram como usa, num post em collab com o nosso perfil. Ganha mais 3 meses."],
  ["03", "O dia do evento pelo sistema", "Você conduz o dia pelo eorganizei: o link de cada fornecedor e o portal da família. Ganha mais 6 meses e fecha um ano."],
];

const PERGUNTAS: [string, string][] = [
  ["Preciso ter muitos seguidores?", "Não. Vale mais ter colegas de profissão acompanhando o que você ensina do que um número grande."],
  ["Preciso pagar alguma coisa?", "Não. O tempo de sistema vem das etapas."],
  ["O post precisa de marcação de publicidade?", "Sim. Como é uma parceria, o post leva a marca de parceria paga do Instagram."],
  ["Como as minhas alunas chegam?", "Pelo seu link próprio. A gente vê as contas que chegam por ele."],
];

const CSS = `
.pp-etapas{border-top:1px solid rgba(34,30,27,.1);padding-top:90px;padding-bottom:90px;display:flex;flex-direction:column;gap:36px}
.pp-etapas h2,.pp-form h2{font:400 clamp(32px,4vw,46px)/1.08 var(--eo-serif)}
.pp-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:32px}
.pp-lista div{border-top:2px solid #6E2E34;padding-top:18px;display:flex;flex-direction:column;gap:10px}
.pp-lista small{font-size:12px;letter-spacing:.2em;color:#928A81}
.pp-lista b{font:400 26px/1.15 var(--eo-serif)}
.pp-lista p{font-size:16px;line-height:1.6;color:#4A443F}
.pp-quem{background:#F2EEE9}
.pp-quem .ps-g{padding-top:80px;padding-bottom:80px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:40px;align-items:start}
.pp-quem h2{font:400 clamp(30px,3.6vw,42px)/1.1 var(--eo-serif)}
.pp-quem p{font-size:17px;line-height:1.65;color:#4A443F}
.pp-quem ul{margin:14px 0 0;padding-left:18px;font-size:16px;line-height:1.8;color:#4A443F}
.pp-form{padding-top:90px;padding-bottom:40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:48px;align-items:start}
.pp-form>div>p{font-size:17px;line-height:1.6;color:#4A443F;margin-top:16px;max-width:440px}
`;

export default function ParceirasPage() {
  return (
    <div className={newsreader.variable}>
      <CascaDoSite>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <section className="ps-g ps-heroi" data-sem-foto="1">
          <div>
            <p className="ps-sobre">Parcerias</p>
            <h1>
              <Titulo texto="Para quem ensina {cerimonial.}" />
            </h1>
            <p className="ps-sub">
              Se você forma cerimonialistas, use o eorganizei nos seus eventos e leve para as suas alunas o sistema que
              você usa.
            </p>
            <div className="ps-botoes">
              <a href="#candidatura" className="ps-cta">
                Quero ser parceira
              </a>
              <a href="/planos#apresentacao" className="ps-sec">
                Ver o sistema por dentro
              </a>
            </div>
          </div>
        </section>

        <section className="ps-g pp-etapas">
          <h2>Como funciona</h2>
          <div className="pp-lista">
            {ETAPAS.map(([n, t, d]) => (
              <div key={n}>
                <small>{n}</small>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pp-quem">
          <div className="ps-g">
            <h2>Quem a gente procura</h2>
            <div>
              <p>Cerimonialistas que ensinam outras cerimonialistas:</p>
              <ul>
                <li>quem dá curso de cerimonial;</li>
                <li>quem faz mentoria;</li>
                <li>quem produz conteúdo para colegas de profissão.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="ps-g pp-form" id="candidatura">
          <div>
            <h2>Candidatura</h2>
            <p>Leva um minuto. A gente olha o seu perfil e responde pelo WhatsApp ou pelo e-mail.</p>
          </div>
          <FormParceira />
        </section>

        <section className="ps-duvidas">
          <h2>Dúvidas</h2>
          {PERGUNTAS.map(([q, r]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{r}</p>
            </details>
          ))}
        </section>
      </CascaDoSite>
      <Origem />
      <MedirCliques />
      <Medicao />
    </div>
  );
}
