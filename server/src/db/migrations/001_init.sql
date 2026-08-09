CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emails and usernames are compared case-insensitively so "Louis" and "louis"
-- cannot both register.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
CREATE UNIQUE INDEX users_username_lower_key ON users (lower(username));

CREATE TABLE games (
  id             SERIAL PRIMARY KEY,
  external_id    BIGINT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  slug           TEXT NOT NULL,
  description    TEXT,
  cover_url      TEXT,
  background_url TEXT,
  release_date   DATE,
  rating         NUMERIC(4, 1),
  genres         TEXT[] NOT NULL DEFAULT '{}',
  platforms      TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX games_title_idx ON games (lower(title));

CREATE TYPE game_status AS ENUM ('WANT_TO_PLAY', 'PLAYING', 'PLAYED', 'NOT_INTERESTED');

CREATE TABLE user_games (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game_id    INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  status     game_status NOT NULL,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 10),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_games_user_game_key UNIQUE (user_id, game_id)
);

CREATE INDEX user_games_user_status_idx ON user_games (user_id, status);
