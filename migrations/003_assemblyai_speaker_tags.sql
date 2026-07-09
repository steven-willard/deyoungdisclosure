-- Add AssemblyAI speaker-tagging columns to meetings table
ALTER TABLE meetings ADD COLUMN transcript_source TEXT NOT NULL DEFAULT 'youtube-captions';
ALTER TABLE meetings ADD COLUMN speaker_map TEXT;      -- JSON: { "A": "Dave DeYoung", "B": "Russ TeSlaa", ... }
ALTER TABLE meetings ADD COLUMN dave_segments TEXT;    -- JSON: [{ text, timestamp_sec, youtube_url, topic }]
