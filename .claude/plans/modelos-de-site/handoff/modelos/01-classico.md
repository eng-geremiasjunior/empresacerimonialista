# Template 01: Clássico editorial (abertura em portas)
Arquivo: `prototipos/Template 01.dc.html`. Fonte padrão: **04 Caligrafia**. Nomes padrão: Marina & João.

## Paleta (5 opções no protótipo, prop `paleta`; padrão Marfim)
| token | Marfim | Sálvia | Rosé | Azul | Noite |
|---|---|---|---|---|---|
| bg | #f7f2ea | #f1f2ec | #f8efec | #f0f3f6 | #16181e |
| alt | #efe7db | #e4e8dd | #f0e1dc | #e2e8ee | #1e2129 |
| ink | #2b241d | #1f2a22 | #33232a | #1c2633 | #efe7d6 |
| muted | #65594c | #566258 | #6f5660 | #566172 | #aaa293 |
| accent | #7d5f40 | #536a4b | #94545d | #466183 | #d4b97f |
| line | #e0d5c6 | #d3dacd | #e8d4cf | #d2dae3 | #2f323b |
| lineStrong | #b9aa96 | #a6b2a2 | #c4a9a7 | #a3afbd | #4a4d57 |
| dark | #2b241d | #1f2a22 | #3a2830 | #1c2633 | #0e1014 |
| darkInk | #f3ece1 | #eef1ea | #f8efec | #eef2f6 | #efe7d6 |

## Wireframe (ordem das seções)
```
[ABERTURA fixa, tela cheia]   duas portas (metades) cor alt + selo circular com iniciais
[NAV fixa]                    aparece após 85% do hero: monograma | História · O grande dia · Presentes · [Confirmar presença]
[HERO 100svh]                 foto full-bleed + gradiente; centro: nomes (3 modos), linha 72px, frase itálica, "31 · 10 · 2026", local, "Nossa história ↓"
[NOSSA HISTÓRIA]              grid 2 col: foto 4/5 (parallax) | eyebrow + "Tudo começou em 2019..." + texto
                              timeline vertical central: ano à esquerda · ponto · título à direita (4 marcos)
[O GRANDE DIA] fundo alt      eyebrow, data grande, local; 3 colunas (Cerimônia/Recepção/Festa + hora); botões "Ver localização" e "Adicionar à minha agenda"
[CONTAGEM] fundo dark         "Faltam" + 4 colunas (dias/horas/minutos/segundos) + "Para o nosso grande dia."
[LOCALIZAÇÃO]                 foto 16/8; card sobreposto (margin-top -96px) com nome, endereço, "Como chegar →"
[DRESS CODE] fundo alt        texto à esquerda | 3 fotos verticais escalonadas
[RSVP]                        título, prazo, botão → formulário inline → finais sim/não
[PRESENTES] fundo alt         título, subtítulo, grid de 4 cards (foto 4/3, título, desc) → painel com valor e "Presentear"
[NOSSO JEITO]                 título + lista numerada em 2 colunas (01 Café depois do almoço…)
[GALERIA]                     foto 16/9 · 2 fotos 4/5 (a 2ª desce 40–120px) · frase central · foto 16/9
[PADRINHOS] fundo alt         pares de fotos circulares sobrepostas (112px, -24px) + nomes
[RECADO]                      "Esperamos você" + texto + nomes na cor de acento
[HASHTAG] fundo alt
[RODAPÉ] fundo dark
```
Padding das seções: `clamp(96px,14vw,176px) clamp(20px,5vw,64px)`. Largura máxima de 1160–1200px.

## Efeitos
- **Abertura**: um clique abre as portas. As duas metades (`width 50.5%`) fazem `translateX(∓101%)` em 1.7s `cubic-bezier(.77,0,.18,1)`. O conteúdo central vai para opacity 0 e scale 1.06. A animação do hero começa em 450ms e a abertura é removida em 1800ms. O selo de 132px tem fundo accent e um anel duplo (box-shadow 6px alt + 7px accent).
- **Hero, foto**: `opacity 0→1` (até 30%) com `scale 1.16→1`, 7000ms, `cubic-bezier(.2,.7,.2,1)`.
- **Hero, nomes**: `opacity 0, blur 18px, translateY 14px, scale 1.02 → 1`, 2400ms, delay 900ms. Os outros itens entram em 1400ms com delay de 1900 + i×380ms. A linha faz `scaleX 0→1` em 1600ms, delay 1800ms.
- **Imagens (reveal "img")**: a camada interna (`data-zoom`) faz `clip-path inset(100% 0 0 0)→inset(0)` (até 62%) com `scale 1.28→1`, 2600ms. É um efeito de cortina subindo com zoom que assenta.
- **Parallax** da foto da história: `translateY((centro−vh/2)×−0.07)`.
- **Timeline**: a linha accent cresce com `scaleY` conforme o scroll (`(vh×.62 − top)/altura`), e cada ponto fica preenchido com accent quando passa de 62% da viewport.
- **Contagem**: a troca de número usa blur, com `translateY(-.22em)`.
- **Galeria**: hover com `scale(1.05)` em 1.8s.
- **RSVP sim**: 26 pétalas na cor accent caem (border-radius `80% 0 80% 0`, 7–13px), 3.6–6s, com rotação aleatória.
- **Presentes**: o card selecionado sobe -8px, ganha sombra `0 30px 50px -28px rgba(0,0,0,.35)`, imagem com scale 1.06 e um check ✓ de 34px com mola (`cubic-bezier(.34,1.56,.64,1)`). Em seguida aparecem os valores R$ 150/300/500/1000 e o botão "Presentear com R$ X".
  - ⚠️ Pela regra nova, todo presente tem um valor fixo próprio. Em produção, use o valor do item, como no T02, e não a escolha livre de valor.
- **Botões**: o letter-spacing cresce no hover.
