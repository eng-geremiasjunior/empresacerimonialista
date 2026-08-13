import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default function PortalEscolhasPage() {
  return (
    <EmBreve
      rotulo="Escolhas"
      titulo="Suas escolhas"
      texto="Aqui vão aparecer as opções que sua cerimonialista selecionou para você, com o que cada uma inclui, o valor e o prazo de reserva."
    />
  );
}
