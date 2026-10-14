// O rastro das tentativas barradas (207, 13/10/2026): o bloqueio por IP
// do middleware e as recusas do cadastro passam a ser contados, para o
// dono ver no /admin se quem foi barrado voltou. Só porta, motivo, IP e
// hora — nada do que a pessoa digitou.
//
// Leve de propósito (só fetch, sem node: nem next/headers): o middleware
// roda na borda. Nunca lança e nunca segura a resposta por mais de 2 s.

export type PortaBarrada = "site" | "cadastro" | "assinatura" | "portal";

export type MotivoBarrado =
  | "ip_bloqueado"
  | "navegador_barrado"
  | "conta_suspensa"
  | "email_descartavel"
  | "email_sem_caixa"
  | "documento_repetido"
  | "conta_repetida"
  | "fora_do_brasil"
  | "impressao_digital";

export async function registrarTentativaBarrada(porta: PortaBarrada, motivo: MotivoBarrado, ip: string | null): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return;
  try {
    await fetch(`${url}/rest/v1/rpc/registrar_tentativa_barrada`, {
      method: "POST",
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_porta: porta, p_motivo: motivo, p_ip: ip ?? "" }),
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // o rastro nunca derruba o bloqueio nem o cadastro
  }
}
