# Rollbacks

Scripts que **desfazem** uma migração. Moram fora de `supabase/migrations/`
de propósito: quem roda a pasta de migrações em ordem numérica não pode
tropeçar num arquivo que desmonta a RLS.

O `024_rls_por_cargo.sql` restaura o isolamento por `cerimonialista_id`,
como era antes da RLS multiusuário. A 024 foi aplicada há mais de noventa
migrações e noventa dependem dela — na prática este arquivo é histórico,
não um plano.
