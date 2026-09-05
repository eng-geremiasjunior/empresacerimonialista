// O único lugar do sistema que desenha QR.
//
// Sai em SVG, não em PNG: pesa poucos bytes, viaja dentro do JSON da
// rota e escala sem serrilhar — o convidado vai ampliar na fila da
// porta. Sem largura fixa de propósito: o viewBox manda, e quem
// renderiza decide o tamanho pelo CSS do contêiner.
//
// Roda só no servidor (a lib puxa módulos do Node). Componente cliente
// recebe a string pronta e a injeta — nunca importa isto direto.

import QRCode from "qrcode";

export async function qrSvg(texto: string): Promise<string> {
  const svg = await QRCode.toString(texto, {
    type: "svg",
    // M corrige até 15% de dano: tela riscada, brilho baixo, dedo na
    // frente. H deixaria o código mais denso e mais difícil de ler de
    // longe, que é o caso da porta.
    errorCorrectionLevel: "M",
    margin: 1,
  });
  // O <svg> sai só com viewBox; sem isto alguns navegadores dão a ele
  // 300×150 por padrão e o código vira um retângulo achatado.
  return svg.replace("<svg ", '<svg style="display:block;width:100%;height:auto" ');
}
