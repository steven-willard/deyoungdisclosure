CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  platforms TEXT NOT NULL DEFAULT '[]',
  state TEXT NOT NULL DEFAULT 'pending_approval',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dave_note TEXT,
  social_copy TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_state ON posts(state);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS meetings (
  video_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  date TEXT,
  youtube_url TEXT NOT NULL,
  hct_url TEXT NOT NULL,
  summary TEXT,
  highlights TEXT NOT NULL DEFAULT '[]',
  deleted_at TEXT,
  scraped_at TEXT NOT NULL,
  summarized_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(type);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date DESC);

CREATE TABLE IF NOT EXISTS post_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES posts(id),
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  actor TEXT NOT NULL,
  note TEXT,
  transitioned_at TEXT NOT NULL
);
