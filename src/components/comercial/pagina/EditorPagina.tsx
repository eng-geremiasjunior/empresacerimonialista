"use client";

// O editor da página pública.
//
// Uma tela, de cima para baixo na ordem em que ela resolve: onde a página
// está (no ar ou rascunho, e o que falta), o endereço, o que a página diz,
// o contato, e o que vai para a rua (fotos e depoimentos, um a um).
//
// Template fixo de propósito: ela escreve campos, não monta layout. A
// página pública lê exatamente estes campos, e nada mais.

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Plus, X } from "lucide-react";
import {
  definirEndereco,
  despublicarPagina,
  marcarNaPagina,
  publicarPagina,
  salvarPagina,
} from "@/app/(app)/orcamentos/pagina/actions";
import {
  LIMITES,
  enderecoDaPagina,
  erroDoSlug,
  faltaParaPublicar,
  normalizarInstagram,
  normalizarPixelMeta,
  sugerirSlug,
  textoParaBio,
  type ServicoDaPagina,
} from "@/lib/comercial/pagina-publica";
import {
  normalizarWhatsapp,
  whatsappFormatado,
  whatsappValido,
} from "@/lib/comercial/pedidos";
import { TIPOS_CATALOGO, rotuloTipo } from "@/lib/catalogo";
import type { EventType } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
const secaoClass = "rounded-xl border border-gray-200 bg-white p-6";
const botaoPrincipal =
  "rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50";
const botaoSecundario =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

const SERVICOS_SUGERIDOS = ["Assessoria completa", "Assessoria parcial", "Cerimonial do dia"];

type Foto = { id: string; url: string; legenda: string | null; tipo: EventType; naPagina: boolean };
type Depoimento = {
  id: string;
  texto: string;
  autor: string;
  contexto: string | null;
  naPagina: boolean;
};

type Props = {
  base: string;
  nomeEmpresa: string;
  logoUrl: string | null;
  emailAviso: string | null;
  enderecosUsados: number;
  /** O WhatsApp já cadastrado nas propostas: preenche o campo, não conta como salvo. */
  whatsappSugerido: string | null;
  inicial: {
    slug: string | null;
    publicada: boolean;
    publicadaEm: string | null;
    titulo: string;
    posicionamento: string;
    paraQuem: string;
    cidade: string;
    tipos: EventType[];
    servicos: ServicoDaPagina[];
    motivos: string[];
    whatsapp: string;
    instagram: string;
    pixelMeta: string;
  };
  fotos: Foto[];
  depoimentos: Depoimento[];
};

