"use client";

// Põe a classe sm-js no <html> antes da primeira pintura, para o reveal
// poder começar oculto sem sumir com o conteúdo de quem não tem JS.
//
// Inline e síncrono de propósito: roda quando o HTML é lido, antes do
// conteúdo que vem depois dele. Com reduced-motion nem põe a classe (o
// conteúdo aparece direto). E se o JS da página não chegar em 4 s — rede
// ruim, chunk que falhou —, tira a classe de novo: melhor sem animação do
// que um site em branco. O useRevelar marca data-sm-revelar quando chega.
//
// Só no público: na prévia e na revisão nada começa oculto.

import { useModoDoSite } from "./contexto";
import "./pecas.css";

const SCRIPT =
  "(function(){try{var d=document.documentElement;" +
  "if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;" +
  "d.classList.add('sm-js');" +
  "setTimeout(function(){if(!d.hasAttribute('data-sm-revelar'))d.classList.remove('sm-js')},4000)" +
  "}catch(e){}})()";

export function ScriptRevelar() {
  const { modo } = useModoDoSite();
  if (modo !== "publico") return null;
  // suppressHydrationWarning: o navegador não reexecuta script hidratado,
  // e o conteúdo é sempre o mesmo
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
