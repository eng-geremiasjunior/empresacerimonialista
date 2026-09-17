// A caixa de entrada do suporte (161) — o outro lado da caixinha que fica
// no canto do sistema. À esquerda, quem escreveu; à direita, a conversa
// aberta e a resposta. Abrir a conversa marca como lida.
//
// A conversa escolhida vai na URL (?u=<user_id>), não em estado de tela:
// recarregar, voltar e mandar o link para si mesmo continuam abrindo a
// mesma conversa.
//
// Desde 16/09/2026 a resposta sai também por e-mail, e cada resposta diz
// o que se sabe dela: se a pessoa abriu a caixinha com ela na tela
// ("vista") e o que o e-mail fez ("entregue" é o provedor dela ter
// aceitado — não é leitura). O dono estava "no escuro": respondia e não
// sabia se a cliente tinha visto.

import Link from "next/link";
import {
  getConversaSuporte,
  getConversasSuporte,
  getPessoaDoSuporte,
  type AvisoPorEmail,
  type PessoaDoSuporte,
} from "@/lib/supabase/admin-painel";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { RespostaSuporte } from "./RespostaSuporte";
import { AvisarPorEmail } from "./AvisarPorEmail";

export const dynamic = "force-dynamic";

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

const SITUACAO_DO_EMAIL: Record<string, string> = {
  entregue: "e-mail entregue",
  // o Resend aceitou; a entrega só aparece quando ele confirmar
  enviado: "e-mail enviado",
  atrasado: "e-mail atrasado no provedor dela",
  nao_chegou: "o e-mail não chegou (endereço recusou)",
  spam: "o e-mail foi marcado como spam",
};

function linhaDoAviso(aviso: AvisoPorEmail): string {
  if (aviso.estado === "enviado") return SITUACAO_DO_EMAIL[aviso.situacao] ?? "e-mail enviado";
  if (aviso.estado === "falhou") return `o e-mail não saiu: ${aviso.falha}`;
  return "sem aviso por e-mail";
}

function Pessoa({ pessoa }: { pessoa: PessoaDoSuporte }) {
  const wa = linkWhatsapp(
    pessoa.whatsapp,
    `Oi${pessoa.primeiroNome ? `, ${pessoa.primeiroNome}` : ""}! Respondi a sua mensagem no Suporte do eOrganizei.`
  );
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500">
      <span>
        Último login: {pessoa.ultimoLogin ? quando(pessoa.ultimoLogin) : "nunca registrado"}
      </span>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-stone-200 px-2 py-1 font-medium text-stone-700 hover:bg-stone-50"
        >
          Chamar no WhatsApp
        </a>
      ) : (
        <span className="text-stone-400">sem WhatsApp no cadastro</span>
      )}
    </div>
  );
}

