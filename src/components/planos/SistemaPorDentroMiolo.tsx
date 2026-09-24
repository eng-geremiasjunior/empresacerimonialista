// GERADO por ferramentas/sim/gerar-sistema-por-dentro.mjs a partir do desenho
// do Claude Design (design_handoff_sistema_por_dentro). Não editar à mão:
// mudar o desenho ou o gerador e gerar de novo.
export function SistemaPorDentroMiolo(v: any) {
  const { chips, wrapRef, wrapH, stageRef, scale, url, proArea, sino, fase1Bg, rail1, rail2, rail3, tabResumoBd, tabResumoFg, tabFinBd, tabFinFg, tabRsvpBd, tabRsvpFg, s0, s1, planFeitas, planMeses, planAbertas, planDecididas, planHover, planRingBd, planRingBg, planTxt, planDeco, planData, s2, cvBd, cvBg, aPagar, caBd, caBg, finVerba, pago, comprov, nAbertas, fcBg, fcFg, fcSelo, pagBg, pagOp, finAss, s3, nPessoas, barC, barA, nConf, nAg, whatsBg, guests, toast, toastTxt, s4, convAberto, simBd, simBg, simFg, convPerguntas, acompTxt, confBg, convPronto, qr, s5, decBg, decFg, decTxt, portalConv, cx, cy, cOp, ripple, rippleOp } = v;
  return (
<section style={{ "background": "#FAF8F5", "color": "#221E1B", "fontFamily": "var(--font-ui),'Instrument Sans',system-ui,sans-serif", "fontVariantNumeric": "lining-nums" }}>
<div className="spd-g" style={{ "maxWidth": "1200px", "margin": "0 auto", "padding": "100px 32px", "display": "flex", "flexDirection": "column", "gap": "32px" }}>

<div style={{ "display": "flex", "flexDirection": "column", "gap": "14px", "alignItems": "center", "textAlign": "center" }}>
<p style={{ "fontSize": "12px", "letterSpacing": ".22em", "textTransform": "uppercase", "color": "#6E2E34" }}>O sistema por dentro</p>
<h2 style={{ "font": "400 clamp(36px,4vw,52px)/1.08 var(--font-newsreader),Newsreader,Georgia,serif", "textWrap": "pretty" }}>Um evento, do seu painel ao celular da noiva.</h2>
</div>

<div style={{ "display": "flex", "justifyContent": "center", "gap": "6px", "flexWrap": "wrap" }}>
{chips.map((c: any, i: number) => (<button key={i} onClick={c.go} style={{ "cursor": "pointer", "border": `1px solid ${c.bd}`, "background": `${c.bg}`, "color": `${c.fg}`, "padding": "10px 18px", "borderRadius": "999px", "font": "500 13px var(--font-ui),'Instrument Sans',sans-serif", "whiteSpace": "nowrap" }}>{c.label}</button>))}
</div>

<div ref={wrapRef} style={{ "width": "100%", "height": `${wrapH}px`, "position": "relative" }}>
<div ref={stageRef} style={{ "position": "absolute", "left": "50%", "top": "0", "width": "1120px", "height": "680px", "marginLeft": "-560px", "transformOrigin": "top center", "transform": `scale(${scale})`, "background": "#fff", "border": "1px solid rgba(34,30,27,.1)", "borderRadius": "10px", "overflow": "hidden", "boxShadow": "0 40px 80px -40px rgba(34,30,27,.35)" }}>

<div style={{ "height": "40px", "display": "flex", "alignItems": "center", "gap": "14px", "padding": "0 16px", "background": "#F2EEE9", "borderBottom": "1px solid #E6E0D8" }}>
<div style={{ "display": "flex", "gap": "6px" }}><span style={{ "width": "10px", "height": "10px", "borderRadius": "50%", "background": "#DCD4C9" }}></span><span style={{ "width": "10px", "height": "10px", "borderRadius": "50%", "background": "#DCD4C9" }}></span><span style={{ "width": "10px", "height": "10px", "borderRadius": "50%", "background": "#DCD4C9" }}></span></div>
<span style={{ "flex": "1", "maxWidth": "520px", "margin": "0 auto", "textAlign": "center", "font": "12px ui-monospace,Menlo,monospace", "color": "#6B6259", "background": "#FAF8F5", "padding": "5px 12px", "borderRadius": "6px" }}>{url}</span>
<span style={{ "width": "46px" }}></span>
</div>

<div style={{ "position": "relative", "height": "640px", "overflow": "hidden" }}>

{proArea && (<>
<div style={{ "display": "grid", "gridTemplateColumns": "196px minmax(0,1fr)", "height": "100%" }}>
<div style={{ "background": "#1F1C1A", "color": "#D6D0CA", "padding": "20px 10px", "display": "flex", "flexDirection": "column", "gap": "1px", "fontSize": "12.5px" }}>
<p style={{ "font": "600 17px var(--font-ui),'Instrument Sans',sans-serif", "color": "#fff", "margin": "0 8px 14px" }}><span style={{ "color": "#C98FA0" }}>e</span>organizei</p>
<span style={{ "fontSize": "9.5px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#8A837D", "padding": "6px 10px 3px" }}>Principal</span>
<span style={{ "padding": "7px 10px" }}>Dashboard</span>
<span style={{ "padding": "7px 10px", "background": "rgba(255,255,255,.08)", "color": "#fff", "borderRadius": "6px", "fontWeight": "600" }}>Eventos</span>
<span style={{ "fontSize": "9.5px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#8A837D", "padding": "10px 10px 3px" }}>Comercial</span>
<span style={{ "padding": "7px 10px" }}>Gestão comercial</span>
<span style={{ "padding": "7px 10px" }}>Clientes</span>
<span style={{ "fontSize": "9.5px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#8A837D", "padding": "10px 10px 3px" }}>Operação</span>
<span style={{ "padding": "7px 10px" }}>Solicitações</span>
<span style={{ "padding": "7px 10px" }}>Tarefas</span>
<span style={{ "fontSize": "9.5px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#8A837D", "padding": "10px 10px 3px" }}>Cadastros</span>
<span style={{ "padding": "7px 10px" }}>Fornecedores</span>
<span style={{ "padding": "7px 10px" }}>Equipe</span>
<span style={{ "fontSize": "9.5px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#8A837D", "padding": "10px 10px 3px" }}>Empresa</span>
<span style={{ "padding": "7px 10px" }}>Financeiro</span>
<span style={{ "padding": "7px 10px" }}>Configurações</span>
</div>

<div style={{ "position": "relative", "background": "#FAFAF9", "display": "flex", "flexDirection": "column", "minWidth": "0" }}>
<div style={{ "height": "44px", "flex": "none", "display": "flex", "alignItems": "center", "justifyContent": "space-between", "padding": "0 22px", "borderBottom": "1px solid #EFEDEA", "background": "#fff", "fontSize": "12px", "color": "#6B6259" }}>
<span>Quarta-feira, 23 de setembro de 2026</span>
<span style={{ "display": "flex", "alignItems": "center", "gap": "14px" }}><span style={{ "position": "relative" }}>🔔<span style={{ "position": "absolute", "top": "-6px", "right": "-10px", "background": "#E11D48", "color": "#fff", "fontSize": "9px", "padding": "1px 4px", "borderRadius": "999px" }}>{sino}</span></span><span style={{ "width": "24px", "height": "24px", "borderRadius": "50%", "background": "#EDE5DD", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "10px", "fontWeight": "600", "color": "#6E2E34" }}>JP</span>Juliana Prado</span>
</div>

<div style={{ "padding": "18px 34px", "display": "flex", "flexDirection": "column", "gap": "13px", "minWidth": "0" }}>
<div style={{ "display": "flex", "alignItems": "center", "gap": "10px", "fontSize": "12px", "color": "#797E86" }}><span>← Voltar para eventos</span><span style={{ "display": "flex", "alignItems": "center", "gap": "5px", "background": "#ECFDF5", "color": "#047857", "fontSize": "11px", "fontWeight": "500", "padding": "2px 8px", "borderRadius": "4px" }}><span style={{ "width": "5px", "height": "5px", "borderRadius": "50%", "background": "currentColor" }}></span>Confirmado</span></div>
<div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "flex-start", "gap": "16px" }}>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "4px" }}><h1 style={{ "fontSize": "21px", "fontWeight": "600", "letterSpacing": "-.01em", "color": "#1B1C1E" }}>Marina e Téo <span style={{ "fontSize": "14px", "color": "#A2A6AD" }}>✎</span></h1><p style={{ "fontSize": "12.5px", "color": "#797E86" }}>Casamento · 14/03/2027 às 17:00 · Villa Real · 180 convidados · Faltam 172 dias</p></div>
<span style={{ "display": "flex", "alignItems": "center", "gap": "8px", "border": "1px solid #E5E7EB", "background": "#fff", "padding": "8px 14px", "borderRadius": "8px", "fontSize": "12.5px", "fontWeight": "500", "color": "#33373D", "whiteSpace": "nowrap" }}>▷ Modo Evento</span>
</div>

