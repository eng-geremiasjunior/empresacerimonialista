"use client";

// A lista de presentes do convidado (/c/<endereço>/presentes). Escolher,
// deixar o nome e o recado, pagar (Pix ou cartão) e ver o "presente
// enviado" — sem conta, sem sair da página.
//
// Tudo que vale dinheiro sai do servidor: a página só mostra o preço que a
// rota de pagamento vai cobrar (o mesmo cálculo, valoresDoPresente e
// valoresNoCartao). O pagamento aberto fica guardado nesta aba
// (sessionStorage) enquanto pode valer: quem fechou a janela sem querer,
// ou recarregou, encontra o Pix de novo. Quem confirma o pagamento é a
// rota /api/presentes/pagamento/<id>, que relê a Pagar.me — a página só
// pergunta.
//
// O cartão (03/10/2026) vira token aqui mesmo, direto com a Pagar.me (a
// chave pública vem do servidor): o número, a validade e o CVV nunca vão
// para a nossa rota nem para o armazenamento da aba, e saem da memória da
// página quando a janela fecha.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, GRUPOS } from "@/lib/catalogo-de-presentes";
import {
  PARCELAS_NO_CARTAO,
  problemaNoConvidado,
  problemaNoEnderecoDeCobranca,
  so,
  valoresDoPresente,
  valoresNoCartao,
  type EnderecoDeCobranca,
} from "@/lib/lista-presentes";
import { tokenizar } from "@/lib/assinatura/cartao";
import { mascararCep, UFS } from "@/lib/contato";
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
  /** a chave pública da Pagar.me para o cartão; sem ela, só Pix */
  chaveDoCartao: string | null;
  itens: ItemDaVitrine[];
  /** as variáveis --lp-* (tema.ts) */
  estilo: Record<string, string>;
};

type Ordem = "lista" | "menor" | "maior";
type Meio = "pix" | "cartao";
type Passo = "dados" | "pix" | "cartao" | "pago" | "venceu" | "falhou";

type PagamentoAberto = {
  id: string;
  itemId: string;
  titulo: string;
  /** os guardados antes do cartão não têm: são Pix */
  meio?: Meio;
  /** só no Pix */
  copiaECola?: string;
  qr?: string;
  expiraEm: string;
  totalCentavos: number;
  /** o recado foi junto (muda o agradecimento) */
  comRecado: boolean;
};

type Convidado = { quem: string; email: string; cpf: string; celular: string; recado: string };
type Cartao = { numero: string; nome: string; validade: string; cvv: string };

const VAZIO: Convidado = { quem: "", email: "", cpf: "", celular: "", recado: "" };
const SEM_CARTAO: Cartao = { numero: "", nome: "", validade: "", cvv: "" };
const SEM_ENDERECO: EnderecoDeCobranca = { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };
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

const mascaraNumeroDoCartao = (v: string) =>
  so(v)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

function mascaraValidade(v: string): string {
  let d = so(v);
  // o preenchimento automático do navegador pode trazer o ano com 4 dígitos
  // (12/2030): fica o mês e os dois últimos do ano
  if (d.length === 6) d = d.slice(0, 2) + d.slice(4);
  d = d.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** O dígito verificador do número do cartão (Luhn): erro de digitação para aqui. */
function numeroDeCartaoValido(numero: string): boolean {
  const d = so(numero);
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
}

function problemaNoCartao(c: Cartao): string | null {
  if (!numeroDeCartaoValido(c.numero)) return "Confira o número do cartão.";
  if (c.nome.trim().length < 2) return "Escreva o nome como está no cartão.";
  const m = /^(\d{2})\/(\d{2})$/.exec(c.validade.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return "Confira a validade do cartão (mês/ano).";
  const hoje = new Date();
  const ano = 2000 + Number(m[2]);
  if (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && Number(m[1]) < hoje.getMonth() + 1)) {
    return "Este cartão está vencido.";
  }
  if (!/^\d{3,4}$/.test(so(c.cvv))) return "Confira o código de segurança do cartão.";
  return null;
}

function minutosAte(iso: string, agora: number): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - agora) / 60_000));
}

