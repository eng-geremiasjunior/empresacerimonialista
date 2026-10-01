"use client";

// "Criar conta" na porta do portal (187): a noiva, ou o pai, a mãe ou o
// responsável da debutante, abre a conta do evento sozinha. Mesma arte e
// mesmas classes da porta de entrar (acesso.css) — é a mesma porta, com
// a outra metade.
//
// Só o que a conta precisa para nascer: a festa, quem é você, o nome da
// festa, a data e o login. A cidade é opcional; o resto ela conta depois,
// lá dentro.

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  criarContaDaFamilia,
  type PapelDaFamilia,
  type TipoDaFesta,
} from "@/app/(portal)/portal/criar-conta/actions";
import { IconeAlerta, IconeCheck } from "./AcessoOrnamento";
import { FOTO_CASAL_EXEMPLO } from "@/lib/portal-fotos";

const PAPEIS: Record<TipoDaFesta, { valor: PapelDaFamilia; rotulo: string }[]> = {
  casamento: [
    { valor: "noiva", rotulo: "Noiva" },
    { valor: "noivo", rotulo: "Noivo" },
  ],
  debutante: [
    { valor: "mae", rotulo: "Mãe" },
    { valor: "pai", rotulo: "Pai" },
    { valor: "outro", rotulo: "Responsável" },
  ],
};

