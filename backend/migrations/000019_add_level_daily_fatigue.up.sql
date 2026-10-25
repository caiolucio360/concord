-- Cansaço diário do XP de voz: quanto tempo de call a pessoa já teve hoje
-- (dia de Brasília). Guardado no banco para um deploy/reinício não zerar.
ALTER TABLE user_levels
  ADD COLUMN daily_date DATE NULL,
  ADD COLUMN daily_seconds INTEGER NOT NULL DEFAULT 0 CHECK (daily_seconds >= 0);
