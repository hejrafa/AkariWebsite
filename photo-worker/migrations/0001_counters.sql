-- The daily allowance counters. `key` is `global:<day>`, or `device:` or
-- `address:` with a hash under that day's salt, then the day. The cron at
-- 03:00 UTC deletes every row older than yesterday.
CREATE TABLE IF NOT EXISTS counters (
    key TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    count INTEGER NOT NULL
);

-- One salt per UTC day; once it is deleted, that day's hashed keys can't be
-- linked to a device, an address or each other.
CREATE TABLE IF NOT EXISTS salts (
    day TEXT PRIMARY KEY,
    salt TEXT NOT NULL
);
