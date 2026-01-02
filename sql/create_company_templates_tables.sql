-- ==============================================================================
-- COMPANY TEMPLATES MIGRATION
-- Creates tables for managing company initialization templates
-- ==============================================================================

-- 1. Create company_templates table
CREATE TABLE IF NOT EXISTS company_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create template_leave_types table
CREATE TABLE IF NOT EXISTS template_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  annual_quota INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create template_notice_types table
CREATE TABLE IF NOT EXISTS template_notice_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create template_requisition_types table
CREATE TABLE IF NOT EXISTS template_requisition_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create template_complaint_types table
CREATE TABLE IF NOT EXISTS template_complaint_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create template_stakeholder_types table
CREATE TABLE IF NOT EXISTS template_stakeholder_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create template_stakeholder_issue_categories table
CREATE TABLE IF NOT EXISTS template_stakeholder_issue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES company_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE company_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_notice_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_requisition_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_complaint_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_stakeholder_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_stakeholder_issue_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for Super Admin access (assuming there's a way to identify super admins, 
-- for now we'll allow authenticated users to read, but only specific roles to write if needed.
-- Adjusting to standard policy: Public read (or authenticated read), Admin write.
-- Since this is for system config, we'll start with open access for authenticated users to READ,
-- and restrict WRITE to service_role or specific admin checks later if needed.
-- For now, let's allow all authenticated users to READ so the signup flow works,
-- and only service_role/superadmin to WRITE.)

CREATE POLICY "Allow read access for authenticated users" ON company_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_notice_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_requisition_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_complaint_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_stakeholder_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON template_stakeholder_issue_categories FOR SELECT TO authenticated USING (true);

-- ==============================================================================
-- SEED DEFAULT DATA
-- ==============================================================================

DO $$
DECLARE
  default_template_id UUID;
BEGIN
  -- 1. Create Default Template
  INSERT INTO company_templates (name, description, is_default)
  VALUES ('Standard Company', 'Default configuration for new companies', true)
  RETURNING id INTO default_template_id;

  -- 2. Seed Leave Types
  INSERT INTO template_leave_types (template_id, name, annual_quota) VALUES
    (default_template_id, 'Annual Leave', 20),
    (default_template_id, 'Sick Leave', 10),
    (default_template_id, 'Personal Leave', 5),
    (default_template_id, 'Maternity Leave', 90),
    (default_template_id, 'Paternity Leave', 15);

  -- 3. Seed Notice Types
  INSERT INTO template_notice_types (template_id, name) VALUES
    (default_template_id, 'General'),
    (default_template_id, 'HR Announcement'),
    (default_template_id, 'Policy Update'),
    (default_template_id, 'Event'),
    (default_template_id, 'Urgent');

  -- 4. Seed Requisition Categories
  INSERT INTO template_requisition_types (template_id, name) VALUES
    (default_template_id, 'IT Equipment'),
    (default_template_id, 'Office Supplies'),
    (default_template_id, 'Furniture'),
    (default_template_id, 'Travel'),
    (default_template_id, 'Training');

  -- 5. Seed Complaint Types
  INSERT INTO template_complaint_types (template_id, name) VALUES
    (default_template_id, 'Workplace Issue'),
    (default_template_id, 'Harassment'),
    (default_template_id, 'Discrimination'),
    (default_template_id, 'Policy Violation'),
    (default_template_id, 'Other');

  -- 6. Seed Stakeholder Types
  INSERT INTO template_stakeholder_types (template_id, name, description) VALUES
    (default_template_id, 'Customer', 'External customers and clients'),
    (default_template_id, 'Vendor', 'Suppliers and service providers'),
    (default_template_id, 'Partner', 'Business partners and affiliates');

  -- 7. Seed Stakeholder Issue Categories
  INSERT INTO template_stakeholder_issue_categories (template_id, name, description, color) VALUES
    (default_template_id, 'General Inquiry', 'General questions and information requests', '#3B82F6'),
    (default_template_id, 'Technical Issue', 'Technical problems and bugs', '#EF4444'),
    (default_template_id, 'Billing Issue', 'Payment and billing related issues', '#F59E0B');

  RAISE NOTICE '✅ Default company template created with ID: %', default_template_id;
END $$;
