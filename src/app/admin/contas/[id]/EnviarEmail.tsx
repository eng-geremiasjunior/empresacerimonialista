"use client";

// O disparo de e-mail da ficha (22/09/2026).
//
// Ele escreve, vê como fica e manda — sem sair do painel e sem pedir
// para mim. A prévia é o HTML DE VERDADE, montado pelo servidor com o
// mesmo molde da régua: o que aparece aqui é o que chega na caixa dela.
//
// Enviar é irreversível, então são dois passos: primeiro "Ver como
// fica", e o botão de enviar só existe depois da prévia. Mexer em
// qualquer campo derruba a prévia — para nunca mandar um texto que ele
// não viu.

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { enviarEmailDaConta, preverEmailDaConta, type ResultadoAdmin } from "../../actions";
import { DESTINOS_DO_EMAIL, LIMITES_DO_EMAIL } from "@/lib/admin/email-do-painel";

type Modelo = {
  nome: string;
  assunto: string;
  titulo: string;
  texto: string;
  destaqueRotulo?: string;
  destaqueValor?: string;
  botaoTexto: string;
  botaoCaminho: string;
};

const CAMPO =
  "w-full rounded-md border border-[#d3d3cf] bg-white px-2.5 py-1.5 text-[13px] text-[#1c1d21] placeholder:text-[#a9aab0]";
const ROTULO = "flex flex-col gap-1 text-[11.5px] text-[#84858b]";

function data(iso?: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Os modelos são rascunhos: ele troca qualquer palavra antes de mandar.
 * Existem porque 90% dos e-mails são os mesmos três.
 */
function modelos(p: { nome: string; testeAte?: string | null; eventos: number; preco?: string | null }): Modelo[] {
  const primeiro = p.nome.trim().split(/\s+/)[0] ?? "";
  const oQueEla = p.eventos === 1 ? "o seu evento" : p.eventos > 1 ? `os seus ${p.eventos} eventos` : "a sua conta";
  // "os seus 7 eventos continua" — o verbo tem de acompanhar o sujeito
  const continua = p.eventos > 1 ? "continuam" : "continua";
  return [
    {
      nome: "Teste prorrogado",
      assunto: `Mais dias para você${primeiro ? `, ${primeiro}` : ""}`,
      titulo: p.testeAte ? `Seu teste foi estendido até ${data(p.testeAte)}` : "Seu teste foi estendido",
      texto:
        `Vimos que você já está organizando os seus eventos no eOrganizei, e queremos que você tenha tempo de usar o sistema com calma, no ritmo dos seus eventos.\n` +
        `Por isso estendemos o seu teste, por nossa conta. Você não precisa fazer nada: ${oQueEla} ${continua} do jeito que você deixou.\n` +
        `Aproveite para testar o que muda o dia a dia: o roteiro do dia para os fornecedores, o portal da sua cliente com a lista de convidados e o financeiro de cada evento.\n` +
        `Qualquer dúvida, é só responder este e-mail.`,
      destaqueRotulo: "Seu teste vai até",
      destaqueValor: data(p.testeAte) || "",
      botaoTexto: "Continuar os meus eventos",
      botaoCaminho: "/eventos/dashboard",
    },
    {
      nome: "Convite para assinar",
      assunto: "Continue de onde você parou",
      titulo: "Sua conta está pronta para continuar",
      texto:
        `${oQueEla.charAt(0).toUpperCase() + oQueEla.slice(1)} ${continua} aqui: roteiro, fornecedores, tarefas e financeiro, do jeito que você deixou.\n` +
        `Assinando, nada para — você segue de onde parou.`,
      // o preço vem do catálogo (Ajustes); sem ele, o destaque fica de fora
      destaqueRotulo: p.preco ? "Para continuar" : undefined,
      destaqueValor: p.preco ?? undefined,
      botaoTexto: "Assinar e continuar",
      botaoCaminho: "/assinatura",
    },
    {
      nome: "Mensagem livre",
      assunto: "",
      titulo: "",
      texto: "",
      botaoTexto: "Abrir o meu painel",
      botaoCaminho: "/eventos/dashboard",
    },
  ];
}

function Botao({ rotulo, tom = "claro" }: { rotulo: string; tom?: "claro" | "escuro" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        tom === "escuro"
          ? "h-8 rounded-md bg-[#6e3f5f] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#59324c] disabled:opacity-50"
          : "h-8 rounded-md border border-[#d3d3cf] bg-white px-3.5 text-[12.5px] font-medium text-[#1c1d21] hover:border-[#9a9ba1] disabled:opacity-50"
      }
    >
      {pending ? "…" : rotulo}
    </button>
  );
}

