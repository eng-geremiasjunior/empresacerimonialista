import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reais } from "@/lib/planos";
import { portaoDoTeste } from "@/lib/supabase/teste-gratis";
import { ofertaDoTeste } from "@/lib/teste-com-cartao";
import { CriarContaDeTeste } from "@/components/auth/CriarContaDeTeste";
import { Medicao } from "@/components/marketing/Medicao";
import { Simbolo } from "@/components/marca/Marca";
import { CSS_PLANOS } from "@/components/planos/estilo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar conta — eorganizei",
  // Fim do funil do anúncio, como o checkout: não é destino de busca.
  robots: { index: false, follow: false },
};

// A porta do teste de sete dias (154), com o cartão no cadastro (21/09/2026).
//
// O cartão é conferido sem cobrar; a assinatura fica agendada para o dia
// seguinte ao fim do teste. O que a tela promete (dia e valor) é calculado
// aqui, pela mesma função que a action usa para agendar
// (lib/teste-com-cartao.ts).
//
// O PIXEL RODA AQUI (decisão do dono, 21/09/2026: "no WooCommerce tem
// pixel na tela de checkout"). Ele não vê o cartão — o número vai por
// token direto para a operadora — e manda os fatos com o mesmo id do
// servidor: chegou ao cartão, a conta nasceu, o teste começou.
//
// O PORTÃO MANDA. Fechado, esta página não existe — manda para o
// checkout. Quem liga e desliga é o dono, no /admin, sem publicar nada.
export default async function CriarContaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/eventos/dashboard");

  const portao = await portaoDoTeste();
  if (!portao.aberto) redirect("/comecar");

  // Sem catálogo não há o que agendar: a página de vendas explica.
  const oferta = await ofertaDoTeste(portao.dias);
  if (!oferta) redirect("/planos");

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
          Teste de {portao.dias} dias
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
          fornecedor. O cartão fica guardado e nada é cobrado hoje: a primeira cobrança é em{" "}
          {oferta.texto.comecaEm}.
        </p>

        <CriarContaDeTeste
          oferta={{
            dias: portao.dias,
            comecaEm: oferta.texto.comecaEm,
            termina: oferta.texto.termina,
            preco: oferta.texto.preco,
            primeiraCobranca: oferta.texto.primeiraCobranca,
            valorPrimeiro: oferta.valorPrimeiro,
            planoNome: oferta.plano.nome,
            planoCodigo: oferta.plano.codigo,
          }}
          precoDeEntrada={reais(oferta.valorPrimeiro)}
        />
      </main>
      {/* o pixel e a tag do Google: é aqui que o anúncio do teste termina */}
      <Medicao />
    </div>
  );
}
