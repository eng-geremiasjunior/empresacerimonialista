// Contas semelhantes (07/10/2026). Pedido do dono, depois de ver quatro
// contas da mesma pessoa abertas com nomes, e-mails e Instagram inventados
// ("notamos que possui 4 contas semelhantes… deixar apenas 1 ativa").
//
// Módulo PURO: recebe as contas já lidas e devolve os grupos. Quem decide
// encerrar é o dono, num botão (admin-semelhantes.ts); fica ativa a conta
// MAIS USADA do grupo.
//
// Os sinais, do mais forte ao mais fraco:
//   · mesmo navegador — o cookie do pixel (_fbp) ou o client_id do GA4
//     gravados no cadastro (origem_do_clique). Dois cadastros no mesmo
//     navegador é a mesma pessoa, ou alguém no computador dela;
//   · mesmo WhatsApp da dona;
//   · mesmo IP, ou IP vizinho (mesma faixa) COM o mesmo sobrenome — o IP
//     sozinho não liga ninguém: casal, escritório e wi-fi de café dividem.
// O cadastro novo só é barrado pelos dois primeiros (ver criar-conta).

export type ContaParaComparar = {
  empresaId: string;
  nome: string;
  email: string | null;
  /** nome da dona, como ela digitou no cadastro */
  dona: string | null;
  criadaEm: string;
  minutos: number;
  banida: boolean;
  fbp: string | null;
  gaClientId: string | null;
  ip: string | null;
  whatsapp: string | null;
};

export type GrupoSemelhante = {
  contas: ContaParaComparar[];
  /** "mesmo navegador: evento real e evento do moises" */
  motivos: string[];
  /** a que o botão sugere manter: a mais usada (empate: a mais antiga) */
  sugerida: string;
};

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O último nome da dona, para o sinal fraco ("Moises Antero" → "antero"). */
export function sobrenome(nome: string | null): string | null {
  const partes = semAcento(nome ?? "").replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return null;
  const ultimo = partes[partes.length - 1];
  return ultimo.length >= 3 ? ultimo : null;
}

/** A faixa do IP: os dois primeiros blocos ("45.161"). Só IPv4. */
function faixa(ip: string | null): string | null {
  const m = (ip ?? "").match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  return m ? `${m[1]}.${m[2]}` : null;
}

/** "indiararosa@gmail.com" → "i***@gmail.com" */
export function emailMascarado(email: string | null | undefined): string | null {
  const [antes, dominio] = (email ?? "").split("@");
  if (!antes || !dominio) return null;
  return `${antes.charAt(0)}***@${dominio}`;
}

/** A parte do e-mail antes do @, só letras ("indiara.rosa190" → "indiararosa"). */
function raizDoEmail(email: string | null): string {
  return semAcento((email ?? "").split("@")[0] ?? "").replace(/[^a-z]/g, "");
}

/** O começo em comum de duas raízes ("indiararosa", "indiarasilvarosa" → 7). */
function prefixoComum(x: string, y: string): number {
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i;
}

function ligacoes(a: ContaParaComparar, b: ContaParaComparar): string[] {
  const motivos: string[] = [];
  // e-mails que começam igual por 6+ letras: a mesma pessoa variando o
  // endereço (indiararosa, indiararosa190, indiarasilvarosa190)
  const ra = raizDoEmail(a.email);
  const rb = raizDoEmail(b.email);
  if (ra.length >= 6 && rb.length >= 6 && prefixoComum(ra, rb) >= 6) motivos.push("e-mails parecidos");
  // o sobrenome de uma dona dentro do e-mail da outra, da mesma faixa de IP
  // ("Moises Antero" e lorivalantero190@…)
  const fa0 = faixa(a.ip);
  if (fa0 && fa0 === faixa(b.ip)) {
    const sa0 = sobrenome(a.dona);
    const sb0 = sobrenome(b.dona);
    if ((sa0 && sa0.length >= 5 && rb.includes(sa0)) || (sb0 && sb0.length >= 5 && ra.includes(sb0))) {
      motivos.push("sobrenome no e-mail da outra e IP vizinho");
    }
  }
  if ((a.fbp && a.fbp === b.fbp) || (a.gaClientId && a.gaClientId === b.gaClientId)) motivos.push("mesmo navegador");
  if (a.whatsapp && a.whatsapp === b.whatsapp) motivos.push("mesmo WhatsApp");
  {
    const fa = faixa(a.ip);
    const sa = sobrenome(a.dona);
    if (a.ip !== b.ip && fa && fa === faixa(b.ip) && sa && sa === sobrenome(b.dona)) {
      motivos.push("IP vizinho e mesmo sobrenome");
    }
  }
  // O mesmo IP SOZINHO não liga ninguém: a operadora de celular põe
  // milhares de clientes atrás de um IP só (duas cerimonialistas sem nada
  // em comum caíram juntas no primeiro teste). Ele só reforça o que outro
  // sinal já ligou.
  if (motivos.length > 0 && a.ip && a.ip === b.ip) motivos.push("mesmo IP");
  return motivos;
}

/** Endereços das contas-sonda dos testes (Resend): não são clientes. */
const ehSonda = (email: string | null) => /@resend\.dev$/i.test(email ?? "");

/**
 * Os grupos de contas que parecem da mesma pessoa. Só aparecem grupos com
 * duas ou mais contas ATIVAS — o que já foi resolvido some da tela.
 */
export function agruparSemelhantes(todas: ContaParaComparar[]): GrupoSemelhante[] {
  const contas = todas.filter((c) => !ehSonda(c.email));
  const pai = new Map(contas.map((c) => [c.empresaId, c.empresaId]));
  const raiz = (id: string): string => {
    let r = id;
    while (pai.get(r) !== r) r = pai.get(r)!;
    pai.set(id, r);
    return r;
  };
  const motivosDoPar: { a: string; b: string; motivos: string[] }[] = [];
  for (let i = 0; i < contas.length; i++) {
    for (let j = i + 1; j < contas.length; j++) {
      const m = ligacoes(contas[i], contas[j]);
      if (m.length === 0) continue;
      motivosDoPar.push({ a: contas[i].empresaId, b: contas[j].empresaId, motivos: m });
      pai.set(raiz(contas[i].empresaId), raiz(contas[j].empresaId));
    }
  }

  const porRaiz = new Map<string, ContaParaComparar[]>();
  for (const c of contas) {
    const r = raiz(c.empresaId);
    porRaiz.set(r, [...(porRaiz.get(r) ?? []), c]);
  }
  const nomeDe = new Map(contas.map((c) => [c.empresaId, c.nome]));

  const grupos: GrupoSemelhante[] = [];
  for (const membros of porRaiz.values()) {
    if (membros.length < 2) continue;
    if (membros.filter((c) => !c.banida).length < 2) continue;
    const ids = new Set(membros.map((c) => c.empresaId));
    const motivos = motivosDoPar
      .filter((p) => ids.has(p.a))
      .map((p) => `${p.motivos.join(", ")}: ${nomeDe.get(p.a)} e ${nomeDe.get(p.b)}`);
    const ativas = membros.filter((c) => !c.banida);
    const sugerida = [...ativas].sort(
      (x, y) => y.minutos - x.minutos || x.criadaEm.localeCompare(y.criadaEm)
    )[0].empresaId;
    grupos.push({
      contas: [...membros].sort((x, y) => x.criadaEm.localeCompare(y.criadaEm)),
      motivos,
      sugerida,
    });
  }
  return grupos.sort((x, y) => y.contas.length - x.contas.length);
}
