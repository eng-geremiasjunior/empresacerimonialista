# Vela — SaaS de gestão para cerimonialistas

## Visão do produto
Ferramenta de gestão simples para cerimonialistas que atuam sozinhas (ou em dupla), cobrindo o ciclo do evento do orçamento até o dia da festa. Filosofia central: **simplicidade radical** — nada de dashboards inchados, configurações desnecessárias ou telas com excesso de campos. O público-alvo tem baixa tolerância a curva de aprendizado.

## Stack técnica
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Deploy: Vercel

## Módulos do MVP (ordem de prioridade de construção)

1. **Autenticação** — Supabase Auth, login por e-mail/senha.
2. **Eventos** — CRUD de eventos (casamento ou debutante), dados do cliente, data, local, status.
3. **Roteiro do evento** — timeline do dia com horário, título, descrição e fornecedor responsável. Gera link público (sem necessidade de login) filtrado por fornecedor, que atualiza sozinho quando o roteiro muda. Modo "dia do evento" com o item atual em destaque.
4. **Orçamento rápido** — montagem de orçamento com itens e valores, geração de link compartilhável ou PDF.
5. **Fornecedores** — cadastro com contato, categoria, histórico de eventos e valores praticados.
6. **Financeiro** — receitas e despesas por evento, controle de parcelas, relatório consolidado e rentabilidade por evento.
7. **Notificações** — lembretes de tarefas próximas enviados ao cliente (e-mail no MVP; WhatsApp em versão futura).

## Modelo de dados inicial (Supabase / Postgres)

```
clients          (id, cerimonialista_id, name, phone, email)
events           (id, cerimonialista_id, client_id, type, date, location, status)
suppliers        (id, cerimonialista_id, name, category, phone, notes)
event_suppliers  (event_id, supplier_id, role)
roteiro_items    (id, event_id, time, title, description, supplier_id, order)
budgets          (id, event_id, status, total)
budget_items     (id, budget_id, description, value)
transactions     (id, event_id, type [receita|despesa], value, due_date, paid)
tasks            (id, event_id, title, due_date, notified)
```

Todas as tabelas com dados do cerimonialista devem ter RLS (row level security) no Supabase, garantindo isolamento por `cerimonialista_id`.

## Princípios de produto
- No máximo 3 cliques para qualquer ação comum (criar evento, adicionar item de roteiro, lançar uma despesa).
- Nunca pedir um campo que não seja essencial para a ação.
- Cada tela responde "o que eu preciso fazer agora", sem navegação profunda ou menus aninhados.
- Mobile-first para as visões públicas de fornecedor (elas serão abertas no celular, no dia do evento).

## Público
Cerimonialistas solo ou em dupla, especializadas em casamentos e debutantes, sem afinidade técnica.

## Regra de ouro da interface
O objetivo da interface não é mostrar tudo o que o sistema sabe. É mostrar apenas o necessário para que a cerimonialista tome a próxima decisão com segurança e rapidez. Todo elemento visual deve **reduzir tempo, reduzir erro ou aumentar capacidade operacional** — se não cumprir pelo menos um desses, deve ser removido.

Corolários:
- **Nada de copy que explica o sistema.** "Ao decidir, gera na Organização", "Desbloqueia…", "O sistema irá…" viram ruído depois de dois dias de uso. Mostrar o resultado (a lista de tarefas), não a mecânica.
- **Falar em tempo, não em status.** "vence em 4 dias" > "Status: pendente".
- **Menos caixas.** Antes de envolver algo num card, perguntar: isso precisa de borda ou pode ser só texto? Menos bordas = interface mais leve.
- **Sem linguagem gamificada.** Nada de "desbloquear", "missão", "meta", "nível", "parabéns", "100%". É software profissional, não app de hábitos.
- **O Copiloto fala como uma coordenadora experiente** e age como um Radar do evento: "2 eventos precisam de ação hoje", "1 fornecedor crítico ainda não confirmou" — não "23 eventos precisam da sua atenção".
