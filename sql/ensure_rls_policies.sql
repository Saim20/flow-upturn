-- ==============================================================================
-- ENSURE RLS POLICIES (Recursion Fixed)
-- ==============================================================================
-- This script enforces Row Level Security (RLS) policies for:
-- 1. Core permission tables (teams, permissions, team_permissions, team_members)
-- 2. Content tables (task_records, project_records, etc.) based on permission modules
--
-- CRITICAL FIX: Uses 'get_auth_company_id()' to avoid infinite recursion in RLS policies.
-- ==============================================================================

-- ==============================================================================
-- PART 0: HELPER FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- Function to safely get the current user's company_id without triggering RLS
CREATE OR REPLACE FUNCTION get_auth_company_id()
RETURNS INTEGER AS $$
DECLARE
  cid INTEGER;
BEGIN
  SELECT company_id INTO cid
  FROM employees
  WHERE id = auth.uid();
  
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_company_id() TO authenticated;

-- ==============================================================================
-- PART 1: CORE PERMISSION TABLES
-- ==============================================================================

-- 1.1 Teams Table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view company teams" ON teams;
CREATE POLICY "Employees can view company teams" ON teams
  FOR SELECT
  USING (
    company_id = get_auth_company_id()
  );

DROP POLICY IF EXISTS "Admins can create teams" ON teams;
CREATE POLICY "Admins can create teams" ON teams
  FOR INSERT
  WITH CHECK (
    user_can_manage_teams(auth.uid())
    AND company_id = get_auth_company_id()
  );

DROP POLICY IF EXISTS "Admins can update teams" ON teams;
CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE
  USING (user_can_manage_teams(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete teams" ON teams;
CREATE POLICY "Admins can delete teams" ON teams
  FOR DELETE
  USING (user_can_delete_teams(auth.uid()));

-- 1.2 Team Members Table
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company employees can view team members" ON team_members;
CREATE POLICY "Company employees can view team members" ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE company_id = get_auth_company_id()
    )
  );

DROP POLICY IF EXISTS "Team managers can add members" ON team_members;
CREATE POLICY "Team managers can add members" ON team_members
  FOR INSERT
  WITH CHECK (
    user_can_manage_teams(auth.uid())
    AND team_id IN (
      SELECT id FROM teams WHERE company_id = get_auth_company_id()
    )
  );

DROP POLICY IF EXISTS "Team managers can remove members" ON team_members;
CREATE POLICY "Team managers can remove members" ON team_members
  FOR DELETE
  USING (
    user_can_manage_teams(auth.uid())
    AND team_id IN (
      SELECT id FROM teams WHERE company_id = get_auth_company_id()
    )
  );

-- 1.3 Permissions Table (Read-only for all authenticated users)
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view permissions" ON permissions;
CREATE POLICY "All authenticated users can view permissions" ON permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 1.4 Team Permissions Table
ALTER TABLE team_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company employees can view team permissions" ON team_permissions;
CREATE POLICY "Company employees can view team permissions" ON team_permissions
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE company_id = get_auth_company_id()
    )
  );

DROP POLICY IF EXISTS "Team managers can insert permissions" ON team_permissions;
CREATE POLICY "Team managers can insert permissions" ON team_permissions
  FOR INSERT
  WITH CHECK (
    user_can_manage_teams(auth.uid())
    AND team_id IN (
      SELECT id FROM teams WHERE company_id = get_auth_company_id()
    )
  );

DROP POLICY IF EXISTS "Team managers can update permissions" ON team_permissions;
CREATE POLICY "Team managers can update permissions" ON team_permissions
  FOR UPDATE
  USING (
    user_can_manage_teams(auth.uid())
    AND team_id IN (
      SELECT id FROM teams WHERE company_id = get_auth_company_id()
    )
  );

DROP POLICY IF EXISTS "Team managers can delete permissions" ON team_permissions;
CREATE POLICY "Team managers can delete permissions" ON team_permissions
  FOR DELETE
  USING (
    user_can_delete_teams(auth.uid())
    AND team_id IN (
      SELECT id FROM teams WHERE company_id = get_auth_company_id()
    )
  );

