# Guia para quem constrói uma tela do Portal dos Noivos v4

Leia inteiro antes de escrever código. O plano geral está em
`.claude/plans/portal-noivos-v4.md`.

## O desenho
- Protótipo: `C:\Users\user\Downloads\design_handoff_portal_noivos\Portal da Noiva v4.dc.html`
  (template com estilos inline nas linhas 35–899; lógica e dados de exemplo na
  classe `Component`, linhas 902–1139). README com tokens e cada tela:
  `C:\Users\user\Downloads\design_handoff_portal_noivos\README.md`.
- **Alta fidelidade**: copie cores, tamanhos, raios, sombras, espaçamentos,
  grids e animações EXATAMENTE como estão no trecho da sua tela. Os dados do
  protótipo são exemplos: na tela real vêm do banco.
- O desenho é de 1280px. Adapte para o celular (≤767px) e para o tablet
  (≤1180px) com `@media`: grids viram uma coluna, nada estoura a largura
  (sem rolagem lateral), toque mínimo de 44px. Liste cada adaptação no
  relatório final.

## A fundação (pronta — use, não reescreva, não edite)
- Casca: `src/components/portal/noivos/CascaNoivos.tsx` (entrada, barra,
  capa, menu, rodapé). Sua tela é o `children` da casca: renderize só o
  conteúdo da tela (a casca já põe o gap de 30px entre blocos e o rodapé).
- CSS base: `src/components/portal/noivos/noivos.css` (tokens `--pn-*`,
  classes `pn-*`, animações com prefixo `pn-`: `pn-rise`, `pn-fadein`,
  `pn-halo`, `pn-draw`, `pn-grow`, `pn-bar`, `pn-spin`, `pn-eq`, `pn-pop`,
  `pn-fall`, `pn-kb`, `pn-sweep`). Tokens: `--pn-verde #1b2a23`,
  `--pn-pessego #e9ae88`, `--pn-creme #f5f0e8`, `--pn-salvia #eaf0e8`,
  `--pn-pessego-claro #f6dccb`, `--pn-texto-2 #56655c`, `--pn-texto-3 #7d877f`,
  `--pn-marrom #9a5a34`, `--pn-marrom-escuro #7a3f1d`, `--pn-ok #2f6b4a`,
  `--pn-salvia-escuro #b9c6bc`, `--pn-pessego-escuro #f6d4be`, bordas
  `--pn-borda #e2dccf`, `--pn-borda-2 #dcd6ca`, `--pn-borda-3 #d8d1c3`,
  `--pn-trilho #efe9df`, `--pn-trilho-2 #f1ece3`; sombras
  `--pn-sombra-card`, `--pn-sombra-hover`, `--pn-sombra-folha`; curvas
  `--pn-mov`, `--pn-entra`, `--pn-mola`.
- Fontes: `.pn-t` = Marcellus (títulos, números, nomes); o corpo já é Nunito
  Sans; ícones: `<Icone nome="group" tamanho={22} cheio />` de
  `src/components/portal/noivos/primitivas.tsx` (lá também: `Eyebrow`,
  `Trilho` (barra 6px animada), `SeloPop`, `Interruptor`, `Sobe`
  (entrada escalonada), `iniciais()`).
  **Ícones**: a fonte é um SUBCONJUNTO. Só existem estes nomes: add,
  add_circle, add_photo_alternate, arrow_back, arrow_forward, auto_awesome,
  auto_delete, cake, calendar_month, call, celebration, chat, check,
  check_circle, checkroom, chevron_right, child_care, close, construction,
  content_copy, contract, description, diversity_1, download, eco, edit,
  event, event_available, expand_more, family_restroom, favorite, forum,
  grass, group, headphones, hotel, info, lightbulb, link, local_florist,
  location_on, lock, logout, mail, map, menu, more_horiz, music_note,
  no_meals, notifications, notifications_active, offline_pin, open_in_new,
  palette, pause, payments, person, person_add, person_remove, photo_camera,
  photo_library, play_arrow, qr_code_2, queue_music, receipt_long, redeem,
  remove, replay, request_quote, restaurant, savings, schedule, search, send,
  send_to_mobile, shield_lock, space_dashboard, star, storefront, sync, tag,
  theaters, timeline, umbrella, upload_file, verified, verified_user,
  water_drop. Precisa de outro? NÃO use: diga no relatório qual e onde.
