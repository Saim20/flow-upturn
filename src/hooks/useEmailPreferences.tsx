"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { captureSupabaseError } from "@/lib/sentry";

/**
 * Email Preferences Structure (JSONB)
 * 
 * These are emails users CAN opt out of.
 * Emails ALWAYS sent (not configurable):
 * - Onboarding approval/rejection (new user has no preferences)
 * - Offboarding notice (user is leaving)
 * - Account reactivation (user was inactive)
 */
export interface EmailPreferencesData {
  global_enabled: boolean;
  leave_approval: boolean;
  leave_rejection: boolean;
  project_completion: boolean;
  payroll_paid: boolean;
  stakeholder_issue_high_priority: boolean;
  urgent_notices: boolean;
  // Extensible: add new preferences here without schema changes
  [key: string]: boolean;
}

export interface EmailPreferences {
  id?: number;
  user_id: string;
  company_id: number;
  preferences: EmailPreferencesData;
  created_at?: string;
  updated_at?: string;
}

export type EmailPreferenceKey = keyof EmailPreferencesData;

// Default preferences - all enabled
export const defaultEmailPreferences: EmailPreferencesData = {
  global_enabled: true,
  leave_approval: true,
  leave_rejection: true,
  project_completion: true,
  payroll_paid: true,
  stakeholder_issue_high_priority: true,
  urgent_notices: true,
};