-- ==============================================================================
-- PART 2: CONTENT TABLES
-- ==============================================================================

-- 2.1 Tasks (task_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_records') THEN
    ALTER TABLE task_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view task_records" ON task_records;
    CREATE POLICY "Users can view task_records" ON task_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'tasks', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create task_records" ON task_records;
    CREATE POLICY "Users can create task_records" ON task_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'tasks', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update task_records" ON task_records;
    CREATE POLICY "Users can update task_records" ON task_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'tasks', 'can_write') OR has_permission(auth.uid(), 'tasks', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete task_records" ON task_records;
    CREATE POLICY "Users can delete task_records" ON task_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'tasks', 'can_delete')
    );
  END IF;
END $$;

-- 2.2 Projects (project_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_records') THEN
    ALTER TABLE project_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view project_records" ON project_records;
    CREATE POLICY "Users can view project_records" ON project_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'projects', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create project_records" ON project_records;
    CREATE POLICY "Users can create project_records" ON project_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'projects', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update project_records" ON project_records;
    CREATE POLICY "Users can update project_records" ON project_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'projects', 'can_write') OR has_permission(auth.uid(), 'projects', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete project_records" ON project_records;
    CREATE POLICY "Users can delete project_records" ON project_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'projects', 'can_delete')
    );
  END IF;
END $$;

-- 2.3 Milestones (milestone_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'milestone_records') THEN
    ALTER TABLE milestone_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view milestone_records" ON milestone_records;
    CREATE POLICY "Users can view milestone_records" ON milestone_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'milestones', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create milestone_records" ON milestone_records;
    CREATE POLICY "Users can create milestone_records" ON milestone_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'milestones', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update milestone_records" ON milestone_records;
    CREATE POLICY "Users can update milestone_records" ON milestone_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'milestones', 'can_write') OR has_permission(auth.uid(), 'milestones', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete milestone_records" ON milestone_records;
    CREATE POLICY "Users can delete milestone_records" ON milestone_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'milestones', 'can_delete')
    );
  END IF;
END $$;

-- 2.4 Attendance (attendance_requests)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_requests') THEN
    ALTER TABLE attendance_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view attendance_requests" ON attendance_requests;
    CREATE POLICY "Users can view attendance_requests" ON attendance_requests FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'attendance', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create attendance_requests" ON attendance_requests;
    CREATE POLICY "Users can create attendance_requests" ON attendance_requests FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'attendance', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update attendance_requests" ON attendance_requests;
    CREATE POLICY "Users can update attendance_requests" ON attendance_requests FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'attendance', 'can_write') OR has_permission(auth.uid(), 'attendance', 'can_approve'))
    );
    
    DROP POLICY IF EXISTS "Users can delete attendance_requests" ON attendance_requests;
    CREATE POLICY "Users can delete attendance_requests" ON attendance_requests FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'attendance', 'can_delete')
    );
  END IF;
END $$;

-- 2.5 Leave (leave_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_records') THEN
    ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view leave_records" ON leave_records;
    CREATE POLICY "Users can view leave_records" ON leave_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'leave', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create leave_records" ON leave_records;
    CREATE POLICY "Users can create leave_records" ON leave_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'leave', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update leave_records" ON leave_records;
    CREATE POLICY "Users can update leave_records" ON leave_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'leave', 'can_write') OR has_permission(auth.uid(), 'leave', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete leave_records" ON leave_records;
    CREATE POLICY "Users can delete leave_records" ON leave_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'leave', 'can_delete')
    );
  END IF;
END $$;

-- 2.6 Notice (notice_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notice_records') THEN
    ALTER TABLE notice_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view notice_records" ON notice_records;
    CREATE POLICY "Users can view notice_records" ON notice_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'notice', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create notice_records" ON notice_records;
    CREATE POLICY "Users can create notice_records" ON notice_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'notice', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update notice_records" ON notice_records;
    CREATE POLICY "Users can update notice_records" ON notice_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'notice', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can delete notice_records" ON notice_records;
    CREATE POLICY "Users can delete notice_records" ON notice_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'notice', 'can_delete')
    );
  END IF;