export default async function AdminSuportePage({
  searchParams,
}: {
  searchParams?: { u?: string };
}) {
  const conversas = await getConversasSuporte();
  // Clientes e contas da casa nunca se misturam na lista (regra dele,
  // 17/09/2026): as da casa são testes, e vêm depois, à parte.
  const deClientes = conversas.filter((c) => !c.daCasa);
  const daCasa = conversas.filter((c) => c.daCasa);
  const aberta = searchParams?.u ?? deClientes[0]?.userId ?? daCasa[0]?.userId ?? null;
  const [mensagens, pessoa] = aberta
    ? await Promise.all([getConversaSuporte(aberta), getPessoaDoSuporte(aberta)])
    : [[], null];
  const atual = conversas.find((c) => c.userId === aberta) ?? null;
  const naoLidas = deClientes.reduce((s, c) => s + c.naoLidas, 0);

  return (
    <div data-adm-secao="suporte" className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Suporte</h1>
        <p className="mt-1 text-sm text-stone-500">
          {conversas.length === 0
            ? "Ninguém escreveu ainda. As mensagens da caixinha “Tem dúvidas?” do sistema chegam aqui."
            : `${deClientes.length} ${deClientes.length === 1 ? "conversa de cliente" : "conversas de clientes"}${
                naoLidas > 0 ? ` · ${naoLidas} ${naoLidas === 1 ? "mensagem nova" : "mensagens novas"}` : ""
              }${daCasa.length > 0 ? ` · ${daCasa.length} de contas da casa, à parte` : ""}. A resposta aparece na caixinha da pessoa e vai também por e-mail.`}
        </p>
      </div>

      {conversas.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* ---------- quem escreveu ---------- */}
          <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {deClientes.length === 0 && (
              <li className="px-4 py-3 text-xs text-stone-500">Nenhuma conversa de cliente.</li>
            )}
            {[...deClientes, ...daCasa].map((c, i) => {
              const primeiraDaCasa = c.daCasa && i === deClientes.length;
              const ativa = c.userId === aberta;
              return (
                <li key={c.userId} className="border-b border-stone-100 last:border-b-0">
                  {primeiraDaCasa && (
                    <p className="border-t border-stone-200 bg-stone-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">
                      Contas da casa
                    </p>
                  )}
                  <Link
                    href={`/admin/suporte?u=${c.userId}`}
                    className={`block px-4 py-3 transition-colors ${ativa ? "bg-stone-100" : "hover:bg-stone-50"}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-stone-900">{c.pessoa}</span>
                      <span className="shrink-0 text-[11px] text-stone-400">{quando(c.ultimaEm)}</span>
                    </div>
                    <p className="truncate text-xs text-stone-500">
                      {c.empresa}
                      {c.daCasa ? " · conta da casa" : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={`min-w-0 flex-1 truncate text-xs ${c.naoLidas > 0 ? "font-medium text-stone-800" : "text-stone-500"}`}>
                        {c.ultimoAutor === "eorganizei" ? "Você: " : ""}
                        {c.ultimaMensagem}
                      </p>
                      {c.naoLidas > 0 && (
                        <span className="shrink-0 rounded-full bg-[#6e3f5f] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {c.naoLidas}
                        </span>
                      )}
                    </div>
                    {c.respostaNaoVista && (
                      <p className="mt-1 text-[11px] font-medium text-stone-600">sua resposta ainda não foi vista</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* ---------- a conversa aberta ---------- */}
          {atual && (
            <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
              <header className="border-b border-stone-100 px-5 py-3">
                <p className="text-sm font-semibold text-stone-900">{atual.pessoa}</p>
                <p className="text-xs text-stone-500">
                  {atual.empresa}
                  {atual.daCasa ? " · conta da casa" : ""}
                  {atual.email && (
                    <>
                      {" · "}
                      <a href={`mailto:${atual.email}`} className="hover:underline">
                        {atual.email}
                      </a>
                    </>
                  )}
                </p>
                {pessoa && <Pessoa pessoa={pessoa} />}
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto bg-stone-50 px-5 py-4">
                {mensagens.map((m) => {
                  const nossa = m.autor === "eorganizei";
                  return (
                    <div key={m.id} className={`flex ${nossa ? "justify-end" : "justify-start"}`}>
                      <div className={`flex max-w-[80%] flex-col ${nossa ? "items-end" : "items-start"}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm ${
                            nossa
                              ? "rounded-br-md bg-stone-900 text-white"
                              : "rounded-bl-md border border-stone-200 bg-white text-stone-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                          <p className={`mt-1 text-[10px] ${nossa ? "text-white/60" : "text-stone-400"}`}>
                            {quando(m.em)}
                            {/* em que tela ela estava — metade das dúvidas se
                                responde sabendo isso */}
                            {!nossa && m.pagina ? ` · estava em ${m.pagina}` : ""}
                          </p>
                        </div>
                        {/* o que se sabe da resposta, fora do balão */}
                        {nossa && (
                          <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-[11px] text-stone-500">
                            <span className={m.vistaEm ? "text-stone-700" : ""}>
                              {m.vistaEm ? `vista em ${quando(m.vistaEm)}` : "ainda não vista"}
                            </span>
                            {m.aviso && (
                              <>
                                <span aria-hidden>·</span>
                                <span>{linhaDoAviso(m.aviso)}</span>
                                {m.aviso.estado !== "enviado" && <AvisarPorEmail mensagemId={m.id} />}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <RespostaSuporte userId={atual.userId} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
