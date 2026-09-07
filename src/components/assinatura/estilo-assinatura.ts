// Os tokens e o CSS da assinatura, num lugar so.
//
// Duas telas cobram — a de dentro do app e a publica de quem chega do
// anuncio — e as duas montam os MESMOS campos (DadosPessoais,
// EnderecoDeCobranca, o cartao). As classes .subx-* vivem aqui para as
// duas terem o mesmo formulario, e nao duas copias que divergem.
//
// Visual: Especificacao-Assinatura.md (Claude Design, 31/08/2026).

const C = {
  canvas: "#E4E5E7",
  card: "#FFFFFF",
  chumbo: "#23262A",
  preto: "#000000",
  recuo: "#EFF0F1",
  bordaCard: "#A9AEB3",
  bordaFina: "#D3D6D9",
  bordaChumbo: "#3B4046",
  forte: "#23262A",
  apoio: "#5B6167",
  rotulo: "#7C8288",
  sobChumbo: "#C6C9CC",
  rotuloChumbo: "#9BA0A6",
};

// A única cor de matiz da tela: a linha de uso quando a conta passou do
// teto. Aviso, não erro — nada foi travado.
const AMBAR = "#9A6700";

const F_UI = "var(--font-ui), 'Instrument Sans', sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', monospace";
const F_TITLE = "var(--font-title), Inter, sans-serif";


export { C, AMBAR, F_UI, F_MONO, F_TITLE };

export const CSS_ASSINATURA = `
        .subx-grid{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start}
        .subx-row{display:flex;align-items:center;gap:16px}
        .subx-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .subx-form-grid>div,.subx-exp>div{min-width:0}
        .subx-form-grid input,.subx-form-grid select,.subx-exp input{width:100%;min-width:0}
        .subx-exp{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .subx-actions{display:flex;gap:10px;align-items:center}
        .subx-planos{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:stretch}
        .subx-in{height:44px;border:1px solid ${C.bordaCard};border-radius:10px;padding:0 12px;
          font:400 14px ${F_UI};color:${C.forte};background:#fff;outline:none;box-sizing:border-box}
        .subx-in--mono{font:400 14px ${F_MONO}}
        .subx-in:focus{border-color:${C.chumbo};box-shadow:0 0 0 3px rgba(35,38,42,.14)}
        .subx-in::placeholder{color:${C.bordaCard}}
        .subx-in:disabled{background:${C.recuo}}
        .subx-btn{height:38px;padding:0 18px;background:${C.chumbo};color:#fff;border:none;
          border-radius:8px;font:600 13.5px ${F_UI};cursor:pointer}
        .subx-btn:hover{background:${C.preto}}
        .subx-btn:disabled{opacity:.5;cursor:default}
        .subx-btn2{height:38px;padding:0 16px;background:transparent;color:${C.forte};
          border:1px solid ${C.bordaCard};border-radius:8px;font:600 13px ${F_UI};cursor:pointer}
        .subx-btn2:hover{background:#fff}
        .subx-btn2:disabled{opacity:.5;cursor:default}
        .subx-aceite{display:flex;align-items:flex-start;gap:10px;cursor:pointer;
          font:400 13.5px/1.5 ${F_UI};color:${C.forte}}
        .subx-aceite input{width:20px;height:20px;margin:0;flex:none;accent-color:${C.chumbo};cursor:pointer}
        /* assinar em sequência: o painel do plano à esquerda, as etapas à direita */
        .subx-passos{display:grid;grid-template-columns:260px 1fr;gap:16px;align-items:start}
        .subx-trilha{display:flex;align-items:center;gap:10px;list-style:none;margin:0 0 20px;padding:0 0 16px;
          border-bottom:1px solid ${C.bordaFina};flex-wrap:wrap}
        .subx-trilha li{display:flex;align-items:center;gap:8px;color:${C.rotulo};
          font:400 13px ${F_UI}}
        .subx-trilha li+li::before{content:"";width:18px;height:1px;background:${C.bordaCard};margin-right:2px}
        .subx-trilha-num{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;
          border-radius:50%;border:1px solid ${C.bordaCard};font:500 11px ${F_MONO};flex:none}
        .subx-trilha li[data-atual="true"]{color:${C.forte};font-weight:600}
        .subx-trilha li[data-atual="true"] .subx-trilha-num{background:${C.chumbo};border-color:${C.chumbo};color:#fff}
        .subx-trilha li[data-feita="true"] .subx-trilha-num{border-color:${C.forte};color:${C.forte}}
        .subx-aceite a{color:${C.forte};text-decoration:underline;text-underline-offset:2px}
        @media (max-width:720px){
          .subx-wrap{padding:28px 20px 40px !important}
          .subx-grid{grid-template-columns:1fr}
          .subx-planos{grid-template-columns:1fr}
          .subx-row{flex-direction:column;align-items:stretch}
          .subx-row button{width:100%;height:44px !important}
          .subx-actions{flex-direction:column;align-items:stretch}
          .subx-actions button{width:100%;height:44px !important}
          /* no celular o painel do plano vai para o topo e as etapas
             seguem abaixo — uma coluna, na ordem de leitura */
          .subx-passos{grid-template-columns:1fr}
          /* a trilha vira só o número da etapa atual: três nomes lado a
             lado não cabem em 375px sem virar duas linhas tortas */
          .subx-trilha li{display:none}
          .subx-trilha li[data-atual="true"]{display:flex}
          .subx-trilha li+li::before{display:none}
        }
`;