END $$;

-- 2.7 Requisition (requisition_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'requisition_records') THEN
    ALTER TABLE requisition_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view requisition_records" ON requisition_records;
    CREATE POLICY "Users can view requisition_records" ON requisition_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'requisition', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create requisition_records" ON requisition_records;
    CREATE POLICY "Users can create requisition_records" ON requisition_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'requisition', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update requisition_records" ON requisition_records;
    CREATE POLICY "Users can update requisition_records" ON requisition_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'requisition', 'can_write') OR has_permission(auth.uid(), 'requisition', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete requisition_records" ON requisition_records;
    CREATE POLICY "Users can delete requisition_records" ON requisition_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'requisition', 'can_delete')
    );
  END IF;
END $$;

-- 2.8 Settlement (settlement_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settlement_records') THEN
    ALTER TABLE settlement_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view settlement_records" ON settlement_records;
    CREATE POLICY "Users can view settlement_records" ON settlement_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'settlement', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create settlement_records" ON settlement_records;
    CREATE POLICY "Users can create settlement_records" ON settlement_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'settlement', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update settlement_records" ON settlement_records;
    CREATE POLICY "Users can update settlement_records" ON settlement_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'settlement', 'can_write') OR has_permission(auth.uid(), 'settlement', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete settlement_records" ON settlement_records;
    CREATE POLICY "Users can delete settlement_records" ON settlement_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'settlement', 'can_delete')
    );
  END IF;
END $$;

-- 2.9 Complaints (complaint_records)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'complaint_records') THEN
    ALTER TABLE complaint_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view complaint_records" ON complaint_records;
    CREATE POLICY "Users can view complaint_records" ON complaint_records FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'complaints', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create complaint_records" ON complaint_records;
    CREATE POLICY "Users can create complaint_records" ON complaint_records FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'complaints', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update complaint_records" ON complaint_records;
    CREATE POLICY "Users can update complaint_records" ON complaint_records FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'complaints', 'can_write') OR has_permission(auth.uid(), 'complaints', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete complaint_records" ON complaint_records;
    CREATE POLICY "Users can delete complaint_records" ON complaint_records FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'complaints', 'can_delete')
    );
  END IF;
END $$;

-- 2.10 Payroll (payrolls)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payrolls') THEN
    ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view payrolls" ON payrolls;
    CREATE POLICY "Users can view payrolls" ON payrolls FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'payroll', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create payrolls" ON payrolls;
    CREATE POLICY "Users can create payrolls" ON payrolls FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'payroll', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update payrolls" ON payrolls;
    CREATE POLICY "Users can update payrolls" ON payrolls FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'payroll', 'can_write') OR has_permission(auth.uid(), 'payroll', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete payrolls" ON payrolls;
    CREATE POLICY "Users can delete payrolls" ON payrolls FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'payroll', 'can_delete')
    );
  END IF;
END $$;

-- 2.11 HRIS/Onboarding/Offboarding (employees)
-- CRITICAL: Using get_auth_company_id() here is essential to prevent recursion
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees') THEN
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

    -- View: Users can view their own profile OR if they have HRIS/Onboarding/Offboarding read permissions
    DROP POLICY IF EXISTS "Users can view employees" ON employees;
    CREATE POLICY "Users can view employees" ON employees FOR SELECT USING (
      id = auth.uid()
      OR (
        company_id = get_auth_company_id()
        AND (
          has_permission(auth.uid(), 'hris', 'can_read')
          OR has_permission(auth.uid(), 'onboarding', 'can_read')
          OR has_permission(auth.uid(), 'offboarding', 'can_read')
        )
      )
    );

    -- Update: Users can update their own profile
    DROP POLICY IF EXISTS "Users can update employees" ON employees;
    CREATE POLICY "Users can update employees" ON employees FOR UPDATE USING (
      id = auth.uid()
      OR (
        company_id = get_auth_company_id()
        AND (
          has_permission(auth.uid(), 'hris', 'can_write')
          OR has_permission(auth.uid(), 'onboarding', 'can_write')
          OR has_permission(auth.uid(), 'offboarding', 'can_write')
        )
      )
    );
    
    -- Insert/Delete
    DROP POLICY IF EXISTS "Users can insert employees" ON employees;
    CREATE POLICY "Users can insert employees" ON employees FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND (
        has_permission(auth.uid(), 'hris', 'can_write')
        OR has_permission(auth.uid(), 'onboarding', 'can_write')
      )
    );
  END IF;
