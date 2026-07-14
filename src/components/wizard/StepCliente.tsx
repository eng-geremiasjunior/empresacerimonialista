"use client";

import { useMemo, useState } from "react";

export type ClientOption = { id: string; name: string; phone: string | null };

export type ClienteEscolhido =
  | { kind: "existing"; client: ClientOption }
  | { kind: "new"; name: string; phone: string };

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";

type Props = {
  clients: ClientOption[];
  onChoose: (c: ClienteEscolhido) => void;
};

export function StepCliente({ clients, onChoose }: Props) {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? clients.filter((c) => c.name.toLowerCase().includes(q))
      : clients;
    return base.slice(0, 8);
  }, [clients, search]);

  return (
    <div>
      <h2 className="text-lg font-semibold">Para qual cliente?</h2>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <label htmlFor="cli_search" className="mb-1 block text-sm font-medium">
          Buscar cliente existente
        </label>
        <input
          id="cli_search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Digite o nome..."
          className={inputClass}
        />
        {clients.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {filtered.length === 0 ? (
              <li className="text-sm text-stone-500">
                Nenhum cliente encontrado. Crie um abaixo.
              </li>
            ) : (
              filtered.map((client) => (
                <li key={client.id}>
                  <button
                    onClick={() => onChoose({ kind: "existing", client })}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-left text-sm hover:border-stone-400"
                  >
                    <span className="font-medium">{client.name}</span>
                    {client.phone && (
                      <span className="text-stone-400">{client.phone}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="relative my-5 text-center">
        <span className="bg-stone-50 px-3 text-xs uppercase tracking-wide text-stone-400">
          ou crie rápido
        </span>
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-stone-200" />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cli_new_name" className="mb-1 block text-sm font-medium">
              Nome do cliente
            </label>
            <input
              id="cli_new_name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Marina Oliveira"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cli_new_phone" className="mb-1 block text-sm font-medium">
              Telefone{" "}
              <span className="font-normal text-stone-400">(opcional)</span>
            </label>
            <input
              id="cli_new_phone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={() =>
            onChoose({ kind: "new", name: newName.trim(), phone: newPhone.trim() })
          }
          disabled={newName.trim().length === 0}
          className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:border-stone-400 disabled:opacity-40"
        >
          Continuar com novo cliente →
        </button>
      </div>
    </div>
  );
}
