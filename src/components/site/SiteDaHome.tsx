import { newsreader, planosDoSite } from "@/lib/planos-do-site";
import { SiteModelo2 } from "@/components/planos/SiteModelo2";
import { MenuDoSite } from "./MenuDoSite";
import { Apresentacao } from "./Apresentacao";
import { Palco } from "./Palco";
import { RoteiroAoVivo } from "./RoteiroAoVivo";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";

// A home do site (27/09/2026), a mesma na raiz (visitante) e na /planos
// (destino dos anúncios; decisão do dono: "pode ficar em planos mesmo, nos
// dois"): a base da página de vendas (modelo 2) com o menu do site, a
// apresentação que troca de tela com a rolagem, o palco do dia do evento
// e o roteiro andando. Preços do painel, como sempre.
export async function SiteDaHome() {
  const { planos, hrefConta, hrefPlano } = await planosDoSite();
  return (
    <div className={newsreader.variable}>
      <SiteModelo2
        planos={planos}
        hrefConta={hrefConta}
        hrefPlano={hrefPlano}
        menu={<MenuDoSite hrefConta={hrefConta} />}
        apresentacao={
          <>
            <Apresentacao />
            <Palco />
            <RoteiroAoVivo />
          </>
        }
      />
      {/* a marca do anúncio guardada na primeira tela */}
      <Origem />
      {/* toda âncora desta página vira evento medido */}
      <MedirCliques />
      <Medicao />
    </div>
  );
}
