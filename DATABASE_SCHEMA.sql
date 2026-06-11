-- BOX Score Tracker - Database Schema
-- Run these SQL commands in Supabase SQL Editor

-- Create groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  minus_limit INT NOT NULL DEFAULT -300,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Create rounds table
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  is_reset BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create round_scores table
CREATE TABLE round_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  is_cate BOOLEAN DEFAULT FALSE,
  joker_used INT DEFAULT 0,
  joker_held INT DEFAULT 0,
  son_failed BOOLEAN DEFAULT FALSE,
  card_score INT DEFAULT 0,
  round_total INT NOT NULL,
  score_reset BOOLEAN DEFAULT FALSE
);

-- Create indexes for faster queries
CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_players_group_id ON players(group_id);
CREATE INDEX idx_games_group_id ON games(group_id);
CREATE INDEX idx_rounds_game_id ON rounds(game_id);
CREATE INDEX idx_round_scores_round_id ON round_scores(round_id);
CREATE INDEX idx_round_scores_player_id ON round_scores(player_id);

-- Enable Row Level Security (RLS) - Optional, for extra security
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE round_scores ENABLE ROW LEVEL SECURITY;
