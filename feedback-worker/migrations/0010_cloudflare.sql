-- Cloudflare usage from the GraphQL Analytics API, one row per UTC day (a
-- rerun replaces the day's row; each run fetches yesterday and today). Counts
-- only: Workers requests and errors over every script, D1 rows read and
-- written over every database, the largest database's size (`d1_bytes`; the
-- free plan caps each database at 500 MB), and the zone's requests.
CREATE TABLE IF NOT EXISTS cloudflare_days (
    day TEXT PRIMARY KEY,
    taken_at TEXT NOT NULL,
    worker_requests INTEGER,
    worker_errors INTEGER,
    d1_rows_read INTEGER,
    d1_rows_written INTEGER,
    d1_bytes INTEGER,
    pages_requests INTEGER
);
