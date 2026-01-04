-- ==============================================================================
-- EXPAND COMPANY TEMPLATES
-- Creates additional template tables for Departments, Grades, Designations
-- and Sample User Data (Leaves, Requisitions, etc.)
-- ==============================================================================

-- ==============================================================================
-- PART 1: NEW COMPANY CONFIGURATION TEMPLATES
-- ==============================================================================

-- 1. Template Departments
CREATE TABLE IF NOT EXISTS template_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Template Grades
CREATE TABLE IF NOT EXISTS template_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Grade 1', 'Grade 2'
  description TEXT,
  basic_salary DECIMAL(12,2) DEFAULT 0.00, -- Optional default salary
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Template Designations (Positions)
CREATE TABLE IF NOT EXISTS template_designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade_name TEXT, -- Optional link to a grade name (resolved at runtime)
  department_name TEXT, -- Optional link to a department name (resolved at runtime)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PART 2: SAMPLE USER DATA TEMPLATES
-- ==============================================================================

-- 4. Template Sample Leaves
CREATE TABLE IF NOT EXISTS template_sample_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  leave_type_name TEXT NOT NULL, -- Must match a name in template_leave_types
  reason TEXT NOT NULL,
  duration_days INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pending', -- Approved, Pending, Rejected
  is_past BOOLEAN DEFAULT false, -- If true, creates a past record
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Template Sample Requisitions
CREATE TABLE IF NOT EXISTS template_sample_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL, -- Must match template_requisition_types
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Template Sample Settlements
CREATE TABLE IF NOT EXISTS template_sample_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Template Sample Complaints
CREATE TABLE IF NOT EXISTS template_sample_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL, -- Must match template_complaint_types
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Template Sample Tickets (Replacing hardcoded logic)
CREATE TABLE IF NOT EXISTS template_sample_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Pending',
  category_name TEXT, -- Must match template_stakeholder_issue_categories
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PART 3: ENABLE RLS
-- ==============================================================================

ALTER TABLE template_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sample_tickets ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON template_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_leaves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_requisitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_sample_tickets FOR SELECT TO authenticated USING (true);

-- ==============================================================================
-- PART 4: SEED DATA
-- ==============================================================================

DO $$
DECLARE
  default_template_id UUID;
BEGIN
  -- Get Default Template ID
  SELECT id INTO default_template_id FROM company_templates WHERE is_default = true LIMIT 1;

  IF default_template_id IS NOT NULL THEN
    
    -- 1. Seed Departments
    INSERT INTO template_departments (template_id, name, description) VALUES
      (default_template_id, 'Engineering', 'Software development and IT operations'),
      (default_template_id, 'Human Resources', 'Employee management and recruitment'),
      (default_template_id, 'Sales & Marketing', 'Sales, marketing, and customer relations'),
      (default_template_id, 'Finance', 'Accounting and financial planning');

    -- 2. Seed Grades
    INSERT INTO template_grades (template_id, name, description, basic_salary) VALUES
      (default_template_id, 'Grade 1', 'Entry Level', 30000.00),
      (default_template_id, 'Grade 2', 'Mid Level', 50000.00),
      (default_template_id, 'Grade 3', 'Senior Level', 80000.00),
      (default_template_id, 'Executive', 'Leadership Level', 120000.00);

    -- 3. Seed Designations
    INSERT INTO template_designations (template_id, title, department_name, grade_name) VALUES
      (default_template_id, 'Software Engineer', 'Engineering', 'Grade 2'),
      (default_template_id, 'HR Manager', 'Human Resources', 'Grade 3'),
      (default_template_id, 'Sales Representative', 'Sales & Marketing', 'Grade 1'),
      (default_template_id, 'Accountant', 'Finance', 'Grade 2');

    -- 4. Seed Sample Leaves
    INSERT INTO template_sample_leaves (template_id, leave_type_name, reason, duration_days, status, is_past) VALUES
      (default_template_id, 'Annual Leave', 'Family Vacation', 3, 'Approved', true),
      (default_template_id, 'Sick Leave', 'Flu', 1, 'Pending', false);

    -- 5. Seed Sample Requisitions
    INSERT INTO template_sample_requisitions (template_id, category_name, title, description, urgency) VALUES
      (default_template_id, 'IT Equipment', 'New Monitor', 'Requesting a second monitor for productivity', 'Normal'),
      (default_template_id, 'Office Supplies', 'Notebooks and Pens', 'Stationery for the team', 'Low');

    -- 6. Seed Sample Settlements
    INSERT INTO template_sample_settlements (template_id, title, description, amount, expense_date) VALUES
      (default_template_id, 'Client Lunch', 'Lunch meeting with potential client', 1500.00, CURRENT_DATE - INTERVAL '2 days'),
      (default_template_id, 'Taxi Fare', 'Travel to client office', 450.00, CURRENT_DATE - INTERVAL '1 day');

    -- 7. Seed Sample Complaints
    INSERT INTO template_sample_complaints (template_id, type_name, subject, description, severity) VALUES
      (default_template_id, 'Workplace Issue', 'Noise Level', 'The construction noise next door is very distracting.', 'Low');

    -- 8. Seed Sample Tickets
    INSERT INTO template_sample_tickets (template_id, title, description, priority, category_name) VALUES
      (default_template_id, 'Sample Support Ticket', 'This is a sample ticket to demonstrate issue tracking.', 'Medium', 'General Inquiry');

    RAISE NOTICE '✅ Expanded template data seeded for template: %', default_template_id;
  ELSE
    RAISE WARNING '⚠️ No default template found. Skipping expanded seeding.';
  END IF;
END $$;
