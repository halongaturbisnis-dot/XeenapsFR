
-- XEENAPS PRESENTATION REGISTRY SCHEMA
-- Dedicated module for Presentations
-- V2: Migration Safe & Write-Enabled RLS

-- 1. Create Table if not exists
CREATE TABLE IF NOT EXISTS public.presentations (
    "id" TEXT PRIMARY KEY,
    "collectionIds" TEXT[] DEFAULT '{}'::text[],
    "gSlidesId" TEXT,
    "title" TEXT NOT NULL,
    "presenters" TEXT[] DEFAULT '{}'::text[],
    "templateName" TEXT,
    "themeConfig" JSONB DEFAULT '{}'::jsonb,
    "slidesCount" INTEGER DEFAULT 0,
    "storageNodeUrl" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
    -- "search_all" TEXT will be added safely below
);

-- 2. Safely Add 'search_all' column if it doesn't exist (Migration Logic)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'presentations' AND column_name = 'search_all') THEN
        ALTER TABLE public.presentations ADD COLUMN "search_all" TEXT;
    END IF;
END $$;

-- 3. Indexing (Safe Re-creation)
DROP INDEX IF EXISTS idx_presentations_search_all;
CREATE INDEX IF NOT EXISTS idx_presentations_search_all ON public.presentations ("search_all");

-- 4. RLS (FIXED: Explicit Write Permission)
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to ensure we apply the fixed one
DROP POLICY IF EXISTS "Public Access Presentations" ON public.presentations;

-- Create full access policy (Read + Write)
CREATE POLICY "Public Access Presentations" ON public.presentations
FOR ALL
USING (true)
WITH CHECK (true); -- This enables INSERT and UPDATE

-- 5. Smart Search Trigger (UPDATED: Include Collection Titles Lookup)
CREATE OR REPLACE FUNCTION public.update_presentation_search_index()
RETURNS TRIGGER AS $$
DECLARE
    collection_titles TEXT := '';
BEGIN
    -- Fetch titles from library_items based on collectionIds array
    IF array_length(NEW."collectionIds", 1) > 0 THEN
        SELECT string_agg("title", ' ') INTO collection_titles
        FROM public.library_items
        WHERE "id" = ANY(NEW."collectionIds");
    END IF;

    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' ||
        array_to_string(NEW."presenters", ' ') || ' ' ||
        COALESCE(collection_titles, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_presentation_search_index ON public.presentations;
CREATE TRIGGER trigger_update_presentation_search_index
    BEFORE INSERT OR UPDATE ON public.presentations
    FOR EACH ROW EXECUTE FUNCTION public.update_presentation_search_index();
