import { getFornecedoresDaTela } from "@/lib/supabase/fornecedores-tela";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { FornecedoresTela } from "@/components/fornecedores/FornecedoresTela";

// A tela filtra no cliente, então o servidor entrega a lista inteira uma
// vez — e por isso ela precisa ser sempre fresca: sem `force-dynamic` o
// Next serviria um cadastro velho depois de cada cadastro novo.
export const dynamic = "force-dynamic";

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams?: { f?: string };
}) {
  const [{ linhas, migracaoPendente }, { cargo }] = await Promise.all([
    getFornecedoresDaTela(),
    getMeuCargo(),
  ]);

  // Assistente LÊ o cadastro (RLS 024) mas não escreve — e as policies de
  // UPDATE só têm USING, então a recusa volta com zero linhas e SEM erro.
  // Botão que falha calado é pior que botão ausente.
  const podeEscrever =
    cargo === "proprietaria" || cargo === "coordenadora" || cargo === "cerimonialista";

  // "Este ano" nasce aqui, em Brasília: calcular no cliente faria o
  // servidor e o navegador discordarem na virada do ano.
  const anoCorrente = Number(
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 4)
  );

  return (
    <FornecedoresTela
      linhas={linhas}
      anoCorrente={anoCorrente}
      migracaoPendente={migracaoPendente}
      selecionadoInicial={searchParams?.f ?? null}
      podeEscrever={podeEscrever}
    />
  );
}
