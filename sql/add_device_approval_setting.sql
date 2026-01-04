-- Add device_approval_enabled column to companies table
-- This setting controls whether device approval checks are enforced during sign-in
-- Default: FALSE (device approval is disabled by default)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS device_approval_enabled BOOLEAN DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN companies.device_approval_enabled IS 'When enabled, device approval checks are enforced during sign-in. When disabled (default), users can sign in from any device without approval.';

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE '✅ Added device_approval_enabled column to companies table (default: FALSE)';
END $$;
