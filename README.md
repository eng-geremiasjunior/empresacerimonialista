# Vela

SaaS de gestão para cerimonialistas — do orçamento ao dia da festa, com
simplicidade radical.

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

2. Crie um projeto no [Supabase](https://supabase.com).

3. Copie `.env.local.example` para `.env.local` e preencha.

   **Esse arquivo é a fonte da verdade das variáveis** — cada bloco explica
   o que quebra sem ele, e vários módulos degradam em silêncio quando a
   variável falta (WhatsApp, Copiloto, e-mail).

4. No **SQL Editor** do painel do Supabase, execute:

   1. [`supabase/schema.sql`](supabase/schema.sql) — tabelas, índices e a RLS
      original por `cerimonialista_id`
   2. os arquivos de [`supabase/migrations/`](supabase/migrations) **em ordem
      numérica**, do `002` ao mais alto

   `supabase/rollbacks/` fica fora dessa ordem de propósito: são scripts que
   desfazem uma migração, não que avançam o schema.

5. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

6. Acesse [http://localhost:3000](http://localhost:3000) e crie uma conta.

> O primeiro cadastro vira **proprietária** de uma empresa nova (um gatilho
> em `auth.users` cuida disso). Logins criados pela tela de Cerimonialistas
> entram como **equipe** da empresa existente, não ganham empresa própria.

## Estrutura

```
supabase/schema.sql       Schema inicial (RLS por cerimonialista_id)
supabase/migrations/      Migrações incrementais — rodar em ordem numérica
supabase/rollbacks/       Scripts que DESFAZEM uma migração (fora da ordem)
src/middleware.ts         Proteção de rotas + renovação de sessão
src/lib/supabase/         Clientes Supabase (browser, server, middleware)
src/lib/                  Regras puras (saúde, espera, avisos, propostas…)
src/app/(app)/            Área profissional da cerimonialista
src/app/(portal)/portal/  Portal da cliente (o casal / a debutante)
src/app/orcamento/[hash]/ Proposta pública, sem login
src/app/fornecedor/[hash]/Central de Solicitações do fornecedor, sem login
src/app/api/cron/         Rotinas diárias (Bearer CRON_SECRET)
```

Quatro superfícies, quatro públicos: a **cerimonialista** (área
profissional), a **cliente** (portal), o **fornecedor** (links por hash,
abertos no celular no dia do evento) e as **rotinas** (cron).

## Backup

Estratégia atual (fase de piloto): export completo das tabelas via API com
a service role, salvo **fora do repositório** em
`Documents/vela-backups/backup-AAAA-MM-DD.json`. Rodar antes de qualquer
migração grande ou de convidar gente nova. Se o piloto virar produção
paga, subir para o plano do Supabase com PITR.

## Módulos

| | |
|---|---|
| ✅ | Autenticação e equipe por cargo (RLS multiusuário) |
| ✅ | Eventos — CRUD, fases, saúde do evento |
| ✅ | Roteiro do dia — timeline, link público por fornecedor, Modo Evento |
| ✅ | Orçamentos — propostas públicas, seis templates, aceite da cliente |
| ✅ | Fornecedores — agenda, categorias, histórico e valores praticados |
| ✅ | Financeiro — receitas, despesas, parcelas, rentabilidade por evento |
| ✅ | Central de Solicitações — cobrança de fornecedor e caixa de espera |
| ✅ | Portal da cliente — convidados, cortejo, guia de estilo, pagamentos |
| ✅ | Notificações — sino, e-mail e WhatsApp (template UTILITY da Meta) |
| ✅ | Copiloto — radar do dia e assistente dentro do evento |
