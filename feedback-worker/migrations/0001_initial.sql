CREATE TABLE IF NOT EXISTS food_feedback (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
    reasons_json TEXT NOT NULL DEFAULT '[]',
    note TEXT,
    flow TEXT NOT NULL,
    locale TEXT,
    market TEXT,
    app_version TEXT,
    build_number TEXT,
    catalog_version TEXT,
    installation_hash TEXT NOT NULL,
    items_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'reviewing', 'fixed', 'dismissed')),
    admin_note TEXT
);

CREATE INDEX IF NOT EXISTS food_feedback_status_created
    ON food_feedback(status, created_at DESC);

CREATE INDEX IF NOT EXISTS food_feedback_rating_created
    ON food_feedback(rating, created_at DESC);

CREATE INDEX IF NOT EXISTS food_feedback_installation_created
    ON food_feedback(installation_hash, created_at DESC);
