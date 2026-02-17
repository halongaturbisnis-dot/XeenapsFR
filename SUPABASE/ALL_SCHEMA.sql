
-- =============================================================================
-- XEENAPS CONSOLIDATED DATABASE SCHEMA (ALL MODULES)
-- Run this script in the Supabase SQL Editor to initialize the entire database.
-- =============================================================================

-- =============================================================================
-- 1. PROFILE REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    "id" TEXT PRIMARY KEY, -- ID tetap: 'MAIN_USER'
    "fullName" TEXT,
    "photoUrl" TEXT,
    "photoFileId" TEXT,
    "photoNodeUrl" TEXT,
    "birthDate" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "sintaId" TEXT,
    "scopusId" TEXT,
    "wosId" TEXT,
    "googleScholarId" TEXT,
    "jobTitle" TEXT,
    "affiliation" TEXT,
    "uniqueAppId" TEXT,
    "socialMedia" TEXT,
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_history (
    "id" TEXT PRIMARY KEY,
    "profile_id" TEXT REFERENCES public.profiles("id") ON DELETE CASCADE,
    "level" TEXT,
    "institution" TEXT,
    "major" TEXT,
    "degree" TEXT,
    "startYear" TEXT,
    "endYear" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.career_history (
    "id" TEXT PRIMARY KEY,
    "profile_id" TEXT REFERENCES public.profiles("id") ON DELETE CASCADE,
    "company" TEXT,
    "position" TEXT,
    "type" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access Profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public Access Education" ON public.education_history FOR ALL USING (true);
CREATE POLICY "Public Access Career" ON public.career_history FOR ALL USING (true);

-- =============================================================================
-- 2. LIBRARY REGISTRY
-- =============================================================================

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
    "supportingReferences" JSONB DEFAULT '{"references": [], "videoUrl": ""}'::jsonb,
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_library_items_search_all ON public.library_items ("search_all");
CREATE INDEX IF NOT EXISTS idx_library_items_type ON public.library_items ("type");
CREATE INDEX IF NOT EXISTS idx_library_items_created_at ON public.library_items ("createdAt");

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Library" ON public.library_items FOR ALL USING (true) WITH CHECK (true);

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
        COALESCE(NEW."authors"::text, '') || ' ' ||
        COALESCE(NEW."pubInfo"::text, '') || ' ' ||
        COALESCE(NEW."identifiers"::text, '') || ' ' ||
        COALESCE(NEW."tags"::text, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_library_search_index
    BEFORE INSERT OR UPDATE ON public.library_items
    FOR EACH ROW EXECUTE FUNCTION public.update_library_search_index();

-- =============================================================================
-- 3. TEACHING REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teaching_logs (
    "id" TEXT PRIMARY KEY,
    "label" TEXT NOT NULL,
    "teachingDate" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "institution" TEXT,
    "faculty" TEXT,
    "program" TEXT,
    "academicYear" TEXT,
    "semester" TEXT,
    "classGroup" TEXT,
    "meetingNo" INTEGER DEFAULT 1,
    "mode" TEXT,
    "plannedStudents" INTEGER DEFAULT 0,
    "location" TEXT,
    "eventColor" TEXT DEFAULT '#004A74',
    "skReference" TEXT,
    "courseTitle" TEXT,
    "courseCode" TEXT,
    "learningOutcomes" TEXT,
    "method" TEXT,
    "theoryCredits" NUMERIC DEFAULT 0,
    "practicalCredits" NUMERIC DEFAULT 0,
    "courseType" TEXT,
    "educationLevel" TEXT,
    "topic" TEXT,
    "role" TEXT,
    "referenceLinks" JSONB DEFAULT '[]'::jsonb,
    "presentationId" JSONB DEFAULT '[]'::jsonb,
    "questionBankId" JSONB DEFAULT '[]'::jsonb,
    "attachmentLink" JSONB DEFAULT '[]'::jsonb,
    "syllabusLink" TEXT,
    "lectureNotesLink" TEXT,
    "actualStartTime" TEXT,
    "actualEndTime" TEXT,
    "teachingDuration" TEXT,
    "totalStudentsPresent" INTEGER DEFAULT 0,
    "attendancePercentage" NUMERIC DEFAULT 0,
    "attendanceListLink" TEXT,
    "problems" TEXT,
    "reflection" TEXT,
    "assignmentType" TEXT,
    "assessmentCriteria" TEXT,
    "vaultJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "status" TEXT DEFAULT 'Planned',
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT,
    "vault_items" JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_teaching_logs_search_all ON public.teaching_logs ("search_all");
CREATE INDEX IF NOT EXISTS idx_teaching_logs_date ON public.teaching_logs ("teachingDate");

ALTER TABLE public.teaching_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Teaching Logs" ON public.teaching_logs FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_teaching_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."label", '') || ' ' || 
        COALESCE(NEW."courseTitle", '') || ' ' || 
        COALESCE(NEW."courseCode", '') || ' ' ||
        COALESCE(NEW."topic", '') || ' ' ||
        COALESCE(NEW."institution", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teaching_search_index
    BEFORE INSERT OR UPDATE ON public.teaching_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_teaching_search_index();

-- =============================================================================
-- 4. ACTIVITY REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.activities (
    "id" TEXT PRIMARY KEY,
    "type" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "organizer" TEXT,
    "location" TEXT,
    "level" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "role" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "certificateNumber" TEXT,
    "credit" TEXT,
    "link" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "vaultJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "certificateFileId" TEXT,
    "certificateNodeUrl" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT,
    "vault_items" JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activities_search_all ON public.activities ("search_all");

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Activities" ON public.activities FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_activity_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."eventName", '') || ' ' || 
        COALESCE(NEW."organizer", '') || ' ' || 
        COALESCE(NEW."description", '') || ' ' ||
        COALESCE(NEW."certificateNumber", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activity_search_index
    BEFORE INSERT OR UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.update_activity_search_index();

-- =============================================================================
-- 5. RESEARCH REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.research_projects (
    "id" TEXT PRIMARY KEY,
    "projectName" TEXT NOT NULL,
    "language" TEXT DEFAULT 'English',
    "status" TEXT DEFAULT 'Draft',
    "isFavorite" BOOLEAN DEFAULT false,
    "isUsed" BOOLEAN DEFAULT false,
    "proposedTitle" TEXT,
    "noveltyNarrative" TEXT,
    "futureDirections" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE TABLE IF NOT EXISTS public.research_sources (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT REFERENCES public.research_projects("id") ON DELETE CASCADE,
    "sourceId" TEXT NOT NULL,
    "title" TEXT,
    "findings" TEXT,
    "methodology" TEXT,
    "limitations" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "isUsed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_projects_search_all ON public.research_projects ("search_all");
CREATE INDEX IF NOT EXISTS idx_research_sources_project_id ON public.research_sources ("projectId");

ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access Research Projects" ON public.research_projects FOR ALL USING (true);
CREATE POLICY "Public Access Research Sources" ON public.research_sources FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_research_project_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."projectName", '') || ' ' || 
        COALESCE(NEW."proposedTitle", '') || ' ' ||
        COALESCE(NEW."noveltyNarrative", '') || ' ' ||
        COALESCE(NEW."status", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_research_project_search_index
    BEFORE INSERT OR UPDATE ON public.research_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_research_project_search_index();

CREATE OR REPLACE FUNCTION public.update_research_source_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."findings", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_research_source_search_index
    BEFORE INSERT OR UPDATE ON public.research_sources
    FOR EACH ROW EXECUTE FUNCTION public.update_research_source_search_index();

-- =============================================================================
-- 6. TRACER REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tracer_projects (
    "id" TEXT PRIMARY KEY,
    "title" TEXT,
    "label" TEXT NOT NULL,
    "topic" TEXT,
    "problemStatement" TEXT,
    "researchGap" TEXT,
    "researchQuestion" TEXT,
    "methodology" TEXT,
    "population" TEXT,
    "keywords" TEXT[] DEFAULT '{}'::text[],
    "category" TEXT,
    "authors" TEXT[] DEFAULT '{}'::text[],
    "startDate" TEXT,
    "estEndDate" TEXT,
    "status" TEXT,
    "progress" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE TABLE IF NOT EXISTS public.tracer_logs (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT REFERENCES public.tracer_projects("id") ON DELETE CASCADE,
    "date" TEXT,
    "title" TEXT,
    "logJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "description" TEXT,
    "vault_items" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracer_references (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT REFERENCES public.tracer_projects("id") ON DELETE CASCADE,
    "collectionId" TEXT NOT NULL,
    "contentJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "quotes" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracer_todos (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT REFERENCES public.tracer_projects("id") ON DELETE CASCADE,
    "title" TEXT,
    "description" TEXT,
    "startDate" TEXT,
    "deadline" TEXT,
    "linkLabel" TEXT,
    "linkUrl" TEXT,
    "isDone" BOOLEAN DEFAULT false,
    "completedDate" TEXT,
    "completionRemarks" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracer_finance (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT REFERENCES public.tracer_projects("id") ON DELETE CASCADE,
    "date" TEXT,
    "credit" NUMERIC DEFAULT 0,
    "debit" NUMERIC DEFAULT 0,
    "balance" NUMERIC DEFAULT 0,
    "description" TEXT,
    "attachmentsJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "attachments" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracer_projects_search_all ON public.tracer_projects ("search_all");

ALTER TABLE public.tracer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracer_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracer_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracer_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access Tracer Projects" ON public.tracer_projects FOR ALL USING (true);
CREATE POLICY "Public Access Tracer Logs" ON public.tracer_logs FOR ALL USING (true);
CREATE POLICY "Public Access Tracer References" ON public.tracer_references FOR ALL USING (true);
CREATE POLICY "Public Access Tracer Todos" ON public.tracer_todos FOR ALL USING (true);
CREATE POLICY "Public Access Tracer Finance" ON public.tracer_finance FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_tracer_project_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."label", '') || ' ' || 
        COALESCE(NEW."topic", '') || ' ' ||
        COALESCE(NEW."status", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tracer_project_search_index
    BEFORE INSERT OR UPDATE ON public.tracer_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_tracer_project_search_index();

CREATE OR REPLACE FUNCTION public.update_tracer_finance_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."description", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tracer_finance_search_index
    BEFORE INSERT OR UPDATE ON public.tracer_finance
    FOR EACH ROW EXECUTE FUNCTION public.update_tracer_finance_search_index();

-- =============================================================================
-- 7. BRAINSTORMING REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.brainstorming (
    "id" TEXT PRIMARY KEY,
    "label" TEXT NOT NULL,
    "roughIdea" TEXT,
    "proposedTitle" TEXT,
    "problemStatement" TEXT,
    "researchGap" TEXT,
    "researchQuestion" TEXT,
    "methodology" TEXT,
    "population" TEXT,
    "keywords" TEXT[] DEFAULT '{}'::text[],
    "pillars" TEXT[] DEFAULT '{}'::text[],
    "proposedAbstract" TEXT,
    "externalRefs" TEXT[] DEFAULT '{}'::text[],
    "internalRefs" TEXT[] DEFAULT '{}'::text[],
    "isFavorite" BOOLEAN DEFAULT false,
    "isUsed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_brainstorming_search_all ON public.brainstorming ("search_all");
ALTER TABLE public.brainstorming ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Brainstorming" ON public.brainstorming FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_brainstorming_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."label", '') || ' ' || 
        COALESCE(NEW."roughIdea", '') || ' ' ||
        COALESCE(NEW."proposedTitle", '') || ' ' ||
        COALESCE(NEW."researchQuestion", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_brainstorming_search_index
    BEFORE INSERT OR UPDATE ON public.brainstorming
    FOR EACH ROW EXECUTE FUNCTION public.update_brainstorming_search_index();

-- =============================================================================
-- 8. PUBLICATION REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.publications (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "authors" TEXT[] DEFAULT '{}'::text[],
    "type" TEXT DEFAULT 'Journal',
    "status" TEXT DEFAULT 'Draft',
    "publisherName" TEXT,
    "researchDomain" TEXT,
    "affiliation" TEXT,
    "indexing" TEXT,
    "quartile" TEXT,
    "doi" TEXT,
    "issn_isbn" TEXT,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "year" TEXT,
    "submissionDate" TEXT,
    "acceptanceDate" TEXT,
    "publicationDate" TEXT,
    "brainstormingId" TEXT,
    "libraryId" TEXT,
    "manuscriptLink" TEXT,
    "abstract" TEXT,
    "keywords" TEXT[] DEFAULT '{}'::text[],
    "remarks" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_publications_search_all ON public.publications ("search_all");
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Publications" ON public.publications FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_publication_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."publisherName", '') || ' ' || 
        COALESCE(NEW."status", '') || ' ' ||
        COALESCE(NEW."indexing", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_publication_search_index
    BEFORE INSERT OR UPDATE ON public.publications
    FOR EACH ROW EXECUTE FUNCTION public.update_publication_search_index();

-- =============================================================================
-- 9. REVIEWS REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    "id" TEXT PRIMARY KEY,
    "label" TEXT NOT NULL,
    "centralQuestion" TEXT,
    "reviewJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_search_all ON public.reviews ("search_all");
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Reviews" ON public.reviews FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_review_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."label", '') || ' ' || 
        COALESCE(NEW."centralQuestion", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_search_index
    BEFORE INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_review_search_index();

-- =============================================================================
-- 10. NOTEBOOK REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notes (
    "id" TEXT PRIMARY KEY,
    "collectionId" TEXT,
    "collectionTitle" TEXT,
    "label" TEXT NOT NULL,
    "searchIndex" TEXT,
    "noteJsonId" TEXT,
    "storageNodeUrl" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "isUsed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_search_all ON public.notes ("search_all");
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Notes" ON public.notes FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_note_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."label", '') || ' ' || 
        COALESCE(NEW."collectionTitle", '') || ' ' || 
        COALESCE(NEW."searchIndex", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_note_search_index
    BEFORE INSERT OR UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.update_note_search_index();

-- =============================================================================
-- 11. QUESTION BANK REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.questions (
    "id" TEXT PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "bloomLevel" TEXT NOT NULL,
    "customLabel" TEXT,
    "questionText" TEXT NOT NULL,
    "options" JSONB DEFAULT '[]'::jsonb,
    "correctAnswer" TEXT NOT NULL,
    "reasoningCorrect" TEXT,
    "reasoningDistractors" JSONB DEFAULT '{}'::jsonb,
    "verbatimReference" TEXT,
    "language" TEXT DEFAULT 'English',
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_search_all ON public.questions ("search_all");
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Questions" ON public.questions FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_question_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."questionText", '') || ' ' || 
        COALESCE(NEW."customLabel", '') || ' ' || 
        COALESCE(NEW."bloomLevel", '') || ' ' ||
        COALESCE(NEW."verbatimReference", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_question_search_index
    BEFORE INSERT OR UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.update_question_search_index();

-- =============================================================================
-- 12. CONSULTATION REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.consultations (
    "id" TEXT PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answerJsonId" TEXT,
    "nodeUrl" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_consultations_search_all ON public.consultations ("search_all");
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Consultations" ON public.consultations FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_consultation_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(COALESCE(NEW."question", ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consultation_search_index
    BEFORE INSERT OR UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION public.update_consultation_search_index();

-- =============================================================================
-- 13. PRESENTATION REGISTRY
-- =============================================================================

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
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_presentations_search_all ON public.presentations ("search_all");
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Presentations" ON public.presentations FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_presentation_search_index()
RETURNS TRIGGER AS $$
DECLARE
    collection_titles TEXT := '';
BEGIN
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

CREATE TRIGGER trigger_update_presentation_search_index
    BEFORE INSERT OR UPDATE ON public.presentations
    FOR EACH ROW EXECUTE FUNCTION public.update_presentation_search_index();

-- =============================================================================
-- 14. CV ARCHITECT REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cv_documents (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "template" TEXT,
    "fileId" TEXT,
    "storageNodeUrl" TEXT,
    "includePhoto" BOOLEAN DEFAULT true,
    "aiSummary" TEXT,
    "selectedEducationIds" TEXT[] DEFAULT '{}'::text[],
    "selectedCareerIds" TEXT[] DEFAULT '{}'::text[],
    "selectedPublicationIds" TEXT[] DEFAULT '{}'::text[],
    "selectedActivityIds" TEXT[] DEFAULT '{}'::text[],
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_cv_documents_search_all ON public.cv_documents ("search_all");
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access CV Documents" ON public.cv_documents FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_cv_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."template", '') || ' ' ||
        COALESCE(NEW."aiSummary", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cv_search_index
    BEFORE INSERT OR UPDATE ON public.cv_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_cv_search_index();

-- =============================================================================
-- 15. COLLEAGUE REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.colleagues (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "uniqueAppId" TEXT NOT NULL,
    "affiliation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "socialMedia" TEXT,
    "photoUrl" TEXT,
    "photoFileId" TEXT,
    "photoNodeUrl" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_colleagues_search_all ON public.colleagues ("search_all");
ALTER TABLE public.colleagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Colleagues" ON public.colleagues FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_colleague_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."name", '') || ' ' || 
        COALESCE(NEW."uniqueAppId", '') || ' ' || 
        COALESCE(NEW."affiliation", '') || ' ' ||
        COALESCE(NEW."email", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_colleague_search_index
    BEFORE INSERT OR UPDATE ON public.colleagues
    FOR EACH ROW EXECUTE FUNCTION public.update_colleague_search_index();

-- =============================================================================
-- 16. SHARBOX REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sharbox_inbox (
    "id" TEXT PRIMARY KEY,
    "senderName" TEXT,
    "senderPhotoUrl" TEXT,
    "senderAffiliation" TEXT,
    "senderUniqueAppId" TEXT,
    "senderEmail" TEXT,
    "senderPhone" TEXT,
    "senderSocialMedia" TEXT,
    "receiverName" TEXT,
    "message" TEXT,
    "timestamp" TIMESTAMPTZ DEFAULT now(),
    "status" TEXT DEFAULT 'UNCLAIMED',
    "isRead" BOOLEAN DEFAULT false,
    "id_item" TEXT,
    "title" TEXT,
    "type" TEXT,
    "category" TEXT,
    "topic" TEXT,
    "subTopic" TEXT,
    "authors" JSONB DEFAULT '[]'::jsonb,
    "publisher" TEXT,
    "year" TEXT,
    "fullDate" TEXT,
    "pubInfo" JSONB DEFAULT '{}'::jsonb,
    "identifiers" JSONB DEFAULT '{}'::jsonb,
    "source" TEXT,
    "format" TEXT,
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
    "supportingReferences" JSONB DEFAULT '{"references": [], "videoUrl": ""}'::jsonb,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE TABLE IF NOT EXISTS public.sharbox_sent (
    "id" TEXT PRIMARY KEY,
    "receiverName" TEXT,
    "receiverPhotoUrl" TEXT,
    "receiverUniqueAppId" TEXT,
    "receiverEmail" TEXT,
    "receiverPhone" TEXT,
    "receiverSocialMedia" TEXT,
    "message" TEXT,
    "timestamp" TIMESTAMPTZ DEFAULT now(),
    "status" TEXT DEFAULT 'SENT',
    "id_item" TEXT,
    "title" TEXT,
    "type" TEXT,
    "category" TEXT,
    "topic" TEXT,
    "subTopic" TEXT,
    "authors" JSONB DEFAULT '[]'::jsonb,
    "publisher" TEXT,
    "year" TEXT,
    "fullDate" TEXT,
    "pubInfo" JSONB DEFAULT '{}'::jsonb,
    "identifiers" JSONB DEFAULT '{}'::jsonb,
    "source" TEXT,
    "format" TEXT,
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
    "supportingReferences" JSONB DEFAULT '{"references": [], "videoUrl": ""}'::jsonb,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_sharbox_inbox_search_all ON public.sharbox_inbox ("search_all");
CREATE INDEX IF NOT EXISTS idx_sharbox_sent_search_all ON public.sharbox_sent ("search_all");
ALTER TABLE public.sharbox_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharbox_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Sharbox Inbox" ON public.sharbox_inbox FOR ALL USING (true);
CREATE POLICY "Public Access Sharbox Sent" ON public.sharbox_sent FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_sharbox_inbox_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."message", '') || ' ' ||
        COALESCE(NEW."senderName", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_sharbox_sent_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."message", '') || ' ' ||
        COALESCE(NEW."receiverName", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inbox_search
    BEFORE INSERT OR UPDATE ON public.sharbox_inbox
    FOR EACH ROW EXECUTE FUNCTION public.update_sharbox_inbox_search_index();

CREATE TRIGGER trigger_update_sent_search
    BEFORE INSERT OR UPDATE ON public.sharbox_sent
    FOR EACH ROW EXECUTE FUNCTION public.update_sharbox_sent_search_index();

-- =============================================================================
-- 17. LITERATURE SEARCH REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.archived_articles (
    "id" TEXT PRIMARY KEY,
    "title" TEXT,
    "citationHarvard" TEXT,
    "doi" TEXT,
    "url" TEXT,
    "info" TEXT,
    "label" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_archived_articles_search_all ON public.archived_articles ("search_all");
ALTER TABLE public.archived_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Archived Articles" ON public.archived_articles FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_archived_article_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."label", '') || ' ' || 
        COALESCE(NEW."citationHarvard", '') || ' ' ||
        COALESCE(NEW."info", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_archived_article_search_index
    BEFORE INSERT OR UPDATE ON public.archived_articles
    FOR EACH ROW EXECUTE FUNCTION public.update_archived_article_search_index();

CREATE TABLE IF NOT EXISTS public.archived_books (
    "id" TEXT PRIMARY KEY,
    "title" TEXT,
    "citationHarvard" TEXT,
    "isbn" TEXT,
    "url" TEXT,
    "info" TEXT,
    "label" TEXT,
    "isFavorite" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "search_all" TEXT
);

CREATE INDEX IF NOT EXISTS idx_archived_books_search_all ON public.archived_books ("search_all");
ALTER TABLE public.archived_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Archived Books" ON public.archived_books FOR ALL USING (true);

CREATE OR REPLACE FUNCTION public.update_archived_book_search_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW."search_all" := LOWER(
        COALESCE(NEW."title", '') || ' ' || 
        COALESCE(NEW."label", '') || ' ' || 
        COALESCE(NEW."citationHarvard", '') || ' ' ||
        COALESCE(NEW."info", '') || ' ' ||
        COALESCE(NEW."isbn", '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_archived_book_search_index
    BEFORE INSERT OR UPDATE ON public.archived_books
    FOR EACH ROW EXECUTE FUNCTION public.update_archived_book_search_index();

