-- Performance optimizations and additional indexes

-- Enable pg_stat_statements extension for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Partial indexes for active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_active 
ON game_sessions(player_id, started_at) 
WHERE session_state = 'active';

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_level_score 
ON players(level, total_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_level_progress_player_completed 
ON level_progress(player_id, completed, best_score DESC);

-- Index for recent game sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_recent 
ON game_sessions(player_id, started_at DESC) 
WHERE started_at > NOW() - INTERVAL '30 days';

-- Materialized view for leaderboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS top_players_by_level AS
SELECT 
    level_id,
    player_id,
    username,
    score,
    achieved_at,
    ROW_NUMBER() OVER (PARTITION BY level_id ORDER BY score DESC) as rank
FROM leaderboard l
JOIN players p ON l.player_id = p.id
WHERE score > 0;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_top_players_by_level_unique 
ON top_players_by_level(level_id, rank);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_players_by_level;
END;
$$ LANGUAGE plpgsql;

-- Partitioning for game_sessions table (by month)
-- This helps with performance when dealing with large amounts of historical data
CREATE TABLE IF NOT EXISTS game_sessions_template (
    LIKE game_sessions INCLUDING ALL
);

-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Vacuum and analyze optimization settings
ALTER TABLE players SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE game_sessions SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- Statistics targets for better query planning
ALTER TABLE players ALTER COLUMN level SET STATISTICS 1000;
ALTER TABLE players ALTER COLUMN total_score SET STATISTICS 1000;
ALTER TABLE game_sessions ALTER COLUMN score SET STATISTICS 1000;
ALTER TABLE level_progress ALTER COLUMN best_score SET STATISTICS 1000;