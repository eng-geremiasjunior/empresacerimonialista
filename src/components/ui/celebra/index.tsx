"use client";

// Primitivos do Celebra Pro Design System — implementados sobre os tokens
// de globals.css. São a fonte da verdade visual das telas novas (Tarefas/
// Organização); reusar em vez de estilizar na mão.

import { forwardRef, type ReactNode } from "react";

/* ---------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "ghost";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "md";
  }
>(function Button({ variant = "primary", size = "md", className = "", style, ...props }, ref) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: "var(--r-md)",
    fontFamily: "var(--font-ui)",
    fontWeight: 600,
    fontSize: size === "sm" ? 12.5 : 13.5,
    height: size === "sm" ? 34 : 40,
    padding: size === "sm" ? "0 12px" : "0 16px",
    cursor: "pointer",
    transition: "background 120ms ease, border-color 120ms ease",
    border: "1px solid transparent",
  };
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "#fff" },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-strong)",
      borderColor: "var(--border-hairline)",
    },
    ghost: { background: "transparent", color: "var(--text-body)" },
  };
  return (
    <button
      ref={ref}
      className={`celebra-btn celebra-btn-${variant} disabled:opacity-60 ${className}`}
      style={{ ...base, ...variants[variant], ...style }}
      {...props}
    />
  );
});

/* ---------------------------------------------------------- Badge */

export type BadgeTone = "ok" | "wait" | "late" | "plum" | "sage" | "neutral";

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  ok: { bg: "var(--state-ok-bg)", fg: "var(--state-ok)" },
  wait: { bg: "var(--state-wait-bg)", fg: "var(--state-wait)" },
  late: { bg: "var(--state-late-bg)", fg: "var(--state-late)" },
  plum: { bg: "var(--accent-tint)", fg: "var(--accent)" },
  sage: { bg: "var(--salvia-50)", fg: "var(--salvia-600)" },
  neutral: { bg: "var(--surface-sunken)", fg: "var(--text-muted)" },
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const t = BADGE_TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: t.bg,
        color: t.fg,
        borderRadius: "var(--r-pill)",
        padding: "3px 9px",
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------- Switch */

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: "var(--r-pill)",
        background: checked ? "var(--accent)" : "var(--border-strong)",
        position: "relative",
        transition: "background 140ms ease",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        flex: "0 0 auto",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 140ms ease",
          boxShadow: "var(--shadow-sm)",
        }}
      />
    </button>
  );
}

/* ------------------------------------------------- SegmentedControl */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--r-md)",
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((o) => {
        const ativo = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              cursor: "pointer",
              borderRadius: 7,
              padding: "6px 12px",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              fontWeight: ativo ? 600 : 500,
              background: ativo ? "var(--surface-card)" : "transparent",
              color: ativo ? "var(--text-strong)" : "var(--text-muted)",
              boxShadow: ativo ? "var(--shadow-sm)" : "none",
              transition: "background 120ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------- TextField */

export const TextField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; mono?: boolean }
>(function TextField({ label, mono, style, ...props }, ref) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        ref={ref}
        {...props}
        style={{
          height: 38,
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border-hairline)",
          background: "var(--surface-card)",
          padding: "0 11px",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
          fontSize: mono ? 12.5 : 13.5,
          color: "var(--text-strong)",
          outline: "none",
          width: "100%",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
          e.currentTarget.style.boxShadow = "var(--ring-focus)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border-hairline)";
          e.currentTarget.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
      />
    </label>
  );
});

/* ---------------------------------------------------------- Select */

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
>(function Select({ label, style, children, ...props }, ref) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <select
        ref={ref}
        {...props}
        style={{
          height: 38,
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border-hairline)",
          background: "var(--surface-card)",
          padding: "0 8px",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--text-strong)",
          outline: "none",
          width: "100%",
          ...style,
        }}
      >
        {children}
      </select>
    </label>
  );
});

/* ------------------------------------------------------ FieldLabel */

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}
