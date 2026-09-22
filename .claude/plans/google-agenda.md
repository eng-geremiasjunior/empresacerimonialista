# Google Agenda pela API (22/09/2026)

Decisão dele: "se for por API, teremos que fazer, mesmo que dê trabalho". O concorrente
(Assessoria VIP) vende "integração ao Google Agenda ... sincronizar compromissos".

## Já feito por ele
- Projeto `eorganizei` no Google Cloud, Calendar API ligada, tela de consentimento (Externo, em teste).
- Escopos: `openid`, `userinfo.email`, `calendar.app.created`, `calendar.freebusy`.
  (Pendente: ele dizer se os dois de agenda caíram em "confidenciais" ou "não confidenciais".)
- Credencial Web com retorno `https://eorganizei.com.br/api/google/retorno` e `http://localhost:3000/api/google/retorno`.
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no `.env.local` (conferido: presentes, ID no formato).
- Domínio verificado no Search Console (TXT na GoDaddy; DNS = ns29/ns30.domaincontrol.com).
- Pendente dele: variáveis na Vercel (Production); usuários de teste (ele + testadora).
- Achado: `www.eorganizei.com.br` com certificado errado (falta o www em Vercel → Domains).

## O que o produto faz (v1)
1. Configurações → "Conectar Google Agenda" (por PESSOA, qualquer cargo). OAuth com
   `access_type=offline&prompt=consent`; conferir que `calendar.app.created` veio (consentimento
   granular pode desmarcar); `freebusy` é opcional (guardar `pode_ler_ocupado`).
2. Cria na conta dela a agenda secundária **eOrganizei** (`POST /calendars`, timeZone
   America/Sao_Paulo). Nunca toca nas outras agendas.
3. Sistema → Google, na hora: eventos (dia inteiro) e compromissos (com hora, `duracao_min`
   padrão 60; sem hora = dia inteiro). Só título, data, hora, local e link. NUNCA valor, CPF,
   observação.
   - evento: "{Tipo} — {cliente}", + " (em orçamento)" se status orcamento; `cancelado` ou sem
     data = apagar.
   - compromisso: "{titulo} — {Tipo} {cliente}"; descrição com fornecedor + link da Organização;
     estado `cancelado` = apagar.
   - IDs DETERMINÍSTICOS no Google (base32hex): `ev` + uuid sem hífens, `cp` + uuid sem hífens.
     Upsert = PUT (com status confirmed, que também "desapaga") → 404 → POST com id → 409 → PUT.
     Sem tabela de vínculo.
   - Para cada item, TODAS as conexões da empresa: quem vê recebe upsert, quem não vê recebe
     delete (404/410 ignorados). Cobre perda de acesso.
4. Google → sistema: só OCUPADO da agenda `primary` (`POST /freeBusy`), subtraído em
   `gerarSlotsLivres` (src/lib/agendamento.ts). Falha do Google = segue sem (fail open, log).
   A revalidação no banco (`horario_ocupado`, 081) NÃO vê o Google: janela aceita.
5. Desconectar: apagar a agenda eOrganizei, revogar o token, apagar a linha.
6. Token revogado/vencido (`invalid_grant`; no modo teste vence em 7 dias) → marca falha na
   conexão + um aviso no sino (type `compromisso`, já existe no CHECK da 165) uma vez.

Fora da v1: edição feita NO Google voltar ao sistema; tarefas (241 com prazo, afogariam).

## Banco — migração 168 (nova; revisar com os 2 céticos se ele autorizar)
- `create extension if not exists pg_net;` (019 só citava; nunca foi usado).
- `google_agenda_conexao` (user_id pk → auth.users cascade, empresa_id, google_email,
  refresh_token_cifrado, calendario_id, pode_ler_ocupado, conectado_em, falha, falha_em,
  avisado_em). RLS ligada, SEM policy. Leitura pela sessão via função `minha_conexao_google()`
  (security definer, só auth.uid(), devolve email/estado, NUNCA o token).
- `google_agenda_fila` (id bigserial, empresa_id, origem in ('evento','compromisso'),
  origem_id, criado_em, tentativas, proxima_em, falha). RLS sem policy.
- `google_agenda_ajuste` (linha única: url_fila, segredo default gen_random_bytes). RLS sem
  policy. O segredo nunca vai para env nem git: a rota compara com o banco.
- Gatilhos AFTER em `events` (insert/delete e update de date,type,location,status,client_id),
  `compromisso` (insert/update/delete) e `clients` (update of name → eventos dela): enfileiram
  SÓ se a empresa tem conexão. Tudo dentro de `begin … exception when others then null`:
  falha da fila nunca derruba a gravação do evento.
- Gatilho de STATEMENT na fila → `net.http_post(url_fila, header x-eorg-fila: segredo)`,
  também à prova de exceção. É o "na hora"; a rotina diária varre o resto.
- `google_agenda_quem_ve(p_event uuid)` → user_ids conectados da empresa que veem o evento
  (réplica de `pode_ver_evento` 037 com usuário explícito: proprietaria/coordenadora, ou
  responsável, ou criadora, ou participante). Só service role.
- `google_agenda_enfileirar_tudo(p_user)` → eventos/compromissos de hoje em diante (usada ao
  conectar). Só service role.
- Conferência no fim (anon/authenticated sem execute nas funções de serviço; RLS sem policy).

## Código
- `src/lib/google/cifra.ts` — AES-256-GCM; chave por HKDF do SUPABASE_SERVICE_ROLE_KEY
  (sem env nova; trocar a service key = reconectar).
- `src/lib/google/oauth.ts` — URL de autorização, state assinado (HMAC + cookie httpOnly),
  troca de código, refresh, revogar; e-mail pelo id_token (veio direto do token endpoint).
- `src/lib/google/agenda.ts` — criarAgenda, gravarItem, apagarItem, apagarAgenda, ocupado().
- `src/lib/google/fila.ts` — processarFila (agrupa por origem, backoff, falha de token).
- Rotas: `/api/google/conectar` (sessão), `/api/google/retorno` (sessão + state),
  `/api/google/fila` (POST, segredo do banco; liberar no middleware SÓ esta).
- Rotina `google-agenda` no despachante `/api/cron/diario`.
- Configurações: seção "Google Agenda" (desconectada / conectada como x / falhou em DD/MM).
- `/privacidade`: parágrafo do Google com a declaração de "Uso Limitado" (exigida na aprovação).

## Depois (aprovação do Google)
Logo 120×120, vídeo do fluxo (estúdio em ferramentas/video), justificativa de cada escopo,
publicar o app (sai do modo teste). Google diz 3–5 dias úteis.

## Confirmado em 22/09/2026 11:56 (print dele)
- Os 4 escopos salvos caíram em "não confidenciais": `openid`, `userinfo.email`,
  `calendar.app.created` e **`calendar.events.freebusy`** (foi este que ficou salvo, não o
  `calendar.freebusy`; serve para o mesmo `POST /freeBusy` — usar exatamente este na URL de
  autorização, senão o Google recusa o escopo não declarado).
- Consequência: SEM verificação de escopo sensível (nada de vídeo nem justificativa). O que
  resta para sair do modo teste é só "Publicar app" em Público-alvo; logo é opcional e, se
  entrar, pede verificação da marca (à parte, não bloqueia).
