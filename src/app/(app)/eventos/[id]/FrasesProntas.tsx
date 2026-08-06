"use client";

// Frases prontas clicáveis para agilizar o dia a dia da cerimonialista.
// Clicar copia a frase para a área de transferência e mostra um toast
// "Copiado". Sem banco: array fixo por enquanto, dividido por destinatário.

import { useState } from "react";
import { ClipboardList, Check } from "lucide-react";

type Grupo = { titulo: string; frases: string[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Noivos",
    frases: [
      "Oi! Passando para confirmar nossa próxima reunião de alinhamento. Qual horário fica melhor para vocês?",
      "Boa notícia: já fechamos mais um item do planejamento. Vou te enviar o resumo atualizado.",
      "Lembrete carinhoso: precisamos definir isso nos próximos dias para não apertar o cronograma. Consegue me dar um retorno?",
      "Estamos com tudo caminhando bem. Qualquer dúvida, pode me chamar a qualquer momento.",
    ],
  },
  {
    titulo: "Fornecedores",
    frases: [
      "Olá! Sou a cerimonialista responsável pelo evento. Pode confirmar a disponibilidade para a data combinada?",
      "Por favor, me envie o contrato e a lista do que está incluso para eu alinhar com os noivos.",
      "Confirmando os horários de montagem e desmontagem no local. Segue o roteiro em anexo.",
      "Precisamos da confirmação de presença até esta semana para fechar o cronograma do dia.",
    ],
  },
  {
    titulo: "Equipe",
    frases: [
      "Bom dia, equipe! Segue o roteiro do evento. Confiram os horários e a ordem de entrada.",
      "Ponto de encontro e horário de chegada confirmados. Cheguem com antecedência, por favor.",
      "Qualquer imprevisto no dia, falem comigo imediatamente antes de tomar qualquer decisão.",
      "Obrigada pelo trabalho de hoje! Foi impecável. Depois passo o feedback completo.",
    ],
  },
];

export function FrasesProntas() {
  // guarda a frase copiada por instante, para o feedback visual + toast.
  const [copiada, setCopiada] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  async function copiar(frase: string) {
    try {
      await navigator.clipboard.writeText(frase);
    } catch {
      // fallback para navegadores sem clipboard API
      const ta = document.createElement("textarea");
      ta.value = frase;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiada(frase);
    setToast(true);
    window.setTimeout(() => setToast(false), 1600);
    window.setTimeout(() => setCopiada(null), 1600);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <ClipboardList size={15} className="text-indigo-500" />
        Frases prontas
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">
        Toque para copiar e colar no WhatsApp.
      </p>

      <div className="mt-3 space-y-4">
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {g.titulo}
            </p>
            <div className="mt-1.5 space-y-1.5">
              {g.frases.map((frase) => {
                const ativa = copiada === frase;
                return (
                  <button
                    key={frase}
                    onClick={() => copiar(frase)}
                    className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      ativa
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 text-gray-400">
                      {ativa ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <ClipboardList size={13} />
                      )}
                    </span>
                    <span className="min-w-0 leading-snug">{frase}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Toast "Copiado" */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <Check size={15} className="text-emerald-400" />
            Copiado
          </div>
        </div>
      )}
    </section>
  );
}
