"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useBaseEntity } from "./core";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useLeaveBalances } from "./useLeaveBalances";
import { useNotifications } from "./useNotifications";
import { HolidayConfig, LeaveType } from "@/lib/types";
import { usePermissions } from "./usePermissions";
import { captureSupabaseError } from "@/lib/sentry";
import { sendNotificationEmailAction } from "@/lib/actions/email-actions";
import { checkUserEmailPreference } from "./useEmailPreferences";
import { createLeaveRequestNotification } from "@/lib/utils/notifications";


export type { LeaveType, HolidayConfig };

export function useLeaveTypes() {
  const baseResult = useBaseEntity<LeaveType>({
    tableName: "leave_types",
    entityName: "leave type",
    companyScoped: true,
  });

  return {
    ...baseResult,
    leaveTypes: baseResult.items,
    fetchLeaveTypes: baseResult.fetchItems,
    createLeaveType: baseResult.createItem,
    updateLeaveType: baseResult.updateItem,
    deleteLeaveType: baseResult.deleteItem,
  };
}

export function useHolidayConfigs() {
  const baseResult = useBaseEntity<HolidayConfig>({
    tableName: "other_holiday_configs",
    entityName: "holiday config",
    companyScoped: true,
  });

  return {
    ...baseResult,
    holidayConfigs: baseResult.items,
    fetchHolidayConfigs: baseResult.fetchItems,
    createHolidayConfig: baseResult.createItem,
    updateHolidayConfig: baseResult.updateItem,
    deleteHolidayConfig: baseResult.deleteItem,
  };
}