<div style={{ "display": "grid", "gridTemplateColumns": "repeat(3,minmax(0,1fr))", "border": "1px solid #F0F0EE", "borderRadius": "10px", "background": "#fff", "overflow": "hidden" }}>
<div data-alvo="fase1" style={{ "padding": "11px 14px", "display": "flex", "flexDirection": "column", "gap": "3px", "background": `${fase1Bg}`, "transition": "background .3s" }}>
<span style={{ "fontSize": "9.5px", "fontWeight": "600", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "#A2A6AD" }}>1 · Planejar</span>
<span style={{ "fontSize": "13px", "fontWeight": "500", "color": "#33373D" }}>Planejamento</span>
<span style={{ "fontSize": "11px", "color": "#797E86" }}>2 tarefas restantes</span>
<span style={{ "marginTop": "5px", "height": "3px", "borderRadius": "999px", "background": "#E8E8E4", "overflow": "hidden" }}><span style={{ "display": "block", "height": "100%", "borderRadius": "999px", "background": "#A2A6AD", "width": `${rail1}`, "transition": "width 1s ease" }}></span></span>
</div>
<div style={{ "padding": "11px 14px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE" }}>
<span style={{ "fontSize": "9.5px", "fontWeight": "600", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "#A2A6AD" }}>2 · Organizar</span>
<span style={{ "fontSize": "13px", "fontWeight": "500", "color": "#33373D" }}>Organização</span>
<span style={{ "fontSize": "11px", "color": "#797E86" }}>1 parcela pendente</span>
<span style={{ "marginTop": "5px", "height": "3px", "borderRadius": "999px", "background": "#E8E8E4", "overflow": "hidden" }}><span style={{ "display": "block", "height": "100%", "borderRadius": "999px", "background": "#A2A6AD", "width": `${rail2}`, "transition": "width 1s ease .15s" }}></span></span>
</div>
<div style={{ "padding": "11px 14px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE" }}>
<span style={{ "fontSize": "9.5px", "fontWeight": "600", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "#A2A6AD" }}>3 · Executar</span>
<span style={{ "fontSize": "13px", "fontWeight": "500", "color": "#33373D" }}>Roteiro do dia</span>
<span style={{ "fontSize": "11px", "color": "#797E86" }}>Faltam 172 dias</span>
<span style={{ "marginTop": "5px", "height": "3px", "borderRadius": "999px", "background": "#E8E8E4", "overflow": "hidden" }}><span style={{ "display": "block", "height": "100%", "borderRadius": "999px", "background": "#A2A6AD", "width": `${rail3}`, "transition": "width 1s ease .3s" }}></span></span>
</div>
</div>

