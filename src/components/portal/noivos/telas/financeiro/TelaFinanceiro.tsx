// A tela Financeiro do portal dos noivos (desenho v4, README §15;
// protótipo, template 663–688 e lógica 1101–1103): o resumo (contratado,
// já pago, falta pagar e a barra) e as parcelas, a próxima em pêssego.
//
// Sem estado nem clique: fica no servidor. "Pagar com Pix" é outra fase
// (parcelas com Pix): a próxima parcela mostra o prazo em tempo ("vence
// em 4 dias") no lugar do botão. O lembrete no WhatsApp também não
// existe; o canto do título mostra quantas já foram pagas.

import { Eyebrow, Trilho } from "../../primitivas";
import type { ResumoFinanceiro } from "./montar";
import "./financeiro.css";

export function TelaFinanceiro({ resumo }: { resumo: ResumoFinanceiro }) {
  const total = resumo.parcelas.length;
  return (
    <section className="pn-financeiro" aria-label="Financeiro">
      <div className="pn-financeiro-resumo">
        <Eyebrow>Resumo financeiro</Eyebrow>
        <div className="pn-financeiro-numeros">
          <div className="pn-financeiro-numero">
            <div className="pn-financeiro-rot">Contratado</div>
            <div className="pn-t pn-financeiro-valor">{resumo.contratado}</div>
          </div>
          <div className="pn-financeiro-numero">
            <div className="pn-financeiro-rot">Já pago</div>
            <div className="pn-t pn-financeiro-valor pago">{resumo.pago}</div>
          </div>
          <div className="pn-financeiro-numero">
            <div className="pn-financeiro-rot">Falta pagar</div>
            <div className="pn-t pn-financeiro-valor falta">{resumo.falta}</div>
          </div>
        </div>
        <div className="pn-financeiro-barra">
          <Trilho pct={resumo.pct} altura={10} fundo="var(--pn-trilho)" cor="var(--pn-verde)" duracao={1.4} />
        </div>
      </div>

      {total > 0 && (
        <div className="pn-financeiro-parcelas">
          <div className="pn-financeiro-cabeca">
            <h2 className="pn-t pn-financeiro-titulo">Parcelas</h2>
            <div className="pn-financeiro-conta">
              {resumo.pagas} de {total} {total === 1 ? "paga" : "pagas"}
            </div>
          </div>
          <ul className="pn-financeiro-lista">
            {resumo.parcelas.map((p) => (
              <li key={p.chave} className={`pn-financeiro-linha${p.estado === "prox" ? " prox" : ""}`}>
                <div className="pn-t pn-financeiro-data">{p.data}</div>
                <div className="pn-financeiro-texto">{p.texto}</div>
                <div className="pn-financeiro-quanto">{p.valor}</div>
                <div className="pn-financeiro-estado">
                  <span className={`pn-financeiro-chip ${p.estado}`}>{p.rotulo}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
