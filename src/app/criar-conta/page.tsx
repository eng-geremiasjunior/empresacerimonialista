import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogoDePlanos, reais } from "@/lib/planos";
import { dadosDoBanner } from "@/lib/planos-banner";
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

  // O PORTÃO decide só o TESTE de 7 dias (23/09/2026): o cadastro existe
  // sempre, porque o plano Gratuito existe sempre. Fechado, o plano pago
  // vai para o checkout e paga na hora.
  const portao = await portaoDoTeste();

  // Sem catálogo não há o que agendar: a página de vendas explica.
  const oferta = await ofertaDoTeste(portao.dias);
  if (!oferta) redirect("/planos");

  // A tela de planos (23/09/2026): a oferta do teste de CADA plano pago —
  // o que a etapa do cartão mostra depende do que ela escolheu —, e o
  // banner com os preços do painel.
  const [catalogo, banner] = await Promise.all([getCatalogoDePlanos(), dadosDoBanner()]);
  const ofertas: Record<string, {
    dias: number;
    comecaEm: string;
    termina: string;
    preco: string;
    primeiraCobranca: string;
    valorPrimeiro: number;
    planoNome: string;
    planoCodigo: string;
  }> = {};
  for (const p of catalogo) {
    const o = await ofertaDoTeste(portao.dias, undefined, p.codigo);
    if (!o) continue;
    ofertas[p.codigo] = {
      dias: portao.dias,
      comecaEm: o.texto.comecaEm,
      termina: o.texto.termina,
      preco: o.texto.preco,
      primeiraCobranca: o.texto.primeiraCobranca,
      valorPrimeiro: o.valorPrimeiro,
      planoNome: o.plano.nome,
      planoCodigo: o.plano.codigo,
    };
  }

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
          maxWidth: "1020px",
          margin: "0 auto",
          padding: "clamp(28px,5vw,48px) clamp(16px,4vw,28px) 64px",
        }}
      >
        <CriarContaDeTeste
          ofertas={ofertas}
          banner={banner}
          testeAberto={portao.aberto}
          precoDeEntrada={reais(oferta.valorPrimeiro)}
        />
      </main>
      {/* o pixel e a tag do Google: é aqui que o anúncio do teste termina */}
      <Medicao />
    </div>
  );
}
