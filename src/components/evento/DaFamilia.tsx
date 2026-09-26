// O que a família cria pelo portal v2, visto pela equipe (só leitura):
// as tarefas próprias (179) e os fornecedores que ela mesma chamou (181).
// Some quando não há nada.

type TarefaDaFamilia = { id: string; titulo: string; quando: string | null; quem: string | null; feita: boolean; autor: string | null };
type FornecedorDaFamilia = { id: string; nome: string; oQueFaz: string | null; contato: string | null; contratado: boolean; autor: string | null };

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Caixa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
      <p className="mt-0.5 text-xs text-gray-500">pelo portal da família</p>
      <ul className="mt-3 divide-y divide-gray-100">{children}</ul>
    </section>
  );
}

export function TarefasDaFamilia({ itens }: { itens: TarefaDaFamilia[] }) {
  if (!itens.length) return null;
  return (
    <Caixa titulo="Tarefas da família">
      {itens.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className={t.feita ? "text-gray-400 line-through" : "text-gray-800"}>{t.titulo}</span>
          <span className="shrink-0 text-xs text-gray-500">
            {[t.quem, t.quando ? `até ${ddmm(t.quando)}` : null, t.feita ? "feita" : null].filter(Boolean).join(" · ")}
          </span>
        </li>
      ))}
    </Caixa>
  );
}

export function FornecedoresDaFamilia({ itens }: { itens: FornecedorDaFamilia[] }) {
  if (!itens.length) return null;
  return (
    <Caixa titulo="Fornecedores da família">
      {itens.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="font-medium text-gray-900">{f.nome}</span>
            <span className="text-gray-500">{[f.oQueFaz, f.contato].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${f.contratado ? "bg-[#f3ecf1] text-[#6E3F5F]" : "bg-gray-100 text-gray-600"}`}>
            {f.contratado ? "contratado" : "em conversa"}
          </span>
        </li>
      ))}
    </Caixa>
  );
}
