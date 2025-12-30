import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface LeaveBalance {
  id?: number;
  employee_id: string;
  type_id: number;
  balance: number;
  used: number; // Track used leaves for display
  total_quota: number; // Track total quota from leave type settings
  leave_type_name?: string;
  color?: string;
}

// Helper to calculate days between two dates (inclusive)
function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function useLeaveBalances(employeeId?: number, companyId?: number) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId || !companyId) return;

    const fetchOrCreateBalances = async () => {
      const supabase = createClient();
      setLoading(true);

      // Get all leave types for the company (admin settings)
      const { data: leaveTypes, error: typesError } = await supabase
        .from("leave_types")
        .select("*")
        .eq("company_id", companyId);

      if (typesError) {
        console.error("Error fetching leave types:", typesError);
        setLoading(false);
        return;
      }

      // Get existing balances for the employee
      const { data: existingBalances, error: balancesError } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", companyId);

      if (balancesError) {
        console.error("Error fetching leave balances:", balancesError);
        setLoading(false);
        return;
      }

      // Get current year's start and end dates for filtering leaves
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // Fetch accepted leave records for this employee in the current year
      // This is used for calculating used leaves for display purposes
      const { data: acceptedLeaves, error: leavesError } = await supabase
        .from("leave_records")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", companyId)
        .eq("status", "Accepted")
        .gte("start_date", yearStart)
        .lte("start_date", yearEnd);

      if (leavesError) {
        console.error("Error fetching accepted leaves:", leavesError);
        // Continue without used leaves calculation
      }

      // Calculate used leaves per type from accepted leave records
      const usedLeavesPerType: Record<number, number> = {};
      for (const leave of acceptedLeaves || []) {
        const days = calculateDaysBetween(leave.start_date, leave.end_date);
        usedLeavesPerType[leave.type_id] = (usedLeavesPerType[leave.type_id] || 0) + days;
      }

      const updatedBalances: LeaveBalance[] = [];

      for (const type of leaveTypes || []) {
        // Get used leaves for this type from actual leave records
        const usedDays = usedLeavesPerType[type.id] || 0;
        
        // Check if balance record exists
        let balanceRecord = existingBalances?.find(b => b.type_id === type.id);
        
        if (!balanceRecord) {
          // Create balance if missing - use annual_quota from leave type admin settings
          const { data: newBalance, error: insertError } = await supabase
            .from("leave_balances")
            .insert({
              employee_id: employeeId,
              type_id: type.id,
              balance: type.annual_quota, // Use admin-configured quota
              company_id: companyId,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating leave balance:", insertError);
            continue;
          }

          balanceRecord = newBalance;
        }

        // Calculate remaining balance based on admin quota minus used leaves
        // This ensures the balance follows admin settings (annual_quota)
        const totalQuota = type.annual_quota; // Always use admin-configured quota
        const remainingBalance = Math.max(0, totalQuota - usedDays);

        // Update the balance record if it doesn't match the calculated value
        // This syncs the stored balance with the actual remaining balance
        if (balanceRecord.balance !== remainingBalance) {
          await supabase
            .from("leave_balances")
            .update({ balance: remainingBalance })
            .eq("id", balanceRecord.id);
        }

        updatedBalances.push({
          ...balanceRecord,
          balance: remainingBalance,
          used: usedDays,
          total_quota: totalQuota,
          leave_type_name: type.name,
          color: type.color || "bg-background-tertiary border-border-secondary text-foreground-primary",
        });
      }

      setBalances(updatedBalances);
      setLoading(false);
    };

    fetchOrCreateBalances();
  }, [employeeId, companyId]);


  // 🔹 Function to update a balance
  const updateBalance = useCallback(
    async (typeId: number, newBalance: number) => {
      if (!employeeId || !companyId) return { success: false };

      try {
        const supabase = createClient();

        const { error } = await supabase
          .from("leave_balances")
          .update({ balance: newBalance })
          .eq("employee_id", employeeId)
          .eq("company_id", companyId)
          .eq("type_id", typeId);

        if (error) {
          console.error("Error updating leave balance:", error);
          return { success: false, error };
        }

        // Update local state too
        setBalances((prev) =>
          prev.map((b) =>
            b.type_id === typeId ? { ...b, balance: newBalance } : b
          )
        );

        return { success: true };
      } catch (err) {
        console.error("Unexpected error updating leave balance:", err);
        return { success: false, error: err };
      }
    },
    [employeeId, companyId]
  );

  // reduceBalance is now a no-op since balances are calculated dynamically
  // from approved leave records. This function is kept for backward compatibility
  // but the actual balance is always computed as: annual_quota - used_leaves
  const reduceBalance = async (
    _employeeId: string,
    _typeId: number,
    _amount: number
  ) => {
    // No longer needed - balance is calculated dynamically from leave_records
    // The leave_balances table is now synced automatically when fetching balances
    console.log("reduceBalance called but balance is now calculated dynamically from approved leave records");
  };

  return { balances, loading, updateBalance, reduceBalance };
}
