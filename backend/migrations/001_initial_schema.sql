-- Initial database schema with optimized indexes
-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    currency INTEGER DEFAULT 0 CHECK (currency >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    total_score BIGINT DEFAULT 0 CHECK (total_score >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for players table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_email ON players(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_level ON players(level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_created_at ON players(created_at);

-- Owned vehicles table
CREATE TABLE IF NOT EXISTS owned_vehicles (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    upgrades JSONB DEFAULT '{}',
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for owned_vehicles table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owned_vehicles_player_id ON owned_vehicles(player_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owned_vehicles_type ON owned_vehicles(vehicle_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owned_vehicles_upgrades ON owned_vehicles USING GIN(upgrades);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    level_id VARCHAR(50) NOT NULL,
    score INTEGER DEFAULT 0 CHECK (score >= 0),
    zombies_killed INTEGER DEFAULT 0 CHECK (zombies_killed >= 0),
    distance_traveled FLOAT DEFAULT 0 CHECK (distance_traveled >= 0),
    session_state VARCHAR(20) DEFAULT 'active' CHECK (session_state IN ('active', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for game_sessions table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_level_id ON game_sessions(level_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_state ON game_sessions(session_state);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_started_at ON game_sessions(started_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);

-- Level progress table
CREATE TABLE IF NOT EXISTS level_progress (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    level_id VARCHAR(50) NOT NULL,
    best_score INTEGER DEFAULT 0 CHECK (best_score >= 0),
    completed BOOLEAN DEFAULT FALSE,
    stars_earned INTEGER DEFAULT 0 CHECK (stars_earned >= 0 AND stars_earned <= 3),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(player_id, level_id)
);

-- Indexes for level_progress table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_level_progress_player_id ON level_progress(player_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_level_progress_level_id ON level_progress(level_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_level_progress_completed ON level_progress(completed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_level_progress_best_score ON level_progress(best_score DESC);

-- Leaderboard table for high scores
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    level_id VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, level_id)
);

-- Indexes for leaderboard table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_level_score ON leaderboard(level_id, score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_player_id ON leaderboard(player_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_achieved_at ON leaderboard(achieved_at);

-- Player statistics table
CREATE TABLE IF NOT EXISTS player_statistics (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    total_playtime INTEGER DEFAULT 0 CHECK (total_playtime >= 0), -- in seconds
    total_zombies_killed INTEGER DEFAULT 0 CHECK (total_zombies_killed >= 0),
    total_distance_traveled FLOAT DEFAULT 0 CHECK (total_distance_traveled >= 0),
    favorite_vehicle VARCHAR(50),
    last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id)
);

-- Indexes for player_statistics table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_statistics_player_id ON player_statistics(player_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_statistics_last_played ON player_statistics(last_played);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for players table
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW player_summary AS
SELECT 
    p.id,
    p.username,
    p.level,
    p.currency,
    p.total_score,
    ps.total_playtime,
    ps.total_zombies_killed,
    ps.total_distance_traveled,
    ps.favorite_vehicle,
    ps.last_played,
    COUNT(ov.id) as owned_vehicles_count,
    COUNT(lp.id) as levels_completed
FROM players p
LEFT JOIN player_statistics ps ON p.id = ps.player_id
LEFT JOIN owned_vehicles ov ON p.id = ov.player_id
LEFT JOIN level_progress lp ON p.id = lp.player_id AND lp.completed = true
GROUP BY p.id, ps.total_playtime, ps.total_zombies_killed, ps.total_distance_traveled, ps.favorite_vehicle, ps.last_played;

-- Global leaderboard view
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT 
    p.username,
    l.level_id,
    l.score,
    l.achieved_at,
    ROW_NUMBER() OVER (PARTITION BY l.level_id ORDER BY l.score DESC) as rank
FROM leaderboard l
JOIN players p ON l.player_id = p.id
ORDER BY l.level_id, l.score DESC;