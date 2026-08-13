import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosDaCliente, nomeDeExibicao } from "@/lib/supabase/portal";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { temaDoEvento } from "@/lib/portal-tema";
import { formatDate } from "@/lib/format";
import { Atmosfera } from "@/components/portal/Atmosfera";

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

  if (eventos.length === 0) {
    return (
      <div className="portal-raiz" data-tema="carvao">
        <div style={{ position: "relative", minHeight: "100vh" }}>
          <Atmosfera />
          <main
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: "var(--largura-max)",
              margin: "0 auto",
              padding: "var(--esp-9) var(--portal-padding)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontStyle: "italic",
                fontSize: "var(--ts-titulo)",
                lineHeight: "var(--el-titulo)",
                margin: 0,
              }}
            >
              Seu acesso ainda não está ligado a um evento.
            </p>
            <p
              style={{
                marginTop: "var(--esp-5)",
                fontSize: "var(--ts-corpo-p)",
                lineHeight: "var(--el-corpo-p)",
                color: "var(--cor-texto-secundario)",
              }}
            >
              Fale com sua cerimonialista para liberar o acompanhamento.
            </p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-raiz" data-tema={temaDoEvento(eventos[0].tipo)}>
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <Atmosfera />
        <main
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "var(--largura-max)",
            margin: "0 auto",
            padding: "var(--esp-9) var(--portal-padding)",
          }}
        >
          <p
            style={{
              fontSize: "var(--ts-rotulo)",
              fontWeight: 500,
              letterSpacing: "var(--tr-rotulo)",
              textTransform: "uppercase",
              color: "var(--cor-texto-secundario)",
              margin: 0,
            }}
          >
            Seus eventos
          </p>

          <div style={{ marginTop: "var(--esp-7)" }}>
            {eventos.map((ev, i) => (
              <Link
                key={ev.id}
                href={`/portal/${ev.id}`}
                style={{
                  display: "block",
                  padding: "var(--esp-5) 0",
                  borderBottom:
                    i === eventos.length - 1 ? "none" : "var(--borda-fina)",
                  minHeight: "var(--toque-min)",
                  color: "inherit",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--fonte-titulo)",
                    fontStyle: "italic",
                    fontSize: "var(--ts-subtitulo)",
                    lineHeight: "var(--el-subtitulo)",
                    color: "var(--cor-texto-principal)",
                  }}
                >
                  {nomeDeExibicao(ev)}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: "var(--esp-1)",
                    fontSize: "var(--ts-corpo-p)",
                    color: "var(--cor-texto-secundario)",
                  }}
                >
                  {formatDate(ev.data)}
                  {ev.local ? ` · ${ev.local}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
