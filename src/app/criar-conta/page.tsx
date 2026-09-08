import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  faixasDaEscada,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
  reais,
} from "@/lib/planos";
import { portaoDoTeste } from "@/lib/supabase/teste-gratis";
import { CriarContaGratis } from "@/components/auth/CriarContaGratis";
import { Simbolo } from "@/components/marca/Marca";
import { CSS_PLANOS } from "@/components/planos/estilo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar conta — eorganizei",
  // Fim do funil do anúncio, como o checkout: não é destino de busca.
  robots: { index: false, follow: false },
};

// A porta do teste de sete dias (154).
//
// Existe porque, sem ela, "primeira conta criada" e "primeira assinante"
// eram o MESMO evento: a única entrada pedia cartão e dezesseis campos
// antes da primeira tela do produto. Aqui são quatro campos e nenhum
// cartão.
//
// O PORTÃO MANDA. Fechado, esta página não existe — manda para o
// checkout, que é o comportamento anterior à 154. Quem liga e desliga é
// o dono, no /admin, sem publicar nada.
export default async function CriarContaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/eventos/dashboard");

  const portao = await portaoDoTeste();
  if (!portao.aberto) redirect("/comecar");

  // O preço do botão secundário sai do mesmo lugar da vitrine: primeiro
  // degrau da escada, se ela desconta; senão, o plano de entrada. Sem
  // catálogo, o botão fica sem preço — mas fica.
  const planos = await getCatalogoDePlanos();
  const escada = await getEscadaDaPromocao(PROMOCAO_LANCAMENTO);
  const planoPromovido = planos.find((p) => p.codigo === PLANO_DA_PROMOCAO) ?? null;
  const faixas =
    escada && escada.degraus.length > 0 && planoPromovido
      ? faixasDaEscada(escada, planoPromovido.valorMensal)
      : null;
  const desconta =
    faixas !== null &&
    planoPromovido !== null &&
    faixas[0].valorMensal > 0 &&
    faixas[0].valorMensal < planoPromovido.valorMensal;
  const planoDeEntrada =
    planoPromovido ?? [...planos].sort((a, b) => a.valorMensal - b.valorMensal)[0] ?? null;
  const preco = desconta && faixas ? faixas[0].valorMensal : (planoDeEntrada?.valorMensal ?? null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF8F5",
        color: "#221E1B",
        fontFamily: "var(--font-ui, 'Instrument Sans', sans-serif)",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS_PLANOS }} />

      <header
        style={{
          borderBottom: "1px solid #E6E0D8",
          background: "#FAF8F5",
        }}
      >
        <div
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            padding: "0 clamp(20px,4vw,28px)",
            display: "flex",
            alignItems: "center",
            height: "56px",
          }}
        >
          <a
            href="/planos"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "#221E1B",
            }}
          >
            <Simbolo tamanho={26} />
            <span
              style={{
                fontFamily: "var(--font-title, Inter, sans-serif)",
                fontWeight: "600",
                fontSize: "18px",
                letterSpacing: "-0.03em",
              }}
            >
              e<span style={{ color: "#6E3F5F" }}>organizei</span>
            </span>
          </a>
        </div>
      </header>

      <main
        style={{
          maxWidth: "460px",
          margin: "0 auto",
          padding: "clamp(36px,6vw,64px) clamp(20px,5vw,28px) 64px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            marginBottom: "12px",
            padding: "5px 12px",
            borderRadius: "999px",
            background: "#F3EBF0",
            color: "#6E3F5F",
            fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
            fontSize: "11px",
            fontWeight: "500",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          {portao.dias} dias grátis
        </span>
        <h1
          style={{
            margin: "0 0 10px",
            fontFamily: "var(--font-title, Inter, sans-serif)",
            fontWeight: "600",
            fontSize: "clamp(26px,4vw,34px)",
            lineHeight: "1.13",
            letterSpacing: "-0.03em",
            textWrap: "balance",
          }}
        >
          Comece pelo evento que você já está organizando.
        </h1>
        <p
          style={{
            margin: "0 0 28px",
            fontSize: "16px",
            lineHeight: "1.55",
            color: "#6B6259",
            textWrap: "pretty",
          }}
        >
          Cadastre um evento de verdade, monte o roteiro do dia e mande o link para o
          fornecedor. Dá para fazer isso nos primeiros dez minutos.
        </p>

        <CriarContaGratis dias={portao.dias} precoDeEntrada={preco !== null ? reais(preco) : null} />
      </main>
    </div>
  );
}