export function useEmailPreferences() {
  const { employeeInfo } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's email preferences
  const fetchPreferences = useCallback(async () => {
    if (!employeeInfo?.id || !employeeInfo?.company_id) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", employeeInfo.id)
        .single();

      if (fetchError) {
        // If no preferences exist, create default ones
        if (fetchError.code === "PGRST116") {
          const newPreferences = await createDefaultPreferences();
          return newPreferences;
        }
        throw fetchError;
      }

      // Merge with defaults to ensure new keys are included
      const mergedData: EmailPreferences = {
        ...data,
        preferences: {
          ...defaultEmailPreferences,
          ...data.preferences,
        },
      };

      setPreferences(mergedData);
      return mergedData;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch email preferences";
      captureSupabaseError(
        { message: errorMsg },
        "fetchEmailPreferences",
        { userId: employeeInfo.id }
      );
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [employeeInfo?.id, employeeInfo?.company_id]);

  // Create default preferences for a user
  const createDefaultPreferences = useCallback(async () => {
    if (!employeeInfo?.id || !employeeInfo?.company_id) {
      return null;
    }

    try {
      const newPrefs = {
        user_id: employeeInfo.id,
        company_id: typeof employeeInfo.company_id === 'string' 
          ? parseInt(employeeInfo.company_id) 
          : employeeInfo.company_id,
        preferences: defaultEmailPreferences,
      };

      const { data, error: insertError } = await supabase
        .from("email_preferences")
        .insert(newPrefs)
        .select()
        .single();

      if (insertError) throw insertError;

      setPreferences(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create email preferences";
      captureSupabaseError(
        { message: errorMsg },
        "createDefaultEmailPreferences",
        { userId: employeeInfo.id }
      );
      setError(errorMsg);
      return null;
    }
  }, [employeeInfo?.id, employeeInfo?.company_id]);

  // Update a single preference
  const updatePreference = useCallback(async (key: EmailPreferenceKey, value: boolean) => {
    if (!employeeInfo?.id || !preferences) {
      return false;
    }

    try {
      const updatedPreferences = {
        ...preferences.preferences,
        [key]: value,
      };

      const { data, error: updateError } = await supabase
        .from("email_preferences")
        .update({ preferences: updatedPreferences })
        .eq("user_id", employeeInfo.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setPreferences(data);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update email preference";
      captureSupabaseError(
        { message: errorMsg },
        "updateEmailPreference",
        { userId: employeeInfo.id, key, value }
      );
      setError(errorMsg);
      return false;
    }
  }, [employeeInfo?.id, preferences]);

  // Update multiple preferences at once
  const updatePreferences = useCallback(async (updates: Partial<EmailPreferencesData>) => {
    if (!employeeInfo?.id || !preferences) {
      return false;
    }

    try {
      const updatedPreferences = {
        ...preferences.preferences,
        ...updates,
      };

      const { data, error: updateError } = await supabase
        .from("email_preferences")
        .update({ preferences: updatedPreferences })
        .eq("user_id", employeeInfo.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setPreferences(data);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update email preferences";
      captureSupabaseError(
        { message: errorMsg },
        "updateEmailPreferences",
        { userId: employeeInfo.id, updates }
      );
      setError(errorMsg);
      return false;
    }
  }, [employeeInfo?.id, preferences]);

  // Toggle global email notifications
  const toggleGlobalEmail = useCallback(async (enabled: boolean) => {
    return updatePreference('global_enabled', enabled);
  }, [updatePreference]);

  // Check if a specific email type should be sent
  const shouldSendEmail = useCallback((preferenceKey: EmailPreferenceKey): boolean => {
    if (!preferences) return true; // Default to sending if no preferences loaded
    
    const prefs = preferences.preferences;
    
    // If global email is disabled, don't send any emails
    if (!prefs.global_enabled) return false;
    
    // Check the specific preference (default to true if not set)
    return prefs[preferenceKey] ?? true;
  }, [preferences]);

  // Auto-fetch preferences on mount
  useEffect(() => {
    if (employeeInfo?.id) {
      fetchPreferences();
    }
  }, [employeeInfo?.id, fetchPreferences]);

  return {
    preferences,
    preferencesData: preferences?.preferences ?? defaultEmailPreferences,
    loading,
    error,
    fetchPreferences,
    updatePreference,
    updatePreferences,
    toggleGlobalEmail,
    shouldSendEmail,
  };
}

/**
 * Utility function to check email preferences for a specific user (server-side use)
 * Used when sending emails to check if user has opted in
 */
export async function checkUserEmailPreference(
  userId: string,
  preferenceKey: EmailPreferenceKey
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("email_preferences")
      .select("preferences")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no preferences found, default to true (send email)
      if (error.code === "PGRST116") return true;
      console.error("Error checking email preference:", error);
      return true; // Default to sending email on error
    }

    const prefs = data.preferences as EmailPreferencesData;

    // If global email is disabled, don't send
    if (!prefs.global_enabled) return false;

    // Return the specific preference value (default true if not set)
    return prefs[preferenceKey] ?? true;
  } catch (err) {
    console.error("Error checking email preference:", err);
    return true; // Default to sending email on error
  }
}

/**
 * Email preference labels for UI display
 * Organized by category for better UX
 */
export const emailPreferenceCategories = {
  general: {
    title: "General",
    preferences: {
      global_enabled: {
        title: "Enable Email Notifications",
        description: "Master switch for all email notifications. When disabled, you won't receive any emails from the system.",
      },
    },
  },
  leave: {
    title: "Leave Management",
    preferences: {
      leave_approval: {
        title: "Leave Approved",
        description: "Receive email when your leave request is approved.",
      },
      leave_rejection: {
        title: "Leave Rejected",
        description: "Receive email when your leave request is rejected.",
      },
    },
  },
  projects: {
    title: "Projects",
    preferences: {
      project_completion: {
        title: "Project Completed",
        description: "Receive email when a project you're involved in is completed.",
      },
    },
  },
  payroll: {
    title: "Payroll",
    preferences: {
      payroll_paid: {
        title: "Salary Processed",
        description: "Receive email when your salary has been processed and transferred.",
      },
    },
  },
  stakeholders: {
    title: "Stakeholder Management",
    preferences: {
      stakeholder_issue_high_priority: {
        title: "High Priority Issues",
        description: "Receive email for high/urgent priority stakeholder issues requiring immediate attention.",
      },
    },
  },
  notices: {
    title: "Notices & Announcements",
    preferences: {
      urgent_notices: {
        title: "Urgent Notices",
        description: "Receive email for urgent company notices and announcements.",
      },
    },
  },
};

// Flat list of all preference labels (for backward compatibility)
export const emailPreferenceLabels: Record<EmailPreferenceKey, { title: string; description: string }> = {
  global_enabled: emailPreferenceCategories.general.preferences.global_enabled,
  leave_approval: emailPreferenceCategories.leave.preferences.leave_approval,
  leave_rejection: emailPreferenceCategories.leave.preferences.leave_rejection,
  project_completion: emailPreferenceCategories.projects.preferences.project_completion,
  payroll_paid: emailPreferenceCategories.payroll.preferences.payroll_paid,
  stakeholder_issue_high_priority: emailPreferenceCategories.stakeholders.preferences.stakeholder_issue_high_priority,
  urgent_notices: emailPreferenceCategories.notices.preferences.urgent_notices,
};
