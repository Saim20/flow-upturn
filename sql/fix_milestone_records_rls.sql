-- ==============================================================================
-- FIX MILESTONE RECORDS RLS POLICIES
-- ==============================================================================
-- This script creates complete RLS policies for the milestone_records table
-- using the team-based permission system.
--
-- The milestone_records table was missing INSERT, UPDATE, and DELETE policies,
-- which prevented users from creating projects with milestones even with proper permissions.
--
-- Prerequisites:
-- - has_permission(UUID, VARCHAR, VARCHAR) function must exist
-- - get_auth_company_id() function must exist
-- - Permission module 'milestones' must exist in permissions table
-- ==============================================================================

-- Enable RLS on milestone_records table
ALTER TABLE milestone_records ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- DROP EXISTING POLICIES (if any)
-- ==============================================================================

DROP POLICY IF EXISTS "Users can view milestone_records" ON milestone_records;
DROP POLICY IF EXISTS "Users can create milestone_records" ON milestone_records;
DROP POLICY IF EXISTS "Users can update milestone_records" ON milestone_records;
DROP POLICY IF EXISTS "Users can delete milestone_records" ON milestone_records;

-- ==============================================================================
-- CREATE COMPREHENSIVE RLS POLICIES
-- ==============================================================================

-- 1. SELECT Policy - Users can view milestones if they have read permission
CREATE POLICY "Users can view milestone_records" ON milestone_records
  FOR SELECT
  USING (
    company_id = get_auth_company_id()
    AND has_permission(auth.uid(), 'milestones', 'can_read')
  );

-- 2. INSERT Policy - Users can create milestones if they have write permission
CREATE POLICY "Users can create milestone_records" ON milestone_records
  FOR INSERT
  WITH CHECK (
    company_id = get_auth_company_id()
    AND has_permission(auth.uid(), 'milestones', 'can_write')
  );

-- 3. UPDATE Policy - Users can update milestones if they have write or approve permission
CREATE POLICY "Users can update milestone_records" ON milestone_records
  FOR UPDATE
  USING (
    company_id = get_auth_company_id()
    AND (
      has_permission(auth.uid(), 'milestones', 'can_write')
      OR has_permission(auth.uid(), 'milestones', 'can_approve')
    )
  );

-- 4. DELETE Policy - Users can delete milestones if they have delete permission
CREATE POLICY "Users can delete milestone_records" ON milestone_records
  FOR DELETE
  USING (
    company_id = get_auth_company_id()
    AND has_permission(auth.uid(), 'milestones', 'can_delete')
  );

-- ==============================================================================
-- VERIFICATION QUERIES (optional - comment these out for production)
-- ==============================================================================

-- Check if policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'milestone_records'
ORDER BY policyname;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'milestone_records';

-- ==============================================================================
-- NOTES
-- ==============================================================================
-- 
-- Permission Module: 'milestones'
-- Required Permissions:
--   - can_read: View milestones
--   - can_write: Create and edit milestones
--   - can_delete: Delete milestones
--   - can_approve: Approve milestone changes (combined with can_write for UPDATE)
--
-- These policies ensure that:
-- 1. Users can only access milestones from their own company
-- 2. All CRUD operations are properly protected by team permissions
-- 3. Update operations allow both writers and approvers (for workflow flexibility)
--
-- ==============================================================================