- Contexto (cliente): `usePortalNoivos()` de `src/components/portal/noivos/contexto.tsx`
  dá `{ eventoId, base, cerimonialista, daFamilia, avisar(msg, erro?) }` —
  `avisar` é o toast verde do desenho. `comQuem(cerimonialista, daEquipe)`
  escreve "com Geremias" / "com vocês" (na conta de família, sempre "com
  vocês"; sem artigo antes do nome).
- Telas que o desenho manda MANTER: envolva o conteúdo atual em
  `<Legado>` (`src/components/portal/noivos/Legado.tsx`).
- Helpers: `src/lib/portal-noivos.ts` (`usaPortalNoivos`, `MENU_NOIVOS`,
  `MAIS_NOIVOS`), `src/lib/supabase/portal-noivos.ts` (`dataPorExtenso`,
  `momentoDoSim`, `getNomesDoCasal`, `getFotoDoCasal`).

## Como a tela entra
- Rota que já existe (`convidados`, `fornecedores`, `trilha`, `cronograma`,
  `investimento`, `presentes`, `linha-do-tempo`, `guia-estilo`,
  `escolhas`, `site`, `cortejo`): no `page.tsx`, logo depois de
  `getEventoDoPortal`, acrescente
  `if (usaPortalNoivos(evento.tipo)) return <SuaTelaNoivos … />;` e NÃO
  mexa nos ramos v1/v2 que já estão lá.
- Rota nova (`documentos`, `inspiracoes`, `agenda`, …): crie o `page.tsx`;
  se o evento não for casamento, `redirect(\`/portal/${id}\`)`.
- Seus arquivos moram em `src/components/portal/noivos/telas/<sua-tela>/`
  (componentes e um `.css` próprio, importado pelo componente). Classes com
  prefixo `pn-<sua-tela>-`. Não edite arquivos de outra tela nem da
  fundação: se precisar, diga no relatório.
- Dados: leia com os carregadores que já existem em `src/lib/supabase/`
  (`portal.ts`, `portal-*.ts`), pela sessão da família (a RLS decide).
  Fronteira RSC: do servidor para o cliente só vão dados simples (nada de
  função, Map, Set, Date — datas como string ISO).
- Relógio: nunca `Date.now()`/`new Date()` no primeiro render de componente
  cliente (erro de hidratação). Use o dado do servidor e atualize em
  `useEffect`. "Hoje" em datas = `hojeBR()` de `src/lib/tempo`.

## Regras da casa (valem sempre)
- Português em toda a interface. Sem copy que explica o sistema; falar em
  tempo ("vence em 4 dias"), não em status. Sem linguagem gamificada.
- **Sem tela "em breve"**: o que não tem dado ou sistema por trás NÃO
  aparece (nada de botão que só mostra toast fingindo que fez). Se a sua
  tela depende de algo que não existe (pagamento, WhatsApp automático,
  assinatura de contrato, permissões, Google Agenda do casal, mesas pelo
  casal, realtime), faça a parte que existe e liste o que ficou de fora.
- **Dados sensíveis**: termo, valor do contrato e CPF só para quem
  contrata; nunca em log. Nada de dado pessoal em `console.*`.
- NÃO crie migração, NÃO rode o servidor de desenvolvimento, NÃO rode
  `next build`, NÃO abra navegador (a máquina tem 8 GB e só aguenta um).
  NÃO faça commit. Ao terminar, rode UMA vez
  `node node_modules/typescript/bin/tsc --noEmit -p .` e
  `node node_modules/next/dist/bin/next lint --file <cada arquivo seu>`
  e corrija o que for seu.

## O relatório final (o seu retorno)
1. Arquivos criados/alterados.
2. De onde vem cada dado da tela.
3. O que do desenho ficou de fora e por quê (falta sistema/dado).
4. Adaptações de celular/tablet.
5. Ícones que faltaram na fonte, se algum.
6. Resultado do tsc e do lint.
