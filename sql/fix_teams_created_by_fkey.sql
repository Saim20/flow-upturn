-- ==============================================================================
-- FIX TEAMS CREATED_BY FOREIGN KEY CONSTRAINT
-- ==============================================================================
-- This fixes the issue where deleting divisions/employees fails due to
-- teams referencing the employee through created_by field
--
-- The fix: Change the foreign key to SET NULL on delete instead of restricting
-- ==============================================================================

-- Drop the existing constraint
ALTER TABLE teams 
DROP CONSTRAINT IF EXISTS teams_created_by_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE teams
ADD CONSTRAINT teams_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES employees(id) 
ON DELETE SET NULL;

-- Do the same for team_members.added_by if it exists
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS team_members_added_by_fkey;

ALTER TABLE team_members
ADD CONSTRAINT team_members_added_by_fkey 
FOREIGN KEY (added_by) 
REFERENCES employees(id) 
ON DELETE SET NULL;

-- Verify the changes
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('teams', 'team_members')
    AND kcu.column_name IN ('created_by', 'added_by')
ORDER BY tc.table_name, kcu.column_name;
