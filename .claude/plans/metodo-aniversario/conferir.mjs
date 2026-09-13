// Confere um método (JSON no formato do workflow) contra as regras duras
// levantadas no mapa. Uso: node conferir.mjs arquivo.json
import { readFileSync } from "node:fs";

const m = JSON.parse(readFileSync(process.argv[2], "utf8"));
const erros = [];
const avisos = [];
const erro = (s) => erros.push(s);
const aviso = (s) => avisos.push(s);

const TIPOS_CAMPO = ["texto", "numero", "moeda", "sim_nao", "escolha", "data", "hora", "anexo", "fornecedor"];
const OPERACOES = ["ativar_objetivo", "desativar_objetivo", "set_offset_ideal", "set_offset_min", "set_offset_max",
  "set_faixa_pct_min", "set_faixa_pct_ideal", "set_faixa_pct_max", "set_prioridade"];
const DE_OBJETIVO = ["ativar_objetivo", "desativar_objetivo", "set_faixa_pct_min", "set_faixa_pct_ideal", "set_faixa_pct_max"];
const CURADOS = ["prioridades", "tipo_cerimonia", "mesmo_local", "tera_cortejo", "duracao_recepcao", "convidados_estimado",
  "formato_civil", "regime", "igreja_nome", "leituras", "lista_musicas", "modalidade_vestido", "atelie", "itens_acessorios",
  "modalidade_traje", "paleta_madrinhas", "paleta_cores", "estilo_desejado", "modelo_bouquet", "banda_ou_dj", "playlist",
  "lista_veto", "musica_primeira_danca", "atracoes", "lista_bebidas", "topo_bolo", "tipo_lembrancinha", "referencias_foto",
  "lista_fotos", "carro", "destino", "hashtag"];
const SNAKE = /^[a-z0-9_]+$/;

// ---------- identidade dos códigos ----------
const objPor = new Map();
for (const o of m.objetivos) {
  if (objPor.has(o.codigo)) erro(`objetivo repetido: ${o.codigo}`);
  if (!SNAKE.test(o.codigo)) erro(`objetivo com código fora de snake_case: ${o.codigo}`);
  objPor.set(o.codigo, o);
  const f = [o.faixa_min, o.faixa_ideal, o.faixa_max];
  const nulos = f.filter((x) => x === null).length;
  if (nulos !== 0 && nulos !== 3) erro(`objetivo ${o.codigo}: faixa parcialmente nula`);
  if (nulos === 0 && !(o.faixa_min <= o.faixa_ideal && o.faixa_ideal <= o.faixa_max)) erro(`objetivo ${o.codigo}: min<=ideal<=max quebrado`);
}
const decPor = new Map();
for (const d of m.decisoes) {
  if (decPor.has(d.codigo)) erro(`decisão repetida: ${d.codigo}`);
  if (!d.codigo.startsWith("aniv_")) erro(`decisão sem prefixo aniv_: ${d.codigo}`);
  if (!objPor.has(d.objetivo)) erro(`decisão ${d.codigo} aponta objetivo inexistente ${d.objetivo}`);
  if (!(d.offset_min <= d.offset_ideal && d.offset_ideal <= d.offset_max)) erro(`decisão ${d.codigo}: offsets fora de ordem`);
  if (d.offset_ideal < 2) erro(`decisão ${d.codigo}: offset_ideal ${d.offset_ideal} < 2`);
  decPor.set(d.codigo, d);
}
// colisão com códigos de decisão já usados nas migrações
const migr = "C:/Users/user/Documents/GitHub/empresacerimonialista/supabase/migrations";
import { readdirSync } from "node:fs";
const todoSql = readdirSync(migr).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(`${migr}/${f}`, "utf8")).join("\n");
for (const d of m.decisoes) if (todoSql.includes(`'${d.codigo}'`)) erro(`código de decisão já existe nas migrações: ${d.codigo}`);

