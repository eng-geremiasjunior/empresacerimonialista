"use client";

// Depois do cadastro (12/10/2026): a conta só abre pelo link que foi para
// o e-mail. As três portas (gratuito, teste com cartão e assinar pelo
// anúncio) terminam aqui em vez de entrar direto.

import Link from "next/link";

export function ConfiraSeuEmail({ email }: { email: string }) {
  return (
    <div
      role="status"
      style={{
        maxWidth: 460,
        margin: "40px auto",
        padding: "28px 24px",
        borderRadius: 14,
        background: "#fff",
        border: "1px solid #e7e5e4",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        color: "#221E1B",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Confira seu e-mail</h1>
      <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, color: "#57534e" }}>
        Enviamos um link para <strong style={{ color: "#221E1B", wordBreak: "break-all" }}>{email}</strong>. Abra o
        link para entrar na sua conta.
      </p>
      <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: "#78716c" }}>
        Não chegou? Veja a caixa de spam ou promoções.
      </p>
      <Link
        href="/login"
        style={{
          display: "inline-block",
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: 8,
          background: "#221E1B",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Já confirmei, entrar
      </Link>
    </div>
  );
}
