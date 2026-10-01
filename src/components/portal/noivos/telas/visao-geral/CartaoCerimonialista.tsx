// O cartão escuro da cerimonialista (desenho v4, README §6.6; protótipo,
// template 868–882): quem cuida, "Conversar" no WhatsApp dela, o que ela
// está conduzindo e o que já foi resolvido (o quadro da 173, o mesmo da
// tela de Tarefas). Na conta de família (187/188) não há cerimonialista:
// o mesmo cartão vira o convite, e o pedido quando ele chega.

import Link from "next/link";
import { Icone } from "../../primitivas";
import type { CartaoDaCerimonialista as Dados } from "./montar";

export function CartaoCerimonialista({ dados }: { dados: Dados }) {
  if (dados.modo === "convite") {
    const pedido = dados.pedidoDe;
    return (
      <div className="pn-visao-geral-cerimonialista uma-coluna">
        <div>
          <div className="pn-t pn-visao-geral-cerimonialista-avatar">
            {pedido ? pedido.charAt(0).toUpperCase() : <Icone nome="person_add" tamanho={30} />}
          </div>
          <div className="pn-t pn-visao-geral-cerimonialista-nome">
            {pedido ? `${pedido} pediu para organizar a festa com você` : "Tem cerimonialista?"}
          </div>
          {!pedido && (
            <div className="pn-visao-geral-cerimonialista-linha">Convide para organizar com você.</div>
          )}
          <Link href={dados.href} className="pn-visao-geral-conversar">
            <Icone nome={pedido ? "mail" : "person_add"} tamanho={18} />
            {pedido ? "Responder" : "Convidar"}
          </Link>
        </div>
      </div>
    );
  }

  const direita = dados.cuidando.length > 0 || dados.resolvido.length > 0;
  return (
    <div className={`pn-visao-geral-cerimonialista${direita ? "" : " uma-coluna"}`}>
      <div>
        <div className="pn-t pn-visao-geral-cerimonialista-avatar">{dados.inicial}</div>
        <div className="pn-t pn-visao-geral-cerimonialista-nome">{dados.nome}</div>
        <div className="pn-visao-geral-cerimonialista-linha">{dados.linha}</div>
        {dados.whatsapp && (
          <a href={dados.whatsapp} target="_blank" rel="noopener noreferrer" className="pn-visao-geral-conversar">
            <Icone nome="chat" tamanho={18} />
            Conversar
          </a>
        )}
      </div>
      {direita && (
        <div style={{ minWidth: 0 }}>
          {dados.cuidando.length > 0 && (
            <>
              <div className="pn-visao-geral-cerimonialista-eyebrow">Enquanto isso, {dados.quem} cuida de</div>
              <div className="pn-visao-geral-chips">
                {dados.cuidando.map((c) => (
                  <span key={c} className="pn-visao-geral-chip">
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}
          {dados.resolvido.length > 0 && (
            <>
              <div
                className="pn-visao-geral-cerimonialista-eyebrow"
                style={dados.cuidando.length > 0 ? { marginTop: 28 } : undefined}
              >
                Já resolvido
              </div>
              <div className="pn-visao-geral-chips">
                {dados.resolvido.map((c) => (
                  <span key={c} className="pn-visao-geral-chip feito">
                    <Icone nome="check_circle" tamanho={17} />
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
