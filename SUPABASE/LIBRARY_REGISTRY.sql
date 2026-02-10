
-- XEENAPS LIBRARY REGISTRY SCHEMA
-- Dedicated module for Library Items
-- V2: Migration Safe & Write-Enabled RLS

-- 1. Create Table if not exists
CREATE TABLE IF NOT EXISTS public.library_items (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "topic" TEXT,
    "subTopic" TEXT,
    "authors" JSONB DEFAULT '[]'::jsonb,
    "publisher" TEXT,
    "year" TEXT,
    "fullDate" TEXT,
    "pubInfo" JSONB DEFAULT '{}'::jsonb,
    "identifiers" JSONB DEFAULT '{}'::jsonb,
    "source" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "url" TEXT,
    "fileId" TEXT,
    "imageView" TEXT,
    "youtubeId" TEXT,
    "tags" JSONB DEFAULT '{"keywords": [], "labels": []}'::jsonb,
    "abstract" TEXT,
    "mainInfo" TEXT,
    "extractedJsonId" TEXT,
    "insightJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "isBookmarked" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "supportingReferences" JSONB DEFAULT '{"references": [], "videoUrl": ""}'::jsonb
    -- "search_all" TEXT will be added safely below to prevent errors on existing tables
);

-- 2. Safely Add 'search_all' column if it doesn't exist (Migration Logic)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'library_items' AND column_name = 'search_all') THEN
        ALTER TABLE public.library_items ADD COLUMN "search_all" TEXT;
    END IF;
END $$;

-- 3. Indexing (Safe Re-creation)
DROP INDEX IF EXISTS idx_library_items_search_all;
CREATE INDEX IF NOT EXISTS idx_library_items_search_all ON public.library_items ("search_all");
CREATE INDEX IF NOT EXISTS idx_library_items_type ON public.library_items ("type");
CREATE INDEX IF NOT EXISTS idx_library_items_created_at ON public.library_items ("createdAt");

-- 4. RLS (FIXED: Explicit Write Permission)
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to ensure we apply the fixed one
DROP POLICY IF EXISTS "Public Access Library" ON public.library_items;

-- Create full access policy (Read + Write)
CREATE POLICY "Public Access Library" ON public.library_items
FOR ALL
USING (true)
WITH CHECK (true); -- This enables INSERT and UPDATE

-- 5. Smart Search Trigger (UPDATED: Comprehensive Metadata Indexing)
CREATE OR REPLACE FUNCTION public.update_library_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' ||
        COALESCE(NEW."type", '') || ' ' ||
        COALESCE(NEW."category", '') || ' ' ||
        COALESCE(NEW."topic", '') || ' ' ||
        COALESCE(NEW."subTopic", '') || ' ' ||
        COALESCE(NEW."publisher", '') || ' ' ||
        COALESCE(NEW."mainInfo", '') || ' ' ||
        COALESCE(NEW."abstract", '') || ' ' ||
        -- Cast JSONB fields to text for searching
        COALESCE(NEW."authors"::text, '') || ' ' ||
        COALESCE(NEW."pubInfo"::text, '') || ' ' ||
        COALESCE(NEW."identifiers"::text, '') || ' ' ||
        COALESCE(NEW."tags"::text, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_library_search_index ON public.library_items;
CREATE TRIGGER trigger_update_library_search_index
    BEFORE INSERT OR UPDATE ON public.library_items
    FOR EACH ROW EXECUTE FUNCTION public.update_library_search_index();
