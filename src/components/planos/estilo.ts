// O CSS da landing de /planos, copiado do desenho — nao redigitado.
//
// Aqui moram as 71 sequencias de @keyframes das cinco demonstracoes (o
// briefing de 28s, o palco de 15s, a contratacao de 9s, o financeiro de
// 14s e a execucao de 11s), a deriva dos fragmentos, o bloco de
// prefers-reduced-motion e o de celular. Estilo em linha nao expressa
// @keyframes nem media query: e por isso que este arquivo existe.
//
// As unicas linhas que NAO vieram do desenho sao as de :hover, no fim —
// no desenho elas eram o atributo style-hover, que so o editor entende.

export const CSS_PLANOS = `
  html,body{margin:0;padding:0;background:#FAF8F5}
  a{color:#6E3F5F}
  a:hover{color:#4A2A40}
  summary::-webkit-details-marker{display:none}

  /* A demonstração do briefing: 28s, um passo por cena. */
  @keyframes hs1{0%,34%{opacity:1}38%,96%{opacity:0}100%{opacity:1}}
  @keyframes hs2{0%,34%{opacity:0}38%,66%{opacity:1}70%,100%{opacity:0}}
  @keyframes hs3{0%,66%{opacity:0}70%,96%{opacity:1}100%{opacity:0}}
  @keyframes hf1{0%,18%{opacity:0;transform:translateY(3px)}20%,34%{opacity:1;transform:none}37%,100%{opacity:0;transform:translateY(3px)}}
  @keyframes hf2{0%,20%{opacity:0;transform:translateY(3px)}22%,34%{opacity:1;transform:none}37%,100%{opacity:0;transform:translateY(3px)}}
  @keyframes hf3{0%,22%{opacity:0;transform:translateY(3px)}24%,34%{opacity:1;transform:none}37%,100%{opacity:0;transform:translateY(3px)}}
  @keyframes hf4{0%,24%{opacity:0;transform:translateY(3px)}26%,34%{opacity:1;transform:none}37%,100%{opacity:0;transform:translateY(3px)}}
  @keyframes hf5{0%,26%{opacity:0;transform:translateY(3px)}28%,34%{opacity:1;transform:none}37%,100%{opacity:0;transform:translateY(3px)}}
  @keyframes hf6{0%,28%{opacity:0;transform:translateY(3px)}30%,34%{opacity:1;transform:none}37%,100%{opacity:0;transform:translateY(3px)}}
  @keyframes hlendo{0%,16%{opacity:0}18%,29%{opacity:1}31%,100%{opacity:0}}
  @keyframes hb1{0%,42%{opacity:0}44%,66%{opacity:1}69%,100%{opacity:0}}
  @keyframes hb2{0%,44%{opacity:0}46%,66%{opacity:1}69%,100%{opacity:0}}
  @keyframes hb3{0%,46%{opacity:0}48%,66%{opacity:1}69%,100%{opacity:0}}
  @keyframes hb4{0%,48%{opacity:0}50%,66%{opacity:1}69%,100%{opacity:0}}
  @keyframes hb5{0%,50%{opacity:0}52%,66%{opacity:1}69%,100%{opacity:0}}
  @keyframes hb6{0%,52%{opacity:0}54%,66%{opacity:1}69%,100%{opacity:0}}
  @keyframes htabA{0%,66%{border-color:#6E3F5F;color:#4A2A40}70%,100%{border-color:transparent;color:#6B6259}}
  @keyframes htabF{0%,66%{border-color:transparent;color:#6B6259}70%,100%{border-color:#6E3F5F;color:#4A2A40}}
  @keyframes hc1{0%,72%{opacity:0}74%,96%{opacity:1}99%,100%{opacity:0}}
  @keyframes hc2{0%,76%{opacity:0}78%,96%{opacity:1}99%,100%{opacity:0}}
  @keyframes hc3{0%,80%{opacity:0}82%,96%{opacity:1}99%,100%{opacity:0}}
  @keyframes hcur{
    0%,8%{left:26%;top:30%}
    16%,18%{left:12%;top:92%}
    32%,36%{left:86%;top:92%}
    56%,64%{left:49.5%;top:29%}
    76%,96%{left:68%;top:58%}
    100%{left:26%;top:30%}
  }
  @keyframes hclick{
    0%,16%{opacity:0;left:12%;top:92%;transform:scale(.3)}
    17%{opacity:.16;transform:scale(.3)}
    21%{opacity:0;transform:scale(1)}
    21.1%,34%{opacity:0;left:86%;top:92%;transform:scale(.3)}
    35%{opacity:.16;transform:scale(.3)}
    39%{opacity:0;transform:scale(1)}
    39.1%,61%{opacity:0;left:49.5%;top:29%;transform:scale(.3)}
    62%{opacity:.16;transform:scale(.3)}
    66%{opacity:0;transform:scale(1)}
    66.1%,100%{opacity:0}
  }
  @keyframes hp1{0%,32%{opacity:1}36%,100%{opacity:0}}
  @keyframes hp2{0%,36%{opacity:0}40%,64%{opacity:1}68%,100%{opacity:0}}
  @keyframes hp3{0%,68%{opacity:0}72%,94%{opacity:1}98%,100%{opacity:0}}

  /* ---- O palco do problema: 15s (a frase inteira em ~4s — no ritmo de
     quem lê, não de quem espera). A frase é digitada palavra por
     palavra no degradê, o brilho sobe, e só então os fragmentos entram.
     Cada palavra tem seu recorte (tw) e seu cursor (cr): é o cursor que
     dá a leitura de "está sendo escrito agora". ---- */
  @keyframes tw1{0%,2%{clip-path:inset(-15% 100% -20% 0)}3.6%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw2{0%,4.6%{clip-path:inset(-15% 100% -20% 0)}6.2%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw3{0%,7.2%{clip-path:inset(-15% 100% -20% 0)}8.8%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw4{0%,9.8%{clip-path:inset(-15% 100% -20% 0)}11.4%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw5{0%,12.4%{clip-path:inset(-15% 100% -20% 0)}14%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw6{0%,15%{clip-path:inset(-15% 100% -20% 0)}16.6%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw7{0%,17.6%{clip-path:inset(-15% 100% -20% 0)}19.2%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw8{0%,20.2%{clip-path:inset(-15% 100% -20% 0)}21.8%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw9{0%,22.8%{clip-path:inset(-15% 100% -20% 0)}24.4%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes tw10{0%,25.4%{clip-path:inset(-15% 100% -20% 0)}27%,99%{clip-path:inset(-15% -2% -20% 0)}100%{clip-path:inset(-15% 100% -20% 0)}}
  @keyframes cr1{0%,1.9%{opacity:0}2%,4.5%{opacity:1}4.6%,100%{opacity:0}}
  @keyframes cr2{0%,4.5%{opacity:0}4.6%,7.1%{opacity:1}7.2%,100%{opacity:0}}
  @keyframes cr3{0%,7.1%{opacity:0}7.2%,9.7%{opacity:1}9.8%,100%{opacity:0}}
  @keyframes cr4{0%,9.7%{opacity:0}9.8%,12.3%{opacity:1}12.4%,100%{opacity:0}}
  @keyframes cr5{0%,12.3%{opacity:0}12.4%,14.9%{opacity:1}15%,100%{opacity:0}}
  @keyframes cr6{0%,14.9%{opacity:0}15%,17.5%{opacity:1}17.6%,100%{opacity:0}}
  @keyframes cr7{0%,17.5%{opacity:0}17.6%,20.1%{opacity:1}20.2%,100%{opacity:0}}
  @keyframes cr8{0%,20.1%{opacity:0}20.2%,22.7%{opacity:1}22.8%,100%{opacity:0}}
  @keyframes cr9{0%,22.7%{opacity:0}22.8%,25.3%{opacity:1}25.4%,100%{opacity:0}}
  /* o último pisca antes de a página continuar */
  @keyframes cr10{0%,25.3%{opacity:0}25.4%,28%{opacity:1}29%,30.5%{opacity:0}31%,32.5%{opacity:1}33%,100%{opacity:0}}
  @keyframes textoPalco{0%,93%{opacity:1}97%,100%{opacity:0}}
  @keyframes subPalco{0%,29%{opacity:0}34%,93%{opacity:1}97%,100%{opacity:0}}
  @keyframes fragEntra{0%,34%{opacity:0}45%,92%{opacity:1}97%,100%{opacity:0}}
  @keyframes brilhoPalco{
    0%,2%{opacity:.5;transform:translateX(-50%) scale(.9)}
    26%,36%{opacity:1;transform:translateX(-50%) scale(1)}
    70%,100%{opacity:.7;transform:translateX(-50%) scale(.96)}
  }

  /* Os fragmentos espalhados: deriva lenta, quase imperceptível. */
  @keyframes dv1{from{transform:rotate(-4deg) translateY(-7px)}to{transform:rotate(-4.4deg) translateY(6px)}}
  @keyframes dv2{from{transform:rotate(3deg) translateY(5px)}to{transform:rotate(2.6deg) translateY(-6px)}}
  @keyframes dv3{from{transform:rotate(2deg) translateY(-5px)}to{transform:rotate(2.5deg) translateY(7px)}}
  @keyframes dv4{from{transform:rotate(-3deg) translateY(6px)}to{transform:rotate(-2.5deg) translateY(-5px)}}
  @keyframes dv5{from{transform:rotate(-6deg) translateY(-4px)}to{transform:rotate(-5.4deg) translateY(6px)}}
  @keyframes dv6{from{transform:rotate(4deg) translateY(6px)}to{transform:rotate(4.6deg) translateY(-4px)}}
  @keyframes dv7{from{transform:rotate(-2deg) translateY(4px)}to{transform:rotate(-2.6deg) translateY(-6px)}}

  /* A janela inclinada da solução: respira, nunca gira. */
  @keyframes derivaJanela{
    from{transform:perspective(1700px) rotateY(-12deg) rotateX(4.5deg) rotate(-1deg) translateY(6px)}
    to{transform:perspective(1700px) rotateY(-10.4deg) rotateX(3.6deg) rotate(-.6deg) translateY(-6px)}
  }

  /* O financeiro do evento: 14s. */
  @keyframes fb1{0%,6%{width:0}22%,100%{width:62.5%}}
  @keyframes fb2{0%,14%{width:0}32%,100%{width:54.4%}}
  @keyframes fb3{0%,22%{width:0}40%,100%{width:43.8%}}
  @keyframes fres{0%,44%{opacity:0;transform:translateY(4px)}54%,100%{opacity:1;transform:none}}

  /* A contratação: 9s. */
  @keyframes cwait{0%,46%{opacity:1}54%,100%{opacity:0}}
  @keyframes cok{0%,46%{opacity:0}54%,100%{opacity:1}}

  /* A execução: 11s. */
  @keyframes ea{0%,40%{opacity:1}48%,100%{opacity:0}}
  @keyframes eb{0%,40%{opacity:0}48%,100%{opacity:1}}
  @keyframes etoast{0%,48%{opacity:0}56%,84%{opacity:1}92%,100%{opacity:0}}
  @keyframes eq1{0%,30%{opacity:1}36%,100%{opacity:0}}
  @keyframes eq2{0%,30%{opacity:0}36%,62%{opacity:1}68%,100%{opacity:0}}
  @keyframes eq3{0%,62%{opacity:0}68%,100%{opacity:1}}
  @keyframes eqb{0%,30%{width:82%}36%,62%{width:84%}68%,100%{width:86%}}

  @media (prefers-reduced-motion:reduce){
    /* sem movimento: a frase aparece inteira e os fragmentos ficam
       parados no lugar — nada depende de animação para ser lido */
    [data-anim]{animation:none!important;opacity:1!important;transform:none!important}
    [data-frag-wrap]{opacity:1!important}
    [data-scene="2"],[data-scene="3"],[data-cursor]{display:none!important}
  }
  /* Sobrevivência no celular: o que estilo inline não expressa. */
  @media (max-width:719px){
    [data-side]{display:none!important}
    [data-stack]{grid-template-columns:1fr!important}
    [data-hide-sm]{display:none!important}
    [data-plano-cel]{display:block!important}
    [data-frag-sm]{display:none!important}
    [data-frag-wrap]{display:none!important}
    [data-cta-fixo]{display:flex!important}
    [data-cta-espaco]{display:block!important}
    /* o botão flutuante é do desktop; no celular a barra fixa já faz o papel */
    [data-flutuante]{display:none!important}
    /* os dois botões da faixa de chamada, um embaixo do outro, na largura toda */
    [data-chamada-botoes]{flex-direction:column!important;align-items:stretch!important}
    /* a tela do sistema dentro da seção "Não é uma lista de tarefas":
       as três fases empilhadas (a divisória vira horizontal) e a fileira
       de quatro indicadores em duas colunas — em 375px cada um tinha 68px
       e o texto saía cortado */
    [data-fase-cel]{border-left:0!important;border-top:1px solid #F0EFED!important}
    [data-duas-cel]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    /* o painel do Copiloto no mapa mental tem 288px fixos no app; aqui,
       embaixo do mapa, ele ocupa a largura toda */
    [data-mapa-demo] aside{width:100%!important;border-left:0!important;border-top:1px solid #E7E5E4!important}
    /* a demonstração da conversa: em 375px a cena 1 tinha duas colunas de
       140px, com os balões em cinco linhas e o botão "Criar evento"
       cortado pela moldura. Uma coluna só, e a moldura cresce para caber */
    [data-demo-quadro]{height:auto!important}
    [data-cena-1]{position:relative!important;top:0!important;margin-top:48px!important;grid-template-columns:1fr!important}
    [data-legenda-demo]{height:44px!important}
    /* o cursor e o halo de clique da demonstração foram calibrados em
       porcentagem para a moldura de desktop; com a cena empilhada eles
       caem fora dos alvos — no celular não existem */
    [data-cursor]{display:none!important}
    /* a demonstração nascida (DemoNascer): a calha do app cai de 24 para
       14px, a data do cabeçalho some, a saída vira dois botões empilhados
       e o prazo de cada decisão desce para a linha de baixo — em 375px o
       título da decisão virava "D…" */
    [data-app-pad]{padding-left:14px!important;padding-right:14px!important}
    [data-app-marg]{margin-left:14px!important;margin-right:14px!important}
    [data-linha-cel]{flex-wrap:wrap!important}
    [data-prazo-cel]{flex-basis:100%!important;padding-left:19px!important}
    [data-titulo-cel]{white-space:normal!important}
    [data-saida-cel]{flex:1 1 100%!important;min-width:0!important;flex-direction:column!important;align-items:stretch!important}
    [data-palco]{min-height:0!important;padding:56px 0!important}
    [data-palco-t]{position:static!important;transform:none!important}
    /* a inclinação em 360px cortaria a janela: ela volta a ser reta */
    [data-inclina]{transform:none!important;
      box-shadow:0 0 0 1px rgba(203,174,251,.22),0 0 46px 2px rgba(139,72,242,.6),0 14px 30px rgba(0,0,0,.45)!important}
    /* a grade dos planos vira uma coluna: sem isto o fluxo continua por
       COLUNA e os três planos ficam lado a lado em 110px cada */
    [data-grade]{grid-auto-flow:row!important;grid-template-rows:none!important;
      grid-template-columns:1fr!important;grid-auto-columns:auto!important;border-top:0!important}
    [data-colunas]{columns:1!important}
    [data-cel-borda]{border-top:1px solid #E6E0D8!important;padding-top:24px!important;margin-top:20px!important}
    [data-cel-borda-1]{border-top:0!important;padding-top:0!important;margin-top:0!important}
    [data-cel]{border-left:0!important;padding-left:0!important;padding-right:0!important}
    [data-nevoa]{margin-left:-14px!important;margin-right:-14px!important;padding-left:14px!important;padding-right:14px!important}
  }

  /* ---- As chamadas para a ação (07/09/2026) ----
     A vendedora pediu mais chamadas e mais destaque. O brilho ameixa é
     comum a todo botão principal; o contorno é o botão secundário das
     faixas; a rolagem suave é para os links "Experimente", que descem
     até a demonstração. */
  html{scroll-behavior:smooth}
  .pl-cta{box-shadow:0 1px 2px rgba(34,30,27,.08),0 8px 22px rgba(110,63,95,.28);
    transition:background 120ms cubic-bezier(.2,.8,.3,1),transform 160ms cubic-bezier(.2,.8,.3,1),box-shadow 160ms cubic-bezier(.2,.8,.3,1)}
  .pl-cta:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(34,30,27,.08),0 12px 28px rgba(110,63,95,.36)}
  .pl-h-contorno:hover{background:#F3EBF0!important;border-color:#4A2A40!important;color:#4A2A40!important}
  @keyframes flutuaEntra{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){
    html{scroll-behavior:auto}
    [data-flutuante]{animation:none!important}
    .pl-cta:hover{transform:none}
  }

  /* ---- O que o desenho escreveu como style-hover ----
     Cada regra sobrepoe um estilo em linha, entao vai com !important:
     sem isso o estilo do proprio elemento vence e o botao nao reage. */
  .pl-h-ameixa:hover{background:#4A2A40!important;border-color:#4A2A40!important;color:#FAF8F5!important}
  .pl-h-ameixa:active{transform:translateY(1px)}
  .pl-h-suave:hover{background:#F2EEE9!important;color:#221E1B!important}
  .pl-h-branco:hover{background:#F2EEE9!important;border-color:#B4ADA4!important;color:#221E1B!important}
  .pl-h-tinta:hover{color:#221E1B!important}
`;
