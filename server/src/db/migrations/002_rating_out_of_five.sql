-- Personal ratings move from a 1-10 scale to 1-5 stars, which fits the UI and is
-- easier to give. Existing scores are halved and rounded up, so 9 becomes 5 and
-- 3 becomes 2. The game's own IGDB score stays on its original scale: that is a
-- different number and lives on the games table.
ALTER TABLE user_games DROP CONSTRAINT user_games_rating_check;

UPDATE user_games
SET rating = GREATEST(1, CEIL(rating / 2.0))::smallint
WHERE rating IS NOT NULL;

ALTER TABLE user_games ADD CONSTRAINT user_games_rating_check CHECK (rating BETWEEN 1 AND 5);
