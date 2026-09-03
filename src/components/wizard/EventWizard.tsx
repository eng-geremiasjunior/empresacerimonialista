"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  criarEventoCompleto,
  type WizardPayload,
} from "@/app/(app)/eventos/novo/actions";
import {
  checklistMinimoRapido,
  fornecedoresDoTipo,
  gerarChecklistPorTipo,
  resolverTemplate,
  type TaskDraft,
  type WizardRespostas,
} from "@/lib/event-templates";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import type { MembroOption } from "@/lib/equipe-shared";
import { WizardProgress } from "./WizardProgress";
import { StepTipoEvento } from "./StepTipoEvento";
import {
  StepCliente,
  type ClienteEscolhido,
  type ClientOption,
} from "./StepCliente";
import { StepDadosBasicos, type DadosBasicos } from "./StepDadosBasicos";
import { StepEstruturacao } from "./StepEstruturacao";
import { ColarBriefing } from "./ColarBriefing";
import {
  identidadeDaProposta,
  propostaParaConferencia,
  type PropostaBriefingV2,
} from "@/lib/briefing-core";
import { mascararDinheiro } from "@/lib/format";

// O passo "Revisão" saiu. Ele mostrava um checklist para ela marcar,
// desmarcar e até acrescentar item — e a action DESCARTAVA tudo
// (`const tasks = []`, comentário da 076: tarefa nasce da decisão do
// método, não de lista de títulos). A tela pedia uma decisão que o
// servidor jogava fora. O gatilho de criação do evento já instancia o
// método sozinho.
const STEPS = ["Tipo", "Cliente", "Dados", "Configuração"];

const DADOS_INICIAIS: DadosBasicos = {
  name: "",
  date: "",
  time: "",
  city: "",
  location: "",
  guests: "",
  guestsMax: "",
  contractValue: "",
  entrada: "",
  status: "orcamento",
};

// A citação vai no aviso e na dica do campo: curta, ou ninguém lê.
const curto = (t: string, max = 70) =>
  t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;

type Props = {
  clients: ClientOption[];
  preselected: ClientOption | null;
  membros: MembroOption[];
  meuMembroId: string | null;
  /** opções do eixo cenario por tipo de evento (metodo_arquetipo) */
  cenarios: Record<string, { valor: string; rotulo: string }[]>;
};

