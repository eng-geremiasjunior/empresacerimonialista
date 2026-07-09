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
