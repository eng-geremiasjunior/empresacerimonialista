# Handoff: Templates de site de casamento (6 modelos + tipografia)

## Visão geral
Seis modelos de site de casamento para um SaaS em que o casal monta o próprio site: convite, história do casal, programação, local, contagem regressiva, confirmação de presença (RSVP), lista de presentes com valores, galeria e padrinhos. Não há área de planejamento; é o site público que os convidados acessam.

O casal personaliza:
- **Nomes** (nome1, nome2) e **forma de exibição**: `Nomes` ("Luana & Geremias"), `Iniciais` ("L | G") ou `Iniciais + nomes` (iniciais em cima, nomes embaixo).
- **Fonte**: uma das 8 combinações do catálogo (seção Tipografia).
- **Cores**: ainda não definidas. Cada modelo tem uma paleta própria, e a troca de cor fica para uma fase futura. Arquitete os tokens de cor já pensando nisso.
- **Fotos**: todas as fotos são enviadas pelo casal. A imagem `casal-exemplo.jpg` existe só para visualização; **em produção os espaços de foto começam vazios** (placeholder) para a noiva preencher.
- **Seções opcionais**: abertura (intro) e padrinhos podem ser ligadas e desligadas.

O objetivo emocional é que o convidado pense "esse é o site da Marina e do João", e não "template nº 37". O texto deve soar afetuoso, nunca técnico.

## Sobre os arquivos de design
Os arquivos em `prototipos/` são **referências de design feitas em HTML**: protótipos que mostram o visual e o comportamento esperados. **Não são código de produção para copiar.** A tarefa é **recriar esses designs no ambiente do codebase do SaaS** (React/Next, Vue etc.), seguindo os padrões e bibliotecas que ele já usa. Se ainda não houver ambiente, recomendamos Next.js + React com CSS Modules ou Tailwind, e Web Animations API ou Framer Motion para as animações.

Cada `Template NN.dc.html` abre direto no navegador. É uma "Design Component": um template HTML com estilos inline, mais uma classe JS `Component` no final do arquivo, dentro de `<script type="text/x-dc">`. Para extrair valores exatos, leia:
- o **template**: todo o markup entre `<x-dc>` e `</x-dc>`, com os valores de estilo literais;
- o **método `theme()`**, com as fontes, a escala tipográfica e a paleta de cada modelo;
- os métodos **`setupHero()`, `setupReveals()`, `scrollFx()` e `openIntro()`/`runIntro()`**, com as animações e seus tempos e easings;
- o **`renderVals()`**, com os dados de exemplo e os estados.

`support.js` é o runtime do protótipo e `image-slot.js` é o placeholder de foto arrastável. Nenhum dos dois deve ir para produção.

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamentos, raios, sombras, textos e animações são finais. Recrie pixel a pixel e com o mesmo timing. Os valores exatos estão nos arquivos e resumidos nos documentos de cada modelo.

## Arquivos deste pacote
```
README.md                     ← este arquivo (regras gerais, tipografia, comportamentos comuns)
modelos/01-classico.md        ← wireframe + efeitos + tokens do Template 01
modelos/02-aliancas.md        ← Template 02
modelos/03-portal.md          ← Template 03
modelos/04-monograma.md       ← Template 04
modelos/05-franca.md          ← Template 05
modelos/06-violino.md         ← Template 06
prototipos/Template 01…06.dc.html
prototipos/Tipografia Casamento.dc.html   ← catálogo das 8 combinações
prototipos/uploads/casal-exemplo.jpg      ← foto SÓ de visualização (não usar em produção)
prototipos/uploads/203402-921381906_medium.mp4   ← vídeo da capa do Template 05 (Torre Eiffel à noite)
prototipos/uploads/iamnop-…-356054.mp3           ← violino do Template 06
```

---

## Regras inegociáveis (valem para todos os modelos)
1. **Apenas Google Fonts.**
2. **Corsiva (script) só nos nomes do casal.** Nunca em títulos, cabeçalhos de seção ou textos. Nas combinações corsivas, os títulos usam a fonte serifada de apoio.
3. **Todo modelo tem lista de presentes, e todo presente tem valor (R$).**
4. **3 formas de exibir o nome**, em todo lugar onde o nome aparece com destaque (hero e intro):
   - `Nomes`: "Marina & João"
   - `Iniciais`: "M | J" ou "M & J", conforme o modelo
   - `Iniciais + nomes`: iniciais grandes e os nomes menores logo abaixo
   - As iniciais são `nome.charAt(0).toUpperCase()`.
   - Hashtag: `#` + nome1 + `E` + nome2, sem acentos e sem espaços (ex.: `#MarinaEJoao`).
