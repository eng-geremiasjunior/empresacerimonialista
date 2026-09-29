import { headers } from "next/headers";
import { servico } from "@/lib/supabase/admin-painel";
import { Cartao, Rotulo } from "@/components/portal/Nucleo";
import { SairDoPortal } from "@/components/portal/SairDoPortal";
import { entrarComoFamilia } from "@/app/(app)/eventos/[id]/area-do-cliente/portal-dono-actions";
import { PREFIXOS_DO_PORTAL, SUBDOMINIO_DO_PORTAL } from "@/lib/app-url";

// A entrada do portal para o dono do sistema quando ele ainda não é
// família de evento nenhum: os eventos das contas da casa (as de teste),
// cada um com "Entrar como a família". Quem chama já conferiu que ele é
// o dono (SUPER_ADMIN_EMAILS); a trava de conta da casa está também na
// ação. No endereço de um portal (debut., casamento.), só os eventos
// daquele tipo — o mapa sai da mesma lista do app-url.

const TIPO_DO_PREFIXO: Record<string, string> = Object.fromEntries(
  Object.entries(SUBDOMINIO_DO_PORTAL)
    .filter((par): par is [string, string] => Boolean(par[1]))
    .map(([tipo, sub]) => [`${sub}.`, tipo])
);

export async function EscolhaDoDono() {
  const host = headers().get("x-forwarded-host") ?? headers().get("host") ?? "";
  const prefixo = PREFIXOS_DO_PORTAL.find((p) => host.startsWith(p)) ?? null;
  const tipo = prefixo ? TIPO_DO_PREFIXO[prefixo] ?? null : null;

  const db = servico();
  const { data: casa } = await db.from("contas_da_casa").select("empresa_id");
  const empresas = ((casa ?? []) as { empresa_id: string }[]).map((c) => c.empresa_id);
  let q = db
    .from("events")
    .select("id, name, type, date, empresas(nome)")
    .in("empresa_id", empresas.length ? empresas : ["00000000-0000-0000-0000-000000000000"])
    .order("date", { ascending: false })
    .limit(40);
  if (tipo) q = q.eq("type", tipo);
  const { data } = await q;
  const eventos = (data ?? []) as unknown as { id: string; name: string | null; type: string; date: string | null; empresas: { nome: string | null } | null }[];

  return (
    <div className="portal-raiz">
      <div className="portal-fora" style={{ padding: "var(--esp-9) var(--esp-6)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--esp-5)" }}>
          <Cartao padding="var(--esp-7)">
            <Rotulo>Contas da casa · só você vê</Rotulo>
            <h1 style={{ fontFamily: "var(--fonte-titulo)", fontWeight: 400, fontSize: "var(--ts-h2)", color: "var(--cor-texto-forte)", margin: "6px 0 0" }}>
              Entrar como a família
            </h1>
            {eventos.length === 0 && (
              <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>Nenhum evento {tipo ? "deste tipo " : ""}nas contas da casa.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
              {eventos.map((ev) => (
                <form key={ev.id} action={entrarComoFamilia} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid var(--cor-borda-linha)" }}>
                  <input type="hidden" name="eventId" value={ev.id} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: "var(--cor-texto-forte)" }}>{ev.name || "Evento sem nome"}</div>
                    <div style={{ fontSize: 12.5, color: "var(--cor-texto-suave)" }}>
                      {[ev.empresas?.nome, ev.date ? ev.date.split("-").reverse().join("/") : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button type="submit" style={{ flex: "none", height: 40, padding: "0 14px", border: 0, borderRadius: 12, background: "#6E3F5F", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Entrar
                  </button>
                </form>
              ))}
            </div>
          </Cartao>
          <SairDoPortal />
        </div>
      </div>
    </div>
  );
}
