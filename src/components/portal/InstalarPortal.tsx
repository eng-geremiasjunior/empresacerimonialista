"use client";

// "Deixe o portal na tela do seu celular."
//
// Registra o service worker e, quando dá, convida a instalar. São dois
// mundos diferentes e o convite muda com eles:
//
//   Android/Chrome — o navegador avisa que dá para instalar
//     (beforeinstallprompt). Guardamos o evento e abrimos o diálogo
//     nativo no toque dela. Um toque, acabou.
//   iPhone/Safari — não existe evento nem diálogo. A única forma é
//     Compartilhar → Adicionar à Tela de Início, e ela precisa ser
//     ensinada. Por isso o texto muda de acordo com o aparelho.
//
// Regras que a tela obedece:
//   * nada aparece para quem já instalou (o app abre em standalone);
//   * quem dispensa não vê de novo (fica gravado no aparelho dela);
//   * tudo é decidido depois da hidratação — ler localStorage ou
//     matchMedia durante o render quebraria a primeira pintura.

import { useEffect, useState } from "react";

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE = "portal-instalar-dispensado";

function jaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  // o iOS não implementa display-mode: standalone; usa esta propriedade
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone;
  return Boolean(standalone || iosStandalone);
}

function ehIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ se declara Mac; o toque é o que o denuncia
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

export function InstalarPortal() {
  const [convite, setConvite] = useState<PromptInstalacao | null>(null);
  const [modo, setModo] = useState<"nenhum" | "android" | "ios">("nenhum");

  useEffect(() => {
    // O service worker entra sempre: é ele que segura a tela de "sem
    // conexão" quando o sinal cai no salão, instalada ou não.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/portal-sw.js", { scope: "/portal/" })
        .catch(() => {
          /* sem service worker o portal continua inteiro; só perde o offline */
        });
    }

    if (jaInstalado()) return;
    try {
      if (localStorage.getItem(CHAVE) === "1") return;
    } catch {
      /* navegador com armazenamento bloqueado: mostra, e paciência */
    }

    if (ehIOS()) {
      setModo("ios");
      return;
    }

    function aoPoderInstalar(e: Event) {
      e.preventDefault();
      setConvite(e as PromptInstalacao);
      setModo("android");
    }
    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    return () =>
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
  }, []);

  function dispensar() {
    setModo("nenhum");
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      /* sem armazenamento, volta na próxima visita — aceitável */
    }
  }

  async function instalar() {
    if (!convite) return;
    await convite.prompt();
    await convite.userChoice;
    dispensar();
  }

  if (modo === "nenhum") return null;

  return (
    <div className="portal-instalar" role="note">
      <div className="portal-instalar-texto">
        <strong>Deixe o portal na tela do seu celular.</strong>
        {modo === "ios" && (
          <span>
            Toque em <b>Compartilhar</b> e depois em{" "}
            <b>Adicionar à Tela de Início</b>.
          </span>
        )}
      </div>
      <div className="portal-instalar-acoes">
        {modo === "android" && (
          <button type="button" onClick={instalar} className="portal-instalar-ok">
            Adicionar
          </button>
        )}
        <button type="button" onClick={dispensar} className="portal-instalar-nao">
          Agora não
        </button>
      </div>
    </div>
  );
}
