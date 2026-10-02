"use client";

// A lista de presentes do convidado (/c/<endereço>/presentes). Escolher,
// deixar o nome e o recado, pagar o Pix e ver o "presente enviado" — sem
// conta, sem sair da página.
//
// Tudo que vale dinheiro sai do servidor: a página só mostra o preço que a
// rota de pagamento vai cobrar (o mesmo cálculo, valoresDoPresente). O
// Pix gerado fica guardado nesta aba (sessionStorage) enquanto vale: quem
// fechou a janela sem querer, ou recarregou, encontra o código de novo.
// Quem confirma o pagamento é a rota /api/presentes/pagamento/<id>, que
// relê a Pagar.me — a página só pergunta.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, GRUPOS } from "@/lib/catalogo-de-presentes";
import { problemaNoConvidado, so, valoresDoPresente } from "@/lib/lista-presentes";
import { formatarReais } from "@/lib/site-conteudo";
import "./lista-publica.css";

export type ItemDaVitrine = {
  id: string;
  categoria: string;
  titulo: string;
  valorCentavos: number;
  quantidade: number;
  comprados: number;
  /** a foto do catálogo (/presentes/<código>.webp) ou nenhuma */
  foto: string | null;
};

type Props = {
  slug: string;
  /** "Ana & Bruno" */
  nomes: string;
  /** "Ana e Bruno" — quem recebe, nas frases */
  quemRecebe: string;
  /** duas pessoas ("vão receber") ou uma ("vai receber") */
  plural: boolean;
  dataLegivel: string | null;
  mensagem: string | null;
  taxaDoCasal: boolean;
  podePagar: boolean;
  itens: ItemDaVitrine[];
  /** as variáveis --lp-* (tema.ts) */
  estilo: Record<string, string>;
};

type Ordem = "lista" | "menor" | "maior";
type Passo = "dados" | "pix" | "pago" | "venceu" | "falhou";

type PixGerado = {
  id: string;
  itemId: string;
  titulo: string;
  copiaECola: string;
  qr: string;
  expiraEm: string;
  totalCentavos: number;
  /** o recado foi junto (muda o agradecimento) */
  comRecado: boolean;
};

type Convidado = { quem: string; email: string; cpf: string; celular: string; recado: string };

const VAZIO: Convidado = { quem: "", email: "", cpf: "", celular: "", recado: "" };
const PERGUNTAR_A_CADA_MS = 4000;
// depois do vencimento a rota ainda pode achar o pagamento (o Pix pago no
// último minuto): a página pergunta mais um pouco antes de desistir
const FOLGA_DEPOIS_DE_VENCER_MS = 10 * 60_000;

function mascaraCpf(v: string): string {
  const d = so(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

function mascaraCelular(v: string): string {
  const d = so(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = resto.length > 8 ? 5 : 4;
  return resto.length > corte ? `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}` : `(${ddd}) ${resto}`;
}

function minutosAte(iso: string, agora: number): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - agora) / 60_000));
}

