"use client";

// A lista de presentes do casal (197), no portal dos noivos: montar a
// lista a partir do catálogo pronto (preços padrão, editáveis), escolher
// quem paga a taxa, pôr no ar e ver o que chegou. O convidado vê em
// /c/<endereço>/presentes e paga por Pix, direto na conta que recebe.
//
// A tela guarda a lista inteira e manda tudo de uma vez (portal_salvar_lista):
// o banco confere quem pode (só o casal), os campos e os tamanhos. Os
// outros da família veem a lista sem editar; os recebidos, só o casal.
//
// A foto própria (201, pedido dele em 05/10/2026): tocar no quadrado do
// presente (ou no do "Outro presente") escolhe a foto, que sobe comprimida
// direto para o balde 'site' por uma URL assinada e vale mais que a do
// catálogo. O caminho vai com a lista quando ela é salva.

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CATALOGO,
  CATEGORIAS,
  SUGESTAO_INICIAL,
  fotoDoCatalogo,
  presenteDoCatalogo,
} from "@/lib/catalogo-de-presentes";
import { VALOR_MINIMO, TAXA_DA_LISTA, contaRecebe, valoresDoPresente } from "@/lib/lista-presentes";
import { formatarReais } from "@/lib/site-conteudo";
import {
  pedirEnvioDeFotoDoPresente,
  salvarLista,
  type PresenteParaSalvar,
} from "@/app/(portal)/portal/[eventoId]/presentes/actions";
import { comprimirFoto, validarArquivo } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/client";
import { Eyebrow, Icone } from "../../../primitivas";
import { usePortalNoivos } from "../../../contexto";
import { ContaQueRecebe } from "./ContaQueRecebe";
import type { DadosDaTelaLista } from "./dados";
import "./lista.css";

type Linha = {
  id: string;
  codigo: string | null;
  categoria: string;
  titulo: string;
  /** o valor como ela digita ("600", "1.250,50") */
  valor: string;
  quantidade: number;
  comprados: number;
  /** a foto do casal: o caminho no balde 'site' */
  foto: string | null;
};

const VALOR_MAXIMO = 50_000;
/** o teto do balde 'site' (191) */
const TETO_DA_FOTO = 3 * 1024 * 1024;
const ORDEM_DAS_CATEGORIAS = new Map(CATEGORIAS.map((c, i) => [c.id, i]));
const nomeDaCategoria = (id: string) => CATEGORIAS.find((c) => c.id === id)?.nome ?? "Outros";

function novoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** "600" → 60000; "1.250,50" → 125050; "99.9" → 9990. Fora disso, null. */
function reaisParaCentavos(texto: string): number | null {
  let t = texto.replace(/[R$\s]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(t) || (t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

// os acentos soltos depois do NFD (U+0300 a U+036F), montados por código
// para o arquivo não depender de como o editor grava o caractere
const ACENTOS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

/** Para buscar "xicara" e achar "Xícaras". */
function semAcento(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(ACENTOS, "");
}

function centavosParaTexto(c: number): string {
  return c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace(".", ",");
}

/** Na ordem das categorias do catálogo; dentro de cada uma, na ordem em que entraram. */
function ordenar(linhas: Linha[]): Linha[] {
  const pos = (c: string) => ORDEM_DAS_CATEGORIAS.get(c) ?? 999;
  return linhas
    .map((l, i) => ({ l, i }))
    .sort((a, b) => pos(a.l.categoria) - pos(b.l.categoria) || a.i - b.i)
    .map((x) => x.l);
}

function doCatalogo(codigo: string): Linha | null {
  const p = presenteDoCatalogo(codigo);
  if (!p) return null;
  return { id: novoId(), codigo: p.codigo, categoria: p.categoria, titulo: p.titulo, valor: String(p.valor), quantidade: 1, comprados: 0, foto: null };
}

const fotografia = (l: { taxa: boolean; mensagem: string; linhas: Linha[] }) =>
  JSON.stringify({ t: l.taxa, m: l.mensagem.trim(), i: l.linhas.map((x) => [x.id, x.titulo.trim(), x.valor.trim(), x.quantidade, x.foto]) });

export function TelaLista({ dados }: { dados: DadosDaTelaLista }) {
  const { base, avisar } = usePortalNoivos();
  const router = useRouter();
  const [salvando, comecar] = useTransition();

  const iniciais = useMemo<Linha[]>(
    () =>
      dados.itens.map((i) => ({
        id: i.id,
        codigo: i.codigo,
        categoria: i.categoria,
        titulo: i.titulo,
        valor: centavosParaTexto(i.valorCentavos),
        quantidade: i.quantidade,
        comprados: i.comprados,
        foto: i.foto,
      })),
    [dados.itens]
  );
  const [linhas, setLinhas] = useState<Linha[]>(iniciais);
  const [taxa, setTaxa] = useState(dados.lista.taxaDoCasal);
  const [mensagem, setMensagem] = useState(dados.lista.mensagem);
  const [publicada, setPublicada] = useState(dados.lista.publicada);
  const [guardado, setGuardado] = useState(() =>
    fotografia({ taxa: dados.lista.taxaDoCasal, mensagem: dados.lista.mensagem, linhas: iniciais })
  );
  const [invalidas, setInvalidas] = useState<Set<string>>(new Set());
  const [salvaAlgumaVez, setSalvaAlgumaVez] = useState(dados.lista.salvaAlgumaVez);

  const alterado = fotografia({ taxa, mensagem, linhas }) !== guardado;
  const podeEditar = dados.podeEditar && !dados.semMigracao;
  // a conta cadastrada basta para a lista ir ao ar (200)
  const contaPronta = contaRecebe(dados.recebedor);
  // quem cadastra ainda tem o que fazer (mandar os dados do banco ou a
  // prova de vida): no celular a conta sobe para o topo (pedido dele,
  // 05/10/2026); aprovada, ou para quem só olha, vai para o fim
  const contaPedeAcao = dados.souResponsavel && dados.recebedor?.status !== "active";

  // ------------------------------------------------------------ catálogo
  const [catalogoAberto, setCatalogoAberto] = useState(false);
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0].id);
  const [busca, setBusca] = useState("");
  const codigosNaLista = useMemo(() => new Set(linhas.map((l) => l.codigo).filter(Boolean) as string[]), [linhas]);
  const doCatalogoVisiveis = useMemo(() => {
    const q = semAcento(busca.trim());
    if (q.length >= 2) return CATALOGO.filter((p) => semAcento(p.titulo).includes(q));
    return CATALOGO.filter((p) => p.categoria === categoria);
  }, [busca, categoria]);

  // o "outro presente" nasce na categoria que ela está olhando
  const [outro, setOutro] = useState<{ titulo: string; valor: string; categoria: string; foto: string | null }>({
    titulo: "",
    valor: "",
    categoria: CATEGORIAS[0].id,
    foto: null,
  });
  function escolherCategoria(id: string) {
    setCategoria(id);
    setOutro((o) => ({ ...o, categoria: id }));
  }

  function adicionar(codigo: string) {
    if (codigosNaLista.has(codigo)) return;
    const l = doCatalogo(codigo);
    if (l) setLinhas((x) => [...x, l]);
  }

  function comecarComSugestao() {
    const novas = SUGESTAO_INICIAL.filter((c) => !codigosNaLista.has(c))
      .map(doCatalogo)
      .filter((l): l is Linha => !!l);
    setLinhas((x) => ordenar([...x, ...novas]));
  }

  function adicionarOutro() {
    const titulo = outro.titulo.trim().replace(/\s+/g, " ");
    const c = reaisParaCentavos(outro.valor);
    if (titulo.length < 2) return avisar("Dê um nome ao presente", true);
    if (c === null || c < VALOR_MINIMO * 100 || c > VALOR_MAXIMO * 100)
      return avisar(`O valor vai de ${formatarReais(VALOR_MINIMO * 100)} a ${formatarReais(VALOR_MAXIMO * 100)}`, true);
    setLinhas((x) => [
      ...x,
      { id: novoId(), codigo: null, categoria: outro.categoria, titulo, valor: centavosParaTexto(c), quantidade: 1, comprados: 0, foto: outro.foto },
    ]);
    setOutro((o) => ({ ...o, titulo: "", valor: "", foto: null }));
  }

  const mudar = (id: string, campo: Partial<Linha>) => {
    setLinhas((x) => x.map((l) => (l.id === id ? { ...l, ...campo } : l)));
    if (invalidas.has(id)) setInvalidas((s) => new Set([...s].filter((v) => v !== id)));
  };
  const tirar = (id: string) => setLinhas((x) => x.filter((l) => l.id !== id));

  // ------------------------------------------------------------ a foto
  // as recém-enviadas aparecem pela URL local até a assinada chegar
  const [locais, setLocais] = useState<Record<string, string>>({});
  const [enviandoFoto, setEnviandoFoto] = useState<string | null>(null);
  const entradaDeFoto = useRef<HTMLInputElement>(null);
  // a linha (id) ou o "outro" que vai receber a foto escolhida
  const alvoDaFoto = useRef<string | null>(null);

  const urlDaFoto = (l: { foto: string | null; codigo: string | null }) =>
    (l.foto && (locais[l.foto] ?? dados.fotos[l.foto])) || fotoDoCatalogo(l.codigo);

  function escolherFoto(alvo: string) {
    if (enviandoFoto) return;
    alvoDaFoto.current = alvo;
    entradaDeFoto.current?.click();
  }

  async function enviarFoto(arquivo: File) {
    const alvo = alvoDaFoto.current;
    if (!alvo) return;
    const invalido = validarArquivo(arquivo);
    if (invalido) return avisar(`Essa foto não serve: ${invalido}`, true);
    setEnviandoFoto(alvo);
    try {
      const blob = await comprimirFoto(arquivo, { ladoMaximo: 1200, sempreJpeg: true });
      if (blob.type !== "image/jpeg" && blob.type !== "image/webp") return avisar("Use uma foto em JPG ou PNG", true);
      if (blob.size > TETO_DA_FOTO) return avisar("A foto passou de 3 MB. Tente outra", true);
      const pedido = await pedirEnvioDeFotoDoPresente(dados.eventoId);
      if ("error" in pedido) return avisar(pedido.error, true);
      const envio = await createClient()
        .storage.from("site")
        .uploadToSignedUrl(pedido.caminho, pedido.token, blob, { contentType: blob.type });
      if (envio.error) return avisar("Não deu para enviar a foto. Tente de novo", true);
      setLocais((m) => ({ ...m, [pedido.caminho]: URL.createObjectURL(blob) }));
      if (alvo === "outro") setOutro((o) => ({ ...o, foto: pedido.caminho }));
      else mudar(alvo, { foto: pedido.caminho });
    } catch {
      avisar("Não deu para enviar agora", true);
    } finally {
      setEnviandoFoto(null);
    }
  }

  // ------------------------------------------------------------ salvar
  function salvar(publicar: boolean) {
    const erradas = new Set<string>();
    const envio: PresenteParaSalvar[] = [];
    let primeiroProblema: string | null = null;
    for (const l of ordenar(linhas)) {
      const titulo = l.titulo.trim().replace(/\s+/g, " ");
      const c = reaisParaCentavos(l.valor);
      if (titulo.length < 2) {
        erradas.add(l.id);
        primeiroProblema ??= "Todo presente precisa de um nome";
      } else if (c === null || c < VALOR_MINIMO * 100 || c > VALOR_MAXIMO * 100) {
        erradas.add(l.id);
        primeiroProblema ??= `"${titulo}": o valor vai de ${formatarReais(VALOR_MINIMO * 100)} a ${formatarReais(VALOR_MAXIMO * 100)}`;
      }
      envio.push({
        id: l.id,
        codigo: l.codigo,
        categoria: l.categoria,
        titulo,
        valor_centavos: c ?? 0,
        quantidade: Math.max(1, Math.min(50, l.quantidade)),
        ...(l.foto ? { foto: l.foto } : {}),
      });
    }
    setInvalidas(erradas);
    if (primeiroProblema) {
      avisar(primeiroProblema, true);
      return;
    }
    if (publicar && envio.length === 0) {
      avisar("Adicione presentes antes de pôr a lista no ar", true);
      return;
    }
    comecar(async () => {
      const r = await salvarLista(dados.eventoId, { taxa_do_casal: taxa, mensagem: mensagem.trim() || null, publicada: publicar }, envio);
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      const ordenadas = ordenar(linhas);
      setLinhas(ordenadas);
      setGuardado(fotografia({ taxa, mensagem, linhas: ordenadas }));
      if (publicar !== publicada) avisar(publicar ? "A lista está no ar" : "A lista saiu do ar");
      else avisar("Lista salva");
      setPublicada(publicar);
      setSalvaAlgumaVez(true);
      router.refresh();
    });
  }

  async function copiar(texto: string, feito: string) {
    try {
      await navigator.clipboard.writeText(texto);
      avisar(feito);
    } catch {
      avisar("Não foi possível copiar agora", true);
    }
  }

  // ------------------------------------------------------------ desenho
  const grupos = useMemo(() => {
    const m = new Map<string, Linha[]>();
    for (const l of ordenar(linhas)) {
      const g = m.get(l.categoria) ?? [];
      g.push(l);
      m.set(l.categoria, g);
    }
    return [...m.entries()];
  }, [linhas]);

  const exemplo = valoresDoPresente(30_000, taxa);
  const taxaEmTexto = `${(TAXA_DA_LISTA * 100).toFixed(2).replace(".", ",")}%`;
  const totalRecebido = (dados.recebidos ?? []).reduce((s, r) => s + r.familiaCentavos, 0);
  const zap = dados.link ? `https://wa.me/?text=${encodeURIComponent(`Nossa lista de presentes: ${dados.link}`)}` : null;

  const motivoParaNaoPublicar = !contaPronta
    ? "A lista vai ao ar depois que vocês cadastrarem a conta que recebe."
    : linhas.length === 0
      ? "Adicione presentes para pôr a lista no ar."
      : null;

  const conta = (
    <ContaQueRecebe
      eventoId={dados.eventoId}
      recebedor={dados.recebedor}
      souResponsavel={dados.souResponsavel}
      meuNome={dados.meuNome}
      meuEmail={dados.meuEmail}
      cerimonialista={dados.cerimonialista}
      jaRecebeu={(dados.recebidos?.length ?? 0) > 0}
    />
  );

  return (
    <section className="pn-lista" aria-label="Lista de presentes">
      <header className="pn-lista-cabeca">
        <Eyebrow>Presentes</Eyebrow>
        <h1 className="pn-t pn-lista-titulo">Lista de presentes</h1>
        <p className="pn-lista-sub">
          {publicada
            ? `No ar · ${linhas.length} ${linhas.length === 1 ? "presente" : "presentes"}`
            : linhas.length
              ? `Fora do ar · ${linhas.length} ${linhas.length === 1 ? "presente" : "presentes"}`
              : "Fora do ar"}
        </p>
      </header>

      {dados.semMigracao && (
        <p className="pn-lista-aviso" role="alert">
          A lista ainda não pode ser salva neste sistema. Fale com a cerimonialista.
        </p>
      )}

      <div className="pn-lista-grade">
        {/* ---------------------------------------------------------- a lista */}
        <div className="pn-lista-principal">
          <div className="pn-lista-bloco">
            <div className="pn-lista-bloco-topo">
              <h2 className="pn-lista-rotulo">Os presentes</h2>
              {podeEditar && linhas.length > 0 && (
                <button
                  type="button"
                  className="pn-lista-botao claro pequeno"
                  aria-expanded={catalogoAberto}
                  onClick={() => setCatalogoAberto((v) => !v)}
                >
                  <Icone nome={catalogoAberto ? "close" : "add"} /> {catalogoAberto ? "Fechar o catálogo" : "Adicionar"}
                </button>
              )}
            </div>

            {linhas.length === 0 && (
              <div className="pn-lista-vazia">
                <p>A lista está vazia.</p>
                {podeEditar && (
                  <div className="pn-lista-acoes">
                    <button type="button" className="pn-lista-botao" onClick={comecarComSugestao}>
                      Começar com {SUGESTAO_INICIAL.length} sugestões
                    </button>
                    <button type="button" className="pn-lista-botao claro" onClick={() => setCatalogoAberto(true)}>
                      Escolher do catálogo
                    </button>
                  </div>
                )}
              </div>
            )}

            {podeEditar && catalogoAberto && (
              <div className="pn-lista-catalogo">
                <input
                  className="pn-lista-busca"
                  type="search"
                  value={busca}
                  placeholder="Buscar no catálogo"
                  aria-label="Buscar no catálogo"
                  onChange={(e) => setBusca(e.target.value)}
                />
                {busca.trim().length < 2 && (
                  <div className="pn-lista-chips" role="radiogroup" aria-label="Categorias do catálogo">
                    {CATEGORIAS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={categoria === c.id}
                        className={categoria === c.id ? "on" : ""}
                        onClick={() => escolherCategoria(c.id)}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}
                <ul className="pn-lista-opcoes">
                  {doCatalogoVisiveis.map((p) => {
                    const na = codigosNaLista.has(p.codigo);
                    return (
                      <li key={p.codigo}>
                        <button
                          type="button"
                          className={`pn-lista-opcao${na ? " on" : ""}`}
                          aria-pressed={na}
                          onClick={() => adicionar(p.codigo)}
                        >
                          <span className="pn-lista-opcao-nome">{p.titulo}</span>
                          <span className="pn-lista-opcao-valor">{formatarReais(p.valor * 100)}</span>
                          <Icone nome={na ? "check" : "add"} />
                        </button>
                      </li>
                    );
                  })}
                  {doCatalogoVisiveis.length === 0 && <li className="pn-lista-nota">Nada com esse nome no catálogo.</li>}
                </ul>

                <div className="pn-lista-outro">
                  <span className="pn-lista-rotulo">Outro presente</span>
                  <div className="pn-lista-outro-campos">
                    <button
                      type="button"
                      className={`pn-lista-miniatura editavel${enviandoFoto === "outro" ? " enviando" : ""}`}
                      aria-label={outro.foto ? "Trocar a foto do presente" : "Pôr uma foto no presente"}
                      disabled={!!enviandoFoto}
                      onClick={() => escolherFoto("outro")}
                    >
                      {outro.foto && locais[outro.foto] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={locais[outro.foto]} alt="" />
                      ) : (
                        <Icone nome="add_photo_alternate" />
                      )}
                    </button>
                    <input
                      className="pn-lista-entrada"
                      value={outro.titulo}
                      maxLength={80}
                      placeholder="Nome do presente"
                      aria-label="Nome do presente"
                      onChange={(e) => setOutro((o) => ({ ...o, titulo: e.target.value }))}
                    />
                    <label className="pn-lista-reais">
                      R$
                      <input
                        className="pn-lista-entrada"
                        value={outro.valor}
                        inputMode="decimal"
                        placeholder="0"
                        aria-label="Valor do presente"
                        onChange={(e) => setOutro((o) => ({ ...o, valor: e.target.value }))}
                      />
                    </label>
                    <select
                      className="pn-lista-entrada"
                      value={outro.categoria}
                      aria-label="Categoria do presente"
                      onChange={(e) => setOutro((o) => ({ ...o, categoria: e.target.value }))}
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="pn-lista-botao pequeno" onClick={adicionarOutro}>
                      <Icone nome="add" /> Pôr na lista
                    </button>
                  </div>
                </div>
              </div>
            )}

            {grupos.map(([cat, itens]) => (
              <div key={cat} className="pn-lista-grupo">
                <h3 className="pn-lista-grupo-nome">
                  {nomeDaCategoria(cat)} <span>{itens.length}</span>
                </h3>
                <ul className="pn-lista-itens">
                  {itens.map((l) => {
                    const foto = urlDaFoto(l);
                    const errada = invalidas.has(l.id);
                    const miniatura = foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={foto} alt="" loading="lazy" />
                    ) : (
                      l.titulo.trim().charAt(0).toUpperCase()
                    );
                    return (
                      <li key={l.id} className="pn-lista-item">
                        {podeEditar ? (
                          <button
                            type="button"
                            className={`pn-lista-miniatura editavel${enviandoFoto === l.id ? " enviando" : ""}`}
                            aria-label={foto ? `Trocar a foto de ${l.titulo}` : `Pôr uma foto em ${l.titulo}`}
                            disabled={!!enviandoFoto}
                            onClick={() => escolherFoto(l.id)}
                          >
                            {miniatura}
                            <span className="pn-lista-miniatura-selo" aria-hidden="true">
                              <Icone nome="add_photo_alternate" />
                            </span>
                          </button>
                        ) : (
                          <span className="pn-lista-miniatura" aria-hidden="true">
                            {miniatura}
                          </span>
                        )}
                        {podeEditar ? (
                          <>
                            <div className="pn-lista-item-nome">
                              <input
                                className="pn-lista-entrada"
                                value={l.titulo}
                                maxLength={80}
                                aria-label="Nome do presente"
                                aria-invalid={errada && l.titulo.trim().length < 2}
                                onChange={(e) => mudar(l.id, { titulo: e.target.value })}
                              />
                              {l.comprados > 0 && (
                                <span className="pn-lista-comprados">
                                  {l.comprados === 1 ? "1 presenteado" : `${l.comprados} presenteados`}
                                </span>
                              )}
                            </div>
                            <label className="pn-lista-reais">
                              R$
                              <input
                                className="pn-lista-entrada"
                                value={l.valor}
                                inputMode="decimal"
                                aria-label={`Valor de ${l.titulo}`}
                                aria-invalid={errada}
                                onChange={(e) => mudar(l.id, { valor: e.target.value })}
                              />
                            </label>
                            <div className="pn-lista-qtd" role="group" aria-label={`Quantidade de ${l.titulo}`}>
                              <button
                                type="button"
                                aria-label="Menos um"
                                disabled={l.quantidade <= Math.max(1, l.comprados)}
                                onClick={() => mudar(l.id, { quantidade: l.quantidade - 1 })}
                              >
                                <Icone nome="remove" />
                              </button>
                              <span aria-live="polite">{l.quantidade}</span>
                              <button
                                type="button"
                                aria-label="Mais um"
                                disabled={l.quantidade >= 50}
                                onClick={() => mudar(l.id, { quantidade: l.quantidade + 1 })}
                              >
                                <Icone nome="add" />
                              </button>
                            </div>
                            <button
                              type="button"
                              className="pn-lista-tirar"
                              aria-label={`Tirar ${l.titulo} da lista`}
                              onClick={() => tirar(l.id)}
                            >
                              <Icone nome="close" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="pn-lista-item-nome">{l.titulo}</span>
                            <span className="pn-lista-item-valor">
                              {formatarReais(reaisParaCentavos(l.valor) ?? 0)}
                              {l.quantidade > 1 && ` · ${l.quantidade}`}
                            </span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {podeEditar && (
            <input
              ref={entradaDeFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              hidden
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = "";
                if (arquivo) void enviarFoto(arquivo);
              }}
            />
          )}

          {podeEditar && (
            <div className="pn-lista-salvar">
              <button type="button" className="pn-lista-botao" disabled={salvando || !alterado} onClick={() => salvar(publicada)}>
                {salvando ? "Salvando…" : "Salvar a lista"}
              </button>
              <span className="pn-lista-estado-salvo" aria-live="polite">
                {alterado ? "Alterações não salvas" : salvaAlgumaVez ? "Salva" : ""}
              </span>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------- ao lado */}
        <div className="pn-lista-lado">
          {dados.recebidos && dados.recebidos.length > 0 && (
            <div className="pn-lista-bloco">
              <h2 className="pn-lista-rotulo">Recebidos</h2>
              <p className="pn-lista-total">{formatarReais(totalRecebido)}</p>
              <p className="pn-lista-nota">
                {dados.recebidos.length === 1 ? "1 presente" : `${dados.recebidos.length} presentes`}
              </p>
              <ul className="pn-lista-recebidos">
                {dados.recebidos.map((r) => (
                  <li key={r.id}>
                    <div className="pn-lista-recebido-linha">
                      <span>
                        <strong>{r.quem}</strong> · {r.titulo}
                      </span>
                      <span className="pn-lista-recebido-valor">{formatarReais(r.familiaCentavos)}</span>
                    </div>
                    {r.recado && <p className="pn-lista-recado">“{r.recado}”</p>}
                    <span className="pn-lista-quando">
                      {r.quando}
                      {r.noCartao ? ` · ${r.noCartao}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contaPedeAcao && <div className="pn-lista-conta-lugar primeiro">{conta}</div>}

          <div className="pn-lista-bloco">
            <h2 className="pn-lista-rotulo">No site</h2>
            {publicada ? (
              <>
                <p className="pn-lista-estado ok">
                  <span aria-hidden="true" />
                  {dados.site.publicado ? "A lista está no ar." : "Pronta. Aparece quando o site for ao ar."}
                </p>
                {dados.site.publicado && dados.link && (
                  <>
                    <div className="pn-lista-link">{dados.link.replace(/^https?:\/\//, "")}</div>
                    <div className="pn-lista-acoes">
                      <button type="button" className="pn-lista-botao" onClick={() => void copiar(dados.link!, "Link copiado")}>
                        <Icone nome="content_copy" /> Copiar o link
                      </button>
                      {zap && (
                        <a className="pn-lista-botao claro" href={zap} target="_blank" rel="noopener noreferrer">
                          <Icone nome="send_to_mobile" /> WhatsApp
                        </a>
                      )}
                      <a className="pn-lista-botao claro" href={dados.link} target="_blank" rel="noopener noreferrer">
                        <Icone nome="open_in_new" /> Abrir
                      </a>
                    </div>
                  </>
                )}
                {!dados.site.publicado && (
                  <p className="pn-lista-nota">
                    <Link href={`${base}/site`}>Ir para o site</Link>
                  </p>
                )}
                {podeEditar && (
                  <div className="pn-lista-acoes">
                    <button type="button" className="pn-lista-botao claro pequeno" disabled={salvando} onClick={() => salvar(false)}>
                      Tirar do ar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="pn-lista-estado">
                  <span aria-hidden="true" />
                  Fora do ar.
                </p>
                {motivoParaNaoPublicar && <p className="pn-lista-nota">{motivoParaNaoPublicar}</p>}
                {podeEditar && (
                  <div className="pn-lista-acoes">
                    <button
                      type="button"
                      className="pn-lista-botao"
                      disabled={salvando || !!motivoParaNaoPublicar}
                      onClick={() => salvar(true)}
                    >
                      Pôr a lista no ar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pn-lista-bloco">
            <h2 className="pn-lista-rotulo">A taxa de {taxaEmTexto}</h2>
            {podeEditar ? (
              <div className="pn-lista-segmento" role="radiogroup" aria-label="Quem paga a taxa">
                <button type="button" role="radio" aria-checked={!taxa} className={!taxa ? "on" : ""} onClick={() => setTaxa(false)}>
                  Os convidados pagam
                </button>
                <button type="button" role="radio" aria-checked={taxa} className={taxa ? "on" : ""} onClick={() => setTaxa(true)}>
                  Nós pagamos
                </button>
              </div>
            ) : (
              <p className="pn-lista-nota">{taxa ? "O casal paga a taxa." : "Os convidados pagam a taxa."}</p>
            )}
            <p className="pn-lista-nota">
              Num presente de {formatarReais(30_000)}: o convidado paga {formatarReais(exemplo.total)} e vocês recebem{" "}
              {formatarReais(exemplo.familia)}.
            </p>
          </div>

          <div className="pn-lista-bloco">
            <h2 className="pn-lista-rotulo">Frase para os convidados</h2>
            {podeEditar ? (
              <textarea
                className="pn-lista-entrada"
                rows={3}
                maxLength={300}
                value={mensagem}
                placeholder="Opcional"
                aria-label="Frase para os convidados"
                onChange={(e) => setMensagem(e.target.value)}
              />
            ) : (
              <p className="pn-lista-nota">{mensagem || "Sem frase."}</p>
            )}
          </div>

          {!contaPedeAcao && conta}
        </div>
      </div>
    </section>
  );
}