<div style={{ "display": "flex", "alignItems": "stretch", "gap": "2px", "borderBottom": "1px solid #F0F0EE", "fontSize": "12px", "fontWeight": "500", "whiteSpace": "nowrap", "overflow": "hidden" }}>
<span style={{ "padding": "9px 7px", "borderBottom": `2px solid ${tabResumoBd}`, "color": `${tabResumoFg}` }}>Resumo</span>
<span style={{ "alignSelf": "center", "marginLeft": "4px", "fontSize": "9.5px", "fontWeight": "600", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#A2A6AD" }}>Organizar</span>
<span style={{ "padding": "9px 7px", "color": "#797E86" }}>Fornecedores</span>
<span style={{ "padding": "9px 7px", "color": "#797E86" }}>Contratos</span>
<span style={{ "padding": "9px 7px", "color": "#797E86" }}>Comunicação</span>
<span data-alvo="tabFin" style={{ "padding": "9px 7px", "borderBottom": `2px solid ${tabFinBd}`, "color": `${tabFinFg}` }}>Financeiro</span>
<span style={{ "alignSelf": "center", "marginLeft": "4px", "fontSize": "9.5px", "fontWeight": "600", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#A2A6AD" }}>Executar</span>
<span style={{ "padding": "9px 7px", "color": "#797E86" }}>Operação</span>
<span data-alvo="tabRsvp" style={{ "padding": "9px 7px", "borderBottom": `2px solid ${tabRsvpBd}`, "color": `${tabRsvpFg}` }}>RSVP</span>
<span style={{ "padding": "9px 7px", "color": "#797E86" }}>Mesas</span>
<span style={{ "marginLeft": "auto" }}></span>
<span style={{ "padding": "9px 5px", "fontSize": "11px", "color": "#A2A6AD" }}>Área do cliente</span>
<span style={{ "padding": "9px 5px", "fontSize": "11px", "color": "#A2A6AD" }}>Histórico</span>
</div>

{s0 && (<>
<div style={{ "display": "grid", "gridTemplateColumns": "minmax(0,1.9fr) minmax(0,1fr)", "gap": "26px", "animation": "sdIn .4s ease both" }}>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "10px" }}>
<div style={{ "display": "flex", "justifyContent": "space-between" }}><p style={{ "fontSize": "13px", "fontWeight": "600", "color": "#1B1C1E" }}>Cliente</p><span style={{ "fontSize": "11px", "color": "#6B7280" }}>Editar dados do evento</span></div>
<p style={{ "fontSize": "14px", "fontWeight": "500" }}>Marina e Téo</p>
<p style={{ "fontSize": "12.5px", "color": "#4B5563" }}>☏ (11) 99999-9999</p>
<div style={{ "display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "14px 20px", "marginTop": "4px" }}>
<div><p style={{ "fontSize": "11px", "color": "#9CA3AF" }}>Cerimonialista responsável</p><p style={{ "fontSize": "12.5px", "marginTop": "4px", "display": "flex", "alignItems": "center", "gap": "8px" }}><span style={{ "width": "22px", "height": "22px", "borderRadius": "50%", "background": "#F3F4F6", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "10px" }}>J</span>Juliana <span style={{ "color": "#9CA3AF" }}>· Cerimonialista</span></p></div>
<div><p style={{ "fontSize": "11px", "color": "#9CA3AF" }}>Valor contratado</p><p style={{ "fontSize": "12.5px", "fontWeight": "500", "marginTop": "4px" }}>R$ 18.500</p></div>
<div><p style={{ "fontSize": "11px", "color": "#9CA3AF" }}>Forma de pagamento</p><p style={{ "fontSize": "12.5px", "marginTop": "4px" }}>Entrada + 6 parcelas</p></div>
<div><p style={{ "fontSize": "11px", "color": "#9CA3AF" }}>Convidados esperados</p><p style={{ "fontSize": "12.5px", "marginTop": "4px" }}>180 pessoas, pode chegar a 200</p></div>
</div>
</div>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "12px" }}>
<div style={{ "border": "1px solid #EFEDEA", "borderRadius": "10px", "background": "#fff", "padding": "14px 16px", "display": "flex", "flexDirection": "column", "gap": "8px" }}>
<div style={{ "display": "flex", "justifyContent": "space-between" }}><p style={{ "fontSize": "12.5px", "fontWeight": "600" }}>Próximas atividades</p><span style={{ "fontSize": "11px", "color": "#6B7280" }}>Ver todas</span></div>
<div style={{ "display": "flex", "justifyContent": "space-between", "gap": "8px", "fontSize": "12px", "paddingTop": "6px", "borderTop": "1px solid #F3F4F6" }}><span>Prova do cardápio</span><span style={{ "color": "#797E86" }}>em 5 dias</span></div>
<div style={{ "display": "flex", "justifyContent": "space-between", "gap": "8px", "fontSize": "12px" }}><span>Parcela Flor &amp; Casa</span><span style={{ "color": "#B07514" }}>em 12 dias</span></div>
</div>
<div style={{ "border": "1px solid #EFEDEA", "borderRadius": "10px", "background": "#fff", "padding": "14px 16px", "display": "flex", "flexDirection": "column", "gap": "10px" }}>
<p style={{ "fontSize": "12.5px", "fontWeight": "600" }}>Ações rápidas</p>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "1px" }}><span style={{ "fontSize": "12px", "fontWeight": "500" }}>Nova tarefa</span><span style={{ "fontSize": "10.5px", "color": "#9CA3AF" }}>Crie uma tarefa para este evento</span></div>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "1px" }}><span style={{ "fontSize": "12px", "fontWeight": "500" }}>Adicionar fornecedor</span><span style={{ "fontSize": "10.5px", "color": "#9CA3AF" }}>Busque e vincule do seu cadastro</span></div>
</div>
</div>
</div>
</>)}

