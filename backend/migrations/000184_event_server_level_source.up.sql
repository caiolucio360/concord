-- Fonte "evento" do XP do servidor: objetivos de evento cumpridos, até 300 por
-- pessoa por dia, sem competir com o teto da voz (ADR 0037).
CREATE OR REPLACE FUNCTION server_level_cap(p_source TEXT) RETURNS int AS $$
    SELECT CASE p_source
        WHEN 'membros' THEN 50
        WHEN 'mensagens' THEN 100
        WHEN 'figurinhas' THEN 50
        WHEN 'sons' THEN 50
        WHEN 'voz' THEN 120
        WHEN 'live' THEN 60
        WHEN 'espectador' THEN 60
        WHEN 'presenca' THEN 60
        WHEN 'evento' THEN 300
        ELSE 0
    END
$$ LANGUAGE sql IMMUTABLE;
