import Link from "next/link";
import { ClientForm } from "@/components/clients/ClientForm";
import { createClientRecord } from "../actions";

export default function NovoClientePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/clientes"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Voltar aos clientes
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Novo cliente</h1>
      </div>
      <ClientForm action={createClientRecord} submitLabel="Cadastrar cliente" />
    </div>
  );
}
