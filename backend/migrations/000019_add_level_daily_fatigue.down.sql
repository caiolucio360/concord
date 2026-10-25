ALTER TABLE user_levels
  DROP COLUMN IF EXISTS daily_seconds,
  DROP COLUMN IF EXISTS daily_date;