const FOTOS_NA_PAGINA = 24;

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function EditorPagina({
  base,
  nomeEmpresa,
  logoUrl,
  emailAviso,
  enderecosUsados,
  whatsappSugerido,
  inicial,
  fotos: fotosIniciais,
  depoimentos: depoimentosIniciais,
}: Props) {
  const [pendente, iniciar] = useTransition();

  // --- estado salvo (o que o banco tem) ---
  const [slug, setSlug] = useState(inicial.slug);
  const [publicada, setPublicada] = useState(inicial.publicada);

  // --- o que ela está editando ---
  const [slugDigitado, setSlugDigitado] = useState(
    inicial.slug ?? sugerirSlug(nomeEmpresa)
  );
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [posicionamento, setPosicionamento] = useState(inicial.posicionamento);
  const [paraQuem, setParaQuem] = useState(inicial.paraQuem);
  const [cidade, setCidade] = useState(inicial.cidade);
  const [tipos, setTipos] = useState<EventType[]>(inicial.tipos);
  const [servicos, setServicos] = useState<ServicoDaPagina[]>(inicial.servicos);
  const [motivos, setMotivos] = useState<string[]>(
    [...inicial.motivos, "", "", ""].slice(0, LIMITES.motivos)
  );
  const [whatsapp, setWhatsapp] = useState(
    whatsappFormatado(inicial.whatsapp || whatsappSugerido || "")
  );
  const [instagram, setInstagram] = useState(inicial.instagram);
  const [pixelMeta, setPixelMeta] = useState(inicial.pixelMeta);
  const [fotos, setFotos] = useState(fotosIniciais);
  const [depoimentos, setDepoimentos] = useState(depoimentosIniciais);

  // o que já está salvo no banco, para saber se há mudança pendente
  const [salvoConteudo, setSalvoConteudo] = useState({
    titulo: inicial.titulo,
    posicionamento: inicial.posicionamento,
    paraQuem: inicial.paraQuem,
    cidade: inicial.cidade,
    tipos: inicial.tipos,
    servicos: inicial.servicos,
    motivos: inicial.motivos,
    whatsapp: inicial.whatsapp,
    instagram: inicial.instagram,
    pixelMeta: inicial.pixelMeta,
  });

  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string; onde: string } | null>(
    null
  );
  const [copiado, setCopiado] = useState<string | null>(null);

  const host = base.replace(/^https?:\/\//, "");
  const endereco = slug ? enderecoDaPagina(base, slug) : null;

  const conteudoAtual = {
    titulo: titulo.trim(),
    posicionamento: posicionamento.trim(),
    paraQuem: paraQuem.trim(),
    cidade: cidade.trim(),
    tipos: [...tipos].sort(),
    servicos: servicos
      .map((s) => ({ nome: s.nome.trim(), descricao: (s.descricao ?? "").trim() || null }))
      .filter((s) => s.nome),
    motivos: motivos.map((m) => m.trim()).filter(Boolean),
    whatsapp: normalizarWhatsapp(whatsapp) ?? "",
    instagram: normalizarInstagram(instagram) ?? instagram.trim(),
    pixelMeta: normalizarPixelMeta(pixelMeta) ?? pixelMeta.trim(),
  };

  // O WhatsApp que veio do Catálogo, intocado, não é "mudança": é o valor
  // que a página vai usar, e publicar grava junto.
  const whatsappEhSugestao =
    !salvoConteudo.whatsapp &&
    Boolean(whatsappSugerido) &&
    normalizarWhatsapp(whatsapp) === normalizarWhatsapp(whatsappSugerido);

  const sujo =
    JSON.stringify({
      ...conteudoAtual,
      whatsapp: whatsappEhSugestao ? "" : conteudoAtual.whatsapp,
    }) !==
    JSON.stringify({
      ...salvoConteudo,
      titulo: salvoConteudo.titulo.trim(),
      posicionamento: salvoConteudo.posicionamento.trim(),
      paraQuem: salvoConteudo.paraQuem.trim(),
      cidade: salvoConteudo.cidade.trim(),
      tipos: [...salvoConteudo.tipos].sort(),
      servicos: salvoConteudo.servicos.map((s) => ({
        nome: s.nome,
        descricao: s.descricao ?? null,
      })),
      whatsapp: normalizarWhatsapp(salvoConteudo.whatsapp) ?? "",
    });

  // O que falta é lido da tela, não do banco: publicar grava o conteúdo
  // antes. Só o endereço vem do que está salvo, porque ele tem botão
  // próprio.
  const falta = faltaParaPublicar({
    slug,
    whatsapp: whatsappValido(whatsapp) ? whatsapp : null,
    posicionamento: conteudoAtual.posicionamento || null,
    tiposAtendidos: conteudoAtual.tipos,
  });
  const fotosMarcadas = fotos.filter((f) => f.naPagina).length;

  function mostrar(onde: string, tipo: "ok" | "erro", texto: string) {
    setAviso({ onde, tipo, texto });
  }

  async function copiar(chave: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      mostrar("status", "erro", "Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  }

  async function salvarConteudo(): Promise<boolean> {
    // o que ela DIGITOU: texto sem dígito normaliza para vazio e passaria calado
    if (whatsapp.trim() && !whatsappValido(whatsapp)) {
      mostrar("salvar", "erro", "Confira o WhatsApp: DDD e número.");
      return false;
    }
    if (instagram.trim() && !normalizarInstagram(instagram)) {
      mostrar("salvar", "erro", "Confira o Instagram: só o nome do perfil.");
      return false;
    }
    if (pixelMeta.trim() && !normalizarPixelMeta(pixelMeta)) {
      mostrar("salvar", "erro", "Confira o pixel: só o número do pixel da Meta.");
      return false;
    }
    const r = await salvarPagina({
      titulo: conteudoAtual.titulo || null,
      posicionamento: conteudoAtual.posicionamento || null,
      paraQuem: conteudoAtual.paraQuem || null,
      cidade: conteudoAtual.cidade || null,
      tiposAtendidos: conteudoAtual.tipos,
      servicos: conteudoAtual.servicos,
      motivos: conteudoAtual.motivos,
      whatsapp: conteudoAtual.whatsapp || null,
      instagram: conteudoAtual.instagram || null,
      pixelMeta: conteudoAtual.pixelMeta || null,
    });
    if ("error" in r) {
      mostrar("salvar", "erro", r.error);
      return false;
    }
    setSalvoConteudo({ ...conteudoAtual, servicos: conteudoAtual.servicos });
    // colou o código inteiro da Meta: o campo passa a mostrar só o número
    setPixelMeta(conteudoAtual.pixelMeta);
    return true;
  }

  function salvar() {
    setAviso(null);
    iniciar(async () => {
      if (await salvarConteudo()) {
        mostrar("salvar", "ok", "Salvo.");
      }
    });
  }

  function salvarEndereco() {
    setAviso(null);
    const erro = erroDoSlug(slugDigitado);
    if (erro) return mostrar("endereco", "erro", erro);
    iniciar(async () => {
      const r = await definirEndereco(slugDigitado);
      if ("error" in r) return mostrar("endereco", "erro", r.error);
      setSlug(r.slug);
      setSlugDigitado(r.slug);
      mostrar(
        "endereco",
        "ok",
        slug && slug !== r.slug
          ? "Endereço trocado. O anterior continua levando para este."
          : "Endereço salvo."
      );
    });
  }

  function publicar() {
    setAviso(null);
    iniciar(async () => {
      // publica o que está na tela: grava antes, sempre
      if (!(await salvarConteudo())) return;
      const r = await publicarPagina();
      if ("error" in r) return mostrar("status", "erro", r.error);
      setPublicada(true);
      mostrar("status", "ok", "A vitrine está no ar.");
    });
  }

  function despublicar() {
    setAviso(null);
    iniciar(async () => {
      const r = await despublicarPagina();
      if ("error" in r) return mostrar("status", "erro", r.error);
      setPublicada(false);
      mostrar("status", "ok", "A vitrine saiu do ar.");
    });
  }

  function alternar(tipo: "foto" | "depoimento", ids: string[], valor: boolean) {
    setAviso(null);
    const antesFotos = fotos;
    const antesDep = depoimentos;
    if (tipo === "foto") {
      setFotos((l) => l.map((f) => (ids.includes(f.id) ? { ...f, naPagina: valor } : f)));
    } else {
      setDepoimentos((l) => l.map((d) => (ids.includes(d.id) ? { ...d, naPagina: valor } : d)));
    }
    iniciar(async () => {
      const r = await marcarNaPagina(tipo, ids, valor);
      if ("error" in r) {
        setFotos(antesFotos);
        setDepoimentos(antesDep);
        mostrar(tipo === "foto" ? "fotos" : "depoimentos", "erro", r.error);
      }
    });
  }

  const avisoEm = (onde: string) =>
    aviso?.onde === onde ? (
      <p
        role={aviso.tipo === "erro" ? "alert" : "status"}
        className={`mt-3 text-sm ${aviso.tipo === "erro" ? "text-rose-700" : "text-emerald-700"}`}
      >
        {aviso.texto}
      </p>
    ) : null;

  return (
    <div className="space-y-6 pb-20">
      {/* ------------------------------------------------ status */}
      <section className={secaoClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${publicada ? "bg-emerald-500" : "bg-gray-300"}`}
              />
              {publicada ? "No ar" : "Rascunho"}
              {publicada && inicial.publicadaEm && (
                <span className="font-normal text-gray-500">
                  desde {dataCurta(inicial.publicadaEm)}
                </span>
              )}
            </p>
            {endereco && (
              <p className="mt-1 break-all text-sm text-gray-600">{endereco}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {slug && (
              <a
                href={`/cerimonialista/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={botaoSecundario}
              >
                <ExternalLink size={13} />
                {publicada ? "Abrir a vitrine" : "Ver como fica"}
              </a>
            )}
            {publicada ? (
              <button type="button" onClick={despublicar} disabled={pendente} className={botaoSecundario}>
                Tirar do ar
              </button>
            ) : (
              <button
                type="button"
                onClick={publicar}
                disabled={pendente || falta.length > 0}
                className={botaoPrincipal}
              >
                Publicar
              </button>
            )}
          </div>
        </div>

        {!publicada && falta.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-gray-700">
            {falta.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="text-gray-400">·</span>
                {f}
              </li>
            ))}
          </ul>
        )}
        {!publicada && falta.length === 0 && sujo && (
          <p className="mt-4 text-sm text-gray-600">
            Publicar salva também o que você mudou abaixo.
          </p>
        )}

        {publicada && endereco && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => copiar("endereco", endereco)} className={botaoSecundario}>
              {copiado === "endereco" ? <Check size={13} /> : <Copy size={13} />}
              {copiado === "endereco" ? "Copiado" : "Copiar endereço"}
            </button>
            <button
              type="button"
              onClick={() => copiar("bio", textoParaBio(endereco))}
              className={botaoSecundario}
            >
              {copiado === "bio" ? <Check size={13} /> : <Copy size={13} />}
              {copiado === "bio" ? "Copiado" : "Copiar texto para a bio do Instagram"}
            </button>
          </div>
        )}

        {!logoUrl && (
          <p className="mt-4 text-xs text-gray-500">
            A vitrine vai sem logo.{" "}
            <Link href="/configuracoes" className="underline hover:text-gray-800">
              Adicionar em Configurações
            </Link>
          </p>
        )}

        {emailAviso && (
          <p className="mt-4 text-xs text-gray-500">
            Os pedidos de orçamento chegam no sino e no e-mail {emailAviso}.
          </p>
        )}
        {avisoEm("status")}
      </section>

      {/* ------------------------------------------------ endereço */}
      <section className={secaoClass}>
        <label htmlFor="pagina-slug" className={labelClass}>
          Endereço da vitrine
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-sm text-gray-500">{host}/cerimonialista/</span>
          <input
            id="pagina-slug"
            value={slugDigitado}
            onChange={(e) => setSlugDigitado(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            maxLength={LIMITES.slugMax}
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
          />
          <button
            type="button"
            onClick={salvarEndereco}
            disabled={pendente || slugDigitado === slug || !slugDigitado}
            className={`${botaoPrincipal} shrink-0`}
          >
            {slug ? "Trocar" : "Salvar"}
          </button>
        </div>
        {slug && enderecosUsados >= 3 && (
          <p className="mt-2 text-xs text-gray-500">
            {enderecosUsados} de 5 endereços usados. Os anteriores continuam levando para o atual.
          </p>
        )}
        {avisoEm("endereco")}
      </section>

      {/* ------------------------------------------------ apresentação */}
      <section className={`${secaoClass} space-y-5`}>
        <h2 className="text-sm font-semibold text-gray-900">O que a vitrine diz</h2>

        <div>
          <label htmlFor="pagina-titulo" className={labelClass}>
            Título
          </label>
          <input
            id="pagina-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={LIMITES.titulo}
            placeholder="Cerimonial que cuida de cada detalhe"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pagina-posicionamento" className={labelClass}>
            Apresentação
          </label>
          <textarea
            id="pagina-posicionamento"
            value={posicionamento}
            onChange={(e) => setPosicionamento(e.target.value)}
            maxLength={LIMITES.posicionamento}
            rows={4}
            placeholder="Quem você é, como trabalha e o que a pessoa ganha contratando você."
            className={inputClass}
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {posicionamento.length}/{LIMITES.posicionamento}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="pagina-para-quem" className={labelClass}>
              Para quem você trabalha
            </label>
            <input
              id="pagina-para-quem"
              value={paraQuem}
              onChange={(e) => setParaQuem(e.target.value)}
              maxLength={LIMITES.paraQuem}
              placeholder="Casais, famílias e empresas"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pagina-cidade" className={labelClass}>
              Cidade ou região
            </label>
            <input
              id="pagina-cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              maxLength={LIMITES.cidade}
              placeholder="Goiânia e região"
              className={inputClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Tipos de evento que você atende</legend>
          <div className="flex flex-wrap gap-2">
            {TIPOS_CATALOGO.map((t) => {
              const ligado = tipos.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={ligado}
                  onClick={() =>
                    setTipos((l) => (ligado ? l.filter((x) => x !== t) : [...l, t]))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    ligado
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {rotuloTipo(t)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Serviços</legend>
          <div className="space-y-3">
            {servicos.map((s, i) => (
              <div key={i} className="flex gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_1.4fr]">
                  <input
                    aria-label={`Nome do serviço ${i + 1}`}
                    value={s.nome}
                    onChange={(e) =>
                      setServicos((l) =>
                        l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x))
                      )
                    }
                    maxLength={LIMITES.servicoNome}
                    placeholder="Nome do serviço"
                    className={inputClass}
                  />
                  <input
                    aria-label={`Descrição do serviço ${i + 1}`}
                    value={s.descricao ?? ""}
                    onChange={(e) =>
                      setServicos((l) =>
                        l.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x))
                      )
                    }
                    maxLength={LIMITES.servicoDescricao}
                    placeholder="Em uma frase, o que inclui"
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Tirar o serviço ${i + 1}`}
                  onClick={() => setServicos((l) => l.filter((_, j) => j !== i))}
                  className="self-start rounded-lg p-2.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          {servicos.length < LIMITES.servicos && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setServicos((l) => [...l, { nome: "", descricao: "" }])}
                className={botaoSecundario}
              >
                <Plus size={13} />
                Adicionar serviço
              </button>
              {SERVICOS_SUGERIDOS.filter(
                (n) => !servicos.some((s) => s.nome.trim().toLowerCase() === n.toLowerCase())
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setServicos((l) => [...l, { nome: n, descricao: "" }])}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                >
                  + {n}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Por que falar com você</legend>
          <div className="space-y-2">
            {motivos.map((m, i) => (
              <input
                key={i}
                aria-label={`Motivo ${i + 1}`}
                value={m}
                onChange={(e) =>
                  setMotivos((l) => l.map((x, j) => (j === i ? e.target.value : x)))
                }
                maxLength={LIMITES.motivo}
                placeholder={
                  [
                    "Atendimento do primeiro contato até o fim da festa",
                    "Fornecedores de confiança, com quem já trabalho",
                    "Você acompanha tudo, sem precisar cobrar",
                  ][i]
                }
                className={inputClass}
              />
            ))}
          </div>
        </fieldset>
      </section>

      {/* ------------------------------------------------ contato */}
      <section className={`${secaoClass} grid gap-5 sm:grid-cols-2`}>
        <div>
          <label htmlFor="pagina-whatsapp" className={labelClass}>
            WhatsApp que recebe os contatos
          </label>
          <input
            id="pagina-whatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            onBlur={() => whatsappValido(whatsapp) && setWhatsapp(whatsappFormatado(whatsapp))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(62) 99999-8888"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pagina-instagram" className={labelClass}>
            Instagram
          </label>
          <input
            id="pagina-instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            maxLength={LIMITES.instagram + 30}
            autoComplete="off"
            spellCheck={false}
            placeholder="seuperfil"
            className={inputClass}
          />
        </div>
      </section>

      {/* ------------------------------------------------ anúncios */}
      <section className={secaoClass}>
        <label htmlFor="pagina-pixel" className={labelClass}>
          Pixel da Meta <span className="font-normal text-gray-500">(opcional)</span>
        </label>
        <input
          id="pagina-pixel"
          value={pixelMeta}
          onChange={(e) => setPixelMeta(e.target.value)}
          onBlur={() => {
            const numero = normalizarPixelMeta(pixelMeta);
            if (numero) setPixelMeta(numero);
          }}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="Só o número do pixel"
          className={`${inputClass} sm:max-w-xs`}
        />
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          O pixel só é ativado para quem permitir. A vitrine envia à Meta a visita, o
          toque no WhatsApp e o pedido enviado, sem nome, telefone ou e-mail. No
          Gerenciador de Eventos, deixe desligada a correspondência avançada automática.
        </p>
      </section>

      {/* ------------------------------------------------ fotos */}
      <section className={secaoClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Fotos na vitrine</h2>
          {fotos.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pendente || fotosMarcadas === fotos.length}
                onClick={() => alternar("foto", fotos.filter((f) => !f.naPagina).map((f) => f.id), true)}
                className={botaoSecundario}
              >
                Marcar todas
              </button>
              <button
                type="button"
                disabled={pendente || fotosMarcadas === 0}
                onClick={() => alternar("foto", fotos.filter((f) => f.naPagina).map((f) => f.id), false)}
                className={botaoSecundario}
              >
                Desmarcar todas
              </button>
            </div>
          )}
        </div>
        {fotos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Nenhuma foto cadastrada.{" "}
            <Link href="/catalogo" className="underline hover:text-gray-800">
              Adicionar no Catálogo
            </Link>
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-gray-500">
              {fotosMarcadas === 0
                ? "Nenhuma marcada: a vitrine vai sem fotos."
                : fotosMarcadas > FOTOS_NA_PAGINA
                  ? `${fotosMarcadas} marcadas; a vitrine mostra as ${FOTOS_NA_PAGINA} primeiras.`
                  : `${fotosMarcadas} de ${fotos.length} vão para a vitrine.`}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {fotos.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={f.naPagina}
                  aria-label={`${f.naPagina ? "Tirar da" : "Pôr na"} vitrine: ${f.legenda || rotuloTipo(f.tipo)}`}
                  onClick={() => alternar("foto", [f.id], !f.naPagina)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                    f.naPagina ? "border-gray-900" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {f.naPagina && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
        {avisoEm("fotos")}
      </section>

      {/* ------------------------------------------------ depoimentos */}
      <section className={secaoClass}>
        <h2 className="text-sm font-semibold text-gray-900">Depoimentos na vitrine</h2>
        {depoimentos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Nenhum depoimento cadastrado.{" "}
            <Link href="/catalogo" className="underline hover:text-gray-800">
              Adicionar no Catálogo
            </Link>
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-gray-500">
              O nome de quem assina aparece para qualquer pessoa. Marque só os que você tem
              autorização para mostrar.
            </p>
            <ul className="mt-4 divide-y divide-gray-100">
              {depoimentos.map((d) => (
                <li key={d.id} className="flex items-start gap-3 py-3">
                  <input
                    id={`dep-${d.id}`}
                    type="checkbox"
                    checked={d.naPagina}
                    disabled={pendente}
                    onChange={() => alternar("depoimento", [d.id], !d.naPagina)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={`dep-${d.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="line-clamp-2 text-sm text-gray-800">“{d.texto}”</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {d.autor}
                      {d.contexto ? ` · ${d.contexto}` : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        {avisoEm("depoimentos")}
      </section>

      {/* ------------------------------------------------ salvar */}
      <div
        className={`sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition ${
          sujo || aviso?.onde === "salvar" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <p
          role={aviso?.onde === "salvar" && aviso.tipo === "erro" ? "alert" : "status"}
          className={`text-sm ${
            aviso?.onde === "salvar"
              ? aviso.tipo === "erro"
                ? "text-rose-700"
                : "text-emerald-700"
              : "text-gray-600"
          }`}
        >
          {aviso?.onde === "salvar" ? aviso.texto : "Alterações não salvas"}
        </p>
        {sujo && (
          <button type="button" onClick={salvar} disabled={pendente} className={botaoPrincipal}>
            {pendente ? "Salvando…" : "Salvar"}
          </button>
        )}
      </div>
    </div>
  );
}
