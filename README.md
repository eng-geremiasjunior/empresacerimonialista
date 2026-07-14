# Vela

SaaS de gestão para cerimonialistas — do orçamento ao dia da festa, com simplicidade radical.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Deploy: Vercel

## Como rodar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto no [Supabase](https://supabase.com) e copie a URL e a anon key
   (Painel > Settings > API).

3. Copie `.env.local.example` para `.env.local` e preencha:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   ```

4. Execute no **SQL Editor** do painel do Supabase, nesta ordem:
   1. [`supabase/schema.sql`](supabase/schema.sql) — tabelas, índices e políticas de RLS
   2. [`supabase/migrations/002_roteiro.sql`](supabase/migrations/002_roteiro.sql) — módulo Roteiro
      (status dos itens, links públicos e função `roteiro_publico`)

5. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

6. Acesse [http://localhost:3000](http://localhost:3000), crie uma conta e comece a usar.

> Dica: para testar sem precisar confirmar e-mail, desative "Confirm email" em
> Authentication > Providers > Email no painel do Supabase.

## Estrutura

```
supabase/schema.sql            Schema do banco (tabelas + RLS por cerimonialista_id)
supabase/migrations/           Migrações incrementais (executar em ordem)
src/middleware.ts              Proteção de rotas + renovação de sessão
src/lib/supabase/              Clientes Supabase (browser, server e middleware)
src/lib/types.ts               Tipos do domínio
src/app/login/                 Login e criação de conta
src/app/(app)/                 Área autenticada (layout com navegação)
src/app/(app)/eventos/         Módulo de Eventos (listagem, criação, edição)
src/app/(app)/eventos/[id]/roteiro/          Roteiro do evento (timeline do dia)
src/app/eventos/[id]/roteiro/publico/[hash]/ Link público por fornecedor (sem login)
```

## Módulos do MVP

1. ✅ Autenticação (Supabase Auth, e-mail/senha)
2. ✅ Eventos — CRUD com dados do cliente, data, local e status
3. ✅ Roteiro do evento (timeline + link público por fornecedor)
4. ⬜ Orçamento rápido
5. ⬜ Fornecedores
6. ⬜ Financeiro
7. ⬜ Notificações
