-- Create table for dismissed risk factors
-- Provides strong consistency across all devices

CREATE TABLE IF NOT EXISTS dismissed_risks (
  id BIGSERIAL PRIMARY KEY,
  mother_id TEXT NOT NULL,
  risk_key TEXT NOT NULL,
  dismissed_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one row per mother + risk combination
  UNIQUE(mother_id, risk_key)
);

-- Index for fast lookups by mother_id
CREATE INDEX IF NOT EXISTS idx_dismissed_risks_mother_id ON dismissed_risks(mother_id);

-- Index for filtering by dismissal time
CREATE INDEX IF NOT EXISTS idx_dismissed_risks_dismissed_at ON dismissed_risks(dismissed_at);

-- Enable Row Level Security (RLS)
ALTER TABLE dismissed_risks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mothers can view own dismissed risks" ON dismissed_risks;
DROP POLICY IF EXISTS "Mothers can insert own dismissed risks" ON dismissed_risks;
DROP POLICY IF EXISTS "Mothers can update own dismissed risks" ON dismissed_risks;
DROP POLICY IF EXISTS "Mothers can delete own dismissed risks" ON dismissed_risks;

-- Policy: Mothers can only see their own dismissed risks
CREATE POLICY "Mothers can view own dismissed risks"
  ON dismissed_risks FOR SELECT
  USING (mother_id = auth.uid()::text);

-- Policy: Mothers can insert their own dismissed risks
CREATE POLICY "Mothers can insert own dismissed risks"
  ON dismissed_risks FOR INSERT
  WITH CHECK (mother_id = auth.uid()::text);

-- Policy: Mothers can update their own dismissed risks
CREATE POLICY "Mothers can update own dismissed risks"
  ON dismissed_risks FOR UPDATE
  USING (mother_id = auth.uid()::text)
  WITH CHECK (mother_id = auth.uid()::text);

-- Policy: Mothers can delete their own dismissed risks
CREATE POLICY "Mothers can delete own dismissed risks"
  ON dismissed_risks FOR DELETE
  USING (mother_id = auth.uid()::text);

-- Grant access to service role (for server-side operations)
GRANT ALL ON dismissed_risks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE dismissed_risks_id_seq TO service_role;
