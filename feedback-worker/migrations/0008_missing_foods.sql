-- Food names the app could not match to a verified food, counted per folded
-- name (lower case, trimmed, accents kept) and language. Nothing else from the
-- request is kept here; `resolved` is set on the dashboard once a verified row
-- exists.
CREATE TABLE IF NOT EXISTS missing_foods (
    name TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('en', 'de')),
    count INTEGER NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (name, language)
);

CREATE INDEX IF NOT EXISTS missing_foods_count ON missing_foods(count DESC);

-- The rate limit: one row per accepted post, under the same installation hash
-- food reports use, so a device sends at most 50 in 24 hours. The daily cron
-- deletes rows older than a day.
CREATE TABLE IF NOT EXISTS missing_food_posts (
    installation_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS missing_food_posts_installation_created
    ON missing_food_posts(installation_hash, created_at DESC);