export function EnviarEmail(p: {
  empresaId: string;
  email: string;
  nome: string;
  testeAte?: string | null;
  eventos: number;
  /** a frase do preço de hoje, lida do catálogo pela ficha */
  preco?: string | null;
}) {
  const lista = modelos({ nome: p.nome, testeAte: p.testeAte, eventos: p.eventos, preco: p.preco });
  const [aberto, setAberto] = useState(false);
  const [modelo, setModelo] = useState(0);
  const [campos, setCampos] = useState<Modelo>(lista[0]);
  const [previa, setPrevia] = useState<{ html: string; assunto: string } | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const forma = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const [estadoPrevia, verComoFica] = useFormState<
    ResultadoAdmin & { html?: string; para?: string; assunto?: string },
    FormData
  >(preverEmailDaConta, {});
  const [estadoEnvio, enviar] = useFormState<ResultadoAdmin & { para?: string }, FormData>(
    enviarEmailDaConta,
    {}
  );

  useEffect(() => {
    if (estadoPrevia.ok && estadoPrevia.html) {
      setPrevia({ html: estadoPrevia.html, assunto: estadoPrevia.assunto ?? "" });
    }
  }, [estadoPrevia]);

  useEffect(() => {
    if (estadoEnvio.ok && estadoEnvio.para) {
      setEnviado(estadoEnvio.para);
      setPrevia(null);
      router.refresh();
    }
  }, [estadoEnvio, router]);

  function trocarModelo(i: number) {
    setModelo(i);
    setCampos(lista[i]);
    setPrevia(null);
  }

  function mexeu(campo: keyof Modelo, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setPrevia(null); // o que ele vai mandar tem de ser o que ele viu
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-[#d3d3cf] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#1c1d21] hover:border-[#9a9ba1]"
      >
        E-mail
      </button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-lg border border-[#e4e4e0] bg-[#fafaf8] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[#1c1d21]">E-mail para {p.email}</p>
          <p className="mt-0.5 text-[12px] text-[#84858b]">
            Sai como eOrganizei, com o mesmo desenho dos e-mails do sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setPrevia(null);
          }}
          className="text-[12px] text-[#84858b] underline underline-offset-2"
        >
          fechar
        </button>
      </div>

      {enviado ? (
        <p className="mt-3 rounded-md border border-[#cfe3d4] bg-[#f2f8f3] px-3 py-2 text-[13px] text-[#2f5d3a]">
          E-mail enviado para {enviado}.{" "}
          <button
            type="button"
            onClick={() => {
              setEnviado(null);
              trocarModelo(modelo);
            }}
            className="underline underline-offset-2"
          >
            escrever outro
          </button>
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {lista.map((m, i) => (
              <button
                key={m.nome}
                type="button"
                onClick={() => trocarModelo(i)}
                className={`rounded-full border px-3 py-1 text-[12px] ${
                  i === modelo
                    ? "border-[#6e3f5f] bg-[#f3ebf0] font-medium text-[#6e3f5f]"
                    : "border-[#d3d3cf] bg-white text-[#3d3e44] hover:border-[#9a9ba1]"
                }`}
              >
                {m.nome}
              </button>
            ))}
          </div>

          <form ref={forma} action={verComoFica} className="mt-3 grid gap-3">
            <input type="hidden" name="empresa_id" value={p.empresaId} />
            <label className={ROTULO}>
              Assunto
              <input
                name="assunto"
                value={campos.assunto}
                maxLength={LIMITES_DO_EMAIL.assunto}
                onChange={(e) => mexeu("assunto", e.target.value)}
                className={CAMPO}
              />
            </label>
            <label className={ROTULO}>
              Título dentro do e-mail
              <input
                name="titulo"
                value={campos.titulo}
                maxLength={LIMITES_DO_EMAIL.titulo}
                onChange={(e) => mexeu("titulo", e.target.value)}
                className={CAMPO}
              />
            </label>
            <label className={ROTULO}>
              Texto — uma linha por parágrafo
              <textarea
                name="texto"
                value={campos.texto}
                rows={7}
                maxLength={LIMITES_DO_EMAIL.texto}
                onChange={(e) => mexeu("texto", e.target.value)}
                className={`${CAMPO} leading-relaxed`}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={ROTULO}>
                Destaque — rótulo (opcional)
                <input
                  name="destaque_rotulo"
                  value={campos.destaqueRotulo ?? ""}
                  maxLength={LIMITES_DO_EMAIL.destaque}
                  onChange={(e) => mexeu("destaqueRotulo", e.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className={ROTULO}>
                Destaque — valor
                <input
                  name="destaque_valor"
                  value={campos.destaqueValor ?? ""}
                  maxLength={LIMITES_DO_EMAIL.destaque}
                  onChange={(e) => mexeu("destaqueValor", e.target.value)}
                  className={CAMPO}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={ROTULO}>
                Texto do botão
                <input
                  name="botao_texto"
                  value={campos.botaoTexto}
                  maxLength={LIMITES_DO_EMAIL.botao}
                  onChange={(e) => mexeu("botaoTexto", e.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className={ROTULO}>
                O botão leva para
                <select
                  name="botao_caminho"
                  value={campos.botaoCaminho}
                  onChange={(e) => mexeu("botaoCaminho", e.target.value)}
                  className={CAMPO}
                >
                  {DESTINOS_DO_EMAIL.map((d) => (
                    <option key={d.caminho} value={d.caminho}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {(estadoPrevia.error || estadoEnvio.error) && (
              <p className="rounded-md border border-[#e6cfcf] bg-[#fbf3f3] px-3 py-2 text-[12.5px] text-[#8a3b3b]">
                {estadoEnvio.error ?? estadoPrevia.error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Botao rotulo={previa ? "Atualizar a prévia" : "Ver como fica"} />
              {previa && (
                <span className="text-[12px] text-[#84858b]">
                  Confira e mande — o e-mail sai na hora, e não dá para desfazer.
                </span>
              )}
            </div>
          </form>

          {previa && (
            <div className="mt-4">
              <p className="text-[11.5px] uppercase tracking-[0.06em] text-[#84858b]">
                Assunto: <span className="font-semibold text-[#1c1d21]">{previa.assunto}</span>
              </p>
              <iframe
                title="Prévia do e-mail"
                srcDoc={previa.html}
                className="mt-2 h-[520px] w-full rounded-lg border border-[#e4e4e0] bg-white"
              />
              <form
                action={enviar}
                className="mt-3 flex items-center gap-3"
                onSubmit={(e) => {
                  if (!confirm(`Enviar este e-mail para ${p.email}?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="empresa_id" value={p.empresaId} />
                <input type="hidden" name="assunto" value={campos.assunto} />
                <input type="hidden" name="titulo" value={campos.titulo} />
                <input type="hidden" name="texto" value={campos.texto} />
                <input type="hidden" name="destaque_rotulo" value={campos.destaqueRotulo ?? ""} />
                <input type="hidden" name="destaque_valor" value={campos.destaqueValor ?? ""} />
                <input type="hidden" name="botao_texto" value={campos.botaoTexto} />
                <input type="hidden" name="botao_caminho" value={campos.botaoCaminho} />
                <Botao rotulo={`Enviar para ${p.email}`} tom="escuro" />
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