export function CriarContaDaFamilia({
  hoje,
  sessaoAtual,
}: {
  /** AAAA-MM-DD no horário de Brasília (vem do servidor: sem relógio no 1º render) */
  hoje: string;
  /** e-mail da EQUIPE já logada neste navegador, quando houver */
  sessaoAtual?: string | null;
}) {
  const [tipo, setTipo] = useState<TipoDaFesta>("casamento");
  const [papel, setPapel] = useState<PapelDaFamilia>("noiva");
  const [festa, setFesta] = useState("");
  const [data, setData] = useState("");
  const [cidade, setCidade] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [revelar, setRevelar] = useState(false);
  const [responsavel, setResponsavel] = useState(false);
  const [termos, setTermos] = useState(false);
  const [site, setSite] = useState("");
  const [erro, setErro] = useState("");
  const [jaTemConta, setJaTemConta] = useState(false);
  const [enviando, iniciar] = useTransition();

  function escolherTipo(t: TipoDaFesta) {
    setTipo(t);
    setPapel(PAPEIS[t][0].valor);
    setErro("");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErro("");
    setJaTemConta(false);
    iniciar(async () => {
      const r = await criarContaDaFamilia({
        tipo, papel, festa, data, cidade, nome, email, senha, responsavel, termos, site,
      });
      // sucesso é redirect: só volta aqui quando deu errado
      if (r?.error) {
        setErro(r.error);
        setJaTemConta(Boolean(r.jaTemConta));
      }
    });
  }

  const casamento = tipo === "casamento";

  return (
    // casamento: a foto do casal do login dos noivos no lugar das flores
    // (pedido dele, 30/09); 15 anos continua com as flores
    <main
      className="acesso"
      style={casamento ? ({ "--foto": `url("${FOTO_CASAL_EXEMPLO}")` } as React.CSSProperties) : undefined}
    >
      <section className="acesso-arte">
        <div className="acesso-arte-topo">
          e<span style={{ color: "#B98FAC" }}>organizei</span>
        </div>
        <div className="acesso-arte-baixo">
          <p className="acesso-eyebrow">A sua festa</p>
          <p className="acesso-lead">
            Tudo num lugar só.{" "}
            <span className="acesso-say2">Do primeiro orçamento ao último convidado.</span>
          </p>
        </div>
        <div className="acesso-arte-rodape">eorganizei.com.br</div>
      </section>

      <section className="acesso-painel">
        <div className="acesso-col">
          <p className="acesso-titulo">Criar a conta da sua festa</p>

          {erro && (
            <p className="acesso-alert" role="alert">
              <IconeAlerta />
              <span>
                {erro}
                {jaTemConta && (
                  <>
                    {" "}
                    <Link href="/portal/entrar">Entrar</Link>
                  </>
                )}
              </span>
            </p>
          )}
          {sessaoAtual && (
            <p className="acesso-alert" role="status">
              <IconeAlerta />
              <span>
                Você entrou como <strong>{sessaoAtual}</strong>. Criar uma conta aqui vai
                encerrar essa sessão. Para testar sem sair do sistema, use uma janela anônima.
              </span>
            </p>
          )}

          {/* method="post": até o React hidratar o envio é nativo, e o
              padrão do HTML (GET) poria a senha na barra de endereço */}
          <form className="acesso-fields" method="post" onSubmit={enviar}>
            <fieldset className="acesso-grupo">
              <legend>A festa</legend>
              <div className="acesso-opcoes">
                <button type="button" className="acesso-opcao" aria-pressed={casamento} onClick={() => escolherTipo("casamento")}>
                  Casamento
                </button>
                <button type="button" className="acesso-opcao" aria-pressed={!casamento} onClick={() => escolherTipo("debutante")}>
                  15 anos
                </button>
              </div>
            </fieldset>

            <fieldset className="acesso-grupo">
              <legend>Você é</legend>
              <div className="acesso-opcoes">
                {PAPEIS[tipo].map((p) => (
                  <button
                    key={p.valor}
                    type="button"
                    className="acesso-opcao"
                    aria-pressed={papel === p.valor}
                    onClick={() => setPapel(p.valor)}
                  >
                    {p.rotulo}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="acesso-field">
              <label htmlFor="festa">{casamento ? "Os nomes do casal" : "O nome da debutante"}</label>
              <input
                id="festa"
                value={festa}
                onChange={(e) => setFesta(e.target.value)}
                placeholder={casamento ? "Ana e Bruno" : "Isabella"}
                maxLength={80}
                autoComplete="off"
                required
              />
            </div>

            <div className="acesso-field">
              <label htmlFor="data">A data</label>
              <input id="data" type="date" value={data} min={hoje} onChange={(e) => setData(e.target.value)} required />
            </div>

            <div className="acesso-field">
              <label htmlFor="cidade">A cidade (opcional)</label>
              <input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Goiânia"
                maxLength={80}
                autoComplete="address-level2"
              />
            </div>

            <div className="acesso-field">
              <label htmlFor="nome">O seu nome</label>
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={casamento ? "Ana Souza" : "Carla Souza"}
                maxLength={80}
                autoComplete="name"
                required
              />
            </div>

            <div className="acesso-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div className="acesso-field">
              <label htmlFor="senha">Senha</label>
              <div className="acesso-pw">
                <input
                  id="senha"
                  type={revelar ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="8 letras ou números, no mínimo"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="acesso-reveal"
                  aria-pressed={revelar}
                  aria-label={revelar ? "Ocultar a senha" : "Mostrar a senha"}
                  onClick={() => setRevelar((r) => !r)}
                >
                  {revelar ? "ocultar" : "mostrar"}
                </button>
              </div>
            </div>

            {/* robô preenche; gente não vê */}
            <div className="acesso-escondido" aria-hidden="true">
              <label htmlFor="site">Site</label>
              <input id="site" tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
            </div>

            {!casamento && (
              <label className="acesso-keep acesso-caixa">
                <input
                  type="checkbox"
                  className="acesso-nativa"
                  checked={responsavel}
                  onChange={(e) => setResponsavel(e.target.checked)}
                />
                <span className="acesso-box">
                  <IconeCheck cor="#140D07" />
                </span>
                <span>Sou pai, mãe ou responsável legal pela debutante.</span>
              </label>
            )}

            <label className="acesso-keep acesso-caixa">
              <input
                type="checkbox"
                className="acesso-nativa"
                checked={termos}
                onChange={(e) => setTermos(e.target.checked)}
              />
              <span className="acesso-box">
                <IconeCheck cor="#140D07" />
              </span>
              <span>
                Li e aceito os{" "}
                <a href="/termos" target="_blank" rel="noopener">
                  Termos
                </a>{" "}
                e a{" "}
                <a href="/privacidade" target="_blank" rel="noopener">
                  Política de privacidade
                </a>
                .
              </span>
            </label>

            <button type="submit" className="acesso-btn" disabled={enviando} aria-busy={enviando || undefined}>
              {enviando ? (
                <>
                  <span className="acesso-spin" />
                  Criando
                </>
              ) : (
                "Criar a conta"
              )}
            </button>
          </form>
        </div>

        <div className="acesso-rodape">
          <div className="acesso-rule" />
          <p className="acesso-help">
            Já tem conta? <Link href="/portal/entrar"><b>Entrar</b></Link>
          </p>
          <p className="acesso-vela">eorganizei</p>
        </div>
      </section>
    </main>
  );
}
