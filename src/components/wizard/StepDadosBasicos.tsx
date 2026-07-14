"use client";

export type DadosBasicos = {
  name: string;
  date: string;
  time: string;
  city: string;
  location: string;
  guests: string;
  contractValue: string;
  entrada: string;
  status: string; // orcamento | confirmado
};

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";
const labelClass = "mb-1 block text-sm font-medium text-stone-700";

type Props = {
  value: DadosBasicos;
  suggestedName: string;
  onChange: (patch: Partial<DadosBasicos>) => void;
  onQuick: () => void;
  onComplete: () => void;
  creating: boolean;
  error: string | null;
};

export function StepDadosBasicos({
  value,
  suggestedName,
  onChange,
  onQuick,
  onComplete,
  creating,
  error,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Dados do evento</h2>
      <p className="mt-1 text-sm text-stone-500">
        O mínimo para o evento existir. O resto você ajusta depois.
      </p>

      <div className="mt-4 space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="ev_name" className={labelClass}>
            Nome do evento
          </label>
          <input
            id="ev_name"
            type="text"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={suggestedName}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-400">
            Sugestão: {suggestedName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="ev_date" className={labelClass}>
              Data
            </label>
            <input
              id="ev_date"
              type="date"
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ev_time" className={labelClass}>
              Horário
            </label>
            <input
              id="ev_time"
              type="time"
              value={value.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ev_guests" className={labelClass}>
              Convidados
            </label>
            <input
              id="ev_guests"
              type="number"
              min={0}
              value={value.guests}
              onChange={(e) => onChange({ guests: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ev_status" className={labelClass}>
              Status
            </label>
            <select
              id="ev_status"
              value={value.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className={inputClass}
            >
              <option value="orcamento">Cotação</option>
              <option value="confirmado">Confirmado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev_city" className={labelClass}>
              Cidade
            </label>
            <input
              id="ev_city"
              type="text"
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ev_location" className={labelClass}>
              Local / Endereço
            </label>
            <input
              id="ev_location"
              type="text"
              value={value.location}
              onChange={(e) => onChange({ location: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev_contract" className={labelClass}>
              Valor do contrato (R$)
            </label>
            <input
              id="ev_contract"
              type="number"
              min={0}
              step="0.01"
              value={value.contractValue}
              onChange={(e) => onChange({ contractValue: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ev_entrada" className={labelClass}>
              Entrada já recebida (R$)
            </label>
            <input
              id="ev_entrada"
              type="number"
              min={0}
              step="0.01"
              value={value.entrada}
              onChange={(e) => onChange({ entrada: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onQuick}
          disabled={creating}
          className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium hover:border-stone-400 disabled:opacity-50"
        >
          {creating ? "Criando..." : "Criar evento rápido"}
        </button>
        <button
          onClick={onComplete}
          disabled={creating}
          className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          Continuar configuração completa →
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        No rápido, criamos um checklist mínimo (Contrato, Entrada, Confirmar
        fornecedor). No completo, você personaliza tudo.
      </p>
    </div>
  );
}
