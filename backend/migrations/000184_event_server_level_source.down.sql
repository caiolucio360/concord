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
        ELSE 0
    END
$$ LANGUAGE sql IMMUTABLE;