export function ListaPublica(props: Props) {
  const { slug, nomes, quemRecebe, plural, dataLegivel, mensagem, taxaDoCasal, podePagar, itens, estilo } = props;
  const router = useRouter();
  // começo de frase ("Ana e Bruno", ou "Os anfitriões" no site sem nomes)
  const QuemRecebe = quemRecebe.charAt(0).toUpperCase() + quemRecebe.slice(1);
  const chaveDaAba = `lista-pix:${slug}`;

  // ------------------------------------------------------------ a vitrine
  // O filtro é curto (Todos · Casa · Viagem · Divertidos), como nas listas
  // da Wedy: as 14 categorias viram títulos dentro da lista, não 6 linhas
  // de botões antes do primeiro presente.
  const [filtro, setFiltro] = useState<string>("todos");
  const [ordem, setOrdem] = useState<Ordem>("lista");

  const grupoDe = useCallback((i: ItemDaVitrine) => CATEGORIAS.find((c) => c.id === i.categoria)?.grupo ?? "outros", []);
  const grupos = useMemo(() => {
    const usados = new Set(itens.map(grupoDe));
    const doCatalogo = GRUPOS.filter((g) => usados.has(g.id)).map((g) => ({ id: g.id as string, nome: g.nome }));
    return usados.has("outros") ? [...doCatalogo, { id: "outros", nome: "Outros" }] : doCatalogo;
  }, [itens, grupoDe]);

  const visiveis = useMemo(() => {
    const filtrados = itens.filter((i) => filtro === "todos" || grupoDe(i) === filtro);
    if (ordem === "lista") return filtrados;
    const preco = (i: ItemDaVitrine) => i.valorCentavos;
    return [...filtrados].sort((a, b) => (ordem === "menor" ? preco(a) - preco(b) : preco(b) - preco(a)));
  }, [itens, filtro, ordem, grupoDe]);

  // na ordem dos noivos, um título por categoria; por valor, uma grade só
  const secoes = useMemo(() => {
    if (ordem !== "lista") return [{ id: "todos", nome: null as string | null, itens: visiveis }];
    const m = new Map<string, ItemDaVitrine[]>();
    for (const i of visiveis) m.set(i.categoria, [...(m.get(i.categoria) ?? []), i]);
    return [...m.entries()].map(([id, lista]) => ({
      id,
      nome: CATEGORIAS.find((c) => c.id === id)?.nome ?? "Outros",
      itens: lista,
    }));
  }, [visiveis, ordem]);

  // ------------------------------------------------------------ o presente
  const [aberto, setAberto] = useState<ItemDaVitrine | null>(null);
  const [passo, setPasso] = useState<Passo>("dados");
  const [convidado, setConvidado] = useState<Convidado>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pix, setPix] = useState<PixGerado | null>(null);
  const [estado, setEstado] = useState<"aguardando" | "pago" | "venceu" | "falhou">("aguardando");
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  // o Pix desta aba volta depois de recarregar (só enquanto pode valer)
  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(chaveDaAba);
      if (!bruto) return;
      const salvo = JSON.parse(bruto) as PixGerado;
      if (salvo?.id && new Date(salvo.expiraEm).getTime() + FOLGA_DEPOIS_DE_VENCER_MS > Date.now()) setPix(salvo);
      else sessionStorage.removeItem(chaveDaAba);
    } catch {
      /* aba sem armazenamento: o Pix só não volta depois de recarregar */
    }
  }, [chaveDaAba]);

  const guardar = useCallback(
    (p: PixGerado | null) => {
      try {
        if (p) sessionStorage.setItem(chaveDaAba, JSON.stringify(p));
        else sessionStorage.removeItem(chaveDaAba);
      } catch {
        /* sem armazenamento */
      }
    },
    [chaveDaAba]
  );

  // pergunta à rota enquanto o Pix pode cair
  useEffect(() => {
    if (!pix || estado !== "aguardando") return;
    let parado = false;
    const perguntar = async () => {
      const t = Date.now();
      setAgora(t);
      if (t > new Date(pix.expiraEm).getTime() + FOLGA_DEPOIS_DE_VENCER_MS) {
        setEstado("venceu");
        return;
      }
      try {
        const r = await fetch(`/api/presentes/pagamento/${pix.id}`, { cache: "no-store" });
        const j = (await r.json()) as { status?: string };
        if (parado) return;
        if (j.status === "pago") setEstado("pago");
        else if (j.status === "expirado") setEstado("venceu");
        else if (j.status === "falhou" || j.status === "estornado") setEstado("falhou");
      } catch {
        /* sem rede agora: pergunta de novo na próxima volta */
      }
    };
    const relogio = setInterval(() => void perguntar(), PERGUNTAR_A_CADA_MS);
    void perguntar();
    return () => {
      parado = true;
      clearInterval(relogio);
    };
  }, [pix, estado]);

  // o resultado: sai da aba e, pago, a vitrine se atualiza (o "presenteado")
  const tratado = useRef("");
  useEffect(() => {
    if (!pix || estado === "aguardando") return;
    const chave = `${pix.id}:${estado}`;
    if (tratado.current === chave) return;
    tratado.current = chave;
    guardar(null);
    if (estado === "pago") router.refresh();
  }, [estado, pix, guardar, router]);

  // e a janela aberta neste presente acompanha
  useEffect(() => {
    if (!pix || !aberto || aberto.id !== pix.itemId || estado === "aguardando") return;
    setPasso(estado === "pago" ? "pago" : estado === "venceu" ? "venceu" : "falhou");
  }, [estado, pix, aberto]);

  function abrir(item: ItemDaVitrine) {
    setErro(null);
    setCopiado(false);
    setAberto(item);
    if (pix && pix.itemId === item.id) {
      setPasso(estado === "aguardando" ? "pix" : estado === "pago" ? "pago" : estado === "venceu" ? "venceu" : "falhou");
    } else {
      setPasso("dados");
    }
  }

  function fechar() {
    setAberto(null);
    setErro(null);
    // depois do agradecimento, a lista volta limpa
    if (estado !== "aguardando") {
      setPix(null);
      setEstado("aguardando");
    }
  }

  async function gerarPix() {
    if (!aberto || enviando) return;
    const problema = problemaNoConvidado(convidado);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch(`/api/presentes/${encodeURIComponent(slug)}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presenteId: aberto.id, ...convidado }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        erro?: string;
        id?: string;
        copiaECola?: string;
        qr?: string;
        expiraEm?: string;
        totalCentavos?: number;
      };
      if (!r.ok || !j.ok || !j.id || !j.copiaECola || !j.qr || !j.expiraEm) {
        setErro(j.erro ?? "Não foi possível gerar o Pix agora. Tente de novo em instantes.");
        // alguém levou o presente nesse meio-tempo: a vitrine se atualiza
        if (r.status === 409 || r.status === 404) router.refresh();
        return;
      }
      const novo: PixGerado = {
        id: j.id,
        itemId: aberto.id,
        titulo: aberto.titulo,
        copiaECola: j.copiaECola,
        qr: j.qr,
        expiraEm: j.expiraEm,
        totalCentavos: j.totalCentavos ?? valoresDoPresente(aberto.valorCentavos, taxaDoCasal).total,
        comRecado: convidado.recado.trim() !== "",
      };
      setEstado("aguardando");
      setPix(novo);
      guardar(novo);
      setCopiado(false);
      setPasso("pix");
    } catch {
      setErro("Sem conexão agora. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarCodigo() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
    } catch {
      // sem permissão: o código fica selecionável na tela
      setCopiado(false);
    }
  }

  function outroPix() {
    setPix(null);
    setEstado("aguardando");
    guardar(null);
    setPasso("dados");
  }

  // a janela: Esc fecha e a página de trás não rola
  const janela = useRef<HTMLDivElement>(null);
  const fecharAgora = useRef(fechar);
  fecharAgora.current = fechar;
  const temJanela = aberto !== null;
  useEffect(() => {
    if (!temJanela) return;
    const antes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharAgora.current();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      document.documentElement.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [temJanela]);

  // o foco vai para o que se faz em cada passo: o primeiro campo, ou o botão
  const idAberto = aberto?.id ?? null;
  useEffect(() => {
    if (!idAberto) return;
    const j = janela.current;
    (j?.querySelector<HTMLElement>("input") ?? j?.querySelector<HTMLElement>(".lp-botao"))?.focus();
  }, [idAberto, passo]);

  // mexer num campo apaga o aviso do erro (ele dizia respeito ao que estava antes)
  const mudar = (k: keyof Convidado, v: string) => {
    setConvidado((c) => ({ ...c, [k]: v }));
    setErro(null);
  };
  const valores = aberto ? valoresDoPresente(aberto.valorCentavos, taxaDoCasal) : null;
  const pendente = pix && !aberto && estado === "aguardando" ? pix : null;
  const pagoComJanelaFechada = pix && !aberto && estado === "pago" ? pix : null;

  return (
    <div className="lp" style={estilo as CSSProperties}>
      <div className="lp-coluna">
        <header className="lp-cabeca">
          <a className="lp-voltar" href={`/c/${slug}`}>
            <span aria-hidden="true">←</span> Voltar ao site
          </a>
          <p className="lp-sobre">Lista de presentes</p>
          <h1 className="lp-nomes">{nomes}</h1>
          {dataLegivel && <p className="lp-data">{dataLegivel}</p>}
          {mensagem && <p className="lp-mensagem">{mensagem}</p>}
          <p className="lp-como">
            {podePagar
              ? `Escolha um presente e pague por Pix. O valor vai direto para ${quemRecebe}.`
              : "A lista ainda não está recebendo presentes."}
          </p>
        </header>

        {itens.length > 0 ? (
          <>
            <div className="lp-barra">
              {grupos.length > 1 && (
                <div className="lp-filtros" role="radiogroup" aria-label="Que tipo de presente">
                  {[{ id: "todos", nome: "Todos" }, ...grupos].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={filtro === c.id}
                      className={`lp-filtro${filtro === c.id ? " on" : ""}`}
                      onClick={() => setFiltro(c.id)}
                    >
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}
              <label className="lp-ordem">
                <span>Ordenar</span>
                <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
                  <option value="lista">Sugestão</option>
                  <option value="menor">Menor valor</option>
                  <option value="maior">Maior valor</option>
                </select>
              </label>
            </div>

            {secoes.map((secao) => (
              <section key={secao.id} className="lp-secao" aria-label={secao.nome ?? "Presentes"}>
                {secao.nome && <h2 className="lp-secao-nome">{secao.nome}</h2>}
                <ul className="lp-grade">
                  {secao.itens.map((item) => {
                    const esgotado = item.comprados >= item.quantidade;
                    const restam = item.quantidade - item.comprados;
                    const preco = valoresDoPresente(item.valorCentavos, taxaDoCasal).total;
                    return (
                      <li key={item.id} className={`lp-item${esgotado ? " esgotado" : ""}`}>
                        <div className="lp-foto">
                          {item.foto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.foto} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span className="lp-sem-foto" aria-hidden="true">
                              {item.titulo.trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                          {esgotado && <span className="lp-selo">Presenteado</span>}
                        </div>
                        <div className="lp-item-texto">
                          <h3 className="lp-item-titulo">{item.titulo}</h3>
                          <p className="lp-item-preco">{formatarReais(preco)}</p>
                          {!esgotado && item.quantidade > 1 && (
                            <p className="lp-item-restam">{restam === 1 ? "resta 1" : `restam ${restam}`}</p>
                          )}
                        </div>
                        {podePagar && !esgotado && (
                          <button type="button" className="lp-botao" onClick={() => abrir(item)}>
                            {pix?.itemId === item.id && estado === "aguardando" ? "Ver o Pix" : "Presentear"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {visiveis.length === 0 && <p className="lp-vazio">Nenhum presente aqui.</p>}
          </>
        ) : (
          <p className="lp-vazio">A lista ainda está sendo montada.</p>
        )}
      </div>

      {/* o Pix que ficou para trás (janela fechada, aba recarregada) */}
      {(pendente || pagoComJanelaFechada) && (
        <div className="lp-aviso" role="status">
          {pendente ? (
            <>
              <span>
                Pix de <strong>{pendente.titulo}</strong> aguardando o pagamento
              </span>
              <button
                type="button"
                className="lp-aviso-botao"
                onClick={() => {
                  const item = itens.find((i) => i.id === pendente.itemId);
                  if (item) abrir(item);
                }}
              >
                Ver o código
              </button>
            </>
          ) : (
            <>
              <span>
                Recebemos o presente: <strong>{pagoComJanelaFechada!.titulo}</strong>. Obrigado!
              </span>
              <button type="button" className="lp-aviso-botao" onClick={fechar}>
                Fechar
              </button>
            </>
          )}
        </div>
      )}

      {aberto && valores && (
        <div className="lp-fundo-janela" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
          <div className="lp-janela" role="dialog" aria-modal="true" aria-labelledby="lp-janela-titulo" ref={janela}>
            <button type="button" className="lp-fechar" aria-label="Fechar" onClick={fechar}>
              ×
            </button>

            <div className="lp-janela-cabeca">
              <p className="lp-sobre">{passo === "pago" ? "Presente enviado" : "Presente"}</p>
              <h2 id="lp-janela-titulo" className="lp-janela-titulo">
                {aberto.titulo}
              </h2>
              {passo !== "pago" && (
                <>
                  {/* no Pix, o valor que o servidor cobrou (o do QR), não a conta desta página */}
                  <p className="lp-janela-total">
                    {formatarReais(passo === "pix" && pix ? pix.totalCentavos : valores.total)}
                  </p>
                  {!taxaDoCasal && passo === "dados" && (
                    <p className="lp-janela-taxa">
                      Presente {formatarReais(valores.familia)} · taxa de serviço {formatarReais(valores.taxa)}
                    </p>
                  )}
                </>
              )}
            </div>

            {passo === "dados" && (
              <form
                className="lp-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void gerarPix();
                }}
                noValidate
              >
                <label className="lp-campo">
                  <span>Seu nome</span>
                  <input
                    value={convidado.quem}
                    onChange={(e) => mudar("quem", e.target.value)}
                    maxLength={80}
                    autoComplete="name"
                  />
                </label>
                <label className="lp-campo">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={convidado.email}
                    onChange={(e) => mudar("email", e.target.value)}
                    maxLength={64}
                    autoComplete="email"
                    inputMode="email"
                  />
                </label>
                <div className="lp-dupla">
                  <label className="lp-campo">
                    <span>CPF</span>
                    <input
                      value={convidado.cpf}
                      onChange={(e) => mudar("cpf", mascaraCpf(e.target.value))}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000.000.000-00"
                    />
                  </label>
                  <label className="lp-campo">
                    <span>Celular</span>
                    <input
                      value={convidado.celular}
                      onChange={(e) => mudar("celular", mascaraCelular(e.target.value))}
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                </div>
                <label className="lp-campo">
                  <span>Recado para {quemRecebe} (opcional)</span>
                  <textarea
                    value={convidado.recado}
                    onChange={(e) => mudar("recado", e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </label>
                <p className="lp-miudo">
                  O banco pede CPF e celular para o Pix. {QuemRecebe} {plural ? "veem" : "vê"} só o seu nome e o
                  recado.
                </p>
                {erro && (
                  <p className="lp-erro" role="alert">
                    {erro}
                  </p>
                )}
                <button type="submit" className="lp-botao lp-botao-grande" disabled={enviando}>
                  {enviando ? "Gerando o Pix…" : `Gerar o Pix · ${formatarReais(valores.total)}`}
                </button>
              </form>
            )}

            {passo === "pix" && pix && (
              <div className="lp-pix">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lp-qr" src={pix.qr} alt="QR Code do Pix" width={220} height={220} />
                <button type="button" className="lp-botao lp-botao-grande" onClick={() => void copiarCodigo()}>
                  {copiado ? "Código copiado" : "Copiar o código Pix"}
                </button>
                <p className="lp-codigo" aria-label="Código Pix copia e cola">
                  {pix.copiaECola}
                </p>
                <p className="lp-miudo">No app do banco: Pix › Pix copia e cola, ou leia o QR Code.</p>
                <p className="lp-esperando" aria-live="polite">
                  <span className="lp-pulso" aria-hidden="true" />
                  Aguardando o pagamento
                  {minutosAte(pix.expiraEm, agora) > 0 && ` · vale por mais ${minutosAte(pix.expiraEm, agora)} min`}
                </p>
              </div>
            )}

            {passo === "pago" && (
              <div className="lp-fim">
                <p className="lp-fim-texto">
                  Obrigado! {QuemRecebe} {plural ? "vão" : "vai"} receber o presente
                  {pix?.comRecado ? " e o seu recado" : ""}.
                </p>
                <button type="button" className="lp-botao lp-botao-grande" onClick={fechar}>
                  Voltar à lista
                </button>
              </div>
            )}

            {passo === "venceu" && (
              <div className="lp-fim">
                <p className="lp-fim-texto">O código Pix venceu antes do pagamento.</p>
                <button type="button" className="lp-botao lp-botao-grande" onClick={outroPix}>
                  Gerar outro Pix
                </button>
              </div>
            )}

            {passo === "falhou" && (
              <div className="lp-fim">
                <p className="lp-fim-texto">O pagamento não foi concluído.</p>
                <button type="button" className="lp-botao lp-botao-grande" onClick={outroPix}>
                  Tentar de novo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
