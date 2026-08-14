import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosDaCliente, nomeDeExibicao } from "@/lib/supabase/portal";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { dataLonga } from "@/components/portal/datas";
import { Cartao, Rotulo } from "@/components/portal/Nucleo";
import { ChevronRight, TAMANHO_PEQUENO, TRACO } from "@/components/portal/icones";

export const dynamic = "force-dynamic";

// Porta de dentro. Com um evento só, entra direto — a escolha só existe
// quando ela de fato tem mais de um (uma cliente pode ter um casamento
// hoje e outro tipo de evento depois).
export default async function PortalHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/entrar");

  const eventos = await getEventosDaCliente();

  if (eventos.length === 1) {
    redirect(`/portal/${eventos[0].id}`);
  }

  // Sem vínculo nenhum: quem é da equipe volta para a área dela (chegou
  // aqui por engano ou digitando o endereço); quem não é vê o recado.
  if (eventos.length === 0) {
    const { cargo } = await getMeuCargo();
    if (cargo !== null) redirect("/eventos/dashboard");
  }

  return (
    <div className="portal-raiz">
      <div className="portal-fora" style={{ padding: "var(--esp-9) var(--esp-6)" }}>
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--esp-5)",
          }}
        >
          {eventos.length === 0 ? (
            <Cartao padding="var(--esp-8)">
              <h1
                style={{
                  fontFamily: "var(--fonte-titulo)",
                  fontWeight: 400,
                  fontSize: "var(--ts-h2)",
                  color: "var(--cor-texto-forte)",
                }}
              >
                Seu acesso ainda não está ligado a um evento.
              </h1>
              <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
                Fale com sua cerimonialista para liberar o acompanhamento.
              </p>
            </Cartao>
          ) : (
            <>
              <Rotulo>Seus eventos</Rotulo>
              {eventos.map((ev) => (
                <Link key={ev.id} href={`/portal/${ev.id}`} style={{ color: "inherit" }}>
                  <Cartao
                    padding="var(--esp-6)"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--esp-4)",
                    }}
                  >
                    <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span
                        style={{
                          fontFamily: "var(--fonte-titulo)",
                          fontSize: "var(--ts-titulo-item)",
                          color: "var(--cor-texto-forte)",
                        }}
                      >
                        {nomeDeExibicao(ev)}
                      </span>
                      <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
                        {dataLonga(ev.data)}
                        {ev.local ? ` · ${ev.local}` : ""}
                      </span>
                    </span>
                    <span style={{ color: "var(--cor-icone-neutro)", display: "flex" }} aria-hidden>
                      <ChevronRight size={TAMANHO_PEQUENO} strokeWidth={TRACO} />
                    </span>
                  </Cartao>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
