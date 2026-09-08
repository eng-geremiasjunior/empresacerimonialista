// O convite para o teste de sete dias.
//
// Uma seção inteira, e não mais um botão no meio do texto: é a mudança
// de oferta da página, e o dono pediu que ela não passasse despercebida.
// Fica logo depois da demonstração — o momento em que a visitante acabou
// de ver o evento nascer na tela do sistema e a pergunta seguinte é
// "quanto custa para eu fazer isso com o meu evento?".
//
// A resposta desta seção é: nada, e sem cartão. As três garantias abaixo
// do botão são as três objeções na ordem em que ela as tem — a última é
// a de verdade, "vou perder o que eu montar?".
//
// Linguagem profissional, sem gíria: quem lê é uma profissional decidindo
// que ferramenta vai sustentar a operação dela.

const TITULO = "var(--font-title, Inter, sans-serif)";
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";

export function ConviteDoTeste({
  dias,
  precoDeEntrada,
}: {
  dias: number;
  precoDeEntrada: string | null;
}) {
  const garantias = [
    {
      titulo: "Não pedimos dados de cartão",
      texto:
        "Nenhum número de cartão é solicitado para criar a conta ou para usar o sistema durante o período de avaliação.",
    },
    {
      titulo: `Encerra automaticamente em ${dias} dias`,
      texto:
        "Não há renovação automática e não há cobrança ao final. Se você não decidir assinar, nada acontece.",
    },
    {
      titulo: "O que você cadastrar permanece salvo",
      texto:
        "Os eventos, fornecedores e roteiros que você montar continuam na sua conta caso decida assinar depois.",
    },
  ];

  return (
    <section
      id="conta-gratis"
      data-convite="1"
      style={{
        scrollMarginTop: "64px",
        marginTop: "clamp(56px,7vw,88px)",
        padding: "clamp(52px,6.5vw,80px) 0",
        background: "#241C21",
        borderTop: "1px solid #241C21",
        borderBottom: "1px solid #241C21",
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "0 clamp(20px,4vw,28px)",
        }}
      >
        <div style={{ maxWidth: "62ch" }}>
          <span
            style={{
              display: "inline-block",
              marginBottom: "14px",
              padding: "5px 12px",
              borderRadius: "999px",
              background: "rgba(250,248,245,.12)",
              color: "#F0E4EC",
              fontFamily: MONO,
              fontSize: "11px",
              fontWeight: "500",
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Avaliação gratuita
          </span>
          <h2
            style={{
              margin: "0 0 14px",
              maxWidth: "22ch",
              fontFamily: TITULO,
              fontWeight: "700",
              fontSize: "clamp(28px,4.4vw,46px)",
              lineHeight: "1.08",
              letterSpacing: "-0.034em",
              color: "#FAF8F5",
              textWrap: "balance",
            }}
          >
            Crie sua conta e use o sistema por {dias} dias, sem custo.
          </h2>
          <p
            style={{
              margin: "0",
              maxWidth: "56ch",
              fontSize: "clamp(16.5px,1.8vw,18.5px)",
              lineHeight: "1.55",
              color: "#D8CFD5",
              textWrap: "pretty",
            }}
          >
            A criação da conta é gratuita e não exige dados de cartão de crédito. Você
            cadastra um evento que já está organizando, monta o roteiro do dia e envia o
            link para os fornecedores — com o sistema completo, no plano Essencial.
          </p>
        </div>

        <div
          data-convite-grade="1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: "clamp(16px,2.4vw,28px)",
            margin: "clamp(28px,3.6vw,40px) 0 clamp(26px,3.4vw,36px)",
          }}
        >
          {garantias.map((g) => (
            <div
              key={g.titulo}
              data-convite-item="1"
              style={{
                paddingTop: "16px",
                borderTop: "1px solid rgba(250,248,245,.18)",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontFamily: TITULO,
                  fontWeight: "600",
                  fontSize: "16px",
                  lineHeight: "1.25",
                  letterSpacing: "-0.015em",
                  color: "#FAF8F5",
                }}
              >
                {g.titulo}
              </p>
              <p
                style={{
                  margin: "0",
                  fontSize: "14.5px",
                  lineHeight: "1.5",
                  color: "#B8ADB4",
                  textWrap: "pretty",
                }}
              >
                {g.texto}
              </p>
            </div>
          ))}
        </div>

        <div
          data-convite-botoes="1"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <a
            href="/criar-conta"
            className="pl-cta pl-h-claro"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "54px",
              padding: "0 28px",
              borderRadius: "8px",
              background: "#FAF8F5",
              color: "#241C21",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "17px",
              textAlign: "center",
            }}
          >
            Criar conta gratuita
          </a>
          <a
            href="/comecar"
            className="pl-h-claro-contorno"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "54px",
              padding: "0 22px",
              borderRadius: "8px",
              border: "1px solid rgba(250,248,245,.38)",
              color: "#FAF8F5",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "15.5px",
              transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
            }}
          >
            {precoDeEntrada ? `Assinar agora por ${precoDeEntrada}` : "Assinar agora"}
          </a>
        </div>
      </div>
    </section>
  );
}
