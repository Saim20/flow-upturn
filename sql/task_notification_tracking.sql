-- Migration: Add notification tracking columns to task_records table
-- This allows the deadline scheduler to track which notifications have been sent

-- Add columns to track deadline notification status
ALTER TABLE task_records 
ADD COLUMN IF NOT EXISTS deadline_notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS overdue_notification_sent BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying of tasks needing notifications
-- Note: status is a boolean column (true = completed, false = not completed)
CREATE INDEX IF NOT EXISTS idx_task_records_deadline_notification 
ON task_records (end_date, status, deadline_notification_sent) 
WHERE status = FALSE;

CREATE INDEX IF NOT EXISTS idx_task_records_overdue_notification 
ON task_records (end_date, status, overdue_notification_sent) 
WHERE status = FALSE;

-- Reset notification flags when task end_date is updated
-- This ensures notifications are sent again if the deadline changes
CREATE OR REPLACE FUNCTION reset_task_notification_flags()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN
    NEW.deadline_notification_sent := FALSE;
    NEW.overdue_notification_sent := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reset flags on end_date change
DROP TRIGGER IF EXISTS reset_notification_flags_on_deadline_change ON task_records;
CREATE TRIGGER reset_notification_flags_on_deadline_change
  BEFORE UPDATE ON task_records
  FOR EACH ROW
  EXECUTE FUNCTION reset_task_notification_flags();

-- Also reset overdue flag when status changes back from incomplete (false)
CREATE OR REPLACE FUNCTION reset_overdue_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If task was completed (true) and is now reopened (false), reset notification flag
  IF OLD.status = TRUE AND NEW.status = FALSE THEN
    NEW.overdue_notification_sent := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reset_overdue_on_reopened ON task_records;
CREATE TRIGGER reset_overdue_on_reopened
  BEFORE UPDATE ON task_records
  FOR EACH ROW
  EXECUTE FUNCTION reset_overdue_on_status_change();

COMMENT ON COLUMN task_records.deadline_notification_sent IS 'True if deadline approaching notification has been sent (24 hours before end_date)';
COMMENT ON COLUMN task_records.overdue_notification_sent IS 'True if overdue notification has been sent (1 day after end_date)';
