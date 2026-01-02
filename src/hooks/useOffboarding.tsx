"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { JOB_STATUS, ACTIVE_STATUSES } from "@/lib/constants";
import { createOffboardingNotification } from "@/lib/utils/notifications";
import { sendNotificationEmailAction } from "@/lib/actions/email-actions";

export interface OffboardingEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department_id: number;
  designation: string;
  job_status: string;
  hire_date: string;
  supervisor_id: string;
  department_name?: string;
  supervisor_name?: string;
}

export interface OffboardingData {
  employee_id: string;
  offboarding_date: string;
  reason: string;
  offboarding_type: 'Resigned' | 'Terminated';
  notes?: string;
}

export function useOffboarding() {
  const { employeeInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEmployees, setActiveEmployees] = useState<OffboardingEmployee[]>([]);
  const [offboardedEmployees, setOffboardedEmployees] = useState<OffboardingEmployee[]>([]);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch active employees (eligible for offboarding)
  const fetchActiveEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const companyId = employeeInfo?.company_id;
      if (!companyId) {
        setLoading(false);
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from("employees")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone_number,
          department_id,
          designation,
          job_status,
          hire_date,
          supervisor_id,
          departments!employees_department_id_fkey(name)
        `)
        .eq("company_id", companyId)
        .in("job_status", ACTIVE_STATUSES)
        .order("first_name", { ascending: true });

      if (fetchError) throw fetchError;

      // Fetch supervisor names
      const employeesWithDetails = await Promise.all(
        (data || []).map(async (emp: any) => {
          let supervisor_name = "Not assigned";
          
          if (emp.supervisor_id) {
            const { data: supervisorData } = await supabase
              .from("employees")
              .select("first_name, last_name")
              .eq("id", emp.supervisor_id)
              .single();
            
            if (supervisorData) {
              supervisor_name = `${supervisorData.first_name} ${supervisorData.last_name}`;
            }
          }

          return {
            ...emp,
            department_name: emp.departments?.name || "No department",
            supervisor_name,
          };
        })
      );

      setActiveEmployees(employeesWithDetails);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching active employees:", err);
    } finally {
      setLoading(false);
    }
  }, [employeeInfo?.company_id]);

  // Fetch offboarded employees
  const fetchOffboardedEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const companyId = employeeInfo?.company_id;
      if (!companyId) {
        setLoading(false);
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from("employees")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone_number,
          department_id,
          designation,
          job_status,
          hire_date,
          supervisor_id,
          departments!employees_department_id_fkey(name)
        `)
        .eq("company_id", companyId)
        .in("job_status", [JOB_STATUS.RESIGNED, JOB_STATUS.TERMINATED])
        .order("first_name", { ascending: true });

      if (fetchError) throw fetchError;

      // Fetch supervisor names
      const employeesWithDetails = await Promise.all(
        (data || []).map(async (emp: any) => {
          let supervisor_name = "Not assigned";
          
          if (emp.supervisor_id) {
            const { data: supervisorData } = await supabase
              .from("employees")
              .select("first_name, last_name")
              .eq("id", emp.supervisor_id)
              .single();
            
            if (supervisorData) {
              supervisor_name = `${supervisorData.first_name} ${supervisorData.last_name}`;
            }
          }

          return {
            ...emp,
            department_name: emp.departments?.name || "No department",
            supervisor_name,
          };
        })
      );

      setOffboardedEmployees(employeesWithDetails);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching offboarded employees:", err);
    } finally {
      setLoading(false);
    }
  }, [employeeInfo?.company_id]);

  // Process offboarding
  const processOffboarding = useCallback(
    async (data: OffboardingData) => {
      setLoading(true);
      setError(null);

      try {
        // Fetch employee details first for notification/email
        const { data: employeeData, error: fetchError } = await supabase
          .from("employees")
          .select("first_name, last_name, email, users!inner(id)")
          .eq("id", data.employee_id)
          .single();

        if (fetchError) throw fetchError;

        const employeeName = `${employeeData.first_name} ${employeeData.last_name}`;
        const users = employeeData.users as any;
        const employeeUserId = Array.isArray(users) ? users[0]?.id : users?.id;

        // Update employee job status
        const { error: updateError } = await supabase
          .from("employees")
          .update({
            job_status: data.offboarding_type,
          })
          .eq("id", data.employee_id);

        if (updateError) throw updateError;

        // Remove employee from all teams
        const { error: teamRemovalError } = await supabase
          .from("team_members")
          .delete()
          .eq("employee_id", data.employee_id);

        if (teamRemovalError) {
          console.error("Failed to remove employee from teams:", teamRemovalError);
          // Don't throw - continue with offboarding even if team removal fails
        }

        // Send notification to the employee
        if (employeeUserId) {
          try {
            await createOffboardingNotification(
              employeeUserId,
              'processed',
              { employeeName, offboardingType: data.offboarding_type },
              { actionUrl: '/ops/offboarding' }
            );
          } catch (notifError) {
            console.error("Failed to send offboarding notification:", notifError);
          }
        }

        // Send mandatory email to the employee (always send, no preference check)
        if (employeeData.email) {
          try {
            await sendNotificationEmailAction({
              recipientEmail: employeeData.email,
              recipientName: employeeName,
              title: `Offboarding Notice - ${data.offboarding_type}`,
              message: `Dear ${employeeName},\n\nThis is to inform you that your employment status has been updated to "${data.offboarding_type}" as of ${new Date(data.offboarding_date).toLocaleDateString()}.\n\nReason: ${data.reason}${data.notes ? `\n\nAdditional Notes: ${data.notes}` : ""}\n\nPlease contact HR if you have any questions.`,
              priority: 'high',
              actionUrl: `/ops/offboarding`,
              context: 'offboarding',
              skipPreferenceCheck: true,
            });
          } catch (emailError) {
            console.error("Failed to send offboarding email:", emailError);
          }
        }

        // Refresh the lists
        await fetchActiveEmployees();
        await fetchOffboardedEmployees();

        return {
          success: true,
          message: `Employee successfully ${data.offboarding_type === 'Resigned' ? 'resigned' : 'terminated'}`,
        };
      } catch (err: any) {
        setError(err.message);
        console.error("Error processing offboarding:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchActiveEmployees, fetchOffboardedEmployees]
  );

  // Reactivate employee
  const reactivateEmployee = useCallback(
    async (employee_id: string) => {
      setLoading(true);
      setError(null);

      try {
        // Fetch employee details first for notification/email
        const { data: employeeData, error: fetchError } = await supabase
          .from("employees")
          .select("first_name, last_name, email, users!inner(id)")
          .eq("id", employee_id)
          .single();

        if (fetchError) throw fetchError;

        const employeeName = `${employeeData.first_name} ${employeeData.last_name}`;
        const users = employeeData.users as any;
        const employeeUserId = Array.isArray(users) ? users[0]?.id : users?.id;

        const { error: updateError } = await supabase
          .from("employees")
          .update({
            job_status: JOB_STATUS.ACTIVE,
          })
          .eq("id", employee_id);

        if (updateError) throw updateError;

        // Send notification to the employee
        if (employeeUserId) {
          try {
            await createOffboardingNotification(
              employeeUserId,
              'reactivated',
              { employeeName },
              { actionUrl: '/home' }
            );
          } catch (notifError) {
            console.error("Failed to send reactivation notification:", notifError);
          }
        }

        // Send mandatory email to the employee (always send, no preference check)
        if (employeeData.email) {
          try {
            await sendNotificationEmailAction({
              recipientEmail: employeeData.email,
              recipientName: employeeName,
              title: "Employment Reactivated",
              message: `Dear ${employeeName},\n\nWe are pleased to inform you that your employment has been reactivated. Your status has been restored to Active.\n\nPlease contact HR if you have any questions or need assistance getting started again.`,
              priority: 'normal',
              actionUrl: `/home`,
              context: 'offboarding',
              skipPreferenceCheck: true,
            });
          } catch (emailError) {
            console.error("Failed to send reactivation email:", emailError);
          }
        }

        // Refresh the lists
        await fetchActiveEmployees();
        await fetchOffboardedEmployees();

        return {
          success: true,
          message: "Employee successfully reactivated",
        };
      } catch (err: any) {
        setError(err.message);
        console.error("Error reactivating employee:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchActiveEmployees, fetchOffboardedEmployees]
  );

  return {
    loading,
    error,
    activeEmployees,
    offboardedEmployees,
    fetchActiveEmployees,
    fetchOffboardedEmployees,
    processOffboarding,
    reactivateEmployee,
    clearError,
  };
}
