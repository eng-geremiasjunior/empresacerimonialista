import { AjudaTela } from "@/components/ajuda/AjudaTela";
import { ConhecaPorDentro } from "@/components/evento/ConhecaPorDentro";
import { conhecaPorDentroDaConta } from "@/lib/conheca-por-dentro";
import { getMeuCargo } from "@/lib/supabase/equipe";

// O onboarding que não exige ligação: as perguntas da primeira semana,
// com resposta curta e o caminho de clique. O conteúdo mora em
// src/lib/ajuda-conteudo.ts.
//
// Em cima, sempre, "Conheça o eOrganizei por dentro" (27/09/2026): o
// evento pronto e os dois portais como a cliente vê — para voltar quando
// quiser mostrar a uma cliente.

export const metadata = { title: "Ajuda — eorganizei" };

export const dynamic = "force-dynamic";

export default async function AjudaPage() {
  const { empresaId } = await getMeuCargo();
  const { exemploCasamento } = await conhecaPorDentroDaConta(empresaId);
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <ConhecaPorDentro exemploCasamento={exemploCasamento} dispensavel={false} />
      </div>
      <AjudaTela />
    </div>
  );
}