5. **Fotos vazias por padrão em produção.** O placeholder deve convidar o upload e seguir a forma do espaço (retângulo, arco, círculo).
6. **`prefers-reduced-motion`**: todo modelo respeita essa preferência, desligando parallax, reveals e loops e mostrando o conteúdo direto.
7. **Performance (aprendizado da revisão):**
   - Nunca re-renderize a árvore inteira a cada segundo para a contagem. Atualize só o texto dos números (`textContent`) e anime aquele elemento.
   - Evite `backdrop-filter` sobre fotos grandes.
   - Evite animações infinitas que forcem repaint do site todo (ex.: um anel pulsando com `scale` ao redor do botão quebrou o desempenho do Template 06).
   - Elementos com opacidade 0 devem receber `visibility:hidden` e `filter:none`.
   - Fotos devem ser servidas redimensionadas (≤1600px de largura, JPG/WebP), e vídeo em no máximo 1920×1080.

---

## Tipografia: 8 combinações (catálogo `Tipografia Casamento.dc.html`)
Cada combinação tem uma **fonte de nomes/títulos** e uma **fonte de texto**. Nos modelos, o enum `fonte` seleciona a combinação. Os valores abaixo vêm de `theme()`: `s` é o multiplicador aplicado aos tamanhos dos nomes, porque fontes corsivas precisam ser maiores para ter o mesmo peso visual.

| # | Nome | Nomes do casal | Títulos de seção | Texto | Observações |
|---|---|---|---|---|---|
| 01 | Essencial (minimalista) | Jost 300, MAIÚSCULAS, letter-spacing .12–.14em, s=.72 | Jost 300 MAIÚSC., ls .12–.18em | Hanken Grotesk 400, 16px | "+" entre os nomes no catálogo |
| 02 | Maison (didone/luxo) | Bodoni Moda 400, ls -.01em, s=.92, "&" em itálico | Bodoni Moda 400 | Figtree 400, 16px | |
| 03 | Atelier (didone fino) | Italiana 400, ls .03–.04em, s=.94–.96 | Italiana 400 | EB Garamond 400, 19px (no T03/T04, Figtree 16px) | |
| 04 | Caligrafia (corsiva caligráfica) | **Pinyon Script** 400, s=1.1, line-height 1.3–1.35 | Cormorant Garamond 400/500 | Cormorant Garamond 400, 19–20px | corsiva só nos nomes |
| 05 | Riviera (corsiva ornamental) | **Monsieur La Doulaise** 400, s=1.3, lh 1.3–1.35 | Marcellus 400, ls .02–.03em | Marcellus 400, 16–17px | corsiva só nos nomes |
| 06 | Bilhete (manuscrita casual) | **Sacramento** 400, s=1.15, lh 1.25–1.3 | Lora 400 *itálico* | Lora 400, 16–17px | corsiva só nos nomes |
| 07 | Soirée (art déco) | Poiret One 400, MAIÚSC., ls .1–.12em, s=.74–.76 | Poiret One MAIÚSC., ls .1–.14em | Josefin Sans 300/400, 17px | |
| 08 | Relicário (romântico vintage) | Playfair Display 400 *itálico*, s=.92 | Playfair Display 400 (itálico em T01/T02) | Libre Baskerville 400, 15–16px | |

Link do Google Fonts usado em todos os modelos (carregar só o par escolhido em produção):
```
https://fonts.googleapis.com/css2?family=Jost:wght@300;400&family=Hanken+Grotesk:wght@400;500&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Figtree:wght@400;500;600&family=Italiana&family=EB+Garamond:ital,wght@0,400;1,400&family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Monsieur+La+Doulaise&family=Marcellus&family=Sacramento&family=Lora:ital,wght@0,400;0,500;1,400&family=Poiret+One&family=Josefin+Sans:wght@300;400&family=Playfair+Display:ital,wght@0,400;1,400&family=Libre+Baskerville:ital@0;1&display=swap
```

**Escala dos nomes** (fluida, `clamp(min*s, vw*s, max*s)`; veja `nameSize`, `nameSizeSm`, `initSize` em `theme()` de cada modelo). Exemplo do T01: `nameSize = clamp(46s px, 9s vw, 124s px)`.
**Títulos de seção**: `headSize = clamp(hz0 px, hz1 vw, hz2 px)`, com `hz` por combinação (ex.: Caligrafia [36, 5.2, 64]; Essencial [22, 3, 34]). `headSizeSm` ≈ 80% do mínimo, 70% do vw e 66–72% do máximo.
**Rótulos ("eyebrows")**: 11–12px, peso 500–600, letter-spacing .28–.36em, MAIÚSCULAS, na cor de acento.
**Botões**: 11px, ls .22–.26em, MAIÚSCULAS, peso 600 (T03–T06); no hover, o letter-spacing cresce ~.06em em .5s.

Implementação sugerida: um objeto `FONT_PAIRS[id] = { nameFamily, nameWeight, nameTransform, nameTracking, nameStyle, nameScale, nameLineHeight, headFamily, headWeight, headTransform, headTracking, headStyle, headScale:[min,vw,max], textFamily, textSize, textWeight }`, exposto como CSS custom properties no root do site.

---