END $$;

-- 2.12 Departments
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'departments') THEN
    ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view departments" ON departments;
    CREATE POLICY "Users can view departments" ON departments FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'departments', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can manage departments" ON departments;
    CREATE POLICY "Users can manage departments" ON departments FOR ALL USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'departments', 'can_write')
    );
  END IF;
END $$;

-- 2.13 Divisions
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'divisions') THEN
    ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view divisions" ON divisions;
    CREATE POLICY "Users can view divisions" ON divisions FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'divisions', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can manage divisions" ON divisions;
    CREATE POLICY "Users can manage divisions" ON divisions FOR ALL USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'divisions', 'can_write')
    );
  END IF;
END $$;

-- 2.14 Grades
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grades') THEN
    ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view grades" ON grades;
    CREATE POLICY "Users can view grades" ON grades FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'grades', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can manage grades" ON grades;
    CREATE POLICY "Users can manage grades" ON grades FOR ALL USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'grades', 'can_write')
    );
  END IF;
END $$;

-- 2.15 Positions
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'positions') THEN
    ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view positions" ON positions;
    CREATE POLICY "Users can view positions" ON positions FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'positions', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can manage positions" ON positions;
    CREATE POLICY "Users can manage positions" ON positions FOR ALL USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'positions', 'can_write')
    );
  END IF;
END $$;

-- 2.16 Company Logs (company_logs)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_logs') THEN
    ALTER TABLE company_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view company_logs" ON company_logs;
    CREATE POLICY "Users can view company_logs" ON company_logs FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'company_logs', 'can_read')
    );
    
    DROP POLICY IF EXISTS "Users can insert company_logs" ON company_logs;
    CREATE POLICY "Users can insert company_logs" ON company_logs FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'company_logs', 'can_write')
    );
  END IF;
END $$;

-- 2.17 Stakeholders
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stakeholders') THEN
    ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view stakeholders" ON stakeholders;
    CREATE POLICY "Users can view stakeholders" ON stakeholders FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'stakeholders', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can create stakeholders" ON stakeholders;
    CREATE POLICY "Users can create stakeholders" ON stakeholders FOR INSERT WITH CHECK (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'stakeholders', 'can_write')
    );

    DROP POLICY IF EXISTS "Users can update stakeholders" ON stakeholders;
    CREATE POLICY "Users can update stakeholders" ON stakeholders FOR UPDATE USING (
      company_id = get_auth_company_id()
      AND (has_permission(auth.uid(), 'stakeholders', 'can_write') OR has_permission(auth.uid(), 'stakeholders', 'can_approve'))
    );

    DROP POLICY IF EXISTS "Users can delete stakeholders" ON stakeholders;
    CREATE POLICY "Users can delete stakeholders" ON stakeholders FOR DELETE USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'stakeholders', 'can_delete')
    );
  END IF;
END $$;

-- 2.18 Stakeholder Processes
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stakeholder_processes') THEN
    ALTER TABLE stakeholder_processes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view stakeholder_processes" ON stakeholder_processes;
    CREATE POLICY "Users can view stakeholder_processes" ON stakeholder_processes FOR SELECT USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'stakeholder_processes', 'can_read')
    );

    DROP POLICY IF EXISTS "Users can manage stakeholder_processes" ON stakeholder_processes;
    CREATE POLICY "Users can manage stakeholder_processes" ON stakeholder_processes FOR ALL USING (
      company_id = get_auth_company_id()
      AND has_permission(auth.uid(), 'stakeholder_processes', 'can_write')
    );
  END IF;
END $$;

SELECT '✅ RLS Policies Enforced Successfully (Recursion Fixed)' as status;
