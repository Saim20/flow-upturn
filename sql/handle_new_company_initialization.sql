-- ==============================================================================
-- NEW COMPANY INITIALIZATION - TWO PHASE TRIGGER SYSTEM
-- ==============================================================================
-- Phase 1: On company INSERT - Creates default types, teams, departments, grades, designations
-- Phase 2: On first employee INSERT - Adds them to Admin, creates sample data (projects, notices, leaves, etc.)
--
-- This approach:
-- 1. Creates configuration types when company is created
-- 2. Creates default teams (Admin, Manager, Employee) with permissions
-- 3. WAITS for first real employee to join
-- 4. First employee becomes Admin with full permissions
-- 5. Sample data is created using that first employee as owner
-- 6. Subsequent employees are auto-added to Employees team
--
-- Author: Flow HRIS Team
-- Date: 2025-12-27
-- Version: 5.1 (Fixed ambiguous column references)
-- ==============================================================================

-- ==============================================================================
-- PHASE 1: COMPANY INITIALIZATION TRIGGER
-- Creates default types and teams when a company is inserted
-- ==============================================================================

CREATE OR REPLACE FUNCTION handle_new_company_initialization()
RETURNS TRIGGER AS $$
DECLARE
  admin_team_id INTEGER;
  manager_team_id INTEGER;
  employee_team_id INTEGER;
  perm_record RECORD;
  selected_template_id UUID;
