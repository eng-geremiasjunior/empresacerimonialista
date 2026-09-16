"use client";

import { useState } from "react";
import { EVENTO_LINK_COPIADO } from "@/lib/guia-vivo";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // o link do roteiro de um fornecedor fecha o último passo do guia
    if (path.includes("/roteiro/publico/")) {
      window.dispatchEvent(new Event(EVENTO_LINK_COPIADO));
    }
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-stone-400"
    >
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}
