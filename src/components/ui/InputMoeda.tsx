"use client";

// O campo de dinheiro do sistema.
//
// A máscara já existia em format.ts e era usada em sete telas; as outras
// quinze deixavam a pessoa digitar 350000 e mostravam 350000. Quem
// confere um contrato de trezentos e cinquenta mil não lê isso sem contar
// zero com o dedo — aqui vira 350.000,00 enquanto ela digita.
//
// O texto guardado é o MASCARADO (a convenção que o projeto já usa); quem
// recebe converte com desmascararDinheiro. Com `name`, o mesmo texto vai
// no FormData.

import { mascararDinheiro } from "@/lib/format";

export function InputMoeda({
  valor,
  onChange,
  name,
  className,
  style,
  placeholder = "0,00",
  id,
  disabled,
  required,
  autoFocus,
  onKeyDown,
  prefixo = true,
}: {
  /** texto mascarado ("350.000,00") */
  valor: string;
  onChange: (mascarado: string) => void;
  name?: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  /** false esconde o "R$" de dentro do campo (quando o rótulo já diz) */
  prefixo?: boolean;
}) {
  return (
    <span style={{ position: "relative", display: "block", width: "100%" }}>
      {prefixo && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 13,
            color: "#a8a29e",
            pointerEvents: "none",
          }}
        >
          R$
        </span>
      )}
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(mascararDinheiro(e.target.value))}
        className={className}
        style={prefixo ? { paddingLeft: 34, ...style } : style}
      />
    </span>
  );
}