{s1 && (<>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "10px", "animation": "sdIn .4s ease both" }}>
<div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px" }}>
<span style={{ "font": "400 11.5px ui-monospace,Menlo,monospace", "color": "#928A81" }}>Marina &amp; Téo · casamento 14/03/2027 · faltam 172 dias · {planFeitas}/12 feitas</span>
<div style={{ "display": "flex", "alignItems": "center", "gap": "14px" }}>
<span style={{ "display": "flex", "gap": "12px", "font": "400 11px ui-monospace,Menlo,monospace", "color": "#928A81", "whiteSpace": "nowrap" }}><span style={{ "color": "#A5544B" }}>● vencida</span><span>○ a fazer</span><span style={{ "color": "#5E7355", "textDecoration": "line-through" }}>decidida</span></span>
<span style={{ "display": "flex", "padding": "3px", "background": "#F2EEE9", "borderRadius": "9px", "gap": "2px", "fontSize": "12px", "fontWeight": "600" }}><span style={{ "padding": "6px 12px", "color": "#928A81" }}>Panorama</span><span style={{ "padding": "6px 12px", "background": "#fff", "borderRadius": "7px", "boxShadow": "0 1px 2px rgba(34,30,27,.08)" }}>Mês a mês</span></span>
</div>
</div>
<div style={{ "display": "grid", "gridTemplateColumns": "250px minmax(0,1fr)", "background": "#fff", "border": "1px solid #E6E0D8", "borderRadius": "12px", "overflow": "hidden", "height": "356px" }}>
<div style={{ "background": "#FAF8F5", "borderRight": "1px solid #E6E0D8", "padding": "16px 0", "display": "flex", "flexDirection": "column", "gap": "1px" }}>
<span style={{ "padding": "0 18px 8px", "fontSize": "11px", "fontWeight": "600", "letterSpacing": ".06em", "textTransform": "uppercase", "color": "#928A81" }}>Índice · 6 meses</span>
{planMeses.map((m: any, i: number) => (<div key={i} style={{ "display": "grid", "gridTemplateColumns": "96px 1fr 34px", "alignItems": "center", "gap": "10px", "padding": "8px 18px", "borderLeft": `3px solid ${m.bd}`, "background": `${m.bg}` }}>
<span style={{ "fontSize": "13px", "fontWeight": "600", "color": `${m.fg}`, "whiteSpace": "nowrap" }}>{m.nome}</span>
<span style={{ "height": "4px", "borderRadius": "999px", "background": "#E6E0D8", "overflow": "hidden" }}><span style={{ "display": "block", "height": "100%", "background": `${m.barCor}`, "width": `${m.pct}`, "transition": "width .5s" }}></span></span>
<span style={{ "font": "400 10.5px ui-monospace,Menlo,monospace", "color": `${m.rc}`, "textAlign": "right" }}>{m.razao}</span>
</div>))}
</div>
<div style={{ "padding": "18px 28px", "display": "flex", "flexDirection": "column", "gap": "6px", "minWidth": "0" }}>
<div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "flex-end", "paddingBottom": "10px", "borderBottom": "1px solid #221E1B" }}>
<div><span style={{ "font": "400 11.5px ui-monospace,Menlo,monospace", "color": "#928A81" }}>este mês</span><h2 style={{ "font": "500 30px/1.1 var(--font-ui),'Instrument Sans',sans-serif", "letterSpacing": "-.02em", "marginTop": "2px" }}>Outubro 2026</h2></div>
<span style={{ "font": "400 11.5px ui-monospace,Menlo,monospace", "color": "#928A81" }}>{planAbertas} abertas · {planDecididas} decididas</span>
</div>
<div style={{ "display": "flex", "alignItems": "center", "gap": "12px", "minHeight": "38px", "borderBottom": "1px solid #E6E0D8" }}><span style={{ "flex": "none", "width": "13px", "height": "13px", "borderRadius": "50%", "border": "1.5px solid #A5544B", "background": "#A5544B" }}></span><span style={{ "flex": "1", "fontSize": "14px", "color": "#A5544B" }}>Fechar a banda</span><span style={{ "font": "400 11.5px ui-monospace,Menlo,monospace", "color": "#A5544B" }}>há 2 dias</span></div>
<div data-alvo="planTarefa" style={{ "display": "flex", "alignItems": "center", "gap": "12px", "minHeight": "38px", "borderBottom": "1px solid #E6E0D8", "background": `${planHover}`, "margin": "0 -8px", "padding": "0 8px", "transition": "background .2s" }}><span style={{ "flex": "none", "width": "13px", "height": "13px", "borderRadius": "50%", "border": `1.5px solid ${planRingBd}`, "background": `${planRingBg}`, "transition": "all .3s" }}></span><span style={{ "flex": "1", "fontSize": "14px", "color": `${planTxt}`, "textDecoration": `${planDeco}` }}>Escolher a paleta da decoração</span><span style={{ "font": "400 11.5px ui-monospace,Menlo,monospace", "color": `${planTxt}` }}>{planData}</span></div>
<div style={{ "display": "flex", "alignItems": "center", "gap": "12px", "minHeight": "38px", "borderBottom": "1px solid #E6E0D8" }}><span style={{ "flex": "none", "width": "13px", "height": "13px", "borderRadius": "50%", "border": "1.5px solid #B4ADA4", "background": "transparent" }}></span><span style={{ "flex": "1", "fontSize": "14px" }}>Enviar o briefing para a papelaria</span><span style={{ "font": "400 11.5px ui-monospace,Menlo,monospace", "color": "#928A81" }}>28/10/2026</span></div>
<div style={{ "display": "flex", "alignItems": "center", "gap": "12px", "minHeight": "38px", "borderBottom": "1px solid #E6E0D8" }}><span style={{ "flex": "none", "width": "13px", "height": "13px", "borderRadius": "50%", "border": "1.5px solid #5E7355", "background": "#5E7355" }}></span><span style={{ "flex": "1", "fontSize": "14px", "color": "#5E7355", "textDecoration": "line-through" }}>Degustação do buffet</span><span style={{ "font": "400 11.5px ui-monospace,Menlo,monospace", "color": "#5E7355" }}>decidida</span></div>
<div style={{ "padding": "9px 0", "borderBottom": "1px solid #E6E0D8" }}><b style={{ "fontSize": "13px", "fontWeight": "600" }}>Reunião · 12 de outubro · 15:00 · Degustação</b><p style={{ "fontStyle": "italic", "fontSize": "13px", "color": "#6B6259", "padding": "4px 0 0 12px" }}>A noiva prefere o menu 2, sem frutos do mar.</p></div>
<div style={{ "minHeight": "34px", "borderBottom": "1px solid #E6E0D8", "display": "flex", "alignItems": "center", "fontSize": "13px", "color": "#B4ADA4" }}>+ anotar</div>
</div>
</div>
</div>
</>)}

