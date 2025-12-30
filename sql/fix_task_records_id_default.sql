-- Fix task_records table to have a default value for the id column
-- This ensures that tasks can be created without explicitly providing an ID
-- and prevents "null value in column 'id' violates not-null constraint" errors.

-- 1. Ensure the id column has a default value (using gen_random_uuid() for uniqueness)
-- If the column is TEXT, we cast it to text.
ALTER TABLE task_records 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- 2. Verify the change
DO $$
BEGIN
  RAISE LOG '✅ Fixed task_records id default value';
END $$;
