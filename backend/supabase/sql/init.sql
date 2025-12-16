-- ============================================================================
-- Enable Extensions
-- ============================================================================

-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Create Tables
-- ============================================================================

CREATE TABLE documents (
    id bigserial PRIMARY KEY,
    content text,                -- corresponds to Document.pageContent
    metadata jsonb,              -- corresponds to Document.metadata
    embedding vector(1536)       -- 1536 works for OpenAI embeddings
);

-- Create index for fast vector similarity search (hnsw is better for small datasets)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Create indexes for common metadata queries
CREATE INDEX idx_documents_metadata_rating ON documents ((metadata->>'rating'));
CREATE INDEX idx_documents_metadata_release_year ON documents ((metadata->>'releaseYear'));
CREATE INDEX idx_documents_metadata_duration ON documents ((metadata->>'durationMinutes'));

-- ============================================================================
-- Row Level Security for documents table
-- ============================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for service_role"
    ON "public"."documents"
    FOR ALL
    TO service_role
    USING (true);

CREATE POLICY "Enable SELECT for public"
    ON "public"."documents"
    FOR SELECT
    TO public
    USING (true);

-- ============================================================================
-- Storage Bucket Configuration
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('rag_data', 'rag_data', false, '{"text/plain"}');

-- ============================================================================
-- Storage Policies for rag_data bucket
-- ============================================================================

CREATE POLICY "Allow SELECT to service_role"
    ON storage.objects
    FOR SELECT
    TO service_role
    USING (bucket_id = 'rag_data');

CREATE POLICY "Allow INSERT to service_role"
    ON storage.objects
    FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'rag_data');

CREATE POLICY "Allow UPDATE to service_role"
    ON storage.objects
    FOR UPDATE
    TO service_role
    USING (bucket_id = 'rag_data')
    WITH CHECK (bucket_id = 'rag_data');

CREATE POLICY "Allow DELETE to service_role"
    ON storage.objects
    FOR DELETE
    TO service_role
    USING (bucket_id = 'rag_data');

-- ============================================================================
-- Functions
-- ============================================================================

-- Create a function to search for documents
-- Sorts by similarity first, then by rating (higher rating preferred)
-- Excludes previously recommended movies by title
CREATE OR REPLACE FUNCTION match_documents_with_filters (
    query_embedding vector(1536),
    match_count int DEFAULT 20,
    max_duration int DEFAULT NULL,
    min_year int DEFAULT NULL,
    max_year int DEFAULT NULL,
    excluded_titles text[] DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE
        -- Duration filter: only include if durationMinutes <= max_duration
        (max_duration IS NULL OR (documents.metadata->>'durationMinutes')::int <= max_duration)
        AND
        -- Min year filter: only include if releaseYear >= min_year
        (min_year IS NULL OR (documents.metadata->>'releaseYear')::int >= min_year)
        AND
        -- Max year filter: only include if releaseYear <= max_year
        (max_year IS NULL OR (documents.metadata->>'releaseYear')::int <= max_year)
        AND
        -- Exclude previously recommended movies by checking if content contains excluded title
        (excluded_titles IS NULL OR excluded_titles = '{}' OR NOT EXISTS (
            SELECT 1
            FROM unnest(excluded_titles) AS excluded_title
            WHERE documents.content ILIKE '%Name: ' || excluded_title || '%'
        ))
    ORDER BY
        documents.embedding <=> query_embedding,                -- Primary: similarity (lower distance = more similar)
        (documents.metadata->>'rating')::float DESC NULLS LAST  -- Secondary: higher rating first
    LIMIT match_count;
END;
$$;

