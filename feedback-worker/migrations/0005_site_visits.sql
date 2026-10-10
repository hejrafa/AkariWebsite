-- Website visits, counted without cookies. `visitor` is a hash of the
-- request with a salt that exists for one UTC day only; once the salt is
-- deleted the hash can no longer be linked to anyone, or across days.
CREATE TABLE IF NOT EXISTS site_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    day TEXT NOT NULL,
    path TEXT NOT NULL,
    source TEXT,
    country TEXT,
    visitor TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS site_visits_day ON site_visits(day);

CREATE TABLE IF NOT EXISTS site_visit_salts (
    day TEXT PRIMARY KEY,
    salt TEXT NOT NULL
);
