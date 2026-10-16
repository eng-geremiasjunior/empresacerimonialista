// A moldura de programa (15/10/2026, handoff design_handoff_eorganizei,
// rodadas 6–8). Tokens do pacote (tokens.css) com prefixo próprio, para
// não brigar com os --ev-* das telas de dentro. Fontes pelas variáveis do
// next/font (--font-title/ui/mono): o nome literal cairia na fonte do sistema.

export const MOLDURA_CSS = `
.mo-raiz{
  --mo-marfim:#FAF8F5; --mo-nevoa:#F2EEE9; --mo-papel:#FFFFFF;
  --mo-tinta:#221E1B; --mo-cinza-1:#6B6259; --mo-cinza-2:#928A81;
  --mo-linha:#E6E0D8; --mo-ameixa:#6E3F5F; --mo-ameixa-clara:#F3EBF0;
  --mo-salvia:#6E7F63; --mo-veu:rgba(34,30,27,.28);
  --mo-titulo:var(--font-title), Inter, sans-serif;
  --mo-texto:var(--font-ui), "Instrument Sans", sans-serif;
  --mo-mono:var(--font-mono), "IBM Plex Mono", monospace;
  min-height:100vh; display:flex;
  background:var(--mo-marfim); color:var(--mo-tinta); font-family:var(--mo-texto);
}
.mo-raiz button{font-family:inherit}

/* ---------- o menu primário à esquerda: retraído, abre ao passar o mouse (16/10/2026) ---------- */
.mo-lateral{flex:none; width:80px; position:sticky; top:0; height:100vh; z-index:40}
.mo-lateral-dentro{position:absolute; top:0; left:0; bottom:0; width:80px; display:flex; flex-direction:column; gap:18px;
  padding:14px 8px; background:var(--mo-nevoa); border-right:1px solid var(--mo-linha); overflow:hidden; transition:width 160ms ease}
.mo-lateral:hover .mo-lateral-dentro,.mo-lateral:focus-within .mo-lateral-dentro{width:220px}
.mo-logo{font-family:var(--mo-titulo); font-weight:700; font-size:18px; letter-spacing:-0.02em; line-height:1; text-decoration:none;
  padding:6px 14px; white-space:nowrap}
.mo-logo .e{color:var(--mo-tinta)} .mo-logo .o{color:var(--mo-ameixa); transition:opacity 160ms ease}
.mo-lateral:not(:hover):not(:focus-within) .mo-logo .o{opacity:0}
.mo-primario{display:flex; flex-direction:column; gap:4px}
.mo-prim{display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 2px; border-radius:6px; border-left:2px solid transparent;
  font-size:10.5px; font-weight:500; color:var(--mo-cinza-1); text-decoration:none; white-space:nowrap; text-align:center}
.mo-prim svg{width:20px; height:20px; flex:none}
.mo-lateral:hover .mo-prim,.mo-lateral:focus-within .mo-prim{flex-direction:row; justify-content:flex-start; gap:12px; padding:9px 12px; font-size:15px}
.mo-prim:hover{color:var(--mo-tinta); background:var(--mo-marfim)}
.mo-prim-ativo{color:var(--mo-tinta); font-weight:600; background:var(--mo-marfim); border-left-color:var(--mo-ameixa)}
.mo-coluna{flex:1; min-width:0; min-height:100vh; display:flex; flex-direction:column}
.mo-aba-conta{font-family:var(--mo-mono); font-size:12px; font-weight:400; color:var(--mo-cinza-2)}

/* ---------- a faixa do alto: partes do evento, Aparência, Avisos, Conta e o ☰ ---------- */
.mo-cabeca{position:sticky; top:0; z-index:30; display:flex; align-items:stretch; min-height:52px;
  background:var(--mo-marfim); border-bottom:1px solid var(--mo-linha)}
#mo-segunda-linha{flex:1; min-width:0; display:flex; align-items:center}
.mo-acoes{display:flex; align-items:stretch}
.mo-acoes>div{display:flex}
.mo-acao-topo{position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px;
  min-width:66px; padding:4px 8px; border:0; background:transparent; color:var(--mo-cinza-1); cursor:pointer}
.mo-acao-topo:hover{color:var(--mo-tinta); background:var(--mo-nevoa)}
.mo-acao-topo[aria-expanded="true"]{color:var(--mo-tinta); background:var(--mo-nevoa)}
.mo-acao-rotulo{font-size:10.5px; line-height:1}
.mo-avatar{width:22px; height:22px; border-radius:999px; object-fit:cover; background:var(--mo-ameixa); color:#fff;
  font-size:10px; font-weight:600; display:inline-flex; align-items:center; justify-content:center}
.mo-menu-btn{flex:none; min-width:66px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
  border:0; border-left:1px solid var(--mo-linha); background:transparent; color:var(--mo-tinta); cursor:pointer}
.mo-barras{display:flex; flex-direction:column; gap:3px}
.mo-barras span{display:block; width:18px; height:2px; border-radius:1px; background:currentColor}
.mo-menu-btn:hover{background:var(--mo-nevoa)}
.mo-menu-btn[aria-pressed="true"]{background:var(--mo-ameixa-clara); color:var(--mo-ameixa)}

/* ---------- a Aparência ---------- */
.mo-aparencia{top:calc(100% + 4px); right:0; width:300px; padding:14px; display:block}
.mo-aparencia .mo-rotulo{display:block; margin-bottom:8px}
.mo-aparencia-opcoes{display:grid; grid-template-columns:repeat(3,1fr); gap:8px}
.mo-menu .mo-aparencia-op{display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px 6px; width:auto;
  border:1px solid var(--mo-linha); border-radius:6px; background:var(--mo-papel); font-size:12.5px; text-align:center; color:var(--mo-tinta)}
.mo-menu .mo-aparencia-op:hover{background:var(--mo-nevoa)}
.mo-menu .mo-aparencia-op[aria-pressed="true"]{border-color:var(--mo-ameixa); box-shadow:inset 0 0 0 1px var(--mo-ameixa)}
.mo-amostra{display:flex; width:38px; height:22px; border-radius:4px; overflow:hidden; border:1px solid var(--mo-linha)}
.mo-amostra span{flex:1}
.mo-menu-baixo{top:calc(100% + 4px); right:0}
.mo-menu-nome{display:block; padding:6px 14px 8px; font-size:12px; color:var(--mo-cinza-2); max-width:240px; overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap}

/* ---------- cores: Noturno (inversão, fotos devolvidas) e Ameixa ---------- */
html[data-tema="noturno"]{filter:invert(1) hue-rotate(180deg); background:#fff}
html[data-tema="noturno"] img,html[data-tema="noturno"] video,html[data-tema="noturno"] canvas,
html[data-tema="noturno"] iframe,html[data-tema="noturno"] .mo-amostra{filter:invert(1) hue-rotate(180deg)}
html[data-tema="ameixa"] .mo-lateral-dentro{background:#4A2A40; border-right-color:#4A2A40}
html[data-tema="ameixa"] .mo-logo .e{color:#FAF8F5}
html[data-tema="ameixa"] .mo-logo .o{color:#D9B8CE}
html[data-tema="ameixa"] .mo-prim{color:#E5D6E0}
html[data-tema="ameixa"] .mo-prim:hover{color:#fff; background:rgba(255,255,255,.08)}
html[data-tema="ameixa"] .mo-prim-ativo{color:#fff; background:rgba(255,255,255,.12); border-left-color:#fff}
html[data-tema="ameixa"] .mo-cabeca{background:#F3EBF0; border-bottom-color:#E5D6E0}
html[data-tema="ameixa"] .mo-status{background:#F3EBF0; border-top-color:#E5D6E0}

/* ---------- tamanho da letra ---------- */
html[data-fonte="pequena"] .mo-principal{zoom:.92}
html[data-fonte="grande"] .mo-principal{zoom:1.1}

/* ---------- corpo ---------- */
.mo-corpo{flex:1; display:flex; min-height:0}
.mo-principal{flex:1; min-width:0; padding:28px 24px 48px}
.mo-conteudo{margin:0 auto; width:100%; max-width:1240px}
.mo-painel{flex:none; width:280px; border-left:1px solid var(--mo-linha); background:var(--mo-marfim);
  padding:22px; position:sticky; top:53px; align-self:flex-start; max-height:calc(100vh - 53px - 28px); overflow-y:auto}
.mo-painel-topo{display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px}
.mo-rotulo{font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--mo-cinza-2)}
.mo-fechar{border:0; background:none; padding:0; font-size:13px; color:var(--mo-cinza-1); cursor:pointer}
.mo-fechar:hover{color:var(--mo-tinta); text-decoration:underline}
.mo-grupo{padding:12px 0; border-top:1px solid var(--mo-linha)}
.mo-grupo:first-of-type{border-top:0}
.mo-grupo-titulo{display:block; font-size:15px; font-weight:600; color:var(--mo-tinta); text-decoration:none}
a.mo-grupo-titulo:hover{text-decoration:underline; text-underline-offset:3px}
.mo-subitens{display:flex; flex-direction:column; gap:6px; margin-top:8px; padding-left:12px}
.mo-subitem{font-size:14px; color:var(--mo-cinza-1); text-decoration:none}
.mo-subitem:hover{color:var(--mo-tinta)}
.mo-subitem-ativo,.mo-grupo-titulo.mo-subitem-ativo{color:var(--mo-tinta); text-decoration:underline; text-decoration-color:var(--mo-ameixa); text-underline-offset:3px}
.mo-radar{margin-top:6px; padding-top:14px; border-top:1px solid var(--mo-linha); display:flex; flex-direction:column; gap:6px}
.mo-radar p{margin:0; font-size:13px; line-height:1.45; color:var(--mo-cinza-1)}

/* ---------- barra de status (computador) ---------- */
.mo-status{position:sticky; bottom:0; z-index:30; height:28px; display:flex; align-items:center;
  justify-content:space-between; gap:12px; padding:0 0 0 16px; background:var(--mo-nevoa);
  border-top:1px solid var(--mo-linha); font-size:12px; color:var(--mo-cinza-1)}
.mo-status-fatos{min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.mo-status-dir{display:flex; align-items:center; height:100%}
.mo-status-grupo{display:flex; align-items:center; gap:4px; height:100%; padding:0 14px; border-left:1px solid var(--mo-linha)}
.mo-item-status{display:inline-flex; align-items:center; gap:6px; border:0; background:none; padding:2px 4px;
  font-size:12px; color:var(--mo-cinza-1); cursor:pointer; text-decoration:none; white-space:nowrap}
.mo-item-status:hover{color:var(--mo-tinta)}
.mo-contagem-forte{font-family:var(--mo-mono); font-size:11px; font-weight:500; color:var(--mo-tinta)}
.mo-ponto{width:6px; height:6px; border-radius:999px; background:var(--mo-ameixa)}
.mo-vista{padding:1px 8px; border:1px solid transparent; border-radius:4px; font-size:12px; color:var(--mo-cinza-1); text-decoration:none}
.mo-vista:hover{color:var(--mo-tinta)}
.mo-vista-ativa{background:var(--mo-marfim); border-color:var(--mo-linha); font-weight:600; color:var(--mo-tinta)}

/* ---------- menus suspensos: papel, fio, sem sombra ---------- */
.mo-menu{position:absolute; z-index:50; min-width:200px; background:var(--mo-papel);
  border:1px solid var(--mo-linha); border-radius:4px; padding:6px 0; display:flex; flex-direction:column}
.mo-menu a,.mo-menu button{display:block; width:100%; text-align:left; padding:7px 14px; border:0; background:none;
  font-size:14px; color:var(--mo-tinta); text-decoration:none; cursor:pointer; white-space:nowrap}
.mo-menu a:hover,.mo-menu button:hover{background:var(--mo-nevoa)}
.mo-menu hr{border:0; border-top:1px solid var(--mo-linha); margin:6px 0}
.mo-menu-cima{bottom:calc(100% + 4px); right:0}

/* ---------- faixa da conta cancelada ---------- */
.mo-faixa-aviso{border-bottom:1px solid var(--mo-linha); background:var(--mo-nevoa); padding:8px 24px;
  font-size:14px; color:var(--mo-tinta)}
.mo-faixa-aviso a{margin-left:8px; color:var(--mo-tinta); font-weight:600; text-underline-offset:3px}

/* ---------- celular ---------- */
.mo-topo-cel{display:none}
.mo-rodape-cel{display:none}
@media (max-width: 1023px){
  .mo-raiz{flex-direction:column}
  .mo-lateral,.mo-cabeca,.mo-status,.mo-painel{display:none}
  .mo-topo-cel{display:block; position:sticky; top:0; z-index:30; background:var(--mo-nevoa);
    padding:12px 16px; border-bottom:1px solid var(--mo-linha)}
  .mo-topo-cel .mo-logo{display:inline-block; font-size:16px; padding:0 0 10px}
  .mo-seletor{width:100%; display:flex; align-items:baseline; gap:8px; padding:10px 12px; text-align:left;
    background:var(--mo-marfim); border:1px solid var(--mo-linha); border-top:2px solid var(--mo-ameixa);
    border-radius:4px; color:var(--mo-tinta); cursor:pointer}
  .mo-seletor-nome{font-size:15px; font-weight:600; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
  .mo-seletor-seta{margin-left:auto; color:var(--mo-cinza-1)}
  .mo-lista-cel{margin-top:8px; background:var(--mo-papel); border:1px solid var(--mo-linha); border-radius:4px;
    max-height:70vh; overflow-y:auto}
  .mo-lista-cel a{display:flex; align-items:baseline; gap:8px; padding:12px; border-top:1px solid var(--mo-linha);
    font-size:15px; color:var(--mo-tinta); text-decoration:none}
  .mo-lista-cel > a:first-child{border-top:0}
  .mo-lista-cel .mo-cabeca-grupo{display:block; padding:12px 12px 4px; border-top:1px solid var(--mo-linha); font-size:15px; font-weight:600; color:var(--mo-tinta)}
  .mo-lista-cel .mo-cabeca-grupo + a{border-top:0}
  .mo-lista-cel .mo-sub{padding-left:28px; font-size:14px; color:var(--mo-cinza-1)}
  .mo-lista-cel .mo-fio-tinta{border-top:1px solid var(--mo-tinta) !important}
  .mo-lista-cel .mo-aba-conta{margin-left:auto}
  .mo-principal{padding:20px 16px 32px}
  .mo-rodape-cel{display:flex; flex-direction:column; gap:6px; position:sticky; bottom:0; z-index:30;
    background:var(--mo-nevoa); border-top:1px solid var(--mo-linha); padding:10px 16px; font-size:13px; color:var(--mo-cinza-1)}
  .mo-rodape-linha{display:flex; align-items:center; justify-content:space-between; gap:12px}
  .mo-rodape-cel .mo-item-status{font-size:13px; padding:6px 0}
  .mo-faixa-aviso{padding:8px 16px}
}
`;
