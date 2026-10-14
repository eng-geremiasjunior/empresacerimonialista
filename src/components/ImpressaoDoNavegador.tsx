"use client";

// A impressão digital do navegador (14/10/2026). Pedido do dono depois que
// quem abriu contas em série voltou pelo portal da noiva com IP novo e
// cookies limpos: "bloquear por todos os mecanismos que existir".
//
// Um resumo (sha-256) de sinais técnicos que não mudam de uma visita para
// outra nem quando a operadora troca o IP: tela, fuso, idiomas, núcleos,
// placa de vídeo e um desenho de teste no canvas. Nenhum dado pessoal, e
// a versão do navegador fica de fora (muda a cada atualização). Vai num
// cookie próprio; o servidor compara no cadastro e o middleware compara
// com a lista de bloqueio. Política de privacidade: "prevenção de fraude".

import { useEffect } from "react";
import { COOKIE_IMPRESSAO } from "@/lib/ips-bloqueados";

function placaDeVideo(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext
      ? `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}|${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`
      : `${gl.getParameter(gl.VENDOR)}|${gl.getParameter(gl.RENDERER)}`;
  } catch {
    return "";
  }
}

function desenhoDeTeste(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const x = c.getContext("2d");
    if (!x) return "";
    x.textBaseline = "top";
    x.font = "16px 'Arial'";
    x.fillStyle = "#6E3F5F";
    x.fillRect(4, 4, 90, 24);
    x.fillStyle = "#221E1B";
    x.fillText("eOrganizei · ç ã 🌿 1,5", 8, 30);
    return c.toDataURL();
  } catch {
    return "";
  }
}

async function calcular(): Promise<string | null> {
  if (!window.crypto?.subtle) return null;
  const n = navigator as Navigator & { deviceMemory?: number };
  const sinais = [
    navigator.platform,
    String(navigator.hardwareConcurrency ?? ""),
    String(n.deviceMemory ?? ""),
    String(navigator.maxTouchPoints ?? ""),
    (navigator.languages ?? []).join(","),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(window.devicePixelRatio ?? ""),
    placaDeVideo(),
    desenhoDeTeste(),
  ].join("§");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sinais));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function ImpressaoDoNavegador() {
  useEffect(() => {
    let vivo = true;
    calcular()
      .then((h) => {
        if (!vivo || !h) return;
        if (document.cookie.includes(`${COOKIE_IMPRESSAO}=${h}`)) return;
        const seguro = location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${COOKIE_IMPRESSAO}=${h}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${seguro}`;
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return null;
}
