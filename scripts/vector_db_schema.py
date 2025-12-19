"""
VECTOR DATABASE SCHEMA DESIGN
==============================

Supports: Supabase pgvector, Qdrant, or Pinecone

This file documents the required schema and provides setup scripts.
"""

# ==============================================================================
# SUPABASE VECTOR (pgvector) SETUP
# ==============================================================================

SUPABASE_SQL_SCHEMA = """
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE IF NOT EXISTS qa_embeddings (
    id BIGSERIAL PRIMARY KEY,
    
    -- Core fields
    qa_id TEXT UNIQUE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- Embedding (768 dimensions for E5)
    embedding vector(768) NOT NULL,
    
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
    
    -- Indexes for fast search
    CONSTRAINT question_not_empty CHECK (LENGTH(question) > 0),
    CONSTRAINT answer_not_empty CHECK (LENGTH(answer) > 0)
);

-- Create indexes
CREATE INDEX idx_qa_embeddings_language ON qa_embeddings(language);
CREATE INDEX idx_qa_embeddings_severity ON qa_embeddings(severity);
CREATE INDEX idx_qa_embeddings_trimester ON qa_embeddings(trimester);
CREATE INDEX idx_qa_embeddings_category ON qa_embeddings(category);

-- Create vector similarity search index (required for performance)
CREATE INDEX idx_qa_embeddings_vector ON qa_embeddings 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Function: Semantic search
CREATE OR REPLACE FUNCTION semantic_search(
    query_embedding vector(768),
    similarity_threshold FLOAT DEFAULT 0.3,
    limit_results INT DEFAULT 5,
    filter_language TEXT DEFAULT NULL,
    filter_severity TEXT DEFAULT NULL
)
RETURNS TABLE(
    qa_id TEXT,
    question TEXT,
    answer TEXT,
    similarity FLOAT,
    language TEXT,
    severity TEXT,
    trimester INTEGER,
    category TEXT
) AS $$
SELECT
    qa_embeddings.qa_id,
    qa_embeddings.question,
    qa_embeddings.answer,
    (1 - (qa_embeddings.embedding <=> query_embedding))::FLOAT AS similarity,
    qa_embeddings.language,
    qa_embeddings.severity,
    qa_embeddings.trimester,
    qa_embeddings.category
FROM qa_embeddings
WHERE 
    (1 - (qa_embeddings.embedding <=> query_embedding)) >= similarity_threshold
    AND (filter_language IS NULL OR qa_embeddings.language = filter_language)
    AND (filter_severity IS NULL OR qa_embeddings.severity = filter_severity)
ORDER BY similarity DESC
LIMIT limit_results;
$$ LANGUAGE SQL;

-- Function: Full text search (fallback)
CREATE INDEX idx_qa_embeddings_fulltext ON qa_embeddings 
    USING GIN(to_tsvector('english', question || ' ' || answer));

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
    ts_rank(to_tsvector('english', question || ' ' || answer), 
            plainto_tsquery('english', query_text))::FLOAT AS relevance
FROM qa_embeddings
WHERE to_tsvector('english', question || ' ' || answer) @@ 
      plainto_tsquery('english', query_text)
ORDER BY relevance DESC
LIMIT limit_results;
$$ LANGUAGE SQL;

-- Enable Row Level Security (for user data isolation if needed)
ALTER TABLE qa_embeddings ENABLE ROW LEVEL SECURITY;
"""

# ==============================================================================
# QDRANT VECTOR DATABASE SCHEMA
# ==============================================================================

QDRANT_SCHEMA = {
    "collection_name": "momcare_qa",
    "vectors": {
        "size": 768,
        "distance": "Cosine",  # Cosine similarity (normalized vectors)
    },
    "payload_schema": {
        "qa_id": {"type": "text"},
        "question": {"type": "text"},
        "answer": {"type": "text"},
        "content": {"type": "text"},
        "language": {"type": "keyword"},  # en, bn, mixed
        "severity": {"type": "keyword"},  # low, normal, high, emergency
        "trimester": {"type": "integer"},
        "category": {"type": "keyword"},
        "source": {"type": "keyword"},
        "keywords": {"type": "text"},
    }
}

# ==============================================================================
# PINECONE SCHEMA
# ==============================================================================

PINECONE_SCHEMA = {
    "index_name": "momcare-qa",
    "metric": "cosine",
    "dimension": 768,
    "pod_type": "p1",  # Performance tier
    "pods": 1,
    "replicas": 1,
    "metadata_filters": {
        "language": "text",
        "severity": "text",
        "trimester": "integer",
        "category": "text",
        "source": "text",
    }
}

