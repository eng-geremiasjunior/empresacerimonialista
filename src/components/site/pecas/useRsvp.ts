"use client";

// A confirmação de presença sem desenho: o estado do formulário e o envio.
// Cada modelo veste a casca dele por cima; o RsvpConvite (o "convite" de
// hoje) também. A máquina é a de sempre: POST /api/rsvp/[hash], que já
// cuida de dedupe pelo e-mail, teto da lista, rate-limit e e-mail.
//
// O acompanhante tem NOME — é o que a recepção confere na entrada — e a
// marca de criança; o convidado escolhe o menu e deixa um recado.

import { useState } from "react";
import type { Credencial } from "@/components/rsvp/ConfirmacaoConvidado";

export type Acompanhante = { nome: string; crianca: boolean };

export const ERROS_DO_RSVP: Record<string, string> = {
  nome_obrigatorio: "Precisamos do seu nome.",
  email_invalido: "Confira o e-mail — é por ele que a confirmação chega.",
  link_fechado: "As confirmações já foram encerradas.",
  link_invalido: "Este link não está mais válido.",
  lista_cheia: "A lista está completa. Fale direto com os anfitriões.",
  muitas_tentativas: "Muitas tentativas seguidas. Aguarde um minuto.",
};

const FALHA = "Não conseguimos registrar agora. Tente de novo.";

export function useRsvp(hash: string) {
  const [vai, setVai] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>([]);
  const [menuEscolhido, setMenuEscolhido] = useState("");
  const [restricao, setRestricao] = useState("");
  const [recado, setRecado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  // a entrada, desenhada pela rota: quem confirma por aqui saía sem nada
  const [credencial, setCredencial] = useState<Credencial | null>(null);

  const total = 1 + acompanhantes.length;

  function adicionarAcompanhante() {
    setAcompanhantes([...acompanhantes, { nome: "", crianca: false }]);
  }

  function mudarAcompanhante(i: number, parte: Partial<Acompanhante>) {
    setAcompanhantes(acompanhantes.map((x, j) => (j === i ? { ...x, ...parte } : x)));
  }

  function removerAcompanhante(i: number) {
    setAcompanhantes(acompanhantes.filter((_, j) => j !== i));
  }

  async function enviar() {
    if (!nome.trim()) return setErro(ERROS_DO_RSVP.nome_obrigatorio);
    if (!email.trim()) return setErro(ERROS_DO_RSVP.email_invalido);
    setEnviando(true);
    setErro(null);
    try {
      const nomes = acompanhantes.filter((a) => a.nome.trim());
      const res = await fetch(`/api/rsvp/${hash}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          confirmacao: vai ? "confirmado" : "nao_vai",
          acompanhantes: vai ? nomes.filter((a) => !a.crianca).length : 0,
          criancas: vai ? nomes.filter((a) => a.crianca).length : 0,
          restricao: vai ? restricao || null : null,
          // o que o convite acrescentou ao cadastro de sempre
          acompanhantesNomes: vai ? nomes : [],
          menu: vai ? menuEscolhido || null : null,
          recado: recado || null,
        }),
      });
      const r = (await res.json()) as {
        ok?: boolean;
        erro?: string;
        qr?: string;
        codigo?: string;
      };
      setEnviando(false);
      if (!r.ok) {
        setErro(ERROS_DO_RSVP[r.erro ?? ""] ?? FALHA);
        return;
      }
      setCredencial(
        vai && r.qr && r.codigo ? { qr: r.qr, codigo: r.codigo, nome: nome.trim() } : null
      );
      setPronto(true);
    } catch {
      setEnviando(false);
      setErro(FALHA);
    }
  }

  // volta ao formulário preenchido; o mesmo e-mail atualiza a mesma linha
  function alterarResposta() {
    setPronto(false);
    setCredencial(null);
    setErro(null);
  }

  return {
    vai,
    setVai,
    nome,
    setNome,
    email,
    setEmail,
    acompanhantes,
    adicionarAcompanhante,
    mudarAcompanhante,
    removerAcompanhante,
    menuEscolhido,
    setMenuEscolhido,
    restricao,
    setRestricao,
    recado,
    setRecado,
    total,
    enviando,
    erro,
    pronto,
    credencial,
    enviar,
    alterarResposta,
  };
}

export type EstadoDoRsvp = ReturnType<typeof useRsvp>;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-10-15" → "15 de outubro" (o prazo vem como data, sem fuso). */
export function formatarPrazo(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}`;
}
