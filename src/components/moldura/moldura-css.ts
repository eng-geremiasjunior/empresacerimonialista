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
  min-height:100vh; display:flex; flex-direction:column;
  background:var(--mo-marfim); color:var(--mo-tinta); font-family:var(--mo-texto);
}
.mo-raiz button{font-family:inherit}

/* ---------- faixa das abas (computador) ---------- */
.mo-cabeca{position:sticky; top:0; z-index:30}
.mo-faixa{display:flex; align-items:flex-end; gap:4px;
  padding:8px 16px 0; background:var(--mo-nevoa); border-bottom:1px solid var(--mo-linha)}
.mo-logo{flex:none; align-self:center; padding:0 22px 8px 4px; font-family:var(--mo-titulo);
  font-weight:700; font-size:18px; letter-spacing:-0.02em; line-height:1; text-decoration:none}
.mo-logo .e{color:var(--mo-tinta)} .mo-logo .o{color:var(--mo-ameixa)}
.mo-abas{display:flex; align-items:flex-end; gap:4px; min-width:0; overflow:hidden}
.mo-aba{display:inline-flex; align-items:baseline; gap:8px; padding:7px 14px; white-space:nowrap;
  font-size:14px; color:var(--mo-cinza-1); text-decoration:none; border:1px solid var(--mo-linha);
  border-bottom:0; border-radius:4px 4px 0 0; background:transparent; max-width:260px}
.mo-aba:hover{color:var(--mo-tinta)}
.mo-aba-nome{overflow:hidden; text-overflow:ellipsis}
.mo-aba-ativa{position:relative; margin-bottom:-1px; padding-bottom:8px; background:var(--mo-marfim);
  color:var(--mo-tinta); font-weight:600; border-top:2px solid var(--mo-ameixa); padding-top:6px}
.mo-aba-conta{font-family:var(--mo-mono); font-size:12px; font-weight:400; color:var(--mo-cinza-2)}
.mo-aba-x{border:0; background:none; padding:0 0 0 2px; font-size:14px; line-height:1; color:var(--mo-cinza-2); cursor:pointer}
.mo-aba-x:hover{color:var(--mo-tinta)}
.mo-aba-solta{border-color:transparent}
.mo-escritorio-btn{flex:none; align-self:center; margin:0 0 8px auto; padding:5px 12px; border-radius:4px;
  font-size:14px; font-weight:500; color:var(--mo-tinta); background:transparent;
  border:1px solid var(--mo-linha); cursor:pointer}
.mo-escritorio-btn[aria-pressed="true"]{background:var(--mo-ameixa-clara); color:var(--mo-ameixa); border-color:var(--mo-ameixa-clara)}

/* ---------- corpo ---------- */
.mo-corpo{flex:1; display:flex; min-height:0}
.mo-principal{flex:1; min-width:0; padding:28px 24px 48px}
.mo-conteudo{margin:0 auto; width:100%; max-width:1240px}
.mo-painel{flex:none; width:280px; border-left:1px solid var(--mo-linha); background:var(--mo-marfim);
  padding:22px; position:sticky; top:45px; align-self:flex-start; max-height:calc(100vh - 45px - 28px); overflow-y:auto}
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
  .mo-faixa,.mo-status,.mo-painel,#mo-segunda-linha{display:none}
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