export function useLeaveRequests() {
  const { employeeInfo } = useAuth();
  const baseResult = useBaseEntity<any>({
    tableName: "leave_records",
    entityName: "leave record",
    companyScoped: true,
  });

  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { reduceBalance } = useLeaveBalances();
  const { createNotification } = useNotifications();
  const { canApprove, isSupervisorOf, getSubordinates } = usePermissions();

  // Create leave request (same as before)
  const createLeaveRequest = async (leaveData: any) => {
    if (!employeeInfo) {
      console.warn('Cannot create leave request: Employee info not available');
      return null;
    }

    try {
      const result = await baseResult.createItem(leaveData);

      const recipients = [employeeInfo.supervisor_id].filter(Boolean) as string[];
      createNotification({
        title: "New Leave Request",
        message: `A new leave request has been submitted by ${employeeInfo.name}.`,
        priority: "normal",
        type_id: 2,
        recipient_id: recipients,
        action_url: "/ops/leave",
        company_id: typeof employeeInfo.company_id === 'string' ? parseInt(employeeInfo.company_id) : employeeInfo.company_id!,
        department_id: typeof employeeInfo.department_id === 'string' ? parseInt(employeeInfo.department_id) : employeeInfo.department_id,
      });

      return result;
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "createLeaveRequest",
        { companyId: employeeInfo.company_id }
      );
      console.error("Error creating leave request:", error);
      throw error;
    }
  };

  // Update leave request (with permission check)
  const updateLeaveRequest = async (
    leaveId: number,
    leaveData: any,
    leaveTypeId: number,
    employeeId: string,
    start_date: string,
    end_date: string
  ) => {
    if (!employeeInfo) {
      console.warn('Cannot update leave request: Employee info not available');
      return null;
    }

    try {
      // Check permission: user must have leave approval permission OR be supervisor of employee
      const hasTeamPermission = canApprove('leave');
      const isSupervisor = await isSupervisorOf(employeeId);
      
      if (!hasTeamPermission && !isSupervisor) {
        throw new Error("You do not have permission to update this leave request");
      }

      const result = await baseResult.updateItem(leaveId, leaveData);

      // Fetch employee and leave type details for notification
      const { data: empData } = await supabase
        .from("employees")
        .select("first_name, last_name, email, users!inner(id)")
        .eq("id", employeeId)
        .single();

      const { data: leaveTypeData } = await supabase
        .from("leave_types")
        .select("name")
        .eq("id", leaveTypeId)
        .single();

      const employeeName = empData ? `${empData.first_name} ${empData.last_name}` : "Employee";
      const leaveTypeName = leaveTypeData?.name || "Leave";

      if (leaveData.status === "Accepted") {
        const parseDate = (str: string) => new Date(str.replace(" ", "T"));
        const start = parseDate(start_date);
        const end = parseDate(end_date);

        const diffInDays =
          Math.floor(
            (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
              Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
              (1000 * 60 * 60 * 24)
          ) + 1;

        await reduceBalance(employeeId, leaveTypeId, diffInDays);

        // Send approval notification
        const users = empData?.users as any;
        const userId = Array.isArray(users) ? users[0]?.id : users?.id;
        
        if (userId) {
          try {
            await createLeaveRequestNotification(
              userId,
              'approved',
              {
                leaveType: leaveTypeName,
                startDate: start_date,
                endDate: end_date,
              },
              {
                referenceId: leaveId,
                actionUrl: '/ops/leave',
              }
            );
          } catch (notifError) {
            console.error("Failed to send leave approval notification:", notifError);
          }
        }

        // Send approval email
        if (empData?.email && userId) {
          try {
            const canSendEmail = await checkUserEmailPreference(userId, 'leave_approval');
            if (canSendEmail) {
              await sendNotificationEmailAction({
                recipientEmail: empData.email,
                recipientName: employeeName,
                title: `Leave Request Approved: ${leaveTypeName}`,
                message: `Dear ${employeeName},\n\nYour ${leaveTypeName.toLowerCase()} leave request from ${start_date} to ${end_date} has been approved.\n\nEnjoy your time off!`,
                priority: 'normal',
                actionUrl: `/ops/leave`,
                context: 'leave',
              });
            }
          } catch (emailError) {
            console.error("Failed to send leave approval email:", emailError);
          }
        }
      } else if (leaveData.status === "Rejected") {
        // Send rejection notification
        const users = empData?.users as any;
        const userId = Array.isArray(users) ? users[0]?.id : users?.id;
        
        if (userId) {
          try {
            await createLeaveRequestNotification(
              userId,
              'rejected',
              {
                leaveType: leaveTypeName,
                reason: leaveData.remarks || "No reason provided",
              },
              {
                referenceId: leaveId,
                actionUrl: '/ops/leave',
              }
            );
          } catch (notifError) {
            console.error("Failed to send leave rejection notification:", notifError);
          }
        }

        // Send rejection email
        if (empData?.email && userId) {
          try {
            const canSendEmail = await checkUserEmailPreference(userId, 'leave_rejection');
            if (canSendEmail) {
              await sendNotificationEmailAction({
                recipientEmail: empData.email,
                recipientName: employeeName,
                title: `Leave Request Not Approved: ${leaveTypeName}`,
                message: `Dear ${employeeName},\n\nYour ${leaveTypeName.toLowerCase()} leave request from ${start_date} to ${end_date} was not approved.\n\n${leaveData.remarks ? `Reason: ${leaveData.remarks}` : ""}\n\nPlease contact your supervisor if you have any questions.`,
                priority: 'normal',
                actionUrl: `/ops/leave`,
                context: 'leave',
              });
            }
          } catch (emailError) {
            console.error("Failed to send leave rejection email:", emailError);
          }
        }
      } else {
        // Generic status update notification (for Pending status revert)
        createNotification({
          title: "Leave request updated",
          message: `Your leave request has been updated to status: ${leaveData.status}.`,
          priority: "normal",
          type_id: 2,
          recipient_id: [employeeId].filter(Boolean) as string[],
          action_url: "/ops/leave",
          company_id: typeof employeeInfo.company_id === 'string' ? parseInt(employeeInfo.company_id) : employeeInfo.company_id!,
          department_id: typeof employeeInfo.department_id === 'string' ? parseInt(employeeInfo.department_id) : employeeInfo.department_id,
        });
      }

      return result;
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "updateLeaveRequest",
        { leaveId, companyId: employeeInfo.company_id }
      );
      console.error("Error updating leave request:", error);
      throw error;
    }
  };

  // Fetch pending requests (user's assigned requests + subordinate requests if supervisor)
  const fetchLeaveRequests = async () => {
    try {
      if (!employeeInfo) {
        setLoading(false);
        return;
      }
      setLoading(true);
      
      // Get subordinate IDs if user is a supervisor
      const subordinateIds = await getSubordinates();
      
      // Build query for requests assigned to user OR from subordinates
      let query = supabase
        .from("leave_records")
        .select("*")
        .eq("status", "Pending");

      // User can see requests assigned to them OR from their subordinates
      if (subordinateIds.length > 0) {
        query = query.or(`requested_to.eq.${employeeInfo.id},employee_id.in.(${subordinateIds.join(',')})`);
      } else {
        query = query.eq("requested_to", employeeInfo.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLeaveRequests(data);
      setLoading(false);
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchLeaveRequests",
        { employeeId: employeeInfo?.id }
      );
      console.error("Error fetching leave requests:", error);
      setLoading(false);
      throw error;
    }
  };

  // Fetch pending requests globally (for users with leave approval permissions)
  const fetchGlobalLeaveRequests = async () => {
    try {
      setLoading(true);
      
      // Check if user has permission to see all leave requests
      if (!canApprove('leave')) {
        console.warn("User does not have permission to view global leave requests");
        setLeaveRequests([]);
        setLoading(false);
        return;
      }

      const companyId = employeeInfo?.company_id;
      if (!companyId) {
        console.warn('Company ID not available, cannot fetch leave requests');
        setLeaveRequests([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("leave_records")
        .select("*")
        .eq("status", "Pending")
        .eq("company_id", companyId)

      if (error) throw error;

      setLeaveRequests(data);
      setLoading(false);
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchGlobalLeaveRequests",
        { companyId: employeeInfo?.company_id }
      );
      console.error("Error fetching global leave requests:", error);
      setLoading(false);
      throw error;
    }
  };

  // Fetch leave history (default: only for user)
  const fetchLeaveHistory = async () => {
    try {
      if (!employeeInfo) {
        setLoading(false);
        return;
      }
      setLoading(true);
      
      const { data, error } = await supabase
        .from("leave_records")
        .select("*")
        .neq("status", "Pending")
        .eq("employee_id", employeeInfo.id);

      if (error) throw error;

      setLeaveRequests(data);
      setLoading(false);
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchLeaveHistory",
        { employeeId: employeeInfo?.id }
      );
      console.error("Error fetching leave history:", error);
      setLoading(false);
      throw error;
    }
  };

  // Fetch leave history globally (admin only)
  const fetchGlobalLeaveHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leave_records")
        .select("*")
        .neq("status", "Pending");

      if (error) throw error;

      setLeaveRequests(data);
      setLoading(false);
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchGlobalLeaveHistory",
        {}
      );
      console.error("Error fetching global leave history:", error);
      setLoading(false);
      throw error;
    }
  };

  return {
    ...baseResult,
    loading,
    leaveRequests,
    createLeaveRequest,
    updateLeaveRequest,
    fetchLeaveRequests,
    fetchGlobalLeaveRequests,
    fetchLeaveHistory,
    fetchGlobalLeaveHistory,
    processingId: baseResult.updating,
  };
}


// Define the WeeklyHolidayConfig type (adjust fields as needed)
type WeeklyHolidayConfig = {
  id: number;
  company_id: string;
  day_of_week: string;
  is_active: boolean;
};

export function useWeeklyHolidayConfigs() {
  const baseResult = useBaseEntity<WeeklyHolidayConfig>({
    tableName: "weekly_holiday_configs",
    entityName: "weekly holiday config",
    companyScoped: true,
  });

  return {
    ...baseResult,
    weeklyHolidayConfigs: baseResult.items,
    fetchWeeklyHolidayConfigs: baseResult.fetchItems,
    createWeeklyHolidayConfig: baseResult.createItem,
    updateWeeklyHolidayConfig: baseResult.updateItem,
    deleteWeeklyHolidayConfig: baseResult.deleteItem,
  };
}
