-- Email Preferences System
-- This table stores user preferences for email notifications using JSONB for flexibility
-- 
-- DESIGN NOTES:
-- - Uses JSONB for easy extension without schema migrations
-- - Preferences only for emails that users can opt out of
-- - Some emails are ALWAYS sent (no preference): onboarding, offboarding, reactivation
-- - Default values are handled in application code, not DB defaults

-- Create the email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- JSONB preferences structure:
  -- {
  --   "global_enabled": true,           -- Master switch for all emails
  --   "leave_approval": true,           -- Leave request approved
  --   "leave_rejection": true,          -- Leave request rejected
  --   "project_completion": true,       -- Project completed
  --   "payroll_paid": true,             -- Salary processed
  --   "stakeholder_issue_high_priority": true,  -- High/Urgent priority issues
  --   "urgent_notices": true            -- Urgent company notices
  -- }
  -- 
  -- EMAILS ALWAYS SENT (not in preferences):
  -- - Onboarding approval/rejection (new user has no preferences)
  -- - Offboarding notice (user is leaving)
  -- - Account reactivation (user was inactive)
  --
  preferences JSONB NOT NULL DEFAULT '{
    "global_enabled": true,
    "leave_approval": true,
    "leave_rejection": true,
    "project_completion": true,
    "payroll_paid": true,
    "stakeholder_issue_high_priority": true,
    "urgent_notices": true
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own email preferences"
  ON email_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own email preferences"
  ON email_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own email preferences"
  ON email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_company_id ON email_preferences(company_id);

-- GIN index for JSONB queries (future-proofing for complex queries)
CREATE INDEX IF NOT EXISTS idx_email_preferences_jsonb ON email_preferences USING GIN (preferences);

-- Function to auto-create email preferences for new employees
CREATE OR REPLACE FUNCTION create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if employee is approved (not during initial onboarding)
  IF NEW.has_approval = 'ACCEPTED' THEN
    INSERT INTO email_preferences (user_id, company_id)
    VALUES (NEW.id, NEW.company_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create preferences when employee is approved
DROP TRIGGER IF EXISTS auto_create_email_preferences ON employees;
CREATE TRIGGER auto_create_email_preferences
  AFTER INSERT OR UPDATE OF has_approval ON employees
  FOR EACH ROW
  WHEN (NEW.has_approval = 'ACCEPTED')
  EXECUTE FUNCTION create_default_email_preferences();

-- Helper function to check if a specific email preference is enabled
-- Returns true if preference doesn't exist (default behavior)
CREATE OR REPLACE FUNCTION check_email_preference(
  p_user_id UUID,
  p_preference_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_preferences JSONB;
  v_global_enabled BOOLEAN;
  v_specific_enabled BOOLEAN;
BEGIN
  SELECT preferences INTO v_preferences
  FROM email_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences found, default to true
  IF v_preferences IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check global enabled first
  v_global_enabled := COALESCE((v_preferences->>'global_enabled')::boolean, true);
  IF NOT v_global_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check specific preference
  v_specific_enabled := COALESCE((v_preferences->>p_preference_key)::boolean, true);
  RETURN v_specific_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON email_preferences TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE email_preferences_id_seq TO authenticated;

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION check_email_preference(UUID, TEXT) TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_preferences_updated_at ON email_preferences;
CREATE TRIGGER email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();
