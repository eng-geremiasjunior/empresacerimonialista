/**
 * Orçamentos — lógica de referência (framework-agnóstica)
 * ------------------------------------------------------------
 * Este arquivo documenta o COMPORTAMENTO da tela de Orçamentos redesenhada.
 * Não é código de produção pronto — é a fonte de verdade das regras de
 * ordenação, filtragem, formatação e alerta de validade. Reimplemente essas
 * funções no seu stack (React/Vue/etc.) usando os padrões do seu projeto.
 *
 * "Hoje" (data de referência para validade): 29/07/2026.
 * Em produção, troque por `new Date()`.
 */

const HOJE = "29/07/2026";

// ---------- Dados de exemplo (substituir pela sua API) ----------
export const ORCAMENTOS = [
  { name:"Geremias Júnior & Luana Godinho", phone:"33999478774", type:"Casamento", date:"08/08/2026", value:2000, validity:"27/10/2026", status:"Aprovado", event:false, venue:"Espaço Villa Bianca — Uberaba/MG", guests:180, time:"19h00", pkg:"Cerimônia + recepção" },
  { name:"Maria Eduarda", phone:"33999478774", type:"Debutante", date:"31/07/2026", value:9150, validity:"27/10/2026", status:"Aprovado", event:false, venue:"Buffet Golden Hall", guests:250, time:"21h00", pkg:"Festa 15 anos completa" },
  { name:"Juliana", phone:"33999478774", type:"Debutante", date:"30/07/2026", value:1250, validity:"28/08/2026", status:"Enviado", event:false, venue:"Salão Jardim das Rosas", guests:90, time:"20h00", pkg:"Decoração + cerimonial" },
  { name:"Marina", phone:"33999592997", type:"Debutante", date:"31/07/2026", value:8600, validity:"27/09/2026", status:"Aprovado", event:false, venue:"Chácara Recanto Azul", guests:200, time:"21h30", pkg:"Festa 15 anos completa" },
  { name:"Lia", phone:"33999478774", type:"Debutante", date:"31/07/2026", value:9200, validity:"27/10/2026", status:"Aprovado", event:false, venue:"Espaço Lumière", guests:220, time:"21h00", pkg:"Festa + assessoria full" },
  { name:"Lya", phone:"33999478774", type:"Debutante", date:"30/07/2026", value:6900, validity:"26/09/2026", status:"Aprovado", event:false, venue:"Buffet Estação Central", guests:160, time:"20h30", pkg:"Festa 15 anos" },
  { name:"Luana & Geremias", phone:"33999592997", type:"Casamento", date:"30/07/2026", value:750, validity:"26/10/2026", status:"Enviado", event:false, venue:"Cartório + mini wedding", guests:40, time:"16h00", pkg:"Cerimônia civil" },
  { name:"Geremias & Luana", phone:"33999478774", type:"Casamento", date:"28/07/2026", value:2500, validity:"27/08/2026", status:"Aprovado", event:true, venue:"Fazenda Santa Clara", guests:120, time:"18h30", pkg:"Cerimônia + recepção" },
  { name:"Geremias Silveira da Silva Júnior", phone:"33999478774", type:"Casamento", date:"30/07/2026", value:2000, validity:"26/08/2026", status:"Aprovado", event:true, venue:"Espaço Villa Bianca", guests:150, time:"19h00", pkg:"Recepção" },
  { name:"Bella & Jonas", phone:"33999478774", type:"Casamento", date:"31/07/2026", value:3150, validity:"22/10/2026", status:"Aprovado", event:true, venue:"Praia do Forte — destination", guests:80, time:"17h00", pkg:"Destination wedding" },
];

// ---------- Formatação ----------
export const fmtPhone = (r) => `(${r.slice(0,2)}) ${r.slice(2,7)}-${r.slice(7)}`;
export const fmtValue = (v) => "R$ " + v.toLocaleString("pt-BR");

export function initials(n){
  const c = n.replace(/&/g," ").split(/\s+/).filter(Boolean);
  return ((c[0]?.[0]||"") + (c[1]?.[0]||"")).toUpperCase();
}

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
export function monthLabel(d){                    // "08/08/2026" -> "08 ago 2026" (ANO obrigatório)
  const [dd,mm,yy] = d.split("/");
  return `${dd} ${MESES[+mm-1]} ${yy}`;
}
export const emailOf = (n) =>                      // placeholder; use o e-mail real do cliente
  n.replace(/&/g," ").split(/\s+/).filter(Boolean)[0].toLowerCase() + "@email.com";

// ---------- Datas / validade ----------
const toDate = (d) => { const [dd,mm,yy]=d.split("/"); return new Date(+yy,+mm-1,+dd); };
export const daysUntil = (d) => Math.round((toDate(d) - toDate(HOJE)) / 86400000);

/** Alerta de validade: âmbar até 30 dias, vermelho se vencido. */
export function validityInfo(validity){
  const dLeft = daysUntil(validity);
  const soon = dLeft >= 0 && dLeft <= 30;
  const expired = dLeft < 0;
  return {
    label: expired ? `Vencido em ${validity}`
         : soon    ? `Vence em ${dLeft} dias`
         :           `Válido até ${validity}`,
    color: expired ? "#B0553F" : soon ? "#9A7B3E" : "#B4B1A9",
    alert: soon || expired,   // mostra o ponto colorido
  };
}

// ---------- Pipeline: filtrar -> ordenar ----------
// state: { query, status: 'todos'|'aprovado'|'enviado', type: 'todos'|'casamento'|'debutante',
//          sortKey: 'date'|'value', sortDir: 'asc'|'desc' }
export function selectRows(data, state){
  const q = state.query.trim().toLowerCase();
  const filtered = data.filter(d => {
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.phone.includes(q.replace(/\D/g,""));
    const matchS = state.status === "todos" || d.status.toLowerCase() === state.status;
    const matchT = state.type   === "todos" || d.type.toLowerCase()   === state.type;
    return matchQ && matchS && matchT;
  });

  const dir = state.sortDir === "asc" ? 1 : -1;
  return filtered.slice().sort((a,b) => {
    const v = state.sortKey === "value" ? a.value - b.value : (toDate(a.date) - toDate(b.date));
    return v * dir;
  });
}

/** Clicar no mesmo cabeçalho alterna asc/desc; cabeçalho novo começa em asc. */
export function nextSort(state, key){
  return { sortKey: key, sortDir: state.sortKey === key && state.sortDir === "asc" ? "desc" : "asc" };
}

/** Card de métrica clicável: clicar de novo no filtro ativo volta para 'todos'. */
export function toggleStatFilter(currentStatus, filter){
  return currentStatus === filter ? "todos" : filter;
}

// ---------- Paletas ----------
export const statusStyle = (s) =>
  s === "Aprovado" ? { color:"#5A7A55", dot:"#7A9B6E" }
: s === "Enviado"  ? { color:"#9A7B3E", dot:"#C08A4E" }
:                    { color:"#8A867C", dot:"#B4B1A9" };

export const avatarPalette = (type) =>
  type === "Casamento" ? { bg:"#EDE9E2", color:"#8A6E4B" }
                       : { bg:"#EAEAE6", color:"#6E7A6A" };
