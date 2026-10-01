# Os 6 modelos de site de casamento — plano (30/09/2026)

Desenho dele no Claude Design: `.claude/plans/modelos-de-site/handoff/`
(README com as regras e a tipografia, `modelos/0N-*.md` com wireframe,
efeitos e tokens, `prototipos/Template 0N.dc.html` com o template inline e
a lógica na classe `Component`). Alta fidelidade: valores, textos e
tempos são finais.

A leitura completa (9 agentes, 30/09) está em
`.claude/plans/modelos-de-site/leitura-dos-agentes.json`:
`modelos[]` (seções, dados, fotos, efeitos com tempos e curvas, o que não
tem sistema, dúvidas), `motor` (o site que existe hoje: arquivos, dados,
editor, RSVP, presentes, fotos, lacunas), `fontes` (os 8 pares com os
valores exatos) e `plano` (arquitetura, dados, editor, presentes, fatias,
adaptações declaradas, riscos). **Ler o `plano` inteiro antes de começar.**

## Decisões dele (30/09)
- **Presentes antes da Pagar.me:** os cards com foto, título, descrição e
  valor, como no desenho. Ao escolher: "Presentear com Pix · R$ X", com o
  QR e o copia-e-cola do Pix ESTÁTICO do casal JÁ COM O VALOR (BR Code
  montado no navegador: chave, titular, cidade, CRC). Sem "obrigado pelo
  presente", porque ninguém confirma o pagamento. Sem chave Pix, os cards
  são só vitrine. Quando a Pagar.me liberar, troca só a ação do botão.
- **O site de hoje** ("Convite", `ConviteCompleto`) continua: é o padrão
  dos 2 sites já aprovados e dos outros tipos de evento. Casamento NOVO já
  nasce no modelo 01 (`tema.modelo` gravado), e a noiva troca quando
  quiser. Nada publicado muda de cara sem passar pela revisão dele.
- **Mídia:** o violino (T06) e o vídeo da Torre Eiffel (T05) são do
  Pixabay. Conferir a página de cada um (licença) antes de usar; os
  arquivos (13 MB) NÃO estão no repositório ainda (estão no Downloads
  dele, `design_handoff_templates_casamento/prototipos/uploads/`).
- **Rodapé:** "Site criado com eorganizei" e, quando o casamento tem
  cerimonialista, o logo dela pequeno ao lado.
- Fotos: todas do casal, pelo portal. Em produção os espaços começam
  vazios (o placeholder convida o envio só no editor e na prévia; no
  público, foto que falta some e a seção se recompõe).

## Recomendações do plano adotadas (sem pergunta)
- RSVP: o formulário REAL do produto (e-mail, acompanhantes com nome e
  criança, menu, recado, QR de entrada) vestido no visual de cada modelo;
  sai o contador anônimo de 0 a 6. "Alterar resposta" é real.
- Nomes: nome 1 e nome 2 digitados pela noiva em Detalhes (pré-preenchidos
  pela quebra do nome do evento em " e "/"&"); forma do nome em 3 modos.
- Todas as seções novas entram na mesma migração (programação, marcos da
  história, Nosso jeito, galeria, padrinhos, fotos do traje e do local,
  cenas do T04, itens de presente com valor, prazo e menu do RSVP). Ficam
  de fora: trilha com horário e "ouvir o trecho" (T03/T04), meta e
  arrecadado da cota.
- Blocos que funcionam e o desenho não tem (hospedagem, álbum, música,
  mural, texto livre): desenhados no estilo de cada modelo.
- Cores: as 5 paletas do T01 como opção; paleta fixa nos outros 5; os
  tokens já prontos para a troca futura; cor livre só no "Convite".
- Endereço do espaço no site (cartão do local, Como chegar, .ics).
- Foto do local e programação: a noiva sobe e digita (passa pela revisão).
- Padrinhos: a noiva digita os pares e sobe as fotos.
- Foto principal: a que o casal sobe; a capa do evento só como reserva.
- T05/T06: rótulos pequenos em francês como no desenho, mas o título e o
  link viram "O local" (não "O château").
- Menu no celular como no desenho.
- Slug do T03 = `cartoes` ("portal" colide com o nome do produto).

## Ordem (o dono pediu os modelos primeiro)
1. Fundação sem banco: fontes dos 8 pares como woff2 no repositório com
   next/font/local (NUNCA next/font/google: já quebrou build sem cache na
   Vercel), `SiteDoEvento` (um renderizador para público, prévia do portal
   e fila do dono), catálogos, peças comuns (contagem por textContent,
   reveal com reforço no scroll, cenas, abertura, .ics, como chegar).
2. Migração **191** (`supabase/migrations/191_site_modelos.sql`): regras
   de conteúdo por bloco, tipos novos, tema (nome, abertura, paleta), o
   balde 'site'. ATENÇÃO: a 189 renomeou 27 RPCs do portal para
   `<nome>_base` com um embrulho de mesmo nome; mudar uma delas = `create
   or replace` da `_base` numa migração NOVA (nunca reaplicar migração
   antiga: troca o embrulho pelo corpo velho, sem erro). Dois céticos antes
   de entregar. O dono aplica à mão no SQL Editor; fechar com um SELECT de
   conferência (item, ok) todo true.
3. Editor da noiva no portal ("Nosso site").
4. T01 de ponta a ponta → 5. T03 e T04 → 6. T05 → 7. T06 → 8. T02.
A **190** (brechas da 189, rascunho em `.claude/plans/190-rascunho.sql`,
decisões no fim de `portal-noivos-v4.md`) vem logo depois, antes da tela
"Família e acessos". Depois: "a noiva organizando sozinha" (insumos,
roteiro e decisões na conta de família) e o Google no portal (só noivas e
debutantes; ele liga o provedor).

## Regras da casa (valem sempre)
- Tudo em português (interface, commits, mensagens a ele).
- Sem botão que finge; sem tela "em breve"; sem copy que explica o
  sistema; cinza + uma cor de destaque fora dos modelos.
- Dado pessoal nunca em log; termo, valor do contrato e CPF nunca no
  portal nem pela API.
- Commit só dos próprios arquivos (há sessões paralelas no mesmo repo);
  nunca `ferramentas/`, o arquivo solto `4`, `.claude/plans/whatsapp-meta.md`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Este trabalho fica no ramo `modelos-de-site`; NÃO juntar no `main`
  (main = produção na Vercel) sem as provas locais e o ok dele.
- Provas contra o banco e no navegador (Chrome sem janela, contas de
  teste apagadas no fim) só na máquina dele: a nuvem não tem as chaves do
  Supabase nem as ferramentas de prova.

## Para ele decidir
- Hashtag do T01 ("Compartilhe esse momento com a gente #MarinaEJoao"):
  hoje é fixa antes do rodapé, como no desenho, e só some sem nome; a
  noiva não tem como escondê-la nem mudar o texto. Opções: um tipo de
  bloco (ou chave do tema) próprio, com olho e a hashtag editável; ou
  prendê-la a outro bloco (galeria/mural visível).
