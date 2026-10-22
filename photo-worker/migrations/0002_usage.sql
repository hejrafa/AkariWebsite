-- AI usage per UTC day and endpoint (`photo`, `meal`, `compose`): every call
-- that reached Anthropic adds one request, a failure when Anthropic or its
-- answer failed, and the response's token counts. Counts only: no text, no
-- device, no address. The admin dashboard reads it; the cron at 03:00 UTC
-- deletes rows older than 400 days.
CREATE TABLE IF NOT EXISTS usage_days (
    day TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    requests INTEGER NOT NULL DEFAULT 0,
    failures INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, endpoint)
);