BEGIN
  RAISE LOG '🚀 Initializing new company: % (ID: %)', NEW.name, NEW.id;

  -- ==========================================================================
  -- STEP 0: SELECT TEMPLATE
  -- ==========================================================================
  -- Select the default template.
  SELECT id INTO selected_template_id FROM company_templates WHERE is_default = true LIMIT 1;

  IF selected_template_id IS NULL THEN
    RAISE WARNING '⚠️ No default company template found! Please check company_templates table.';
  ELSE
     RAISE LOG 'Using company template ID: %', selected_template_id;
     -- Store the selected template ID in the company record for Phase 2
     UPDATE companies SET initialization_template_id = selected_template_id WHERE id = NEW.id;
  END IF;

  -- ==========================================================================
  -- STEP 1: CREATE LEAVE TYPES
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO leave_types (name, annual_quota, company_id)
      SELECT name, annual_quota, NEW.id
      FROM template_leave_types
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created leave types from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ leave_types table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating leave types: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 2: CREATE NOTICE TYPES
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO notice_types (name, company_id)
      SELECT name, NEW.id
      FROM template_notice_types
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created notice types from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ notice_types table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating notice types: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 3: CREATE REQUISITION CATEGORIES
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO requisition_types (name, company_id)
      SELECT name, NEW.id
      FROM template_requisition_types
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created requisition categories from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ requisition_types table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating requisition categories: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 4: CREATE COMPLAINT TYPES
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO complaint_types (name, company_id)
      SELECT name, NEW.id
      FROM template_complaint_types
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created complaint types from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ complaint_types table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating complaint types: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 5: CREATE STAKEHOLDER TYPES
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO stakeholder_types (name, description, company_id, is_active)
      SELECT name, description, NEW.id, true
      FROM template_stakeholder_types
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created stakeholder types from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ stakeholder_types table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating stakeholder types: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 6: CREATE STAKEHOLDER ISSUE CATEGORIES
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO stakeholder_issue_categories (name, description, color, company_id, is_active)
      SELECT name, description, color, NEW.id, true
      FROM template_stakeholder_issue_categories
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created stakeholder issue categories from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ stakeholder_issue_categories table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating stakeholder issue categories: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 7: CREATE DEPARTMENTS (NEW)
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO departments (name, description, company_id)
      SELECT name, description, NEW.id
      FROM template_departments
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created departments from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ departments table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating departments: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 8: CREATE GRADES (NEW)
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      INSERT INTO grades (name, description, basic_salary, company_id)
      SELECT name, description, basic_salary, NEW.id
      FROM template_grades
      WHERE template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created grades from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ grades table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating grades: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 9: CREATE DESIGNATIONS/POSITIONS (NEW)
  -- ==========================================================================
  BEGIN
    IF selected_template_id IS NOT NULL THEN
      -- We need to link designations to departments and grades if possible
      -- This is a bit complex in SQL without IDs, so we'll try to match by name
      -- or just insert with NULLs if not found.
      INSERT INTO positions (title, description, company_id, department_id, grade_id)
      SELECT 
        td.title, 
        td.description, 
        NEW.id,
        (SELECT id FROM departments WHERE company_id = NEW.id AND name = td.department_name LIMIT 1),
        (SELECT id FROM grades WHERE company_id = NEW.id AND name = td.grade_name LIMIT 1)
      FROM template_designations td
      WHERE td.template_id = selected_template_id
      ON CONFLICT DO NOTHING;
      RAISE LOG '✅ Created designations/positions from template';
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ positions table does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating positions: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 10: CREATE DEFAULT TEAMS
  -- ==========================================================================
  BEGIN
    -- Create Administrators team
    INSERT INTO teams (name, description, company_id, is_default)
    VALUES (
      'Administrators',
      'Full system access and management capabilities',
      NEW.id,
      true
    )
    ON CONFLICT (name, company_id) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO admin_team_id;

    -- Create Managers team
    INSERT INTO teams (name, description, company_id, is_default)
    VALUES (
      'Managers',
      'Management and approval permissions for team leads',
      NEW.id,
      true
    )
    ON CONFLICT (name, company_id) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO manager_team_id;

    -- Create Employees team
    INSERT INTO teams (name, description, company_id, is_default)
    VALUES (
      'Employees',
      'Basic access permissions for all employees',
      NEW.id,
      true
    )
    ON CONFLICT (name, company_id) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO employee_team_id;

    RAISE LOG '✅ Created default teams (Admin: %, Manager: %, Employee: %)', admin_team_id, manager_team_id, employee_team_id;
  EXCEPTION WHEN undefined_table THEN
    RAISE LOG '⚠️ teams table does not exist, skipping...';
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating teams: %', SQLERRM;
    RETURN NEW;
  END;

  -- ==========================================================================
  -- STEP 11: GRANT PERMISSIONS TO TEAMS
  -- ==========================================================================
  BEGIN
    -- Grant FULL permissions to Administrators team
    FOR perm_record IN SELECT id FROM permissions LOOP
      INSERT INTO team_permissions (team_id, permission_id, can_read, can_write, can_delete, can_approve, can_comment)
      VALUES (admin_team_id, perm_record.id, true, true, true, true, true)
      ON CONFLICT (team_id, permission_id) 
      DO UPDATE SET can_read = true, can_write = true, can_delete = true, can_approve = true, can_comment = true;
    END LOOP;

    -- Grant appropriate permissions to Managers team
    FOR perm_record IN SELECT id, module_name FROM permissions LOOP
      INSERT INTO team_permissions (team_id, permission_id, can_read, can_write, can_delete, can_approve, can_comment)
      VALUES (
        manager_team_id, 
        perm_record.id, 
        true,
        perm_record.module_name NOT IN ('admin_config', 'teams', 'company_logs'),
        false,
        perm_record.module_name IN ('leave', 'requisition', 'settlement', 'complaints', 'attendance'),
        true
      )
      ON CONFLICT (team_id, permission_id) DO NOTHING;
    END LOOP;

    -- Grant basic permissions to Employees team
    FOR perm_record IN SELECT id, module_name FROM permissions LOOP
      INSERT INTO team_permissions (team_id, permission_id, can_read, can_write, can_delete, can_approve, can_comment)
      VALUES (
        employee_team_id, 
        perm_record.id, 
        perm_record.module_name NOT IN ('admin_config', 'teams', 'company_logs', 'payroll'),
        perm_record.module_name IN ('tasks', 'attendance', 'leave', 'requisition', 'settlement', 'complaints'),
        false,
        false,
        true
      )
      ON CONFLICT (team_id, permission_id) DO NOTHING;
    END LOOP;

    RAISE LOG '✅ Assigned permissions to all teams';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error assigning permissions: %', SQLERRM;
  END;

  RAISE LOG '🎉 Company initialization Phase 1 complete. Waiting for first employee...';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PHASE 2: FIRST EMPLOYEE INITIALIZATION TRIGGER
-- Creates sample data when the FIRST employee joins a company
-- ==============================================================================

CREATE OR REPLACE FUNCTION handle_first_employee_initialization()
RETURNS TRIGGER AS $$
DECLARE
  employee_count INTEGER;
  admin_team_id INTEGER;
  manager_team_id INTEGER;
  employee_team_id INTEGER;
  v_template_id UUID; -- Renamed from template_id to avoid ambiguity
  
  -- Variables for loops
  proj_record RECORD;
  task_record RECORD;
  notice_record RECORD;
  process_record RECORD;
  step_record RECORD;
  leave_record RECORD;
  req_record RECORD;
  settle_record RECORD;
  complaint_record RECORD;
  ticket_record RECORD;
  
  -- IDs for created records
  new_project_id TEXT;
  new_process_id INTEGER;
  new_step_id INTEGER;
  sample_stakeholder_id INTEGER;
  
  -- Helper IDs
  target_notice_type_id INTEGER;
  target_team_id INTEGER;
  target_leave_type_id INTEGER;
  target_req_type_id INTEGER;
  target_complaint_type_id INTEGER;
  target_issue_cat_id INTEGER;
  target_stakeholder_type_id INTEGER;
