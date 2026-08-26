import { redirect } from "next/navigation";

// A precificação mudou de casa: morava no menu Orçamentos e competia com
// o Catálogo — duas portas para "o que eu vendo e por quanto". Quem tem
// o endereço antigo salvo cai na casa nova.
export default function ModelosRedirect() {
  redirect("/catalogo/precificacao");
}
