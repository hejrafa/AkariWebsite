-- TestFlight numbers from the App Store Connect API, one row per UTC day
-- (a rerun replaces the day's row). Counts only: no tester names, emails or
-- ids are stored. `builds_json` holds the last builds with their usage.
CREATE TABLE IF NOT EXISTS testflight_snapshots (
    day TEXT PRIMARY KEY,
    taken_at TEXT NOT NULL,
    testers_total INTEGER NOT NULL,
    testers_public_link INTEGER NOT NULL,
    testers_installed INTEGER NOT NULL,
    sessions_30d INTEGER NOT NULL,
    crashes_30d INTEGER NOT NULL,
    builds_json TEXT NOT NULL
);