{s2 && (<>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "12px", "animation": "sdIn .4s ease both" }}>
<div style={{ "display": "grid", "gridTemplateColumns": "repeat(3,minmax(0,1fr))", "gap": "8px" }}>
<div style={{ "border": `1px solid ${cvBd}`, "background": `${cvBg}`, "borderRadius": "10px", "padding": "10px 14px", "display": "flex", "flexDirection": "column", "gap": "2px" }}><span style={{ "fontSize": "13px", "fontWeight": "600" }}>Verba do evento</span><span style={{ "fontSize": "11.5px", "color": "#797E86" }}>dinheiro do casal · a pagar {aPagar}</span></div>
<div data-alvo="contaAss" style={{ "border": `1px solid ${caBd}`, "background": `${caBg}`, "borderRadius": "10px", "padding": "10px 14px", "display": "flex", "flexDirection": "column", "gap": "2px", "transition": "all .25s" }}><span style={{ "fontSize": "13px", "fontWeight": "600" }}>Minha assessoria</span><span style={{ "fontSize": "11.5px", "color": "#797E86" }}>sua receita · a receber R$ 9.250,00</span></div>
<div style={{ "border": "1px solid #E5E7EB", "background": "#fff", "borderRadius": "10px", "padding": "10px 14px", "display": "flex", "flexDirection": "column", "gap": "2px" }}><span style={{ "fontSize": "13px", "fontWeight": "600" }}>Encerramento</span><span style={{ "fontSize": "11.5px", "color": "#797E86" }}>conciliação · fechamento · prestação</span></div>
</div>
{finVerba && (<>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "10px", "animation": "sdIn .35s ease both" }}>
<div style={{ "display": "grid", "gridTemplateColumns": "repeat(4,minmax(0,1fr))", "border": "1px solid #E5E7EB", "borderRadius": "12px", "background": "#fff" }}>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>Verba total</span><span style={{ "fontSize": "20px", "fontWeight": "600" }}>R$ 92.000,00</span><span style={{ "fontSize": "11px", "color": "#A2A6AD" }}>definida pelo casal</span></div>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>Contratado</span><span style={{ "fontSize": "20px", "fontWeight": "600" }}>R$ 86.400,00</span><span style={{ "fontSize": "11px", "color": "#A2A6AD" }}>7 fornecedores</span></div>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>Pago</span><span style={{ "fontSize": "20px", "fontWeight": "600" }}>{pago}</span><span style={{ "fontSize": "11px", "color": "#A2A6AD" }}>{comprov} comprovantes</span></div>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE", "background": "#FBFAF8" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>A pagar</span><span style={{ "fontSize": "20px", "fontWeight": "600", "color": "#A5813C" }}>{aPagar}</span><span style={{ "fontSize": "11px", "color": "#A2A6AD" }}>{nAbertas} parcelas em aberto</span></div>
</div>
<div style={{ "border": "1px solid #E5E7EB", "borderRadius": "12px", "background": "#fff", "padding": "12px 18px", "display": "flex", "flexDirection": "column" }}>
<div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "baseline", "paddingBottom": "8px" }}><p style={{ "fontSize": "14px", "fontWeight": "600" }}>Agenda de pagamentos</p><span style={{ "fontSize": "11px", "color": "#A2A6AD" }}>próximos 30 dias</span></div>
<div style={{ "display": "grid", "gridTemplateColumns": "52px minmax(0,1fr) 100px 150px 120px", "alignItems": "center", "gap": "12px", "padding": "9px 0", "borderTop": "1px solid #F0F0EE", "fontSize": "12.5px" }}><span style={{ "color": "#A5813C", "fontWeight": "500" }}>10/10</span><span><b style={{ "fontWeight": "500" }}>Flor &amp; Casa</b> <span style={{ "color": "#797E86" }}>· decoração · parcela 3 de 4</span></span><span style={{ "textAlign": "right", "fontWeight": "500" }}>R$ 6.500,00</span><span style={{ "justifySelf": "end", "fontSize": "11px", "fontWeight": "500", "padding": "3px 9px", "borderRadius": "999px", "background": `${fcBg}`, "color": `${fcFg}`, "whiteSpace": "nowrap", "transition": "all .3s" }}>{fcSelo}</span><span data-alvo="btnPagar" style={{ "justifySelf": "end", "fontSize": "12px", "fontWeight": "500", "padding": "6px 10px", "borderRadius": "8px", "border": "1px solid #E5E7EB", "background": `${pagBg}`, "opacity": `${pagOp}`, "whiteSpace": "nowrap", "transition": "all .2s" }}>Pagar e anexar</span></div>
<div style={{ "display": "grid", "gridTemplateColumns": "52px minmax(0,1fr) 100px 150px 120px", "alignItems": "center", "gap": "12px", "padding": "9px 0", "borderTop": "1px solid #F0F0EE", "fontSize": "12.5px" }}><span style={{ "color": "#797E86" }}>20/10</span><span><b style={{ "fontWeight": "500" }}>Banda Lume</b> <span style={{ "color": "#797E86" }}>· música · parcela 2 de 3</span></span><span style={{ "textAlign": "right", "fontWeight": "500" }}>R$ 3.000,00</span><span style={{ "justifySelf": "end", "fontSize": "11px", "fontWeight": "500", "padding": "3px 9px", "borderRadius": "999px", "background": "#F1EEE6", "color": "#8A7448" }}>vence em 26 dias</span><span style={{ "justifySelf": "end", "fontSize": "12px", "fontWeight": "500", "padding": "6px 10px", "borderRadius": "8px", "border": "1px solid #E5E7EB" }}>Pagar e anexar</span></div>
<div style={{ "display": "grid", "gridTemplateColumns": "52px minmax(0,1fr) 100px 150px 120px", "alignItems": "center", "gap": "12px", "padding": "9px 0", "borderTop": "1px solid #F0F0EE", "fontSize": "12.5px" }}><span style={{ "color": "#797E86" }}>02/10</span><span><b style={{ "fontWeight": "500" }}>Buffet Aurora</b> <span style={{ "color": "#797E86" }}>· buffet · parcela 4 de 4</span></span><span style={{ "textAlign": "right", "fontWeight": "500" }}>R$ 9.500,00</span><span style={{ "justifySelf": "end", "fontSize": "11px", "fontWeight": "500", "padding": "3px 9px", "borderRadius": "999px", "background": "#EDF0EA", "color": "#5E7355" }}>pago · comprovante</span><span></span></div>
</div>
</div>
</>)}
{finAss && (<>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "10px", "animation": "sdIn .35s ease both" }}>
<div style={{ "display": "grid", "gridTemplateColumns": "repeat(4,minmax(0,1fr))", "border": "1px solid #E5E7EB", "borderRadius": "12px", "background": "#fff" }}>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>Contrato de assessoria</span><span style={{ "fontSize": "20px", "fontWeight": "600" }}>R$ 18.500,00</span><span style={{ "fontSize": "11px", "color": "#6E2E34" }}>assinado 02/09/2026</span></div>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>Recebido</span><span style={{ "fontSize": "20px", "fontWeight": "600" }}>R$ 9.250,00</span><span style={{ "fontSize": "11px", "color": "#A2A6AD" }}>50% do contrato</span></div>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE", "background": "#FBFAF8" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>A receber</span><span style={{ "fontSize": "20px", "fontWeight": "600" }}>R$ 9.250,00</span><span style={{ "fontSize": "11px", "color": "#A2A6AD" }}>3 parcelas em aberto</span></div>
<div style={{ "padding": "12px 16px", "display": "flex", "flexDirection": "column", "gap": "3px", "borderLeft": "1px solid #F0F0EE" }}><span style={{ "fontSize": "11px", "color": "#797E86" }}>Próximo recebimento</span><span style={{ "fontSize": "20px", "fontWeight": "600" }}>R$ 3.083,33</span><span style={{ "fontSize": "11px", "color": "#A5813C" }}>15/10 · Parcela 4</span></div>
</div>
<div style={{ "border": "1px solid #E5E7EB", "borderRadius": "12px", "background": "#fff", "padding": "12px 18px" }}>
<p style={{ "fontSize": "14px", "fontWeight": "600" }}>Parcelas do casal para você</p>
<p style={{ "fontSize": "11.5px", "color": "#797E86", "margin": "2px 0 8px" }}>este dinheiro é seu · não entra na verba do evento</p>
<div style={{ "display": "grid", "gridTemplateColumns": "52px minmax(0,1fr) 110px 110px", "gap": "12px", "padding": "9px 0", "borderTop": "1px solid #F0F0EE", "fontSize": "12.5px" }}><span style={{ "color": "#797E86" }}>15/09</span><span>Parcela 3</span><span style={{ "textAlign": "right", "fontWeight": "500" }}>R$ 3.083,33</span><span style={{ "justifySelf": "end", "fontSize": "11px", "padding": "3px 9px", "borderRadius": "999px", "background": "#EDF0EA", "color": "#5E7355" }}>recebido</span></div>
<div style={{ "display": "grid", "gridTemplateColumns": "52px minmax(0,1fr) 110px 110px", "gap": "12px", "padding": "9px 0", "borderTop": "1px solid #F0F0EE", "fontSize": "12.5px" }}><span style={{ "color": "#A5813C" }}>15/10</span><span>Parcela 4</span><span style={{ "textAlign": "right", "fontWeight": "500" }}>R$ 3.083,33</span><span style={{ "justifySelf": "end", "fontSize": "11px", "padding": "3px 9px", "borderRadius": "999px", "background": "#F1EEE6", "color": "#8A7448" }}>em 21 dias</span></div>
</div>
</div>
</>)}
</div>
</>)}

