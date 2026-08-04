-- Migração antiga mantida apenas por compatibilidade.
-- A equipe atual possui somente Vitinho OFC; não reative barbeiros desligados.
begin;
update barbers set active = false, updated_at = now() where slug = 'pablo';
commit;
