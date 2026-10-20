// O resumo diário de tarefas por e-mail (19/10/2026, pedido dele: "eu até
// achei que já tinha isso do email"). Um e-mail por pessoa, às 9h, só
// quando há o que dizer: o que vence amanhã e o que está atrasado — das
// tarefas dos eventos e das dela, sem evento (217).
//
// Quando sai (para não virar spam e ela parar de ler):
//   * há tarefa vencendo amanhã; ou
//   * alguma tarefa atrasou ontem (passou do prazo agora); ou
//   * é segunda-feira e há qualquer atrasada (o lembrete da semana).
// A mesma lista de atrasadas NÃO sai todo dia.
//
// O que leva: até 5 de amanhã e as 5 atrasadas mais antigas, com "e mais N"
// e o link para a tela. O assunto não leva título de tarefa (aparece na
// tela de bloqueio do celular). Módulo puro: sem banco.

export type ItemDoResumo = { titulo: string; prazo: string; evento: string | null };

export const NO_EMAIL = 5;

const diasEntre = (de: string, ate: string) => {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
};

const ehSegunda = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() === 1;
};

export function separar(itens: ItemDoResumo[], hoje: string) {
  const amanha = itens.filter((i) => diasEntre(hoje, i.prazo) === 1);
  const atrasadas = itens
    .filter((i) => i.prazo < hoje)
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
  return { amanha, atrasadas };
}

export function deveEnviar(itens: ItemDoResumo[], hoje: string): boolean {
  const { amanha, atrasadas } = separar(itens, hoje);
  if (amanha.length > 0) return true;
  if (atrasadas.some((i) => diasEntre(i.prazo, hoje) === 1)) return true;
  return ehSegunda(hoje) && atrasadas.length > 0;
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function haDias(prazo: string, hoje: string): string {
  const n = diasEntre(prazo, hoje);
  return n === 1 ? "ontem" : `há ${n} dias`;
}

export function assuntoDoResumo(itens: ItemDoResumo[], hoje: string): string {
  const { amanha, atrasadas } = separar(itens, hoje);
  const partes: string[] = [];
  if (amanha.length > 0) partes.push(`${plural(amanha.length, "tarefa vence", "tarefas vencem")} amanhã`);
  if (atrasadas.length > 0) partes.push(plural(atrasadas.length, "atrasada", "atrasadas"));
  return `Suas tarefas: ${partes.join(" · ")}`;
}

export function htmlDoResumo(p: { nome: string; itens: ItemDoResumo[]; hoje: string; app: string }): string {
  const { amanha, atrasadas } = separar(p.itens, p.hoje);
  const linha = (i: ItemDoResumo, quando: string) =>
    `<li style="margin:0 0 8px">${escapar(i.titulo)}<br /><span style="font-size:13px;color:#4F5558">${quando}${
      i.evento ? ` · ${escapar(i.evento)}` : ""
    }</span></li>`;
  const bloco = (titulo: string, lista: ItemDoResumo[], quando: (i: ItemDoResumo) => string) =>
    lista.length === 0
      ? ""
      : `<p style="margin:20px 0 8px;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#4F5558">${titulo}</p>
         <ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.5">${lista
           .slice(0, NO_EMAIL)
           .map((i) => linha(i, quando(i)))
           .join("")}</ul>${
           lista.length > NO_EMAIL
             ? `<p style="margin:6px 0 0;font-size:13px;color:#4F5558">e mais ${lista.length - NO_EMAIL}</p>`
             : ""
         }`;
  const primeiro = p.nome.trim().split(/\s+/)[0] ?? "";
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#292D2C">
      <p style="font-size:15px;line-height:1.6">${primeiro ? `Olá, ${escapar(primeiro)}.` : "Olá."} Este é o resumo das suas tarefas.</p>
      ${bloco("Vencem amanhã", amanha, () => "amanhã")}
      ${bloco("Atrasadas", atrasadas, (i) => `venceu ${haDias(i.prazo, p.hoje)}`)}
      <p style="margin:26px 0">
        <a href="${p.app}/tarefas"
           style="background:#244C50;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Abrir as tarefas
        </a>
      </p>
      <p style="font-size:12.5px;line-height:1.6;color:#6B7275">
        Este resumo sai às 9h, só nos dias em que há o que dizer. Para não receber, desligue em Configurações:<br />
        ${p.app}/configuracoes
      </p>
    </div>
  `;
}
