# Lógica & Modelo de Dados

Referência independente de framework. Reimplemente em qualquer linguagem/stack.

## Constantes
```
START = 13*60   // 780  (13:00) — início da janela do dia
END   = 23*60   // 1380 (23:00) — fim da janela
ppm   = 1.9     // pixels por minuto (zoom da timeline)
```
`minutos(hh,mm) = hh*60 + mm`. `fmt(min) = "HH:MM"` (zero-padded).

## PALETTE (equipes)
Cada equipe tem um `hue` (usado em oklch) e um nome de exibição.
```
som    -> hue 285, "Som / DJ"
deco   -> hue 20,  "Decoração"
buffet -> hue 70,  "Buffet"
foto   -> hue 180, "Fotografia"
ceri   -> hue 250, "Cerimônia"

accent(hue) = oklch(0.6 0.19 <hue>)
soft(hue)   = oklch(0.965 0.03 <hue>)
```

## TASKS (dados de exemplo)
Campos: `id`, `team` (chave da PALETTE), `s`=[h,m] início, `e`=[h,m] fim, `title`,
opcionais `note`, `dep` (id da tarefa anterior), `depType` ("dura" | "suave").

```
som-mont    som     13:00-15:30  "Montagem de som"
som-teste   som     14:00-14:45  "Teste de microfones"          // choque proposital c/ som-mont
som-pass    som     15:30-16:00  "Passagem de som"     dep=som-mont  dura
som-audio   som     17:00-18:00  "Áudio da cerimônia"  dep=som-pass  suave  note="Retorno com ruído"
som-festa   som     19:00-23:00  "Festa / DJ"

deco-mont   deco    13:00-16:30  "Montagem decoração"
deco-aju    deco    16:30-17:00  "Ajustes finais"      dep=deco-mont dura
deco-ilum   deco    17:00-18:30  "Iluminação decorativa" dep=deco-aju suave note="Caiu a energia"
deco-mesas  deco    18:30-20:00  "Decoração das mesas"

buf-cheg    buffet  14:00-15:00  "Chegada do buffet"
buf-mise    buffet  15:00-18:00  "Mise en place"       dep=buf-cheg  dura
buf-coq     buffet  18:00-20:00  "Coquetel de recepção" dep=buf-mise dura
buf-jantar  buffet  20:00-22:00  "Jantar servido"      dep=buf-coq   dura

foto-making foto    15:00-16:30  "Making of"
foto-retra  foto    16:30-17:00  "Retratos do casal"
foto-ceri   foto    17:00-18:00  "Cerimônia"           dep=ceri-ceri dura
foto-cob    foto    19:00-23:00  "Cobertura da festa"

ceri-rec    ceri    16:30-17:00  "Recepção dos convidados"
ceri-ceri   ceri    17:00-18:00  "Cerimônia"           dep=ceri-rec  dura  note="Obrigatória"
ceri-coq    ceri    18:00-20:00  "Coquetel"
```

## Horário efetivo & status
```
delays: mapa { taskId -> minutos_acumulados }  (estado, começa vazio)

eff_start(t) = minutos(t.s) + (delays[t.id] || 0)
eff_end(t)   = minutos(t.e) + (delays[t.id] || 0)

status(t, agora):
  se eff_end(t)   <= agora -> "done"
  se eff_start(t) <= agora -> "live"
  senão                    -> "pending"

progresso = round(count(status=="done") / count(total) * 100)
```

## "Agora"
```
live = clamp(relogio_real_em_minutos, START, END)   // atualiza a cada 30s
agora = simular ? nowMinutes : live
```

## Choque de equipe (mesma equipe, tempo sobreposto)
```
overlap(a, b) = a.eff_start < b.eff_end AND b.eff_start < a.eff_end

choque(t) = existe outra tarefa o (o != t) com o.team == t.team AND overlap(o, t)
```
Não requer cadastro de pessoa/recurso — usa só a equipe já existente.
Renderizar: borda vermelha no bloco; badge ⚠ (inline em bloco estreito / frase em bloco alto);
badge no cabeçalho da raia; card de alerta no topo listando as equipes em choque.

## Empacotamento de sub-colunas (por raia/equipe)
```
mine = tarefas da equipe, ordenadas por eff_start

// 1) atribuição gulosa de colunas
cols = []
para cada t em mine:
  c = índice da primeira coluna em que TODAS as tarefas não sobrepõem t
  se não existe: c = novaColuna()
  cols[c].push(t); t.col = c
nCols = max(1, cols.length)

// 2) span: quantas colunas livres à direita durante o intervalo de t
para cada t em mine:
  span = 1
  para c de t.col+1 até nCols-1:
    se existe o em mine com o.col==c E overlap(o,t): break
    span++
  t.span = span

// 3) geometria do bloco
slotW = 100 / nCols
left  = (t.col  * slotW)% + 6px
width = (t.span * slotW)% - 12px
top    = (eff_start(t) - START) * ppm
height = (eff_end(t) - eff_start(t)) * ppm

narrow = t.span < nCols   // slot estreito -> modo compacto (chip vira ponto, esconde horário/nota/botão)
```

## Atraso em cascata (dependências)
```
// só dependentes DURA, recursivo (BFS). SUAVE nunca é empurrado.
duraChain(id):
  out = []; visitar(id)
  visitar(pid):
    para cada t em TASKS com t.dep==pid E t.depType=="dura" (não visitado):
      s = minutos(t.s) + (delays[t.id]||0)
      out.push({ id:t.id, title, team, from:fmt(s), to:fmt(s+15) })
      visitar(t.id)
  retorna out

// ações do modal
confirmarCascata(id): delays[id] += 15; para cada im em duraChain(id): delays[im.id] += 15
soEssa(id):          delays[id] += 15
desfazer():          delays = {}
```
O horário original (`minutos(t.s/e)`) é sempre preservado e exibido riscado ("era HH:MM")
quando `delays[t.id] > 0`.

## "A seguir"
```
proxima = menor eff_start entre tarefas com eff_start > agora
mostra: fmt(proxima.eff_start), título, equipe, "em X min" (ou "Yh Zmin")
se não houver: "Nada mais agendado — dia encerrado"
```
