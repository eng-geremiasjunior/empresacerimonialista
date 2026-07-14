import { formatCurrency } from "@/lib/format";

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function ResumoContrato({
  contrato,
  recebido,
  aReceber,
  despesas,
}: {
  contrato: number | null;
  recebido: number;
  aReceber: number;
  despesas: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Valor do contrato"
        value={contrato !== null ? formatCurrency(contrato) : "—"}
      />
      <Card label="Recebido" value={formatCurrency(recebido)} />
      <Card label="A receber" value={formatCurrency(aReceber)} />
      <Card label="Despesas" value={formatCurrency(despesas)} />
    </div>
  );
}