{s3 && (<>
<div style={{ "display": "grid", "gridTemplateColumns": "minmax(0,1fr) minmax(0,1.15fr)", "gap": "14px", "animation": "sdIn .4s ease both" }}>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "12px" }}>
<div style={{ "border": "1px solid #E7E5E4", "borderRadius": "14px", "background": "linear-gradient(135deg,#fff,#FAFAF9)", "padding": "14px 18px" }}>
<p style={{ "fontSize": "10.5px", "fontWeight": "500", "letterSpacing": ".06em", "textTransform": "uppercase", "color": "#78716C" }}>Confirmados</p>
<p style={{ "display": "flex", "alignItems": "baseline", "gap": "8px", "marginTop": "2px" }}><span style={{ "fontSize": "40px", "fontWeight": "600", "letterSpacing": "-.02em", "color": "#1C1917" }}>{nPessoas}</span><span style={{ "fontSize": "13px", "color": "#78716C" }}>pessoas</span></p>
<p style={{ "fontSize": "11.5px", "color": "#78716C" }}>contando acompanhantes e crianças · 9 com restrição alimentar</p>
<div style={{ "display": "flex", "height": "7px", "borderRadius": "999px", "overflow": "hidden", "background": "#F5F5F4", "marginTop": "10px" }}>
<span style={{ "background": "#10B981", "width": `${barC}`, "transition": "width .5s" }}></span><span style={{ "background": "#FBBF24", "width": `${barA}`, "transition": "width .5s" }}></span><span style={{ "background": "#D6D3D1", "width": "4.3%" }}></span>
</div>
<div style={{ "display": "flex", "gap": "14px", "marginTop": "8px", "fontSize": "11.5px", "color": "#57534E" }}>
<span style={{ "display": "flex", "gap": "5px", "alignItems": "center" }}><span style={{ "width": "7px", "height": "7px", "borderRadius": "50%", "background": "#10B981" }}></span><b style={{ "color": "#1C1917" }}>{nConf}</b> confirmados</span>
<span style={{ "display": "flex", "gap": "5px", "alignItems": "center" }}><span style={{ "width": "7px", "height": "7px", "borderRadius": "50%", "background": "#FBBF24" }}></span><b style={{ "color": "#1C1917" }}>{nAg}</b> aguardando</span>
<span style={{ "display": "flex", "gap": "5px", "alignItems": "center" }}><span style={{ "width": "7px", "height": "7px", "borderRadius": "50%", "background": "#D6D3D1" }}></span><b style={{ "color": "#1C1917" }}>6</b> não vão</span>
</div>
</div>
<div style={{ "border": "1px solid #E7E5E4", "borderRadius": "14px", "background": "#fff" }}>
<div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "flex-start", "gap": "10px", "padding": "12px 16px", "borderBottom": "1px solid #F5F5F4" }}>
<div><p style={{ "fontSize": "13px", "fontWeight": "600" }}>Convite</p><p style={{ "fontSize": "11.5px", "color": "#78716C", "marginTop": "2px" }}>Um link só para o evento todo. Cada pessoa abre, confirma e já recebe a entrada dela.</p></div>
<span style={{ "background": "#ECFDF5", "color": "#047857", "fontSize": "10.5px", "fontWeight": "500", "padding": "3px 8px", "borderRadius": "999px", "whiteSpace": "nowrap" }}>recebendo confirmações</span>
</div>
<div style={{ "display": "flex", "gap": "8px", "padding": "12px 16px" }}>
<span data-alvo="btnWhats" style={{ "display": "flex", "alignItems": "center", "gap": "7px", "background": `${whatsBg}`, "color": "#fff", "padding": "8px 14px", "borderRadius": "10px", "fontSize": "12.5px", "fontWeight": "500", "transition": "background .2s" }}>Enviar no WhatsApp</span>
<span style={{ "display": "flex", "alignItems": "center", "border": "1px solid #E7E5E4", "padding": "8px 14px", "borderRadius": "10px", "fontSize": "12.5px", "fontWeight": "500", "color": "#44403C" }}>Copiar link</span>
</div>
</div>
</div>
<div style={{ "border": "1px solid #E7E5E4", "borderRadius": "14px", "background": "#fff", "display": "flex", "flexDirection": "column" }}>
<div style={{ "padding": "12px 16px", "borderBottom": "1px solid #F5F5F4" }}><p style={{ "fontSize": "13px", "fontWeight": "600" }}>Convidados</p><p style={{ "fontSize": "11.5px", "color": "#78716C", "marginTop": "2px" }}>A mesma lista que a cliente vê no portal dela.</p></div>
<div style={{ "display": "flex", "flexDirection": "column", "padding": "2px 16px" }}>
{guests.map((g: any, i: number) => (<div key={i} style={{ "display": "flex", "alignItems": "center", "gap": "10px", "padding": "8px 0", "borderTop": "1px solid #F5F5F4" }}>
<span style={{ "width": "30px", "height": "30px", "flex": "none", "borderRadius": "50%", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "10.5px", "fontWeight": "600", "background": `${g.avBg}`, "color": `${g.avFg}`, "transition": "all .4s" }}>{g.ini}</span>
<div style={{ "flex": "1", "minWidth": "0" }}><p style={{ "fontSize": "12.5px", "fontWeight": "500" }}>{g.nome}</p><p style={{ "fontSize": "10.5px", "color": "#78716C", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{g.det}</p></div>
<span style={{ "fontSize": "10.5px", "fontWeight": "500", "padding": "3px 9px", "borderRadius": "999px", "background": `${g.seloBg}`, "color": `${g.seloFg}`, "whiteSpace": "nowrap", "transition": "all .4s" }}>{g.selo}</span>
</div>))}
</div>
</div>
</div>
</>)}
</div>

{toast && (<>
<div style={{ "position": "absolute", "left": "50%", "bottom": "26px", "background": "#1C1917", "color": "#FAF8F5", "padding": "11px 18px", "borderRadius": "10px", "fontSize": "12.5px", "whiteSpace": "nowrap", "animation": "sdToast 2.6s ease both", "boxShadow": "0 12px 30px rgba(34,30,27,.25)" }}>{toastTxt}</div>
</>)}
</div>
</div>
</>)}

