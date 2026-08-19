// Verificador de configuração de e-mail.
//
//   node scripts/checar-email.mjs              → confere o .env.local
//   node scripts/checar-email.mjs --entrega    → também tenta uma entrega real
//
// Existe porque o modo de teste do Resend falha em silêncio do ponto de
// vista de quem usa o sistema: a cerimonialista clica em "enviar", a tela
// não acusa nada, e o fornecedor simplesmente nunca recebe. Aqui a
// pergunta é respondida direto pela API.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(raiz, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

let problemas = 0;
const ok = (t) => console.log(`  ok    ${t}`);
const erro = (t) => { problemas++; console.log(`  FALTA ${t}`); };

console.log("\nCONFIGURAÇÃO LOCAL (.env.local)\n");

const chave = env.RESEND_API_KEY;
chave ? ok(`RESEND_API_KEY presente (${chave.slice(0, 8)}…)`) : erro("RESEND_API_KEY");

const from = env.EMAIL_FROM ?? "";
if (!from) {
  erro("EMAIL_FROM — sem ele o sistema usa o domínio de teste");
} else if (/resend\.dev/i.test(from)) {
  erro(`EMAIL_FROM está no domínio de teste (${from}) — só entrega para o dono da conta`);
} else {
  ok(`EMAIL_FROM com domínio próprio (${from})`);
}

const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
if (/localhost|127\.0\.0\.1/.test(appUrl)) {
  console.log(`  aviso NEXT_PUBLIC_APP_URL local (${appUrl}) — ok para desenvolver;`);
  console.log("        na Vercel precisa ser o endereço público, senão o link do e-mail");
  console.log("        aponta para a máquina de quem programou");
} else if (appUrl) {
  ok(`NEXT_PUBLIC_APP_URL pública (${appUrl})`);
} else {
  erro("NEXT_PUBLIC_APP_URL");
}

env.CRON_SECRET ? ok("CRON_SECRET presente") : erro("CRON_SECRET — as rotinas diárias recusam rodar sem ele");

if (process.argv.includes("--entrega") && chave) {
  console.log("\nTESTE DE ENTREGA REAL\n");
  const destino = process.argv[process.argv.indexOf("--entrega") + 1] ?? "delivered@resend.dev";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: from || "Vela <onboarding@resend.dev>",
      to: [destino],
      subject: "Vela — teste de configuração",
      html: "<p>Se você recebeu este e-mail, o envio está funcionando.</p>",
    }),
  });
  const corpo = await r.text();
  if (r.ok) {
    ok(`entrega aceita para ${destino}`);
    if (destino === "delivered@resend.dev") {
      console.log("        (endereço de sandbox: aceita sempre. Repita com um e-mail");
      console.log("         de verdade que NÃO seja o dono da conta para valer como prova)");
    }
  } else if (r.status === 403 && /own email address/i.test(corpo)) {
    erro(`recusado: a conta só entrega para o dono. Domínio ainda não verificado.`);
  } else {
    erro(`recusado (${r.status}): ${corpo.slice(0, 160)}`);
  }
}

console.log(
  problemas === 0
    ? "\nTudo configurado.\n"
    : `\n${problemas} item(ns) a resolver antes de enviar e-mail para cliente real.\n`
);
process.exit(problemas ? 1 : 0);
