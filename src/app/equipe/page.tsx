// /equipe — o endereço da porta da equipe.
//
// POR QUE EXISTE (10/09/2026). A cerimonialista precisa de um endereço
// curto para mandar no WhatsApp de quem ela acabou de cadastrar:
// "eorganizei.com.br/equipe". Digitar /login?entrar=equipe ninguém
// digita, e quem chega em /login vê primeiro a porta de quem assina.
//
// É só o apelido: a tela é a mesma, e quem decide o que mostrar continua
// sendo a página de login. Assim não existem duas telas de login para
// manter em pé — que é como uma delas envelhece e some do radar.

import { redirect } from "next/navigation";

export const metadata = {
  title: "Acesso da equipe — eorganizei",
  robots: { index: false, follow: false },
};

export default function EquipePage() {
  redirect("/login?entrar=equipe");
}
