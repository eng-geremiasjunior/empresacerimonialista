// Presentes (desenho v4, README §14). Componente de SERVIDOR: lê a parte
// de presentes do site pela sessão da família e entrega só dados simples
// à tela (cliente), que copia a chave e o link.

import { getPresentesDoCasal } from "./dados";
import { TelaPresentes } from "./TelaPresentes";

export async function PresentesSecao({ eventoId }: { eventoId: string }) {
  const presentes = await getPresentesDoCasal(eventoId);
  return <TelaPresentes presentes={presentes} />;
}
