import { qrSvg } from "@/lib/qr";
import { publicBase } from "@/lib/app-url";
import { codigoDoHash, linkDaCredencial } from "@/lib/recepcao";

export const dynamic = "force-dynamic";

/**
 * O destino do QR do convidado.
 *
 * Existe por causa de um fim ruim: o QR levava o hash pelado, e a câmera
 * comum do celular — que não sabe o que fazer com texto — mandava para o
 * buscador. O convidado apontava o próprio ingresso e lia "não encontrou
 * nenhum documento correspondente".
 *
 * NÃO consulta o banco de propósito. Tudo o que a tela mostra sai do
 * próprio endereço: o código curto são os seis últimos caracteres do
 * hash, e o QR é o desenho deste mesmo link. Nome de convidado e nome de
 * evento numa rota pública é decisão do dono, item a item — e nada aqui
 * precisa deles para cumprir o que a porta pede.
 */
export default async function EntradaPage({
  params,
}: {
  params: { hash: string };
}) {
  const hash = params.hash.trim().toLowerCase();

  // Só o formato: 64 hex é o que a 148 gera. Um endereço torto vira uma
  // frase honesta, não um QR de mentira.
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return (
      <main className="rsvp-fora">
        <div className="rsvp-cartao">
          <h1 className="rsvp-titulo">Este código de entrada não é válido.</h1>
          <p className="rsvp-texto">
            Abra de novo o link da sua confirmação de presença — o código de lá
            é sempre o que vale.
          </p>
        </div>
      </main>
    );
  }

  const link = linkDaCredencial(publicBase(), hash);

  return (
    <main className="rsvp-fora">
      <div className="rsvp-cartao" style={{ alignItems: "center", textAlign: "center" }}>
        <h1 className="rsvp-titulo">Sua entrada</h1>

        {/* fundo branco: o cartão é creme e a câmera da recepção perde
            contraste nele — mesma regra da credencial no convite */}
        <div
          style={{
            width: "100%",
            maxWidth: 260,
            background: "#fff",
            padding: 14,
            borderRadius: 8,
          }}
          dangerouslySetInnerHTML={{ __html: await qrSvg(link) }}
        />

        <span style={{ fontSize: 13, color: "var(--cor-texto-suave)" }}>
          <span style={{ opacity: 0.75 }}>entrada</span>{" "}
          <strong
            style={{
              fontSize: 30,
              letterSpacing: "0.12em",
              fontVariantNumeric: "tabular-nums",
              color: "var(--cor-texto-forte)",
            }}
          >
            {codigoDoHash(hash)}
          </strong>
        </span>

        <p className="rsvp-texto">
          Mostre este código na recepção. Se a câmera não ler, as seis letras
          bastam.
        </p>
      </div>
    </main>
  );
}
