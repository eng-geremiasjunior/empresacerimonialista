// O único lugar do sistema que desenha QR.
//
// Duas saídas, um motivo para cada:
//
//   · `qrSvg` — SVG em string. Pesa poucos bytes, viaja dentro do JSON da
//     rota e escala sem serrilhar — o convidado vai ampliar na fila da
//     porta. Sem largura fixa de propósito: o viewBox manda, e quem
//     renderiza decide o tamanho pelo CSS do contêiner.
//   · `qrDataUri` — PNG em data URI. Existe porque o @react-pdf não
//     consome string de SVG; consome `<Image src={dataUri}>`, o mesmo
//     caminho que as fotos da proposta já usam. É o QR do termo de aceite.
//
// Roda só no servidor (a lib puxa módulos do Node). Componente cliente
// recebe a string pronta e a injeta — nunca importa isto direto.

import QRCode from "qrcode";

// M corrige até 15% de dano: tela riscada, brilho baixo, dedo na frente,
// impressão fraca. H deixaria o código mais denso e mais difícil de ler
// de longe, que é o caso da porta.
const CORRECAO = "M" as const;

export async function qrSvg(texto: string): Promise<string> {
  const svg = await QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: CORRECAO,
    margin: 1,
  });
  // O <svg> sai só com viewBox; sem isto alguns navegadores dão a ele
  // 300×150 por padrão e o código vira um retângulo achatado.
  return svg.replace("<svg ", '<svg style="display:block;width:100%;height:auto" ');
}

/**
 * PNG em data URI, 240 px de lado. No PDF ele é desenhado a ~90 pt, então
 * 240 px sobra para impressão sem ficar pesado dentro do arquivo.
 */
export async function qrDataUri(texto: string): Promise<string> {
  return QRCode.toDataURL(texto, {
    type: "image/png",
    errorCorrectionLevel: CORRECAO,
    margin: 1,
    width: 240,
  });
}
