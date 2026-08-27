// A tela de Clientes.
//
// Toda a leitura acontece aqui, uma vez; o filtro e a busca são no
// cliente, ao digitar. Mesma arquitetura da tela de Fornecedores.

import { getClientesTela } from "@/lib/supabase/clientes-tela";
import { ClientesTela } from "@/components/clientes/ClientesTela";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const linhas = await getClientesTela();
  return <ClientesTela linhas={linhas} />;
}
