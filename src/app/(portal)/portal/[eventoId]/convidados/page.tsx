import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default function PortalConvidadosPage() {
  return (
    <EmBreve
      rotulo="Convidados"
      titulo="Sua lista"
      texto="Aqui vai ficar a lista de convidados, com quem já confirmou presença, e o link para você compartilhar a confirmação."
    />
  );
}
