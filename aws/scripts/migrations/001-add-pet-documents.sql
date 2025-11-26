-- Migration: Add documents JSONB column to Pet table
-- This allows storing document metadata (name, key, url, uploadedAt, uploadedBy) for each pet
-- Documents are uploaded to S3 and referenced here

-- Add documents column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Pet' 
        AND column_name = 'documents'
    ) THEN
        ALTER TABLE "Pet" ADD COLUMN "documents" JSONB DEFAULT '[]';
        RAISE NOTICE 'Added documents column to Pet table';
    ELSE
        RAISE NOTICE 'documents column already exists on Pet table';
    END IF;
END $$;

-- Add index for document queries (e.g., finding pets with specific document types)
CREATE INDEX IF NOT EXISTS idx_pet_documents ON "Pet" USING GIN ("documents");

COMMENT ON COLUMN "Pet"."documents" IS 'Array of document objects: [{name, key, url, type, uploadedAt, uploadedBy}]';