BEGIN
  -- Check if this is the FIRST employee in the company
  SELECT COUNT(*) INTO employee_count
  FROM employees
  WHERE company_id = NEW.company_id
    AND id != NEW.id;

  -- If not the first employee, exit
  IF employee_count > 0 THEN
    RAISE LOG 'Employee % is not the first in company %. Skipping first-employee initialization.', 
      NEW.id, NEW.company_id;
    RETURN NEW;
  END IF;

  RAISE LOG '🎉 First employee detected for company %! Starting sample data creation...', NEW.company_id;

  -- Get the template ID used for initialization
  SELECT initialization_template_id INTO v_template_id FROM companies WHERE id = NEW.company_id;
  
  IF v_template_id IS NULL THEN
    RAISE WARNING '⚠️ No initialization template found for company %. Using default if available.', NEW.company_id;
    SELECT id INTO v_template_id FROM company_templates WHERE is_default = true LIMIT 1;
  END IF;

  -- ==========================================================================
  -- STEP 1: ADD FIRST EMPLOYEE TO ADMINISTRATORS TEAM
  -- ==========================================================================
  BEGIN
    -- Get Team IDs
    SELECT id INTO admin_team_id FROM teams WHERE company_id = NEW.company_id AND name = 'Administrators' LIMIT 1;
    SELECT id INTO manager_team_id FROM teams WHERE company_id = NEW.company_id AND name = 'Managers' LIMIT 1;
    SELECT id INTO employee_team_id FROM teams WHERE company_id = NEW.company_id AND name = 'Employees' LIMIT 1;

    IF admin_team_id IS NOT NULL THEN
      -- Override role to Admin
      UPDATE employees SET role = 'Admin' WHERE id = NEW.id;
      
      -- Add to Administrators team
      INSERT INTO team_members (team_id, employee_id, added_by)
      VALUES (admin_team_id, NEW.id, NEW.id)
      ON CONFLICT (team_id, employee_id) DO NOTHING;

      RAISE LOG '✅ First employee % added to Administrators team', NEW.id;
    ELSE
      RAISE WARNING '⚠️ No Administrators team found for company %', NEW.company_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error adding first employee to Admin team: %', SQLERRM;
  END;

  -- IF NO TEMPLATE, STOP HERE
  IF v_template_id IS NULL THEN
    RAISE WARNING '⚠️ No template available. Skipping sample data creation.';
    RETURN NEW;
  END IF;

  -- ==========================================================================
  -- STEP 2: CREATE SAMPLE PROJECTS & TASKS
  -- ==========================================================================
  BEGIN
    FOR proj_record IN SELECT * FROM template_sample_projects WHERE template_id = v_template_id LOOP
      -- Create Project
      INSERT INTO project_records (
        id,
        project_title,
        description,
        start_date,
        end_date,
        status,
        progress,
        project_lead_id,
        company_id,
        created_by
      ) VALUES (
        'sample-' || lower(replace(gen_random_uuid()::text, '-', '')) || '-' || NEW.company_id,
        proj_record.title,
        proj_record.description,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 day' * proj_record.duration_days,
        'Ongoing',
        0,
        NEW.id,
        NEW.company_id,
        NEW.id
      )
      RETURNING id INTO new_project_id;

      -- Create Tasks for this Project
      FOR task_record IN SELECT * FROM template_sample_tasks WHERE project_id = proj_record.id LOOP
        INSERT INTO task_records (
          id,
          task_title,
          task_description,
          start_date,
          end_date,
          priority,
          status,
          company_id,
          assignees,
          created_by,
          project_id
        ) VALUES (
          'sample-task-' || lower(replace(gen_random_uuid()::text, '-', '')),
          task_record.title,
          task_record.description,
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '1 day' * task_record.due_days,
          task_record.priority,
          false,
          NEW.company_id,
          ARRAY[NEW.id],
          NEW.id,
          new_project_id
        );
      END LOOP;
    END LOOP;
    RAISE LOG '✅ Created sample projects and tasks from template';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample projects: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 3: CREATE SAMPLE NOTICES
  -- ==========================================================================
  BEGIN
    FOR notice_record IN SELECT * FROM template_sample_notices WHERE template_id = v_template_id LOOP
      -- Find matching notice type ID
      SELECT id INTO target_notice_type_id 
      FROM notice_types 
      WHERE company_id = NEW.company_id AND name = notice_record.type_name 
      LIMIT 1;

      IF target_notice_type_id IS NOT NULL THEN
        INSERT INTO notice_records (
          title,
          description,
          urgency,
          valid_from,
          valid_till,
          notice_type_id,
          company_id,
          created_by
        ) VALUES (
          notice_record.title,
          notice_record.description,
          notice_record.urgency,
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '1 day' * notice_record.valid_days,
          target_notice_type_id,
          NEW.company_id,
          NEW.id
        );
      END IF;
    END LOOP;
    RAISE LOG '✅ Created sample notices from template';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample notices: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 4: CREATE SAMPLE PROCESSES & STEPS
  -- ==========================================================================
  BEGIN
    FOR process_record IN SELECT * FROM template_sample_processes WHERE template_id = v_template_id LOOP
      -- Create Process
      INSERT INTO stakeholder_processes (
        name,
        description,
        company_id,
        is_active,
        is_sequential,
        allow_rollback,
        created_by
      ) VALUES (
        process_record.name,
        process_record.description,
        NEW.company_id,
        true,
        true,
        false,
        NEW.id
      )
      RETURNING id INTO new_process_id;

      -- Create Steps
      FOR step_record IN SELECT * FROM template_sample_process_steps WHERE process_id = process_record.id ORDER BY step_order ASC LOOP
        -- Determine assigned team
        target_team_id := CASE 
          WHEN step_record.assigned_team_role = 'Admin' THEN admin_team_id
          WHEN step_record.assigned_team_role = 'Manager' THEN manager_team_id
          ELSE employee_team_id
        END;

        IF target_team_id IS NOT NULL THEN
          INSERT INTO stakeholder_process_steps (
            process_id,
            name,
            description,
            step_order,
            team_ids,
            field_definitions,
            use_date_range,
            can_reject,
            created_by
          ) VALUES (
            new_process_id,
            step_record.name,
            step_record.description,
            step_record.step_order,
            to_jsonb(ARRAY[target_team_id]),
            '{"fields": [{"key": "notes", "label": "Notes", "type": "text", "required": false}]}'::jsonb,
            false,
            true,
            NEW.id
          )
          RETURNING id INTO new_step_id;
        END IF;
      END LOOP;
    END LOOP;
    RAISE LOG '✅ Created sample processes from template';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample processes: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 5: CREATE SAMPLE LEAVES (NEW)
  -- ==========================================================================
  BEGIN
    FOR leave_record IN SELECT * FROM template_sample_leaves WHERE template_id = v_template_id LOOP
      -- Find matching leave type
      SELECT id INTO target_leave_type_id FROM leave_types WHERE company_id = NEW.company_id AND name = leave_record.leave_type_name LIMIT 1;
      
      IF target_leave_type_id IS NOT NULL THEN
        INSERT INTO leave_records (
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          reason,
          status,
          company_id,
          created_at
        ) VALUES (
          NEW.id,
          target_leave_type_id,
          CASE WHEN leave_record.is_past THEN CURRENT_DATE - INTERVAL '10 days' ELSE CURRENT_DATE + INTERVAL '5 days' END,
          CASE WHEN leave_record.is_past THEN CURRENT_DATE - INTERVAL '10 days' + (leave_record.duration_days - 1) * INTERVAL '1 day' ELSE CURRENT_DATE + INTERVAL '5 days' + (leave_record.duration_days - 1) * INTERVAL '1 day' END,
          leave_record.reason,
          leave_record.status,
          NEW.company_id,
          NOW()
        );
      END IF;
    END LOOP;
    RAISE LOG '✅ Created sample leaves from template';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample leaves: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 6: CREATE SAMPLE REQUISITIONS (NEW)
  -- ==========================================================================
  BEGIN
    FOR req_record IN SELECT * FROM template_sample_requisitions WHERE template_id = v_template_id LOOP
      -- Find matching requisition type
      SELECT id INTO target_req_type_id FROM requisition_types WHERE company_id = NEW.company_id AND name = req_record.category_name LIMIT 1;
      
      IF target_req_type_id IS NOT NULL THEN
        INSERT INTO requisition_records (
          employee_id,
          requisition_type_id,
          title,
          description,
          urgency,
          status,
          company_id,
          created_at
        ) VALUES (
          NEW.id,
          target_req_type_id,
          req_record.title,
          req_record.description,
          req_record.urgency,
          req_record.status,
          NEW.company_id,
          NOW()
        );
      END IF;
    END LOOP;
    RAISE LOG '✅ Created sample requisitions from template';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample requisitions: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 7: CREATE SAMPLE SETTLEMENTS (NEW)
  -- ==========================================================================
  BEGIN
    FOR settle_record IN SELECT * FROM template_sample_settlements WHERE template_id = v_template_id LOOP
      INSERT INTO settlement_records (
        employee_id,
        title,
        description,
        amount,
        expense_date,
        status,
        company_id,
        created_at
      ) VALUES (
        NEW.id,
        settle_record.title,
        settle_record.description,
        settle_record.amount,
        settle_record.expense_date,
        settle_record.status,
        NEW.company_id,
        NOW()
      );
    END LOOP;
    RAISE LOG '✅ Created sample settlements from template';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample settlements: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 8: CREATE SAMPLE COMPLAINTS (NEW)
  -- ==========================================================================
  BEGIN
    FOR complaint_record IN SELECT * FROM template_sample_complaints WHERE template_id = v_template_id LOOP
      -- Find matching complaint type
      SELECT id INTO target_complaint_type_id FROM complaint_types WHERE company_id = NEW.company_id AND name = complaint_record.type_name LIMIT 1;
      
      IF target_complaint_type_id IS NOT NULL THEN
        INSERT INTO complaint_records (
          employee_id,
          complaint_type_id,
          subject,
          description,
          severity,
          status,
          company_id,
          created_at
        ) VALUES (
          NEW.id,
          target_complaint_type_id,
          complaint_record.subject,
          complaint_record.description,
          complaint_record.severity,
          complaint_record.status,
          NEW.company_id,
          NOW()
        );
      END IF;
    END LOOP;
    RAISE LOG '✅ Created sample complaints from template';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample complaints: %', SQLERRM;
  END;

  -- ==========================================================================
  -- STEP 9: CREATE SAMPLE STAKEHOLDER & TICKETS (UPDATED)
  -- ==========================================================================
  BEGIN
    -- Only proceed if we have a process created earlier (from Step 4)
    IF new_process_id IS NOT NULL AND new_step_id IS NOT NULL THEN
      -- Get a stakeholder type
      SELECT id INTO target_stakeholder_type_id FROM stakeholder_types WHERE company_id = NEW.company_id LIMIT 1;
      
      -- Create Sample Stakeholder
      INSERT INTO stakeholders (
        name,
        address,
        contact_persons,
        process_id,
        current_step_id,
        current_step_order,
        stakeholder_type_id,
        is_active,
        is_completed,
        status,
        company_id,
        created_by
      ) VALUES (
        'Sample Customer Inc.',
        '123 Demo Street, Sample City',
        '[{"name": "John Doe", "phone": "+1234567890", "email": "john@samplecustomer.com"}]'::jsonb,
        new_process_id,
        new_step_id,
        1,
        target_stakeholder_type_id,
        true,
        false,
        'Lead',
        NEW.company_id,
        NEW.id
      )
      RETURNING id INTO sample_stakeholder_id;
      
      -- Create Sample Tickets linked to this stakeholder
      IF sample_stakeholder_id IS NOT NULL THEN
        FOR ticket_record IN SELECT * FROM template_sample_tickets WHERE template_id = v_template_id LOOP
          -- Find issue category
          SELECT id INTO target_issue_cat_id FROM stakeholder_issue_categories WHERE company_id = NEW.company_id AND name = ticket_record.category_name LIMIT 1;
          
          INSERT INTO stakeholder_issues (
            stakeholder_id,
            title,
            description,
            status,
            priority,
            attachments,
            assigned_team_id,
            category_id,
            company_id,
            created_by
          ) VALUES (
            sample_stakeholder_id,
            ticket_record.title,
            ticket_record.description,
            ticket_record.status,
            ticket_record.priority,
            '[]'::jsonb,
            admin_team_id,
            target_issue_cat_id,
            NEW.company_id,
            NEW.id
          );
        END LOOP;
        RAISE LOG '✅ Created sample stakeholder and tickets from template';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ Error creating sample stakeholder/tickets: %', SQLERRM;
  END;

  RAISE LOG '🎉 First employee initialization complete! Sample data created for company %', NEW.company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- CREATE/REPLACE TRIGGERS
-- ==============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_handle_new_company ON companies;
DROP TRIGGER IF EXISTS trigger_handle_first_employee ON employees;

-- Phase 1: Company creation trigger
CREATE TRIGGER trigger_handle_new_company
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_company_initialization();

-- Phase 2: First employee trigger - fires on INSERT only (first employee is auto-approved)
CREATE TRIGGER trigger_handle_first_employee
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_first_employee_initialization();