# ==============================================================================
# RECORD FORMAT (Same for all vector DBs)
# ==============================================================================

RECORD_SCHEMA = {
    "type": "object",
    "required": ["qa_id", "question", "answer", "embedding"],
    "properties": {
        "qa_id": {
            "type": "string",
            "description": "Unique identifier",
            "example": "qa_1"
        },
        "question": {
            "type": "string",
            "description": "User question",
            "example": "Can I eat mango during pregnancy?"
        },
        "answer": {
            "type": "string",
            "description": "Expert answer",
            "example": "Yes, mango is nutritious and safe..."
        },
        "content": {
            "type": "string",
            "description": "Combined question + answer for search",
        },
        "embedding": {
            "type": "array",
            "items": {"type": "number"},
            "minItems": 768,
            "maxItems": 768,
            "description": "E5 embedding vector (normalized)"
        },
        "language": {
            "type": "string",
            "enum": ["en", "bn", "mixed"],
            "description": "Content language"
        },
        "severity": {
            "type": "string",
            "enum": ["low", "normal", "high", "emergency"],
            "description": "Medical severity level"
        },
        "trimester": {
            "type": ["integer", "null"],
            "enum": [1, 2, 3, None],
            "description": "Pregnancy trimester (if applicable)"
        },
        "category": {
            "type": "string",
            "example": "nutrition",
            "description": "Knowledge category"
        },
        "source": {
            "type": "string",
            "example": "medical_database",
            "description": "Data source"
        },
        "keywords": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Search keywords"
        },
        "created_at": {
            "type": "string",
            "format": "date-time",
            "description": "Creation timestamp"
        }
    }
}

# ==============================================================================
# SETUP INSTRUCTIONS
# ==============================================================================

SETUP_INSTRUCTIONS = """
STEP 1: Choose Your Vector Database
====================================

Option A: SUPABASE (Easiest - PostgreSQL + pgvector)
------------------------------------------------------
1. Create Supabase project at https://supabase.com
2. Go to SQL Editor
3. Run the SQL schema above (SUPABASE_SQL_SCHEMA)
4. Get connection string from Project Settings > Database
5. Store in .env.local as DATABASE_URL

Option B: QDRANT (Recommended for Production)
----------------------------------------------
1. Deploy Qdrant cluster at https://cloud.qdrant.io
2. Create collection with settings in QDRANT_SCHEMA
3. Get API key and cluster URL
4. Store in .env.local as:
   QDRANT_URL=https://xxx.qdrant.io
   QDRANT_API_KEY=xxx

Option C: PINECONE (Simplest API)
----------------------------------
1. Create account at https://www.pinecone.io
2. Create index with settings in PINECONE_SCHEMA
3. Get API key from Settings
4. Store in .env.local as PINECONE_API_KEY

STEP 2: Pre-compute Embeddings (Python)
========================================
1. Set HF_API_KEY environment variable
2. Run: python scripts/embed_dataset.py
3. Get embeddings_output.json

STEP 3: Import Embeddings
==========================
# Supabase (using REST API)
POST https://xxx.supabase.co/rest/v1/qa_embeddings
Headers: Authorization: Bearer xxx
Body: JSON from embeddings_output.json

# Qdrant (using Python client)
from qdrant_client import QdrantClient
client = QdrantClient(url="https://xxx", api_key="xxx")
# Upload points...

# Pinecone (using Python client)
from pinecone import Pinecone
pc = Pinecone(api_key="xxx")
# Upload embeddings...

STEP 4: Verify Import
=====================
Query the database to ensure embeddings are loaded:
- Supabase: SELECT COUNT(*) FROM qa_embeddings;
- Should return number of imported records

STEP 5: Store Database Credentials
===================================
Add to .env.local:
- VECTOR_DB_TYPE=supabase|qdrant|pinecone
- VECTOR_DB_URL or VECTOR_DB_CONNECTION_STRING
- VECTOR_DB_API_KEY
- VECTOR_DB_API_SECRET (if needed)

STEP 6: Update Client Configuration
====================================
See: lib/vectorDB.ts for client setup
"""

if __name__ == "__main__":
    print(SETUP_INSTRUCTIONS)
    print("\n\nSUPABASE SQL SCHEMA:")
    print("=" * 80)
    print(SUPABASE_SQL_SCHEMA)
