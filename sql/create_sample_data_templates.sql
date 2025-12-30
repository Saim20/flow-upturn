-- ==============================================================================
-- PHASE 2: SAMPLE DATA TEMPLATES MIGRATION
-- Creates tables for managing sample data in company templates
-- ==============================================================================

-- 1. Add initialization_template_id to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS initialization_template_id UUID REFERENCES company_templates(id);

-- 2. Create template_sample_projects table
CREATE TABLE IF NOT EXISTS template_sample_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create template_sample_tasks table
CREATE TABLE IF NOT EXISTS template_sample_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES template_sample_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  due_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create template_sample_notices table
CREATE TABLE IF NOT EXISTS template_sample_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT DEFAULT 'normal',
  valid_days INTEGER DEFAULT 30,
  type_name TEXT NOT NULL, -- Must match a name in template_notice_types
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create template_sample_processes table
CREATE TABLE IF NOT EXISTS template_sample_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create template_sample_process_steps table
CREATE TABLE IF NOT EXISTS template_sample_process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES template_sample_processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  assigned_team_role TEXT DEFAULT 'Admin', -- 'Admin', 'Manager', 'Employee'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE template_sample_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_process_steps ENABLE ROW LEVEL SECURITY;

-- Policies (Read for all authenticated, Write for Service Role/Admin)
CREATE POLICY "Allow read access for authenticated users" ON template_sample_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_process_steps FOR SELECT TO authenticated USING (true);

-- ==============================================================================
-- SEED DEFAULT SAMPLE DATA
-- ==============================================================================

DO $$
DECLARE
  default_template_id UUID;
  sample_project_id UUID;
  sample_process_id UUID;
BEGIN
  -- Get Default Template ID
  SELECT id INTO default_template_id FROM company_templates WHERE is_default = true LIMIT 1;

  IF default_template_id IS NOT NULL THEN
    -- 1. Seed Sample Project
    INSERT INTO template_sample_projects (template_id, title, description, duration_days)
    VALUES (
      default_template_id,
      'Sample Project - Getting Started',
      'This is a sample project to help you get familiar with the project management features.',
      30
    )
    RETURNING id INTO sample_project_id;

    -- 2. Seed Sample Task
    INSERT INTO template_sample_tasks (project_id, title, description, priority, due_days)
    VALUES (
      sample_project_id,
      'Welcome Task - Explore the System',
      'Welcome to Flow! This sample task helps you understand how task management works.',
      'normal',
      7
    );

    -- 3. Seed Sample Notice
    INSERT INTO template_sample_notices (template_id, title, description, urgency, valid_days, type_name)
    VALUES (
      default_template_id,
      'Welcome to Flow HRIS',
      'Welcome to your new company workspace! This is a sample notice.',
      'normal',
      30,
      'General' -- Assumes 'General' exists in template_notice_types
    );

    -- 4. Seed Sample Process
    INSERT INTO template_sample_processes (template_id, name, description)
    VALUES (
      default_template_id,
      'Sample Customer Onboarding',
      'A sample process to demonstrate the stakeholder management workflow.'
    )
    RETURNING id INTO sample_process_id;

    -- 5. Seed Sample Process Step
    INSERT INTO template_sample_process_steps (process_id, name, description, step_order, assigned_team_role)
    VALUES (
      sample_process_id,
      'Initial Contact',
      'First point of contact with the customer',
      1,
      'Admin'
    );

    RAISE NOTICE '✅ Default sample data seeded for template: %', default_template_id;
  ELSE
    RAISE WARNING '⚠️ No default template found. Skipping sample data seeding.';
  END IF;
END $$;
