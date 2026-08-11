-- 082 — Canal do convite de agendamento: WhatsApp ou e-mail
--
-- Até aqui o Secretário só disparava por WhatsApp — que depende do webhook
-- da Meta estar publicado. O e-mail abre a MESMA página pública (/agendar),
-- sem depender da Meta, então serve de alternativa (e de plano B enquanto
-- o WhatsApp de produção não é liberado). A cerimonialista escolhe o canal.
--
-- Onde o canal vive:
--   * tasks.canal_convite  → escolha por tarefa (drawer do agendamento auto)
--   * agendamento_convite.canal → congelado no envio, para o cron reenviar
--     pelo mesmo canal.

alter table public.tasks
  add column if not exists canal_convite text not null default 'whatsapp'
    check (canal_convite in ('whatsapp', 'email'));

alter table public.agendamento_convite
  add column if not exists canal text not null default 'whatsapp'
    check (canal in ('whatsapp', 'email'));
