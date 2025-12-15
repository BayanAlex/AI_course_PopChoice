-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  content text, -- corresponds to Document.pageContent
  metadata jsonb, -- corresponds to Document.metadata
  embedding vector(1536) -- 1536 works for OpenAI embeddings
);

-- Create index for fast vector similarity search (hnsw is better for small datasets)
create index on documents using hnsw (embedding vector_cosine_ops);

alter table documents enable row level security;

create policy "Enable ALL for service_role"
on "public"."documents"
for ALL
to service_role
using (
  true
);

create policy "Enable SELECT for public"
on "public"."documents"
for SELECT
to public
using (
  true
);

-- Create a function to search for documents
-- Sorts by similarity first, then by rating (higher rating preferred)
-- Excludes previously recommended movies by title
create or replace function match_documents_with_filters (
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  max_duration int DEFAULT null,
  min_year int DEFAULT null,
  max_year int DEFAULT null,
  excluded_titles text[] DEFAULT null
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
return query
select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
from documents
where
  -- Duration filter: only include if durationMinutes <= max_duration
    (max_duration is null or (documents.metadata->>'durationMinutes')::int <= max_duration)
  and
  -- Min year filter: only include if releaseYear >= min_year
    (min_year is null or (documents.metadata->>'releaseYear')::int >= min_year)
  and
  -- Max year filter: only include if releaseYear <= max_year
    (max_year is null or (documents.metadata->>'releaseYear')::int <= max_year)
  and
  -- Exclude previously recommended movies by checking if content contains excluded title
    (excluded_titles is null or excluded_titles = '{}' or NOT EXISTS (
      SELECT 1 FROM unnest(excluded_titles) AS excluded_title
      WHERE documents.content ILIKE '%Name: ' || excluded_title || '%'
    ))
order by
  documents.embedding <=> query_embedding,  -- Primary: similarity (lower distance = more similar)
  (documents.metadata->>'rating')::float desc nulls last  -- Secondary: higher rating first
limit match_count;
end;
$$;
