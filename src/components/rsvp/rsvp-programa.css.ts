// O visual da aba RSVP "ficha em três painéis" (handoff do Claude Design,
// 13/10/2026): cara de programa de trabalho, não de SaaS. Sem cards
// empilhados, sem pílulas, sem sombra — profundidade só por tom.
// Escopado em .rp; a troca para o celular é por CONTAINER (a largura da
// área do evento), não da janela: a barra lateral do app come espaço.

export const CSS_RSVP = `
.rp{--marfim:#FAF8F5;--papel:#FFFFFF;--nevoa:#F2EEE9;--linha:#E6E0D8;--cinza2:#B4ADA4;--cinza:#928A81;--cinza3:#6B6259;--tinta:#221E1B;--a50:#F3EBF0;--a600:#6E3F5F;--a800:#4A2A40;--ok:#5E7355;--ok-f:#EDF0EA;--esp:#A5813C;--esp-f:#F5EEDF;--alerta:#A5544B;
  container-type:inline-size;font-family:var(--font-ui),system-ui,sans-serif;font-size:13px;color:var(--tinta)}
.rp *{box-sizing:border-box}
.rp-mono{font-family:var(--font-mono),ui-monospace,monospace}
.rp-frame{display:grid;grid-template-columns:232px minmax(0,1fr) 360px;grid-template-rows:44px minmax(0,1fr) 26px;height:min(860px,calc(100dvh - 120px));min-height:560px;background:var(--papel);border:1px solid var(--cinza2);border-radius:6px;overflow:hidden}
.rp-top{grid-column:1/-1;display:flex;align-items:center;gap:16px;padding:0 16px;background:var(--marfim);border-bottom:1px solid var(--cinza2);min-width:0}
.rp-top h2{margin:0;font-family:var(--font-title),system-ui,sans-serif;font-weight:700;font-size:15px;letter-spacing:-.02em}
.rp-top .rp-ev{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rp-top .rp-acoes{margin-left:auto;display:flex;gap:8px;flex:none}
.rp-left{background:var(--marfim);border-right:1px solid var(--linha);overflow-y:auto;padding:14px 0 16px;display:flex;flex-direction:column;gap:18px}
.rp-rot{display:block;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--cinza);padding:0 16px 6px}
.rp-item{display:flex;align-items:center;gap:8px;width:100%;height:30px;padding:0 16px;border:0;border-left:2px solid transparent;background:transparent;color:var(--cinza3);font:inherit;text-align:left;cursor:pointer;transition:background 140ms ease,color 140ms ease,border-color 140ms ease}
.rp-item:hover{color:var(--tinta)}
.rp-item[aria-pressed=true]{background:var(--papel);color:var(--tinta);font-weight:600;border-left-color:var(--a600)}
.rp-item.sub{height:28px;padding-left:33px}
.rp-item .rp-n{margin-left:auto;font-family:var(--font-mono),monospace;font-size:12px;font-weight:400;color:var(--cinza)}
.rp-item span:not(.rp-n):not(.rp-q){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rp-q{width:7px;height:7px;border-radius:2px;flex:none}
.rp-busca{margin:0 16px}
.rp-convite{margin-top:auto;border-top:1px solid var(--linha);padding:12px 16px 0;display:flex;flex-direction:column;gap:4px}
.rp-convite .rp-vivo{display:flex;align-items:center;gap:7px;font-weight:500;color:var(--ok)}
.rp-convite .rp-vivo i{width:7px;height:7px;border-radius:50%;background:currentColor}
.rp-convite .rp-vivo.off{color:var(--cinza)}
.rp-link{background:none;border:0;padding:0;font:inherit;font-size:12px;color:var(--alerta);cursor:pointer;text-align:left}
.rp-link.a{color:var(--a600)}
.rp-mid{display:flex;flex-direction:column;min-width:0;min-height:0}
.rp-add{display:flex;gap:8px;padding:8px 12px;border-bottom:1px solid var(--linha)}
.rp-in{height:30px;min-width:0;border:1px solid var(--linha);border-radius:6px;padding:0 10px;background:var(--papel);color:var(--tinta);font:inherit;font-size:13px;transition:border-color 140ms ease,box-shadow 140ms ease}
.rp-in:focus{outline:none;border-color:var(--a600);box-shadow:0 0 0 3px var(--a50)}
.rp-in::placeholder{color:var(--cinza)}
.rp-btn{height:30px;padding:0 12px;border-radius:6px;border:1px solid var(--linha);background:var(--papel);color:var(--tinta);font:inherit;font-size:13px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background 140ms ease,border-color 140ms ease,color 140ms ease}
.rp-btn:hover{background:var(--marfim);border-color:var(--cinza2)}
.rp-btn.p{background:var(--a600);border-color:var(--a600);color:#fff}
.rp-btn.p:hover{background:var(--a800);border-color:var(--a800)}
.rp-btn:disabled{opacity:.55;cursor:default}
.rp-btn.g{height:32px}
.rp-lista{flex:1;overflow-y:auto;min-height:0}
.rp-sec{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;height:30px;padding:0 14px;background:var(--nevoa);border-bottom:1px solid var(--linha)}
.rp-sec b{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--cinza3)}
.rp-sec .rp-dir{margin-left:auto;display:flex;align-items:center;gap:14px;font-family:var(--font-mono),monospace;font-size:12px;color:var(--cinza)}
.rp-sec .rp-dir button{font-family:var(--font-ui),system-ui,sans-serif;font-size:12px;font-weight:500;color:var(--a600);background:none;border:0;padding:0;cursor:pointer}
.rp-sec .rp-dir .rp-falta{font-family:var(--font-ui),system-ui,sans-serif;color:var(--esp)}
.rp-linha{display:grid;grid-template-columns:minmax(0,1fr) 48px 150px;align-items:center;min-height:34px;padding:0 14px;border-bottom:1px solid var(--linha);cursor:pointer;transition:background 140ms ease}
.rp-linha:hover{background:var(--marfim)}
.rp-linha[aria-selected=true]{background:var(--a50);box-shadow:inset 2px 0 0 var(--a600)}
.rp-linha:focus-visible{outline:2px solid var(--a600);outline-offset:-2px}
.rp-nome{display:flex;align-items:baseline;gap:10px;min-width:0;white-space:nowrap}
.rp-nome>span:first-child{font-weight:500;overflow:hidden;text-overflow:ellipsis;flex:none;max-width:60%}
.rp-linha.fora .rp-nome>span:first-child{color:var(--cinza)}
.rp-meta{font-size:12px;color:var(--cinza);overflow:hidden;text-overflow:ellipsis}
.rp-meta .esp{color:var(--esp)}
.rp-meta .ok{color:var(--ok)}
.rp-acomp{font-family:var(--font-mono),monospace;font-size:12px;color:var(--cinza3)}
.rp-acao{justify-self:end;background:none;border:0;padding:0;font:inherit;font-weight:500;color:var(--a600);cursor:pointer;white-space:nowrap}
.rp-acao:hover{color:var(--a800);text-decoration:underline;text-underline-offset:3px}
.rp-acao.mudo{color:var(--cinza);font-weight:400;cursor:default;text-decoration:none}
.rp-vazio{padding:28px 18px;color:var(--cinza3);line-height:1.6}
.rp-right{background:var(--marfim);border-left:1px solid var(--linha);overflow-y:auto;min-height:0}
.rp-ficha{background:var(--papel);padding:18px 20px;border-bottom:1px solid var(--linha);display:flex;flex-direction:column;gap:14px}
.rp-ficha h3{margin:2px 0 0;font-family:var(--font-title),system-ui,sans-serif;font-weight:600;font-size:20px;letter-spacing:-.02em;line-height:1.2}
.rp-etq{font-family:var(--font-mono),monospace;font-size:11px;color:var(--cinza);text-transform:uppercase}
.rp-campos{display:grid;grid-template-columns:110px minmax(0,1fr);row-gap:8px;margin:0}
.rp-campos dt{color:var(--cinza)}
.rp-campos dd{margin:0;min-width:0;overflow-wrap:anywhere}
.rp-campos dd.esp{color:var(--esp)}
.rp-campos dd.ok{color:var(--ok)}
.rp-seg{display:grid;grid-template-columns:repeat(3,1fr);height:30px;border:1px solid var(--linha);border-radius:6px;overflow:hidden}
.rp-seg button{border:0;border-left:1px solid var(--linha);background:var(--papel);color:var(--cinza);font:inherit;font-size:12.5px;cursor:pointer;transition:background 140ms ease,color 140ms ease}
.rp-seg button:first-child{border-left:0}
.rp-seg button[aria-pressed=true][data-r=confirmado]{background:var(--ok-f);color:var(--ok);font-weight:600}
.rp-seg button[aria-pressed=true][data-r=aguardando]{background:var(--esp-f);color:var(--esp);font-weight:600}
.rp-seg button[aria-pressed=true][data-r=nao_vai]{background:var(--nevoa);color:var(--cinza3);font-weight:600}
.rp-par{display:flex;gap:8px}
.rp-par .rp-btn.p{flex:1}
.rp-nota{margin:0;font-size:12px;line-height:1.55;color:var(--cinza3)}
.rp-nota.esp{color:var(--esp)}
.rp-port{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
.rp-port .rp-cab{display:flex;align-items:center}
.rp-port .rp-cab .rp-ativo{margin-left:auto;font-size:12px;color:var(--ok)}
.rp-port .rp-cab .rp-ativo.off{color:var(--cinza)}
.rp-cont{display:flex;align-items:baseline;gap:6px}
.rp-cont b{font-family:var(--font-mono),monospace;font-size:28px;font-weight:500;line-height:1}
.rp-cont span{font-family:var(--font-mono),monospace;font-size:13px;color:var(--cinza3)}
.rp-botoes{display:flex;flex-wrap:wrap;gap:8px}
.rp-qr{background:#fff;border:1px solid var(--linha);border-radius:6px;padding:14px;display:flex;justify-content:center}
.rp-qr>div{width:180px;height:180px}
.rp-qr svg{width:100%;height:100%}
.rp-ultimas{margin:0;padding:0;list-style:none;font-size:12px;color:var(--cinza3);line-height:1.9}
.rp-ultimas .rp-mono{color:var(--cinza)}
.rp-status{grid-column:1/-1;display:flex;align-items:center;gap:20px;padding:0 12px;background:var(--tinta);color:var(--linha);font-family:var(--font-mono),monospace;font-size:11px;white-space:nowrap;overflow:hidden}
.rp-aviso{margin:8px 12px 0;padding:8px 10px;border-radius:6px;background:#F5E6E3;color:var(--alerta);font-size:12.5px}
.rp-aviso.ok{background:var(--ok-f);color:var(--ok)}
.rp-faixa,.rp-portbar,.rp-grupo-m{display:none}
.rp-veu{position:fixed;inset:0;background:rgba(34,30,27,.42);z-index:70}
.rp-folha{position:fixed;left:0;right:0;bottom:0;max-height:88dvh;overflow-y:auto;background:var(--marfim);border-radius:12px 12px 0 0;z-index:71}
.rp-folha .rp-fechar{position:sticky;top:0;display:flex;justify-content:flex-end;padding:8px 10px 0;background:inherit}
.rp-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 32px));max-height:86dvh;display:flex;flex-direction:column;background:var(--papel);border:1px solid var(--cinza2);border-radius:6px;z-index:71}
.rp-modal header{display:flex;align-items:center;gap:12px;height:44px;padding:0 16px;background:var(--marfim);border-bottom:1px solid var(--cinza2);border-radius:6px 6px 0 0}
.rp-modal header h3{margin:0;font-family:var(--font-title),system-ui,sans-serif;font-size:15px;font-weight:700;letter-spacing:-.02em}
.rp-modal .rp-corpo{padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.rp-modal textarea.rp-in{height:180px;padding:10px;resize:vertical;line-height:1.5}
.rp-modal footer{display:flex;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--linha)}
.rp-tab{width:100%;border-collapse:collapse;font-size:12.5px}
.rp-tab th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--cinza);padding:6px 8px;border-bottom:1px solid var(--linha);background:var(--nevoa);position:sticky;top:0}
.rp-tab td{padding:6px 8px;border-bottom:1px solid var(--linha);white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}
.rp-tab tr.rep td{color:var(--cinza)}
@container (max-width: 1000px){
  .rp-frame{display:flex;flex-direction:column;height:auto;min-height:0;overflow:visible}
  .rp-left,.rp-right,.rp-status{display:none}
  .rp-top{flex-wrap:wrap;gap:8px 12px;padding:10px 12px}
  .rp-top .rp-acoes{margin-left:0;width:100%;flex-wrap:wrap}
  .rp-top .rp-acoes .rp-btn{flex:1 1 auto}
  .rp-portbar{display:flex;align-items:center;gap:10px;width:100%;height:44px;padding:0 14px;border:0;border-bottom:1px solid var(--linha);background:var(--papel);font:inherit;color:var(--tinta);cursor:pointer;text-align:left}
  .rp-portbar b{font-family:var(--font-mono),monospace;font-weight:500}
  .rp-portbar .rp-n{margin-left:auto;color:var(--a600);font-weight:500}
  .rp-faixa{display:flex;overflow-x:auto;gap:2px;padding:0 6px;background:var(--marfim);border-bottom:1px solid var(--linha)}
  .rp-faixa button{flex:none;height:38px;padding:0 10px;border:0;border-bottom:2px solid transparent;background:none;font:inherit;color:var(--cinza3);cursor:pointer;white-space:nowrap}
  .rp-faixa button[aria-pressed=true]{color:var(--tinta);font-weight:600;border-bottom-color:var(--a600)}
  .rp-faixa .rp-n{font-family:var(--font-mono),monospace;font-size:12px;color:var(--cinza);margin-left:4px;font-weight:400}
  .rp-grupo-m{display:flex;gap:8px;padding:8px 12px;border-bottom:1px solid var(--linha)}
  .rp-grupo-m .rp-in{flex:1}
  .rp-add{flex-wrap:wrap}
  .rp-add .rp-in{flex:1 1 140px}
  .rp-lista{overflow:visible}
  .rp-sec{top:0}
  .rp-linha{grid-template-columns:minmax(0,1fr) auto;padding:8px 14px;gap:10px}
  .rp-linha .rp-acomp{display:none}
  .rp-nome{flex-direction:column;align-items:flex-start;gap:1px;white-space:normal}
  .rp-nome>span:first-child{max-width:100%}
  .rp-sec .rp-dir .rp-pessoas{display:none}
}
@media (prefers-reduced-motion: reduce){.rp *{transition:none!important}}
`;