// ---------- campos ----------
const especiais = { escala: 0, cenario: 0, verba_total: 0, reserva_pct: 0 };
const moedaPorDecisao = {};
const camposPorDecisao = {};
for (const c of m.campos) {
  const d = decPor.get(c.decisao);
  if (!d) { erro(`campo ${c.codigo} aponta decisão inexistente ${c.decisao}`); continue; }
  camposPorDecisao[c.decisao] ??= new Set();
  if (camposPorDecisao[c.decisao].has(c.codigo)) erro(`campo repetido na decisão ${c.decisao}: ${c.codigo}`);
  camposPorDecisao[c.decisao].add(c.codigo);
  if (!TIPOS_CAMPO.includes(c.tipo)) erro(`campo ${c.decisao}.${c.codigo}: tipo inválido ${c.tipo}`);
  if (!SNAKE.test(c.codigo)) erro(`campo com código fora de snake_case: ${c.codigo}`);
  if (c.codigo.startsWith("proprio_")) erro(`campo usa prefixo reservado proprio_: ${c.codigo}`);
  if (c.tipo === "escolha" && !c.opcoes) erro(`campo escolha sem opções: ${c.decisao}.${c.codigo}`);
  if (c.tipo !== "escolha" && c.opcoes) aviso(`campo não-escolha com opções: ${c.decisao}.${c.codigo}`);
  if (c.codigo in especiais) especiais[c.codigo]++;
  if (c.tipo === "moeda") moedaPorDecisao[c.decisao] = (moedaPorDecisao[c.decisao] ?? 0) + 1;
  const pergunta = (c.pergunta_cliente ?? "").trim();
  if (pergunta) {
    if (!["noivos", "ambos"].includes(d.responsavel)) erro(`pergunta à cliente em decisão da cerimonialista: ${c.decisao}.${c.codigo}`);
    if (["moeda", "fornecedor", "anexo"].includes(c.tipo) || c.codigo in especiais || /^valor|^orcamento/.test(c.codigo))
      erro(`pergunta à cliente em campo que o portal bloqueia: ${c.decisao}.${c.codigo}`);
  }
  if (CURADOS.includes(c.codigo) && ["noivos", "ambos"].includes(d.responsavel) && !pergunta)
    erro(`código curado da 146 sem pergunta própria (vira texto de casamento): ${c.decisao}.${c.codigo}`);
}
for (const [k, n] of Object.entries(especiais)) if (n !== 1) erro(`campo especial ${k} aparece ${n} vezes`);
for (const [d, n] of Object.entries(moedaPorDecisao)) if (n > 1) erro(`decisão ${d} com ${n} campos moeda`);
for (const d of m.decisoes) {
  if (d.codigo.includes("contratar")) {
    const cs = camposPorDecisao[d.codigo] ?? new Set();
    if (!cs.has("fornecedor")) aviso(`contratação sem campo fornecedor: ${d.codigo}`);
    if (!cs.has("valor_contratado")) aviso(`contratação sem valor_contratado: ${d.codigo}`);
  }
}

// ---------- arquétipos ----------
const arq = { escala: m.arquetipos.filter((a) => a.eixo === "escala").map((a) => a.codigo), cenario: m.arquetipos.filter((a) => a.eixo === "cenario").map((a) => a.codigo) };
for (const eixo of ["escala", "cenario"]) {
  const campo = m.campos.find((c) => c.codigo === eixo);
  const ops = (campo?.opcoes ?? "").split("|").filter(Boolean);
  if (JSON.stringify([...ops].sort()) !== JSON.stringify([...arq[eixo]].sort())) erro(`opções do campo ${eixo} (${ops}) != arquétipos (${arq[eixo]})`);
}
const CHECK_141 = { escala: ["tradicional", "mini_wedding", "elopement", "compacta", "ate_100", "100_a_400", "acima_400"],
  cenario: ["igreja", "salao_urbano", "praia", "campo_chacara", "destination", "salao", "clube", "chacara_sitio", "casa_de_festas",
    "confraternizacao", "convencao_kickoff", "lancamento", "congresso_seminario", "premiacao", "treinamento", "inauguracao"] };
const tokensNovos = { escala: arq.escala.filter((t) => !CHECK_141.escala.includes(t)), cenario: arq.cenario.filter((t) => !CHECK_141.cenario.includes(t)) };

// ---------- deltas ----------
for (const x of m.deltas) {
  if (!OPERACOES.includes(x.operacao)) erro(`delta com operação inválida: ${x.operacao}`);
  if (!arq[x.eixo]?.includes(x.arquetipo)) erro(`delta aponta arquétipo inexistente ${x.eixo}/${x.arquetipo}`);
  const deObj = DE_OBJETIVO.includes(x.operacao);
  if (deObj && x.alvo_tipo !== "objetivo") erro(`delta ${x.operacao} com alvo ${x.alvo_tipo} (ignorado em silêncio): ${x.alvo_codigo}`);
  if (!deObj && x.alvo_tipo !== "decisao") erro(`delta ${x.operacao} com alvo ${x.alvo_tipo} (ignorado em silêncio): ${x.alvo_codigo}`);
  if (x.alvo_tipo === "objetivo" && !objPor.has(x.alvo_codigo)) erro(`delta aponta objetivo inexistente ${x.alvo_codigo}`);
  if (x.alvo_tipo === "decisao" && !decPor.has(x.alvo_codigo)) erro(`delta aponta decisão inexistente ${x.alvo_codigo}`);
  if (["ativar_objetivo", "desativar_objetivo"].includes(x.operacao) && x.valor !== null) aviso(`delta ${x.operacao} com valor não nulo`);
  if (!["ativar_objetivo", "desativar_objetivo"].includes(x.operacao) && (x.valor === null || !Number.isInteger(x.valor))) erro(`delta ${x.operacao} ${x.alvo_codigo} com valor não inteiro: ${x.valor}`);
}
const chaveDelta = new Set();
for (const x of m.deltas) {
  const k = `${x.eixo}/${x.arquetipo}/${x.alvo_tipo}/${x.alvo_codigo}/${x.operacao}`;
  if (chaveDelta.has(k)) erro(`delta repetido (a guarda do seed pula o segundo): ${k}`);
  chaveDelta.add(k);
}

