-- Origem da nota (o arquivo em changelog/pending/): a identidade que decide se
-- a nota já saiu numa release. Notas antigas ficam sem origem.
ALTER TABLE changelog_entries ADD COLUMN source TEXT NOT NULL DEFAULT '';
