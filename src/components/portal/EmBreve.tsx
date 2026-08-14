// Destino que já existe na navegação mas cujo conteúdo entra numa fase
// seguinte. Diz o que vai aparecer ali, na mesma voz calma — sem
// exclamação, sem promessa de prazo, sem caixa vazia inexplicada.

import { TopoInterno } from "./TopoInterno";
import { Cartao } from "./Nucleo";

export function EmBreve({
  eventoId,
  titulo,
  texto,
}: {
  eventoId: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="portal-tela">
      <TopoInterno eventoId={eventoId} titulo={titulo} />
      <Cartao>
        <p
          style={{
            fontSize: "var(--ts-desc)",
            color: "var(--cor-texto-suave)",
            maxWidth: 520,
            lineHeight: 1.55,
            textWrap: "pretty",
          }}
        >
          {texto}
        </p>
      </Cartao>
    </div>
  );
}
