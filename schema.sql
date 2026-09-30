-- Promo Check: shared DONE / COMP tracking (api/track.js also creates this automatically)
CREATE TABLE IF NOT EXISTS promo_check_tracking (
  ac_number  TEXT PRIMARY KEY,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  done_at    TIMESTAMPTZ,
  comp       TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