export function EventWizard({
  clients,
  preselected,
  membros,
  meuMembroId,
  cenarios,
}: Props) {
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<EventType | null>(null);
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(
    preselected ? { kind: "existing", client: preselected } : null
  );
  const [dados, setDados] = useState<DadosBasicos>(DADOS_INICIAIS);
  // Responsável: pré-selecionado com quem está criando; editável.
  const [responsavelId, setResponsavelId] = useState<string | null>(
    meuMembroId ?? membros[0]?.id ?? null
  );
  const [respostas, setRespostas] = useState<WizardRespostas>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doBriefing, setDoBriefing] = useState<string | null>(null);
  // e-mail não tem campo no passo Cliente (o wizard nunca o pediu): veio
  // do briefing e vai direto para clients.email na criação.
  const [emailCliente, setEmailCliente] = useState("");
  const [dicaHonorario, setDicaHonorario] = useState<string | null>(null);
  // o que a leitura trouxe e NÃO é do evento (verba da cliente, dinheiro
  // de fornecedor, quantidade, estilo): nasce proposta, para a conferência
  const [briefing, setBriefing] = useState<PropostaBriefingV2 | null>(null);

  // A proposta do briefing preenche o estado; os passos do wizard SÃO a
  // conferência — ela caminha confirmando o que a leitura propôs.
  //
  // Só a IDENTIDADE entra aqui. O dinheiro do buffet ia para
  // contractValue, que é o honorário DELA e é somado como faturamento —
  // agora contractValue só recebe honorário com atribuição explícita
  // (e a identidade já vem sem ele quando não há citação).
  function aplicarBriefing(p: PropostaBriefingV2) {
    const id = identidadeDaProposta(p);
    const preenchidos: string[] = [];
    if (id.tipo) {
      setTipo(id.tipo as EventType);
      preenchidos.push("tipo");
    }
    if (id.nome) {
      setCliente({ kind: "new", name: id.nome, phone: id.telefone ?? "" });
      preenchidos.push(id.telefone ? "cliente e telefone" : "cliente");
    }
    setEmailCliente(id.email ?? "");
    if (id.email) preenchidos.push("e-mail");
    setDados((d) => ({
      ...d,
      date: id.data ?? d.date,
      time: id.hora ?? d.time,
      city: id.cidade ?? d.city,
      location: id.local ?? d.location,
      guests: id.convidados != null ? String(id.convidados) : d.guests,
      guestsMax: id.guestsMax != null ? String(id.guestsMax) : d.guestsMax,
      contractValue: id.honorario
        ? mascararDinheiro(String(Math.round(id.honorario.valor)))
        : d.contractValue,
    }));
    if (id.data) preenchidos.push("data");
    if (id.hora) preenchidos.push("hora");
    if (id.cidade || id.local) preenchidos.push("local");
    if (id.convidados != null) {
      preenchidos.push(
        id.guestsMax != null
          ? `${id.convidados} convidados (pode chegar a ${id.guestsMax})`
          : "convidados"
      );
    }
    if (id.honorario) {
      preenchidos.push(`honorário, citado como “${curto(id.honorario.trecho)}”`);
    }
    setDicaHonorario(id.honorario ? curto(id.honorario.trecho) : null);
    setBriefing(propostaParaConferencia(p));
    setDoBriefing(
      preenchidos.length > 0
        ? `Do briefing: ${preenchidos.join(", ")}. Confira cada passo antes de criar.`
        : null
    );
  }

  const clientName =
    cliente?.kind === "existing"
      ? cliente.client.name
      : cliente?.kind === "new"
        ? cliente.name
        : "";

  const suggestedName = tipo
    ? `${EVENT_TYPE_LABELS[tipo]}${clientName ? ` — ${clientName}` : ""}`
    : "";

  function patchDados(patch: Partial<DadosBasicos>) {
    setDados((d) => ({ ...d, ...patch }));
  }
  function patchRespostas(patch: Partial<WizardRespostas>) {
    setRespostas((r) => ({ ...r, ...patch }));
  }

  async function submit(incluirTimeline: boolean) {
    if (!tipo) return;
    setCreating(true);
    setError(null);
    const payload: WizardPayload = {
      clientId: cliente?.kind === "existing" ? cliente.client.id : null,
      newClientName: cliente?.kind === "new" ? cliente.name : "",
      newClientPhone: cliente?.kind === "new" ? cliente.phone : "",
      newClientEmail: cliente?.kind === "new" ? emailCliente : "",
      type: tipo,
      name: dados.name,
      date: dados.date,
      time: dados.time,
      city: dados.city,
      location: dados.location,
      guests: dados.guests,
      guestsMax: dados.guestsMax,
      contractValue: dados.contractValue,
      entrada: dados.entrada,
      status: dados.status,
      responsavelId,
      respostas,
      briefing,
      incluirTimeline,
    };
    const res = await criarEventoCompleto(payload);
    if (res?.error) {
      setError(res.error);
      setCreating(false);
    }
    // Sucesso → a action redireciona para /eventos/[id].
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <WizardProgress steps={STEPS} current={step} />
        <Link
          href="/eventos"
          className="shrink-0 text-sm text-stone-500 hover:text-stone-900"
        >
          Cancelar
        </Link>
      </div>

      {step === 1 && (
        <>
          <ColarBriefing aoProposta={aplicarBriefing} />
          {doBriefing && (
            <p className="text-sm text-stone-600">{doBriefing}</p>
          )}
          <StepTipoEvento
            selected={tipo}
            onSelect={(t) => {
              setTipo(t);
              setStep(cliente ? 3 : 2);
            }}
          />
        </>
      )}

      {step === 2 && (
        <StepCliente
          clients={clients}
          inicial={
            cliente?.kind === "new"
              ? { name: cliente.name, phone: cliente.phone }
              : null
          }
          onChoose={(c) => {
            setCliente(c);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <StepDadosBasicos
          tipo={tipo ?? ""}
          value={dados}
          suggestedName={suggestedName}
          dicaContrato={dicaHonorario}
          onChange={patchDados}
          membros={membros}
          responsavelId={responsavelId}
          onResponsavel={setResponsavelId}
          creating={creating}
          error={error}
          onQuick={() => submit(false)}
          onComplete={() => {
            setError(null);
            setStep(4);
          }}
        />
      )}

      {step === 4 && tipo && (
        <StepEstruturacao
          type={tipo}
          respostas={respostas}
          fornecedores={fornecedoresDoTipo(tipo)}
          cenarios={cenarios[tipo] ?? []}
          onChange={patchRespostas}
          creating={creating}
          error={error}
          onNext={() => submit(true)}
          onSkip={() => submit(true)}
        />
      )}

      {step > 1 && step < 4 && (
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}