{s4 && (<>
<div style={{ "height": "100%", "background": "#F6F2EB", "display": "grid", "gridTemplateColumns": "1fr 290px 1fr", "alignItems": "center", "gap": "52px", "padding": "0 70px", "animation": "sdIn .4s ease both" }}>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "10px", "textAlign": "right" }}>
<p style={{ "fontSize": "11px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#6E2E34" }}>O convidado</p>
<p style={{ "font": "400 26px/1.25 var(--font-newsreader),Newsreader,serif", "color": "#332B24" }}>Recebe o link no WhatsApp e confirma em segundos, sem aplicativo.</p>
</div>
<div style={{ "width": "290px", "height": "580px", "background": "#1C1917", "borderRadius": "42px", "padding": "10px", "boxShadow": "0 30px 60px -20px rgba(70,56,42,.5)" }}>
<div style={{ "height": "100%", "background": "#FDFBF7", "borderRadius": "34px", "padding": "34px 22px 22px", "overflow": "hidden", "color": "#3A312A" }}>
{convAberto && (<>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "14px" }}>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "4px" }}><span style={{ "fontSize": "14px", "color": "#776D60" }}>Ana,</span><p style={{ "font": "400 24px/1.15 var(--font-newsreader),Newsreader,serif", "color": "#332B24" }}>um convite para o casamento de Marina &amp; Téo</p></div>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "2px", "fontSize": "12.5px", "color": "#4C443C" }}><span>Sábado, 14 de março de 2027 · 17h</span><span>Villa Real · Itu</span></div>
<p style={{ "fontSize": "13px", "color": "#4C443C" }}>Você vai poder ir?</p>
<span data-alvo="simVou" style={{ "textAlign": "center", "padding": "12px", "borderRadius": "10px", "fontSize": "14px", "border": `1px solid ${simBd}`, "background": `${simBg}`, "color": `${simFg}`, "transition": "all .25s" }}>Sim, eu vou</span>
<span style={{ "textAlign": "center", "padding": "12px", "borderRadius": "10px", "fontSize": "14px", "border": "1px solid #E7DFD2", "background": "#fff" }}>Infelizmente não posso</span>
{convPerguntas && (<>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "9px", "animation": "sdIn .35s ease both" }}>
<span style={{ "fontSize": "12px", "color": "#4C443C" }}>Vai levar acompanhante?</span>
<span data-alvo="acomp" style={{ "padding": "10px 12px", "border": "1px solid #E7DFD2", "borderRadius": "8px", "fontSize": "13px", "background": "#fff", "display": "flex", "justifyContent": "space-between" }}><span>{acompTxt}</span><span style={{ "color": "#B39662" }}>▾</span></span>
<span data-alvo="confirmar" style={{ "textAlign": "center", "padding": "12px", "borderRadius": "10px", "fontSize": "14px", "background": `${confBg}`, "color": "#FDFBF7", "transition": "background .2s" }}>Confirmar presença</span>
</div>
</>)}
</div>
</>)}
{convPronto && (<>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "11px", "alignItems": "center", "textAlign": "center", "animation": "sdIn .45s ease both" }}>
<p style={{ "font": "400 30px/1.1 var(--font-newsreader),Newsreader,serif", "color": "#332B24" }}>Que alegria!</p>
<p style={{ "fontSize": "13px", "lineHeight": "1.5", "color": "#4C443C" }}>Sua presença está confirmada para 2 pessoas. Nos vemos lá.</p>
<div style={{ "background": "#fff", "padding": "10px", "borderRadius": "8px", "border": "1px solid #EDE5D9", "display": "flex" }}>{qr}</div>
<p style={{ "fontSize": "15px", "color": "#332B24" }}>Ana Souza</p>
<p style={{ "fontSize": "12px", "color": "#776D60" }}>entrada <b style={{ "fontSize": "22px", "letterSpacing": ".12em", "color": "#332B24" }}>K7M2QX</b></p>
<span style={{ "padding": "11px 16px", "border": "1px solid #332B24", "borderRadius": "12px", "fontSize": "13px", "width": "100%" }}>Guardar no meu WhatsApp</span>
</div>
</>)}
</div>
</div>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "10px" }}>
<p style={{ "fontSize": "11px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#6E2E34" }}>Você</p>
<p style={{ "font": "400 26px/1.25 var(--font-newsreader),Newsreader,serif", "color": "#332B24" }}>A lista atualiza sozinha. No dia, o QR é lido na recepção, mesmo sem internet.</p>
</div>
</div>
</>)}

