"""
SUPABASE SCHEMA FOR 384-DIMENSIONAL EMBEDDINGS
==============================================

Run this SQL in your Supabase database to set up semantic search.
Uses intfloat/multilingual-e5-small (384-dim embeddings).
"""

# ============================================================================
# MIGRATION: Create qa_embeddings table with 384-dim vectors
# ============================================================================

SQL_SCHEMA_384 = """
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table (384-dimensional)
CREATE TABLE IF NOT EXISTS qa_embeddings (
    id BIGSERIAL PRIMARY KEY,
    
    -- Core fields
    qa_id TEXT UNIQUE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- Embedding (384 dimensions for multilingual-e5-small)
    embedding vector(384) NOT NULL,
    
    -- Metadata for filtering
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'bn', 'mixed')),
    severity TEXT DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'emergency')),
    trimester INTEGER CHECK (trimester IS NULL OR trimester IN (1, 2, 3)),
    category TEXT DEFAULT 'general',
    source TEXT DEFAULT 'dataset',
    keywords TEXT[] DEFAULT '{}',
    
    -- Tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT question_not_empty CHECK (LENGTH(question) > 0),
    CONSTRAINT answer_not_empty CHECK (LENGTH(answer) > 0)
);

-- Create indexes
CREATE INDEX idx_qa_embeddings_language ON qa_embeddings(language);
CREATE INDEX idx_qa_embeddings_severity ON qa_embeddings(severity);
CREATE INDEX idx_qa_embeddings_trimester ON qa_embeddings(trimester);
CREATE INDEX idx_qa_embeddings_category ON qa_embeddings(category);

-- Vector similarity search index (CRITICAL for performance)
-- This uses cosine distance for normalized vectors
CREATE INDEX idx_qa_embeddings_vector_cosine ON qa_embeddings 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Full-text search index (for keyword fallback)
CREATE INDEX idx_qa_embeddings_fts ON qa_embeddings 
    USING GIN(to_tsvector('english', question || ' ' || answer));

-- ============================================================================
-- SEMANTIC SEARCH RPC FUNCTION (384-dimensional)
-- ============================================================================

CREATE OR REPLACE FUNCTION semantic_search_384(
    query_embedding vector(384),
    similarity_threshold FLOAT DEFAULT 0.25,
    limit_results INT DEFAULT 5
)
RETURNS TABLE(
    qa_id TEXT,
    question TEXT,
    answer TEXT,
    similarity FLOAT,
    language TEXT,
    category TEXT
) AS $$
SELECT
    qa_embeddings.qa_id,
    qa_embeddings.question,
    qa_embeddings.answer,
    (1 - (qa_embeddings.embedding <=> query_embedding))::FLOAT AS similarity,
    qa_embeddings.language,
    qa_embeddings.category
FROM qa_embeddings
WHERE 
    (1 - (qa_embeddings.embedding <=> query_embedding)) >= similarity_threshold
ORDER BY similarity DESC
LIMIT limit_results;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- KEYWORD SEARCH FALLBACK (Full-text search)
-- ============================================================================

CREATE OR REPLACE FUNCTION keyword_search(
    query_text TEXT,
    limit_results INT DEFAULT 5
)
RETURNS TABLE(
    qa_id TEXT,
    question TEXT,
    answer TEXT,
    relevance FLOAT
) AS $$
SELECT
    qa_embeddings.qa_id,
    qa_embeddings.question,
    qa_embeddings.answer,
    ts_rank(
        to_tsvector('english', question || ' ' || answer), 
        plainto_tsquery('english', query_text)
    )::FLOAT AS relevance
FROM qa_embeddings
WHERE 
    to_tsvector('english', question || ' ' || answer) @@ 
    plainto_tsquery('english', query_text)
ORDER BY relevance DESC
LIMIT limit_results;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- TEXT SEARCH COLUMN (for hybrid search)
-- ============================================================================

ALTER TABLE qa_embeddings ADD COLUMN IF NOT EXISTS 
    question_answer_text tsvector GENERATED ALWAYS AS (
        to_tsvector('english', question || ' ' || answer)
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_qa_embeddings_text ON qa_embeddings 
    USING GIN(question_answer_text);

-- ============================================================================
-- PERMISSIONS & RLS (Optional but recommended)
-- ============================================================================

ALTER TABLE qa_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous (public) read access to Q&A (no secrets in answer)
CREATE POLICY "public_read_qa" ON qa_embeddings
    FOR SELECT
    USING (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'qa_embeddings';

-- Check embedding dimension
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'qa_embeddings' AND column_name = 'embedding';

-- Count embeddings
SELECT COUNT(*) as embedding_count FROM qa_embeddings;

-- Test semantic search (substitute with real embedding)
SELECT semantic_search_384(
    embedding,
    0.25,
    5
) FROM qa_embeddings LIMIT 1;
"""

# ============================================================================
# IMPORT DATA (embeddings_output.json → Supabase)
# ============================================================================

IMPORT_INSTRUCTIONS = """
After creating the schema above:

## Option 1: Using Supabase UI
1. Go to Table Editor in Supabase Console
2. Select qa_embeddings table
3. Click "Import data"
4. Upload embeddings_output.json

## Option 2: Using Python
import json
from supabase import create_client

url = "https://xxx.supabase.co"
key = "eyJxxx"  # service_role key (private)
supabase = create_client(url, key)

with open('embeddings_output.json') as f:
    data = json.load(f)

for record in data['data']:
    supabase.table('qa_embeddings').insert(record).execute()

## Option 3: Using curl
curl -X POST https://xxx.supabase.co/rest/v1/qa_embeddings \\
  -H "apikey: xxx" \\
  -H "Authorization: Bearer xxx" \\
  -H "Content-Type: application/json" \\
  -d @embeddings_output.json
"""

# ============================================================================
# VERIFICATION CHECKLIST
# ============================================================================

VERIFICATION_CHECKLIST = """
After importing data:

☐ Table exists: SELECT COUNT(*) FROM qa_embeddings;
☐ Has embeddings: SELECT COUNT(*) FROM qa_embeddings WHERE embedding IS NOT NULL;
☐ Vector dimension is 384: SELECT embedding FROM qa_embeddings LIMIT 1;
☐ RPC function exists: SELECT * FROM pg_proc WHERE proname = 'semantic_search_384';
☐ Test search works: SELECT * FROM semantic_search_384('query_embedding', 0.25, 5);
☐ Keywords are indexed: \\d qa_embeddings (check for GIN indexes)
☐ Language column has data: SELECT DISTINCT language FROM qa_embeddings;
"""

if __name__ == "__main__":
    print(SQL_SCHEMA_384)
    print("\n\n" + "="*80)
    print("IMPORT INSTRUCTIONS")
    print("="*80)
    print(IMPORT_INSTRUCTIONS)
    print("\n\n" + "="*80)
    print("VERIFICATION CHECKLIST")
    print("="*80)
    print(VERIFICATION_CHECKLIST)