## Comportamentos comuns (todos os modelos)
- **Contagem regressiva** até `dataISO` (padrão `2026-10-31T16:30:00`): dias, horas, minutos, segundos, com zero à esquerda exceto nos dias. Ao mudar um número: `opacity 0→1`, `translateY(±.25–.35em)→0`, `blur(6–8px)→0`, 700–850ms, `cubic-bezier(.2,.7,.2,1)`. No próprio dia: "Hoje é o dia! ❤️". Depois do casamento: "Obrigado por celebrar com a gente." (T01/T02).
- **Reveal ao rolar**: `IntersectionObserver` com `rootMargin 0 0 -8% 0`, e um fallback no scroll que dispara elementos já visíveis (sem isso, cards podem ficar invisíveis; foi um bug real). Padrão: `opacity 0 + translateY(28–34px) [+ blur 6px] → 1/0`, 1100–1300ms, `cubic-bezier(.2,.7,.2,1)`, com escalonamento via `data-delay` (100–140ms entre itens).
- **RSVP**: campo de nome obrigatório (erro: "Conte para a gente quem você é." ou borda em cor de erro), botões "Sim, estarei lá" / "Não poderei ir", contador de acompanhantes de 0 a 6 (só quando a resposta é sim), recado opcional e "Enviar confirmação".
  - Se sim: título **"Que alegria ter você com a gente! ❤️"** e "{PrimeiroNome}, sua presença está confirmada. Nos vemos no dia 31 de outubro."
  - Se não: "Vamos sentir sua falta." e "Obrigado por nos avisar, {PrimeiroNome}. Você estará no nosso coração nesse dia."
  - Os dois finais têm o link "Alterar resposta", que volta para o formulário.
  - Prazo de exemplo: 15 de outubro no T03–T06 (15 de setembro no T01/T02; ajustar).
- **Presentes**: cada item tem `title`, `desc` e `valor` (R$, formatado `pt-BR`). Ao selecionar, o item ganha destaque e os outros ficam com opacidade .5–.55. Ao presentear: mensagem "Obrigado pelo carinho" e o link "Escolher outro presente". A integração de pagamento fica a cargo do SaaS.
- **Adicionar à agenda**: gera um `.ics` (VCALENDAR/VEVENT, DTSTART 20261031T193000Z, DTEND 20261101T040000Z, SUMMARY "Casamento {n1} & {n2}", LOCATION com o endereço). O rótulo muda para "Salvo na sua agenda ✓".
- **Como chegar**: `https://www.google.com/maps/search/?api=1&query={endereço}` em nova aba.
- **Intro (abertura)**: trava o scroll (`html{overflow:hidden}`) até terminar; quando desligada, o hero anima direto.
- **Rodapé**: nomes, data, hashtag e "Site criado com eOrganizei" (10px, ls .24em, opacidade .5–.6).

## Conteúdo de exemplo (padrão em todos)
- Data: sábado, 31 de outubro de 2026, 16h30. Local: **Espaço Villa Toscana**, Rua X, 123 — São Paulo/SP.
- Programação: Cerimônia 16h30, Recepção 18h30, Festa 20h00. Traje: Social.
- Textos de seção, em português e com tom afetuoso: "Nossa história", "Tudo começou em 2019...", "Sua presença já é o nosso presente.", "Mas, se quiserem nos presentear...", "Alguns momentos merecem ser lembrados para sempre.", "Esperamos você", "Estamos preparando tudo com muito carinho e mal podemos esperar para viver esse dia ao lado de quem amamos.", "Compartilhe esse momento com a gente".
- Padrinhos de exemplo: Ana & Pedro, Lucas & Mariana, Rafael & Julia.
- Todos esses textos são editáveis pelo casal no SaaS.

## Modelo de dados sugerido (por site)
```ts
type Site = {
  template: '01'|'02'|'03'|'04'|'05'|'06';
  fontPair: '01'|'02'|'03'|'04'|'05'|'06'|'07'|'08';
  nameMode: 'Nomes'|'Iniciais'|'Iniciais + nomes';
  partner1: string; partner2: string;
  dateISO: string; rsvpDeadline: string;
  venue: { name: string; address: string; photo?: string };
  schedule: { label: string; time: string; note?: string; fr?: string }[];
  dressCode: string;
  story: { year: string; title: string; text: string; city?: string; photo?: string }[]; // T06: 8–10 itens
  moments?: { phrase: string; photo?: string }[]; // T04: 5 itens
  songs?: { time: string; moment: string; song: string; artist: string }[]; // T03/T04
  gifts: { title: string; desc: string; price: number; photo?: string }[];
  honeymoonFund?: { quota: number; raised: number; goal: number }; // T03/T04
  gallery: string[]; godparents: { names: string; photo?: string }[];
  showIntro: boolean; showGodparents: boolean;
  heroVideo?: string; // T05
  audio?: string;     // T06
  hashtag?: string;
};
```

Os detalhes de wireframe, efeitos e tokens de cada modelo estão em `modelos/`.
