// Aba que já existe na navegação mas cujo conteúdo entra numa fase
// seguinte. Diz o que vai aparecer ali, sem prometer prazo e sem inventar
// dado — o portal nunca mostra caixa vazia sem explicação.

export function EmBreve({
  rotulo,
  titulo,
  texto,
}: {
  rotulo: string;
  titulo: string;
  texto: string;
}) {
  return (
    <>
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
        {rotulo}
      </p>
      <h1
        style={{
          margin: "var(--esp-4) 0 0",
          fontFamily: "var(--fonte-titulo)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "var(--ts-titulo)",
          lineHeight: "var(--el-titulo)",
        }}
      >
        {titulo}
      </h1>
      <p
        style={{
          marginTop: "var(--esp-5)",
          maxWidth: 520,
          fontSize: "var(--ts-corpo-p)",
          lineHeight: "var(--el-corpo-p)",
          color: "var(--cor-texto-secundario)",
          textWrap: "pretty",
        }}
      >
        {texto}
      </p>
    </>
  );
}
