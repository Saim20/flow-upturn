-- ==============================================================================
-- FIX MISSING TABLES AND DATA (ROBUST VERSION)
-- Run this script to ensure all necessary tables and data exist
-- Handles schema mismatches (Integer vs UUID) dynamically
-- ==============================================================================

-- 0. Ensure companies table has initialization_template_id
ALTER TABLE companies ADD COLUMN IF NOT EXISTS initialization_template_id UUID REFERENCES company_templates(id);

-- 1. Create Departments Table (if not exists)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Grades Table (if not exists)
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  basic_salary DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist in grades (in case table existed with different schema)
ALTER TABLE grades ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(12,2) DEFAULT 0.00;

-- 3. Create/Update Positions Table with DYNAMIC Foreign Key Types
DO $$
DECLARE
  dept_id_type TEXT;
  grade_id_type TEXT;
BEGIN
  -- Check departments.id type
  SELECT data_type INTO dept_id_type 
  FROM information_schema.columns 
  WHERE table_name = 'departments' AND column_name = 'id';
  
  -- Check grades.id type
  SELECT data_type INTO grade_id_type 
  FROM information_schema.columns 
  WHERE table_name = 'grades' AND column_name = 'id';

  -- Default to uuid if not found (meaning we just created them above as UUID)
  IF dept_id_type IS NULL THEN dept_id_type := 'uuid'; END IF;
  IF grade_id_type IS NULL THEN grade_id_type := 'uuid'; END IF;

  RAISE NOTICE 'Detected types - Departments.id: %, Grades.id: %', dept_id_type, grade_id_type;

  -- Create positions table base if not exists
  CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Ensure basic columns exist
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS description TEXT;

  -- Add department_id FK with correct type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'department_id') THEN
    EXECUTE format('ALTER TABLE positions ADD COLUMN department_id %s REFERENCES departments(id) ON DELETE SET NULL', dept_id_type);
    RAISE NOTICE 'Added department_id column to positions with type %', dept_id_type;
  END IF;

  -- Add grade_id FK with correct type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'grade_id') THEN
    EXECUTE format('ALTER TABLE positions ADD COLUMN grade_id %s REFERENCES grades(id) ON DELETE SET NULL', grade_id_type);
    RAISE NOTICE 'Added grade_id column to positions with type %', grade_id_type;
  END IF;

END $$;

-- 4. Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- 5. Create Basic RLS Policies (Read for authenticated, Write for Admin/Manager)
-- Departments
DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;
CREATE POLICY "Authenticated users can view departments" ON departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/Managers can manage departments" ON departments;
CREATE POLICY "Admins/Managers can manage departments" ON departments FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND company_id = departments.company_id 
    AND role IN ('Admin', 'Manager')
  )
);

-- Grades
DROP POLICY IF EXISTS "Authenticated users can view grades" ON grades;
CREATE POLICY "Authenticated users can view grades" ON grades FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/Managers can manage grades" ON grades;
CREATE POLICY "Admins/Managers can manage grades" ON grades FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND company_id = grades.company_id 
    AND role IN ('Admin', 'Manager')
  )
);

-- Positions
DROP POLICY IF EXISTS "Authenticated users can view positions" ON positions;
CREATE POLICY "Authenticated users can view positions" ON positions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/Managers can manage positions" ON positions;
CREATE POLICY "Admins/Managers can manage positions" ON positions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND company_id = positions.company_id 
    AND role IN ('Admin', 'Manager')
  )
);

-- 6. Ensure Permissions Exist (Idempotent seed)
INSERT INTO permissions (module_name, display_name, description, category) VALUES
  ('departments', 'Departments', 'Department management', 'admin'),
  ('grades', 'Grades', 'Grade and level management', 'admin'),
  ('positions', 'Positions', 'Position and role management', 'admin')
ON CONFLICT (module_name) DO NOTHING;

-- 7. Ensure Default Template Exists
DO $$
DECLARE
  default_template_id UUID;
BEGIN
  SELECT id INTO default_template_id FROM company_templates WHERE is_default = true LIMIT 1;
  
  IF default_template_id IS NULL THEN
    INSERT INTO company_templates (name, description, is_default)
    VALUES ('Standard Company', 'Default configuration for new companies', true);
    RAISE NOTICE '✅ Created default company template';
  ELSE
    RAISE NOTICE '✅ Default company template already exists';
  END IF;
END $$;

-- 8. BACKFILL: Fix First Employees (Admins) who are missing permissions
DO $$
DECLARE
  comp_record RECORD;
  first_emp_id UUID;
  admin_team_id INTEGER;
BEGIN
  -- Loop through all companies
  FOR comp_record IN SELECT id, name FROM companies LOOP
    
    -- Find the first employee for this company (ordered by creation)
    SELECT id INTO first_emp_id 
    FROM employees 
    WHERE company_id = comp_record.id 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF first_emp_id IS NOT NULL THEN
      -- Ensure they are Admin
      UPDATE employees SET role = 'Admin' WHERE id = first_emp_id AND role != 'Admin';
      
      -- Find Administrators team
      SELECT id INTO admin_team_id FROM teams WHERE company_id = comp_record.id AND name = 'Administrators' LIMIT 1;
      
      -- If Admin team exists, add them
      IF admin_team_id IS NOT NULL THEN
        INSERT INTO team_members (team_id, employee_id, added_by)
        VALUES (admin_team_id, first_emp_id, first_emp_id)
        ON CONFLICT (team_id, employee_id) DO NOTHING;
        
        RAISE NOTICE '✅ Fixed: Added first employee of % to Administrators team', comp_record.name;
      ELSE
        -- If Admin team doesn't exist, create it!
        INSERT INTO teams (name, description, company_id, is_default)
        VALUES ('Administrators', 'Full system access', comp_record.id, true)
        RETURNING id INTO admin_team_id;
        
        -- Add permissions to the new team
        INSERT INTO team_permissions (team_id, permission_id, can_read, can_write, can_delete, can_approve, can_comment)
        SELECT admin_team_id, id, true, true, true, true, true FROM permissions
        ON CONFLICT DO NOTHING;
        
        -- Add employee
        INSERT INTO team_members (team_id, employee_id, added_by)
        VALUES (admin_team_id, first_emp_id, first_emp_id)
        ON CONFLICT (team_id, employee_id) DO NOTHING;
        
        RAISE NOTICE '✅ Fixed: Created Administrators team for % and added first employee', comp_record.name;
      END IF;
    END IF;
  END LOOP;
END $$;

RAISE NOTICE '✅ Fix script completed successfully.';