// ---------- simulação por combinação (evento novo) ----------
function simular(escala, cenario) {
  const obj = new Map(m.objetivos.map((o) => [o.codigo, { ...o, ativo: o.ativo_padrao }]));
  const dec = new Map(m.decisoes.map((d) => [d.codigo, { ...d }]));
  const aplicar = (eixo, codigo) => {
    if (!codigo) return;
    for (const x of m.deltas.filter((x) => x.eixo === eixo && x.arquetipo === codigo)) {
      if (x.alvo_tipo === "objetivo") {
        const o = obj.get(x.alvo_codigo); if (!o) continue;
        if (x.operacao === "ativar_objetivo") o.ativo = true;
        if (x.operacao === "desativar_objetivo") o.ativo = false;
        if (x.operacao === "set_faixa_pct_min") o.faixa_min = x.valor;
        if (x.operacao === "set_faixa_pct_ideal") o.faixa_ideal = x.valor;
        if (x.operacao === "set_faixa_pct_max") o.faixa_max = x.valor;
      } else {
        const d = dec.get(x.alvo_codigo); if (!d) continue;
        if (x.operacao === "set_offset_ideal") d.offset_ideal = x.valor;
        if (x.operacao === "set_offset_min") d.offset_min = x.valor;
        if (x.operacao === "set_offset_max") d.offset_max = x.valor;
        if (x.operacao === "set_prioridade") d.prioridade = x.valor;
      }
    }
  };
  aplicar("escala", escala);
  aplicar("cenario", cenario);
  const rot = `${escala ?? "(sem porte)"} + ${cenario ?? "(sem faixa)"}`;
  for (const o of obj.values()) {
    if (o.faixa_ideal !== null && !(o.faixa_min <= o.faixa_ideal && o.faixa_ideal <= o.faixa_max)) erro(`${rot}: objetivo ${o.codigo} com min<=ideal<=max quebrado (${o.faixa_min}/${o.faixa_ideal}/${o.faixa_max})`);
  }
  const ativos = [...obj.values()].filter((o) => o.ativo);
  const soma = ativos.reduce((s, o) => s + (o.faixa_ideal ?? 0), 0);
  const decs = [...dec.values()].filter((d) => obj.get(d.objetivo)?.ativo);
  for (const d of decs) {
    if (!(d.offset_min <= d.offset_ideal && d.offset_ideal <= d.offset_max)) erro(`${rot}: decisão ${d.codigo} offsets fora de ordem (${d.offset_min}/${d.offset_ideal}/${d.offset_max})`);
    if (d.offset_ideal < 2) erro(`${rot}: decisão ${d.codigo} offset_ideal < 2`);
  }
  // prioridade monótona com o offset
  const ord = [...decs].sort((a, b) => b.offset_ideal - a.offset_ideal || b.prioridade - a.prioridade);
  for (let i = 1; i < ord.length; i++) {
    if (ord[i].offset_ideal < ord[i - 1].offset_ideal && ord[i].prioridade > ord[i - 1].prioridade)
      erro(`${rot}: prioridade não acompanha offset — ${ord[i - 1].codigo} (${ord[i - 1].offset_ideal}d p${ord[i - 1].prioridade}) antes de ${ord[i].codigo} (${ord[i].offset_ideal}d p${ord[i].prioridade})`);
  }
  const maxOff = Math.max(...decs.map((d) => d.offset_ideal));
  return { rot, ativos: ativos.map((o) => o.codigo), soma, decisoes: decs.length, maxOffset: maxOff,
    comVerba: ativos.filter((o) => o.faixa_ideal !== null).map((o) => `${o.codigo}:${o.faixa_ideal}`).join(" ") };
}
const combos = [];
for (const e of [null, ...arq.escala]) for (const c of [null, ...arq.cenario]) combos.push(simular(e, c));
for (const x of combos) if (x.rot.includes("(sem faixa)") === false && x.soma !== 100) erro(`${x.rot}: faixas ideais dos ativos somam ${x.soma}`);

