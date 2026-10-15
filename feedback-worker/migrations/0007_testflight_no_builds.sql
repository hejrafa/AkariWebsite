-- The dashboard no longer shows builds, so they are no longer fetched or kept.
ALTER TABLE testflight_snapshots DROP COLUMN builds_json;