{s5 && (<>
<div style={{ "height": "100%", "background": "#F6F2EB", "padding": "18px", "animation": "sdIn .4s ease both" }}>
<div style={{ "height": "100%", "display": "grid", "gridTemplateColumns": "220px minmax(0,1fr)", "background": "#FDFBF7", "border": "1px solid #EBE3D8", "borderRadius": "14px", "overflow": "hidden", "color": "#3A312A" }}>
<div style={{ "background": "#FBF8F2", "borderRight": "1px solid #EFE8DD", "padding": "26px 14px 18px", "display": "flex", "flexDirection": "column", "gap": "20px" }}>
<div style={{ "padding": "0 10px", "display": "flex", "flexDirection": "column", "gap": "4px" }}><span style={{ "font": "400 19px/1 var(--font-newsreader),Newsreader,serif", "letterSpacing": ".14em", "color": "#3A312A" }}>JULIANA PRADO</span><span style={{ "fontSize": "11px", "color": "#4C443C" }}>por Juliana Prado</span></div>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "2px", "fontSize": "13.5px" }}>
<span style={{ "padding": "9px 12px", "borderRadius": "8px", "background": "#F3EBDF" }}>Visão geral</span>
<span style={{ "padding": "9px 12px", "color": "#6B6259" }}>Convidados</span>
<span style={{ "padding": "9px 12px", "color": "#6B6259" }}>Cortejo</span>
<span style={{ "padding": "9px 12px", "color": "#6B6259" }}>Guia de estilo</span>
</div>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "2px", "fontSize": "13px" }}>
<span style={{ "fontSize": "10px", "letterSpacing": ".09em", "textTransform": "uppercase", "color": "#776D60", "padding": "0 12px 4px" }}>Durante o evento</span>
<span style={{ "padding": "8px 12px", "color": "#6B6259" }}>Programa do dia</span>
<span style={{ "fontSize": "10px", "letterSpacing": ".09em", "textTransform": "uppercase", "color": "#776D60", "padding": "10px 12px 4px" }}>Investimento</span>
<span style={{ "padding": "8px 12px", "color": "#6B6259" }}>Pagamentos</span>
</div>
<div style={{ "marginTop": "auto", "border": "1px solid #EDE5D9", "borderRadius": "10px", "background": "#FDFBF7", "padding": "14px", "display": "flex", "flexDirection": "column", "gap": "10px" }}>
<span style={{ "fontSize": "10px", "letterSpacing": ".09em", "textTransform": "uppercase", "color": "#776D60" }}>Sua cerimonialista</span>
<div style={{ "display": "flex", "alignItems": "center", "gap": "10px" }}><span style={{ "width": "34px", "height": "34px", "borderRadius": "50%", "background": "#F3EBDF", "border": "1px solid #EAE1D3", "display": "flex", "alignItems": "center", "justifyContent": "center", "font": "400 14px var(--font-newsreader),Newsreader,serif", "color": "#8C6E43" }}>J</span><div><p style={{ "font": "400 15px var(--font-newsreader),Newsreader,serif" }}>Juliana Prado</p><p style={{ "fontSize": "10.5px", "color": "#4C443C" }}>responde em algumas horas</p></div></div>
<span style={{ "textAlign": "center", "border": "1px solid #E2D6C2", "borderRadius": "8px", "padding": "8px", "fontSize": "12px", "color": "#6E5533", "background": "#FBF8F2" }}>Falar com Juliana</span>
</div>
</div>
<div style={{ "padding": "26px 34px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0" }}>
<div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "flex-start", "gap": "24px" }}>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "8px", "paddingTop": "4px" }}><h1 style={{ "font": "400 44px/1.05 var(--font-newsreader),Newsreader,serif", "color": "#332B24" }}>Marina &amp; Téo</h1><p style={{ "fontSize": "13.5px", "color": "#4C443C" }}>14 de março de 2027 · Villa Real · Itu</p></div>
<div style={{ "position": "relative", "overflow": "hidden", "width": "250px", "flex": "none", "border": "1px solid #E3D3B7", "borderRadius": "12px", "background": "linear-gradient(135deg,#FDFAF4,#F8F1E4)", "padding": "16px 20px", "display": "flex", "flexDirection": "column", "gap": "2px" }}>
<div style={{ "position": "absolute", "top": "0", "left": "0", "right": "0", "height": "1px", "overflow": "hidden", "background": "linear-gradient(90deg,rgba(212,180,124,0),rgba(212,180,124,.5),rgba(212,180,124,0))" }}><span style={{ "display": "block", "height": "1px", "width": "38%", "background": "linear-gradient(90deg,rgba(255,255,255,0),#E7C98D 45%,#FFF6E2 55%,rgba(255,255,255,0))", "animation": "goldSweep 6.5s ease-in-out infinite" }}></span></div>
<span style={{ "fontSize": "10px", "letterSpacing": ".09em", "textTransform": "uppercase", "color": "#776D60" }}>Faltam</span>
<span style={{ "font": "400 34px/1.1 var(--font-newsreader),Newsreader,serif", "color": "#332B24" }}>172 dias</span>
<span style={{ "fontSize": "12px", "color": "#4C443C" }}>para o grande dia</span>
</div>
</div>
<div style={{ "display": "grid", "gridTemplateColumns": "minmax(0,1fr) 250px", "gap": "16px", "alignItems": "start" }}>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "14px" }}>
<div style={{ "position": "relative", "overflow": "hidden", "border": "1px solid #EDE5D9", "borderRadius": "12px", "background": "#fff", "padding": "18px 22px", "display": "flex", "flexDirection": "column", "gap": "6px" }}>
<div style={{ "position": "absolute", "top": "0", "left": "0", "right": "0", "height": "1px", "overflow": "hidden", "background": "linear-gradient(90deg,rgba(212,180,124,0),rgba(212,180,124,.5),rgba(212,180,124,0))" }}><span style={{ "display": "block", "height": "1px", "width": "30%", "background": "linear-gradient(90deg,rgba(255,255,255,0),#E7C98D 45%,#FFF6E2 55%,rgba(255,255,255,0))", "animation": "goldSweep 7.5s ease-in-out infinite .8s" }}></span></div>
<h2 style={{ "font": "400 21px var(--font-newsreader),Newsreader,serif", "color": "#332B24", "marginBottom": "4px" }}>Com vocês agora</h2>
<div data-alvo="decisao" style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "padding": "10px 8px", "margin": "0 -8px", "borderRadius": "8px", "background": `${decBg}`, "transition": "background .3s" }}><div><p style={{ "fontSize": "10px", "letterSpacing": ".09em", "textTransform": "uppercase", "color": "#776D60" }}>Decoração</p><p style={{ "font": "400 16px var(--font-newsreader),Newsreader,serif", "color": "#332B24", "marginTop": "2px" }}>Escolher a paleta de cores</p></div><span style={{ "fontSize": "12px", "whiteSpace": "nowrap", "color": `${decFg}` }}>{decTxt}</span></div>
<div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "padding": "10px 0", "borderTop": "1px solid #F2ECE3" }}><div><p style={{ "fontSize": "10px", "letterSpacing": ".09em", "textTransform": "uppercase", "color": "#776D60" }}>Papelaria</p><p style={{ "font": "400 16px var(--font-newsreader),Newsreader,serif", "color": "#332B24", "marginTop": "2px" }}>Aprovar o convite</p></div><span style={{ "fontSize": "12px", "color": "#4C443C", "whiteSpace": "nowrap" }}>em 8 dias</span></div>
</div>
<div style={{ "border": "1px solid #EDE5D9", "borderRadius": "12px", "background": "#fff", "padding": "18px 22px", "display": "flex", "flexDirection": "column", "gap": "6px" }}>
<h2 style={{ "font": "400 21px var(--font-newsreader),Newsreader,serif", "color": "#332B24", "marginBottom": "4px" }}>Juliana está cuidando</h2>
<div style={{ "display": "flex", "justifyContent": "space-between", "gap": "12px", "padding": "8px 0" }}><p style={{ "font": "400 15px var(--font-newsreader),Newsreader,serif" }}>Confirmação do DJ</p><span style={{ "fontSize": "12px", "color": "#4C443C" }}>em 3 dias</span></div>
<div style={{ "display": "flex", "justifyContent": "space-between", "gap": "12px", "padding": "8px 0", "borderTop": "1px solid #F2ECE3" }}><p style={{ "font": "400 15px var(--font-newsreader),Newsreader,serif" }}>Buffet e fotografia</p><span style={{ "fontSize": "12px", "color": "#4C443C" }}>fechado há 3 dias</span></div>
</div>
</div>
<div style={{ "display": "flex", "flexDirection": "column", "gap": "12px" }}>
<div style={{ "border": "1px solid #EDE5D9", "borderRadius": "12px", "background": "#fff", "padding": "16px", "display": "flex", "flexDirection": "column", "gap": "6px" }}><p style={{ "font": "400 17px var(--font-newsreader),Newsreader,serif" }}>Convidados</p><p style={{ "fontSize": "12px", "color": "#4C443C" }}>{portalConv}</p><span style={{ "fontSize": "12.5px", "color": "#8C6E43" }}>Ver lista</span></div>
<div style={{ "border": "1px solid #EDE5D9", "borderRadius": "12px", "background": "#fff", "padding": "16px", "display": "flex", "flexDirection": "column", "gap": "6px" }}><p style={{ "font": "400 17px var(--font-newsreader),Newsreader,serif" }}>Investimento</p><p style={{ "fontSize": "12px", "color": "#4C443C" }}>Próxima parcela em 10 de fev</p><span style={{ "fontSize": "12.5px", "color": "#8C6E43" }}>Ver pagamentos</span></div>
</div>
</div>
</div>
</div>
</div>
</>)}

<div style={{ "position": "absolute", "left": `${cx}px`, "top": `${cy}px`, "width": "22px", "height": "22px", "pointerEvents": "none", "zIndex": "30", "transition": "left .75s cubic-bezier(.4,0,.2,1),top .75s cubic-bezier(.4,0,.2,1)", "opacity": `${cOp}` }}>
<span style={{ "position": "absolute", "left": "-14px", "top": "-14px", "width": "28px", "height": "28px", "borderRadius": "50%", "background": "rgba(110,46,52,.25)", "transform": `scale(${ripple})`, "opacity": `${rippleOp}`, "transition": "transform .35s ease,opacity .35s ease" }}></span>
<svg width="22" height="22" viewBox="0 0 24 24" style={{ "position": "absolute", "left": "-3px", "top": "-2px", "filter": "drop-shadow(0 2px 3px rgba(0,0,0,.3))" }}><path d="M4 2l15 10.5-6.5 1.3 3.8 7.4-2.7 1.3-3.8-7.4L4 19.5z" fill="#221E1B" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"></path></svg>
</div>

</div>
</div>
</div>

<p style={{ "textAlign": "center", "fontSize": "13px", "color": "#928A81" }}>Nomes e telefones fictícios.</p>
</div>
</section>
  );
}