// ---------- tarefas ----------
for (const t of m.tarefas) {
  const d = decPor.get(t.decisao);
  if (!d) { erro(`tarefa "${t.titulo}" aponta decisão inexistente ${t.decisao}`); continue; }
  if (t.offset >= 0 && d.offset_ideal - t.offset > 14) aviso(`tarefa "${t.titulo}" (${t.offset}d) muito longe da decisão ${d.codigo} (${d.offset_ideal}d): comprimida, cai perto da festa`);
  if (/quantidade/i.test(t.titulo) && t.vinculo === "financeiro") aviso(`tarefa financeira com "quantidade" no título vira pendência de revisão: ${t.titulo}`);
  if (d.codigo.includes("contratar") && /contrato/i.test(t.titulo)) aviso(`tarefa de contrato repetida manualmente em ${d.codigo}: ${t.titulo}`);
}
const repetidas = new Set();
for (const t of m.tarefas) { const k = `${t.decisao}/${t.titulo}`; if (repetidas.has(k)) erro(`tarefa repetida: ${k}`); repetidas.add(k); }

// ---------- roteiro, checklist, recursos ----------
const tokens = new Set(arq.cenario);
const rotCod = new Set();
for (const r of m.roteiro) {
  if (rotCod.has(r.codigo)) erro(`roteiro repetido: ${r.codigo}`); rotCod.add(r.codigo);
  if (r.condicao && !tokens.has(r.condicao)) erro(`roteiro ${r.codigo}: condição ${r.condicao} não é faixa`);
}
const ancoras = m.roteiro.filter((r) => r.offset_min === 0 && !r.condicao);
if (ancoras.length !== 1) erro(`roteiro: ${ancoras.length} âncoras sem condição com offset 0`);
const chkCod = new Set();
for (const c of m.checklist) {
  if (chkCod.has(c.codigo)) erro(`checklist repetido: ${c.codigo}`); chkCod.add(c.codigo);
  if (c.requer_objetivo && !objPor.has(c.requer_objetivo)) erro(`checklist ${c.codigo} requer objetivo inexistente ${c.requer_objetivo}`);
}
const recCod = new Set();
for (const r of m.recursos) {
  if (recCod.has(r.codigo)) erro(`recurso repetido no tipo: ${r.codigo}`); recCod.add(r.codigo);
  const o = objPor.get(r.objetivo);
  if (!o) erro(`recurso ${r.codigo} em objetivo inexistente ${r.objetivo}`);
  else if (!o.ativo_padrao) aviso(`recurso ${r.codigo} em objetivo que nasce desligado (${r.objetivo}): não chega sozinho`);
  if (r.indice < 0) erro(`recurso ${r.codigo} com índice negativo`);
}

// ---------- texto ----------
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const textos = [
  ...m.objetivos.flatMap((o) => [o.nome, o.descricao]), ...m.decisoes.map((d) => d.titulo),
  ...m.campos.flatMap((c) => [c.label, c.pergunta_cliente]), ...m.tarefas.map((t) => t.titulo),
  ...m.roteiro.map((r) => r.titulo), ...m.checklist.map((c) => c.titulo), ...m.recursos.map((r) => r.nome), ...m.arquetipos.map((a) => a.nome),
];
for (const t of textos) {
  if (!t) continue;
  if (EMOJI.test(t)) erro(`emoji no texto: ${t}`);
  if (/noiv|casamento|madrinha|padrinho/i.test(t)) erro(`texto de casamento: ${t}`);
  if (/desbloque|parabéns!|missão|nível|100%/i.test(t)) aviso(`linguagem suspeita: ${t}`);
}

console.log(JSON.stringify({
  contagens: { objetivos: m.objetivos.length, ligadosNaBase: m.objetivos.filter((o) => o.ativo_padrao).length, decisoes: m.decisoes.length,
    campos: m.campos.length, perguntasCliente: m.campos.filter((c) => (c.pergunta_cliente ?? "").trim()).length, tarefas: m.tarefas.length,
    arquetipos: m.arquetipos.length, deltas: m.deltas.length, roteiro: m.roteiro.length, checklist: m.checklist.length, recursos: m.recursos.length },
  tokensNovosNoCheck: tokensNovos,
  combinacoes: combos.map((x) => `${x.rot}: ${x.ativos.length} objetivos, ${x.decisoes} decisões, maior prazo ${x.maxOffset}d, verba ${x.soma} [${x.comVerba}]`),
  erros, avisos,
}, null, 1));
