-- Create table for cached AI-generated risk factors
-- Provides strong consistency and prevents different chips on different devices

CREATE TABLE IF NOT EXISTS cached_ai_risks (
  id BIGSERIAL PRIMARY KEY,
  mother_id TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Unique constraint: one cache entry per mother + text hash
  UNIQUE(mother_id, text_hash)
);

-- Index for fast lookups by mother_id and text_hash
CREATE INDEX IF NOT EXISTS idx_cached_ai_risks_lookup ON cached_ai_risks(mother_id, text_hash);

-- Index for cleaning up expired entries
CREATE INDEX IF NOT EXISTS idx_cached_ai_risks_expires ON cached_ai_risks(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE cached_ai_risks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mothers can view own cached AI risks" ON cached_ai_risks;
DROP POLICY IF EXISTS "Mothers can insert own cached AI risks" ON cached_ai_risks;
DROP POLICY IF EXISTS "Mothers can update own cached AI risks" ON cached_ai_risks;
DROP POLICY IF EXISTS "Mothers can delete own cached AI risks" ON cached_ai_risks;

-- Policy: Mothers can only see their own cached AI risks
CREATE POLICY "Mothers can view own cached AI risks"
  ON cached_ai_risks FOR SELECT
  USING (mother_id = auth.uid()::text);

-- Policy: Mothers can insert their own cached AI risks
CREATE POLICY "Mothers can insert own cached AI risks"
  ON cached_ai_risks FOR INSERT
  WITH CHECK (mother_id = auth.uid()::text);

-- Policy: Mothers can update their own cached AI risks
CREATE POLICY "Mothers can update own cached AI risks"
  ON cached_ai_risks FOR UPDATE
  USING (mother_id = auth.uid()::text)
  WITH CHECK (mother_id = auth.uid()::text);

-- Policy: Mothers can delete their own cached AI risks
CREATE POLICY "Mothers can delete own cached AI risks"
  ON cached_ai_risks FOR DELETE
  USING (mother_id = auth.uid()::text);

-- Grant access to service role (for server-side operations)
GRANT ALL ON cached_ai_risks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE cached_ai_risks_id_seq TO service_role;

-- Function to automatically clean up expired cache entries (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cached_ai_risks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