export function ListaPublica(props: Props) {
  const { slug, nomes, quemRecebe, plural, dataLegivel, mensagem, taxaDoCasal, podePagar, chaveDoCartao, itens, estilo } =
    props;
  const router = useRouter();
  // começo de frase ("Ana e Bruno", ou "Os anfitriões" no site sem nomes)
  const QuemRecebe = quemRecebe.charAt(0).toUpperCase() + quemRecebe.slice(1);
  const chaveDaAba = `lista-pix:${slug}`;
  const aceitaCartao = !!chaveDoCartao;

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
  const [meio, setMeio] = useState<Meio>("pix");
  const [cartao, setCartao] = useState<Cartao>(SEM_CARTAO);
  const [parcelas, setParcelas] = useState(1);
  const [endereco, setEndereco] = useState<EnderecoDeCobranca>(SEM_ENDERECO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pagamento, setPagamento] = useState<PagamentoAberto | null>(null);
  const [estado, setEstado] = useState<"aguardando" | "pago" | "venceu" | "falhou">("aguardando");
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  // o pagamento desta aba volta depois de recarregar (só enquanto pode valer)
  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(chaveDaAba);
      if (!bruto) return;
      const salvo = JSON.parse(bruto) as PagamentoAberto;
      if (salvo?.id && new Date(salvo.expiraEm).getTime() + FOLGA_DEPOIS_DE_VENCER_MS > Date.now()) setPagamento(salvo);
      else sessionStorage.removeItem(chaveDaAba);
    } catch {
      /* aba sem armazenamento: o pagamento só não volta depois de recarregar */
    }
  }, [chaveDaAba]);

  const guardar = useCallback(
    (p: PagamentoAberto | null) => {
      try {
        if (p) sessionStorage.setItem(chaveDaAba, JSON.stringify(p));
        else sessionStorage.removeItem(chaveDaAba);
      } catch {
        /* sem armazenamento */
      }
    },
    [chaveDaAba]
  );

  // pergunta à rota enquanto o pagamento pode ser confirmado
  useEffect(() => {
    if (!pagamento || estado !== "aguardando") return;
    let parado = false;
    const perguntar = async () => {
      const t = Date.now();
      setAgora(t);
      if (t > new Date(pagamento.expiraEm).getTime() + FOLGA_DEPOIS_DE_VENCER_MS) {
        setEstado("venceu");
        return;
      }
      try {
        const r = await fetch(`/api/presentes/pagamento/${pagamento.id}`, { cache: "no-store" });
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
  }, [pagamento, estado]);

  // o resultado: sai da aba e, pago, a vitrine se atualiza (o "presenteado")
  const tratado = useRef("");
  useEffect(() => {
    if (!pagamento || estado === "aguardando") return;
    const chave = `${pagamento.id}:${estado}`;
    if (tratado.current === chave) return;
    tratado.current = chave;
    guardar(null);
    if (estado === "pago") router.refresh();
  }, [estado, pagamento, guardar, router]);

  // e a janela aberta neste presente acompanha
  useEffect(() => {
    if (!pagamento || !aberto || aberto.id !== pagamento.itemId || estado === "aguardando") return;
    setPasso(estado === "pago" ? "pago" : estado === "venceu" ? "venceu" : "falhou");
  }, [estado, pagamento, aberto]);

  const passoDoAberto = (p: PagamentoAberto): Passo =>
    estado === "aguardando"
      ? p.meio === "cartao"
        ? "cartao"
        : "pix"
      : estado === "pago"
        ? "pago"
        : estado === "venceu"
          ? "venceu"
          : "falhou";

  function abrir(item: ItemDaVitrine) {
    setErro(null);
    setCopiado(false);
    setAberto(item);
    setParcelas(1);
    setPasso(pagamento && pagamento.itemId === item.id ? passoDoAberto(pagamento) : "dados");
  }

  function fechar() {
    setAberto(null);
    setErro(null);
    // o cartão não fica na memória da página depois que a janela fecha
    setCartao(SEM_CARTAO);
    // depois do agradecimento, a lista volta limpa
    if (estado !== "aguardando") {
      setPagamento(null);
      setEstado("aguardando");
    }
  }

  function comecar(novo: PagamentoAberto, situacao: "aguardando" | "pago") {
    setPagamento(novo);
    setEstado(situacao);
    if (situacao === "aguardando") guardar(novo);
    setCopiado(false);
    setPasso(situacao === "pago" ? "pago" : novo.meio === "cartao" ? "cartao" : "pix");
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
        body: JSON.stringify({ presenteId: aberto.id, ...convidado, meio: "pix" }),
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
      comecar(
        {
          id: j.id,
          itemId: aberto.id,
          titulo: aberto.titulo,
          meio: "pix",
          copiaECola: j.copiaECola,
          qr: j.qr,
          expiraEm: j.expiraEm,
          totalCentavos: j.totalCentavos ?? valoresDoPresente(aberto.valorCentavos, taxaDoCasal).total,
          comRecado: convidado.recado.trim() !== "",
        },
        "aguardando"
      );
    } catch {
      setErro("Sem conexão agora. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function pagarNoCartao() {
    if (!aberto || enviando || !chaveDoCartao) return;
    const problema = problemaNoConvidado(convidado) ?? problemaNoCartao(cartao) ?? problemaNoEnderecoDeCobranca(endereco);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const [mes, ano] = cartao.validade.split("/");
      const t = await tokenizar(
        { numero: so(cartao.numero), nome: cartao.nome.trim(), mes, ano: `20${ano}`, cvv: so(cartao.cvv) },
        chaveDoCartao
      );
      if (!t.token) {
        setErro(t.erro ?? "Confira os dados do cartão e tente de novo.");
        return;
      }
      const r = await fetch(`/api/presentes/${encodeURIComponent(slug)}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presenteId: aberto.id,
          ...convidado,
          meio: "cartao",
          cartao: { token: t.token, parcelas, ...endereco },
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        erro?: string;
        id?: string;
        status?: string;
        expiraEm?: string;
        totalCentavos?: number;
      };
      if (!r.ok || !j.ok || !j.id || !j.expiraEm) {
        setErro(j.erro ?? "Não foi possível pagar no cartão agora. Tente de novo em instantes.");
        // o token é de uso único: a próxima tentativa pede o CVV de novo
        setCartao((c) => ({ ...c, cvv: "" }));
        if (r.status === 409 || r.status === 404) router.refresh();
        return;
      }
      setCartao(SEM_CARTAO);
      comecar(
        {
          id: j.id,
          itemId: aberto.id,
          titulo: aberto.titulo,
          meio: "cartao",
          expiraEm: j.expiraEm,
          totalCentavos: j.totalCentavos ?? valoresNoCartao(aberto.valorCentavos, taxaDoCasal, parcelas).total,
          comRecado: convidado.recado.trim() !== "",
        },
        j.status === "pago" ? "pago" : "aguardando"
      );
    } catch {
      setErro("Sem conexão agora. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarCodigo() {
    if (!pagamento?.copiaECola) return;
    try {
      await navigator.clipboard.writeText(pagamento.copiaECola);
      setCopiado(true);
    } catch {
      // sem permissão: o código fica selecionável na tela
      setCopiado(false);
    }
  }

  function deNovo() {
    setPagamento(null);
    setEstado("aguardando");
    guardar(null);
    setPasso("dados");
  }

  // o CEP preenche o resto do endereço (ViaCEP); sem resposta, digita-se
  async function buscarCep(cep: string) {
    if (so(cep).length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${so(cep)}/json/`);
      const j = (await r.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
      if (!j.erro) {
        setEndereco((e) => ({
          ...e,
          rua: j.logradouro || e.rua,
          bairro: j.bairro || e.bairro,
          cidade: j.localidade || e.cidade,
          uf: j.uf || e.uf,
        }));
      }
    } catch {
      /* sem o CEP, o endereço é digitado */
    }
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
  const mudarCartao = (k: keyof Cartao, v: string) => {
    setCartao((c) => ({ ...c, [k]: v }));
    setErro(null);
  };
  const mudarEndereco = (k: keyof EnderecoDeCobranca, v: string) => {
    setEndereco((e) => ({ ...e, [k]: v }));
    setErro(null);
  };

  const valores = aberto ? valoresDoPresente(aberto.valorCentavos, taxaDoCasal) : null;
  const noCartao = aberto ? valoresNoCartao(aberto.valorCentavos, taxaDoCasal, parcelas) : null;
  const pagandoNoCartao = aceitaCartao && meio === "cartao";
  const totalDaJanela =
    passo !== "dados" && pagamento && aberto && pagamento.itemId === aberto.id
      ? pagamento.totalCentavos
      : pagandoNoCartao
        ? noCartao?.total
        : valores?.total;
  // a conta que o convidado vê antes de pagar: o presente e cada taxa dele
  const partesDoTotal =
    aberto && valores && noCartao
      ? [
          `Presente ${formatarReais(aberto.valorCentavos)}`,
          ...(taxaDoCasal ? [] : [`taxa de serviço ${formatarReais(valores.taxa)}`]),
          ...(pagandoNoCartao ? [`taxa do cartão ${formatarReais(noCartao.taxaCartao)}`] : []),
        ]
      : [];
  const pendente = pagamento && !aberto && estado === "aguardando" ? pagamento : null;
  const pagoComJanelaFechada = pagamento && !aberto && estado === "pago" ? pagamento : null;
  const ehCartao = pagamento?.meio === "cartao";

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
              ? `Escolha um presente e pague por Pix${aceitaCartao ? " ou cartão" : ""}. O valor vai direto para ${quemRecebe}.`
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
                    const esperando = pagamento?.itemId === item.id && estado === "aguardando";
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
                            {esperando ? (ehCartao ? "Ver o pagamento" : "Ver o Pix") : "Presentear"}
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

      {/* o pagamento que ficou para trás (janela fechada, aba recarregada) */}
      {(pendente || pagoComJanelaFechada) && (
        <div className="lp-aviso" role="status">
          {pendente ? (
            <>
              <span>
                {pendente.meio === "cartao" ? "Pagamento de " : "Pix de "}
                <strong>{pendente.titulo}</strong>
                {pendente.meio === "cartao" ? " em análise" : " aguardando o pagamento"}
              </span>
              <button
                type="button"
                className="lp-aviso-botao"
                onClick={() => {
                  const item = itens.find((i) => i.id === pendente.itemId);
                  if (item) abrir(item);
                }}
              >
                {pendente.meio === "cartao" ? "Ver" : "Ver o código"}
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

      {aberto && valores && noCartao && (
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
              {passo !== "pago" && totalDaJanela !== undefined && (
                <>
                  {/* depois de pedir, o valor que o servidor cobrou; antes, a conta desta página */}
                  <p className="lp-janela-total">{formatarReais(totalDaJanela)}</p>
                  {passo === "dados" && partesDoTotal.length > 1 && (
                    <p className="lp-janela-taxa">{partesDoTotal.join(" · ")}</p>
                  )}
                </>
              )}
            </div>

            {passo === "dados" && (
              <form
                className="lp-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (pagandoNoCartao ? pagarNoCartao() : gerarPix());
                }}
                noValidate
              >
                {aceitaCartao && (
                  <div className="lp-meios" role="radiogroup" aria-label="Como pagar">
                    {(
                      [
                        ["pix", "Pix"],
                        ["cartao", "Cartão de crédito"],
                      ] as const
                    ).map(([m, rotulo]) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={meio === m}
                        className={`lp-meio${meio === m ? " on" : ""}`}
                        onClick={() => {
                          setMeio(m);
                          setErro(null);
                        }}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                )}
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

                {pagandoNoCartao && (
                  <>
                    <fieldset className="lp-grupo">
                      <legend>Cartão</legend>
                      <label className="lp-campo">
                        <span>Número do cartão</span>
                        <input
                          value={cartao.numero}
                          onChange={(e) => mudarCartao("numero", mascaraNumeroDoCartao(e.target.value))}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="0000 0000 0000 0000"
                        />
                      </label>
                      <label className="lp-campo">
                        <span>Nome impresso no cartão</span>
                        <input
                          value={cartao.nome}
                          onChange={(e) => mudarCartao("nome", e.target.value.toUpperCase())}
                          maxLength={64}
                          autoComplete="cc-name"
                        />
                      </label>
                      <div className="lp-dupla">
                        <label className="lp-campo">
                          <span>Validade</span>
                          <input
                            value={cartao.validade}
                            onChange={(e) => mudarCartao("validade", mascaraValidade(e.target.value))}
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/AA"
                          />
                        </label>
                        <label className="lp-campo">
                          <span>Código de segurança</span>
                          <input
                            value={cartao.cvv}
                            onChange={(e) => mudarCartao("cvv", so(e.target.value).slice(0, 4))}
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            placeholder="CVV"
                          />
                        </label>
                      </div>
                      <label className="lp-campo">
                        <span>Parcelas</span>
                        <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                          {Array.from({ length: PARCELAS_NO_CARTAO }, (_, i) => i + 1).map((n) => {
                            const c = valoresNoCartao(aberto.valorCentavos, taxaDoCasal, n);
                            return (
                              <option key={n} value={n}>
                                {n === 1
                                  ? `À vista · ${formatarReais(c.total)}`
                                  : `${n}x de ${formatarReais(c.valorDaParcela)} · total ${formatarReais(c.total)}`}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </fieldset>

                    <fieldset className="lp-grupo">
                      <legend>Endereço da fatura do cartão</legend>
                      <div className="lp-dupla">
                        <label className="lp-campo">
                          <span>CEP</span>
                          <input
                            value={endereco.cep}
                            onChange={(e) => {
                              const v = mascararCep(e.target.value);
                              mudarEndereco("cep", v);
                              if (so(v).length === 8) void buscarCep(v);
                            }}
                            inputMode="numeric"
                            autoComplete="postal-code"
                            placeholder="00000-000"
                          />
                        </label>
                        <label className="lp-campo">
                          <span>Número</span>
                          <input
                            value={endereco.numero}
                            onChange={(e) => mudarEndereco("numero", e.target.value)}
                            maxLength={10}
                            autoComplete="off"
                          />
                        </label>
                      </div>
                      <label className="lp-campo">
                        <span>Rua</span>
                        <input
                          value={endereco.rua}
                          onChange={(e) => mudarEndereco("rua", e.target.value)}
                          maxLength={120}
                          autoComplete="address-line1"
                        />
                      </label>
                      <div className="lp-dupla">
                        <label className="lp-campo">
                          <span>Bairro</span>
                          <input
                            value={endereco.bairro}
                            onChange={(e) => mudarEndereco("bairro", e.target.value)}
                            maxLength={60}
                          />
                        </label>
                        <label className="lp-campo">
                          <span>Complemento (opcional)</span>
                          <input
                            value={endereco.complemento}
                            onChange={(e) => mudarEndereco("complemento", e.target.value)}
                            maxLength={60}
                            autoComplete="address-line2"
                          />
                        </label>
                      </div>
                      <div className="lp-dupla">
                        <label className="lp-campo">
                          <span>Cidade</span>
                          <input
                            value={endereco.cidade}
                            onChange={(e) => mudarEndereco("cidade", e.target.value)}
                            maxLength={60}
                            autoComplete="address-level2"
                          />
                        </label>
                        <label className="lp-campo">
                          <span>Estado</span>
                          <select value={endereco.uf} onChange={(e) => mudarEndereco("uf", e.target.value)}>
                            <option value="">—</option>
                            {UFS.map((uf) => (
                              <option key={uf} value={uf}>
                                {uf}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </fieldset>
                  </>
                )}

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
                  {pagandoNoCartao
                    ? `${QuemRecebe} ${plural ? "veem" : "vê"} só o seu nome e o recado. Os dados do cartão vão direto para a operadora de pagamento.`
                    : `O banco pede CPF e celular para o Pix. ${QuemRecebe} ${plural ? "veem" : "vê"} só o seu nome e o recado.`}
                </p>
                {erro && (
                  <p className="lp-erro" role="alert">
                    {erro}
                  </p>
                )}
                <button type="submit" className="lp-botao lp-botao-grande" disabled={enviando}>
                  {pagandoNoCartao
                    ? enviando
                      ? "Pagando…"
                      : `Pagar ${formatarReais(noCartao.total)}${parcelas > 1 ? ` em ${parcelas}x` : ""}`
                    : enviando
                      ? "Gerando o Pix…"
                      : `Gerar o Pix · ${formatarReais(valores.total)}`}
                </button>
              </form>
            )}

            {passo === "pix" && pagamento?.qr && pagamento.copiaECola && (
              <div className="lp-pix">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lp-qr" src={pagamento.qr} alt="QR Code do Pix" width={220} height={220} />
                <button type="button" className="lp-botao lp-botao-grande" onClick={() => void copiarCodigo()}>
                  {copiado ? "Código copiado" : "Copiar o código Pix"}
                </button>
                <p className="lp-codigo" aria-label="Código Pix copia e cola">
                  {pagamento.copiaECola}
                </p>
                <p className="lp-miudo">No app do banco: Pix › Pix copia e cola, ou leia o QR Code.</p>
                <p className="lp-esperando" aria-live="polite">
                  <span className="lp-pulso" aria-hidden="true" />
                  Aguardando o pagamento
                  {minutosAte(pagamento.expiraEm, agora) > 0 && ` · vale por mais ${minutosAte(pagamento.expiraEm, agora)} min`}
                </p>
              </div>
            )}

            {passo === "cartao" && (
              <div className="lp-fim">
                <p className="lp-esperando" aria-live="polite">
                  <span className="lp-pulso" aria-hidden="true" />
                  Confirmando o pagamento no cartão
                </p>
                <p className="lp-miudo">Costuma levar poucos instantes. Pode deixar esta janela aberta.</p>
              </div>
            )}

            {passo === "pago" && (
              <div className="lp-fim">
                <p className="lp-fim-texto">
                  Obrigado! {QuemRecebe} {plural ? "vão" : "vai"} receber o presente
                  {pagamento?.comRecado ? " e o seu recado" : ""}.
                </p>
                <button type="button" className="lp-botao lp-botao-grande" onClick={fechar}>
                  Voltar à lista
                </button>
              </div>
            )}

            {passo === "venceu" &&
              (ehCartao ? (
                <div className="lp-fim">
                  <p className="lp-fim-texto">
                    O cartão ainda está em análise. Se for aprovado, {quemRecebe} {plural ? "recebem" : "recebe"} o presente e
                    ele aparece como presenteado.
                  </p>
                  <button type="button" className="lp-botao lp-botao-grande" onClick={fechar}>
                    Voltar à lista
                  </button>
                </div>
              ) : (
                <div className="lp-fim">
                  <p className="lp-fim-texto">O código Pix venceu antes do pagamento.</p>
                  <button type="button" className="lp-botao lp-botao-grande" onClick={deNovo}>
                    Gerar outro Pix
                  </button>
                </div>
              ))}

            {passo === "falhou" && (
              <div className="lp-fim">
                <p className="lp-fim-texto">
                  {ehCartao ? "O pagamento no cartão não foi aprovado." : "O pagamento não foi concluído."}
                </p>
                <button type="button" className="lp-botao lp-botao-grande" onClick={deNovo}>
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
