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
import { StepRevisao } from "./StepRevisao";

const STEPS = ["Tipo", "Cliente", "Dados", "Configuração", "Revisão"];

const DADOS_INICIAIS: DadosBasicos = {
  name: "",
  date: "",
  time: "",
  city: "",
  location: "",
  guests: "",
  contractValue: "",
  entrada: "",
  status: "orcamento",
};

type Props = {
  clients: ClientOption[];
  preselected: ClientOption | null;
  membros: MembroOption[];
  meuMembroId: string | null;
};

export function EventWizard({ clients, preselected, membros, meuMembroId }: Props) {
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

  const clientName =
    cliente?.kind === "existing"
      ? cliente.client.name
      : cliente?.kind === "new"
        ? cliente.name
        : "";

  const suggestedName = tipo
    ? `${EVENT_TYPE_LABELS[tipo]}${clientName ? ` — ${clientName}` : ""}`
    : "";

  const checklistCompleto: TaskDraft[] = useMemo(
    () => (tipo ? gerarChecklistPorTipo(resolverTemplate(tipo), respostas) : []),
    [tipo, respostas]
  );

  function patchDados(patch: Partial<DadosBasicos>) {
    setDados((d) => ({ ...d, ...patch }));
  }
  function patchRespostas(patch: Partial<WizardRespostas>) {
    setRespostas((r) => ({ ...r, ...patch }));
  }

  async function submit(
    tasks: { title: string; group: string }[],
    incluirTimeline: boolean
  ) {
    if (!tipo) return;
    setCreating(true);
    setError(null);
    const payload: WizardPayload = {
      clientId: cliente?.kind === "existing" ? cliente.client.id : null,
      newClientName: cliente?.kind === "new" ? cliente.name : "",
      newClientPhone: cliente?.kind === "new" ? cliente.phone : "",
      type: tipo,
      name: dados.name,
      date: dados.date,
      time: dados.time,
      city: dados.city,
      location: dados.location,
      guests: dados.guests,
      contractValue: dados.contractValue,
      entrada: dados.entrada,
      status: dados.status,
      responsavelId,
      respostas,
      tasks,
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
        <StepTipoEvento
          selected={tipo}
          onSelect={(t) => {
            setTipo(t);
            setStep(cliente ? 3 : 2);
          }}
        />
      )}

      {step === 2 && (
        <StepCliente
          clients={clients}
          onChoose={(c) => {
            setCliente(c);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <StepDadosBasicos
          value={dados}
          suggestedName={suggestedName}
          onChange={patchDados}
          membros={membros}
          responsavelId={responsavelId}
          onResponsavel={setResponsavelId}
          creating={creating}
          error={error}
          onQuick={() => submit(checklistMinimoRapido(), false)}
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
          onChange={patchRespostas}
          onNext={() => setStep(5)}
          onSkip={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <StepRevisao
          checklist={checklistCompleto}
          creating={creating}
          error={error}
          onCreate={(tasks) => submit(tasks, true)}
        />
      )}

      {step > 1 && step < 5 && (
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
