"use client";

import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCompanyId } from "@/lib/utils/auth";
import { Payroll, PayrollAdjustment, PayrollAccountEntry } from "@/lib/types/schemas";
import { createPayrollNotification } from "@/lib/utils/notifications";
import { formatDate } from "@/lib/utils";
import { createAccountFromPayroll, markPayrollAccountComplete } from "@/lib/utils/payroll-accounts";
import { sendNotificationEmailAction } from "@/lib/actions/email-actions";
import { checkUserEmailPreference } from "./useEmailPreferences";

export function usePayroll() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch payroll history for current employee
  const fetchPayrollHistory = useCallback(async (employeeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const companyId = await getCompanyId();
      
      let query = supabase
        .from("payrolls")
        .select(`
          *,
          employee:employees!payrolls_employee_id_fkey(first_name, last_name, email),
          supervisor:employees!payrolls_supervisor_id_fkey(first_name, last_name)
        `)
        .eq("company_id", companyId)
        .order("generation_date", { ascending: false });

      // If employeeId is provided, filter by that employee
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPayrolls(data || []);
      return data || [];
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch payrolls supervised by current user
  const fetchSupervisedPayrolls = useCallback(async (supervisorId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const companyId = await getCompanyId();
      
      let query = supabase
        .from("payrolls")
        .select(`
          *,
          employee:employees!payrolls_employee_id_fkey(first_name, last_name, email, department_id),
          supervisor:employees!payrolls_supervisor_id_fkey(first_name, last_name)
        `)
        .eq("company_id", companyId)
        .order("generation_date", { ascending: false });

      // If supervisorId is provided, filter by that supervisor
      if (supervisorId) {
        query = query.eq("supervisor_id", supervisorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPayrolls(data || []);
      return data || [];
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update payroll status (for adjustments)
  const updatePayrollStatus = useCallback(async (
    payrollId: number, 
    status: 'Paid' | 'Pending' | 'Published', // Updated status types
    adjustments?: PayrollAdjustment[]
  ) => {
    setLoading(true);
    setError(null);
    try {
      const updateData: Partial<Payroll> = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (adjustments) {
        updateData.adjustments = adjustments;
        // Recalculate total amount
        const adjustmentTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
        const payroll = payrolls.find(p => p.id === payrollId);
        if (payroll) {
          updateData.total_amount = payroll.basic_salary + adjustmentTotal;
        }
      }

      const { data, error } = await supabase
        .from("payrolls")
        .update(updateData)
        .eq("id", payrollId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPayrolls(prev => 
        prev.map(payroll => 
          payroll.id === payrollId 
            ? { ...payroll, ...updateData }
            : payroll
        )
      );

      // Sync with accounts system when status changes to Published
      if (status === 'Published') {
        try {
          await logPayrollToAccounts(data);
          console.log(`Payroll ${payrollId} synced to accounts system`);
        } catch (accountError) {
          console.error(`Failed to sync payroll ${payrollId} to accounts:`, accountError);
          // Don't fail the entire operation for account sync errors
        }
      }

      // Update account status to Complete when payroll is marked as Paid
      if (status === 'Paid') {
        try {
          await markPayrollAccountComplete(payrollId);
          console.log(`Account entry marked as Complete for payroll ${payrollId}`);
        } catch (accountError) {
          console.error(`Failed to mark account as complete for payroll ${payrollId}:`, accountError);
          // Don't fail the entire operation for account update errors
        }
      }

      // Send notification to employee about payroll status change
      try {
        const payroll = payrolls.find(p => p.id === payrollId);
        if (payroll && payroll.employee_id) {
          // Get employee name for notifications
          const { data: employee } = await supabase
            .from("employees")
            .select("first_name, last_name")
            .eq("id", payroll.employee_id)
            .single();

          const employeeName = employee 
            ? `${employee.first_name} ${employee.last_name}`
            : 'Employee';

          if (status === 'Published') { // Updated from 'Adjusted'
            const adjustmentReason = adjustments && adjustments.length > 0 
              ? adjustments.map(adj => adj.type).join(', ')
              : 'Payroll published';
            
            await createPayrollNotification(
              payroll.employee_id,
              'published',
              {
                employeeName,
                newAmount: updateData.total_amount || payroll.total_amount,
                adjustmentReason
              },
              {
                referenceId: payrollId,
                actionUrl: '/ops/payroll'
              }
            );
          } else if (status === 'Paid') {
            await createPayrollNotification(
              payroll.employee_id,
              'paid',
              {
                employeeName,
                amount: payroll.total_amount,
                date: formatDate(payroll.generation_date)
              },
              {
                referenceId: payrollId,
                actionUrl: '/ops/payroll'
              }
            );

            // Send email for payroll paid notification
            try {
              // Get employee user id and email
              const { data: empData } = await supabase
                .from("employees")
                .select("email, users!inner(id)")
                .eq("id", payroll.employee_id)
                .single();

              const users = empData?.users as any;
              const userId = Array.isArray(users) ? users[0]?.id : users?.id;
              
              if (empData?.email && userId) {
                const canSendEmail = await checkUserEmailPreference(userId, 'payroll_paid');
                if (canSendEmail) {
                  await sendNotificationEmailAction({
                    recipientEmail: empData.email,
                    recipientName: employeeName,
                    title: "Payroll Payment Processed",
                    message: `Dear ${employeeName},\n\nWe are pleased to inform you that your salary for the period ${formatDate(payroll.generation_date)} has been processed.\n\nAmount: ${payroll.total_amount}\n\nPlease check your bank account for the credited amount. If you have any questions regarding your salary, please contact HR.`,
                    priority: 'normal',
                    actionUrl: `/ops/payroll`,
                    context: 'payroll',
                  });
                }
              }
            } catch (emailError) {
              console.error("Failed to send payroll paid email:", emailError);
            }
          }
        }
      } catch (notificationError) {
        console.warn('Failed to send payroll notification:', notificationError);
        // Don't fail the entire operation for notification errors
      }

      return data;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, [payrolls]);

  // Get payroll statistics
  const payrollStats = useMemo(() => {
    if (!payrolls.length) return { total: 0, paid: 0, pending: 0, published: 0 }; // Updated from 'adjusted' to 'published'
    
    return {
      total: payrolls.length,
      paid: payrolls.filter(p => p.status === 'Paid').length,
      pending: payrolls.filter(p => p.status === 'Pending').length,
      published: payrolls.filter(p => p.status === 'Published').length, // Updated from 'adjusted'
    };
  }, [payrolls]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Create account entry from payroll (for automatic accounting)
  const logPayrollToAccounts = useCallback(async (payroll: Payroll) => {
    try {
      // Get employee name for the account entry
      const { data: employee } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", payroll.employee_id)
        .single();

      const employeeName = employee 
        ? `${employee.first_name} ${employee.last_name}`
        : `Employee ${payroll.employee_id}`;

      const payrollAccountData: PayrollAccountEntry = {
        payroll_id: payroll.id!,
        employee_id: payroll.employee_id,
        employee_name: employeeName,
        total_amount: payroll.total_amount,
        basic_salary: payroll.basic_salary,
        adjustments: payroll.adjustments,
        generation_date: payroll.generation_date,
        source: payroll.status === 'Published' ? 'Adjusted' : 'Generated'
      };

      const account = await createAccountFromPayroll(payrollAccountData);
      return account;
    } catch (error) {
      console.error('Error logging payroll to accounts:', error);
      throw error;
    }
  }, []);

  // Process payroll with automatic account creation
  const processPayrollWithAccounting = useCallback(async (payrollId: number) => {
    try {
      // Update payroll status to Paid
      const updatedPayroll = await updatePayrollStatus(payrollId, 'Paid');
      
      // Create corresponding account entry
      if (updatedPayroll) {
        await logPayrollToAccounts(updatedPayroll);
      }

      return updatedPayroll;
    } catch (error) {
      console.error('Error processing payroll with accounting:', error);
      throw error;
    }
  }, [updatePayrollStatus, logPayrollToAccounts]);

  // Check for pending payrolls for any employee in the company
  const checkPendingPayrolls = useCallback(async () => {
    try {
      const companyId = await getCompanyId();
      
      const { data, error } = await supabase
        .from("payrolls")
        .select("id, employee_id, generation_date")
        .eq("company_id", companyId)
        .eq("status", "Pending")
        .limit(1);

      if (error) throw error;
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error checking pending payrolls:', error);
      return null;
    }
  }, []);

  // Generate payroll for company with retry mechanism (client-side implementation)
  const generatePayrollWithRetry = useCallback(async (
    generationDate: string,
    maxRetries: number = 3
  ) => {
    setLoading(true);
    setError(null);
    
    let attempts = 0;
    const failedOperations: string[] = [];
    
    while (attempts < maxRetries) {
      try {
        // Check if there are pending payrolls first
        const pendingPayroll = await checkPendingPayrolls();
        if (pendingPayroll) {
          throw new Error(`Cannot generate payroll. There is a pending payroll for employee from ${pendingPayroll.generation_date}`);
        }

        const companyId = await getCompanyId();
        
        // 1. Get all active employees for this company with their basic_salary
        // Excludes offboarded employees (Resigned/Terminated)
        const { data: employees, error: empErr } = await supabase
          .from("employees")
          .select(`
            id, 
            first_name, 
            last_name, 
            email,
            supervisor_id,
            basic_salary
          `)
          .eq("company_id", companyId)
          .eq("has_approval", "ACCEPTED")
          .in("job_status", ['Active', 'Probation'])
          .gt("basic_salary", 0); // Only employees with salary > 0

        if (empErr) {
          throw new Error(`Error fetching employees: ${empErr.message}`);
        }

        if (!employees || employees.length === 0) {
          throw new Error("No eligible employees found for payroll generation");
        }

        console.log(`Found ${employees.length} eligible employees for payroll generation`);

        // 2. Generate payroll records for each employee
        const payrollRecords = employees.map((emp: any) => ({
          employee_id: emp.id,
          basic_salary: emp.basic_salary || 0,
          adjustments: [], // No adjustments by default
          total_amount: emp.basic_salary || 0,
          generation_date: generationDate,
          company_id: companyId,
          status: 'Pending', // Generate as Pending, sync to accounts only when Published
          supervisor_id: emp.supervisor_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        // 3. Insert payroll records in batches
        const batchSize = 50; // Process in smaller batches to avoid timeout
        const insertedPayrolls = [];
        
        for (let i = 0; i < payrollRecords.length; i += batchSize) {
          const batch = payrollRecords.slice(i, i + batchSize);
          
          const { data: batchResult, error: insertErr } = await supabase
            .from("payrolls")
            .insert(batch)
            .select();

          if (insertErr) {
            throw new Error(`Error inserting payroll batch: ${insertErr.message}`);
          }

          if (batchResult) {
            insertedPayrolls.push(...batchResult);
          }
        }

        console.log(`Successfully generated ${insertedPayrolls.length} payroll records as Pending`);

        // Note: Employees are notified only when payroll is published or paid, not when generated

        setLoading(false);
        
        // Return results with any failed operations noted
        return {
          success: true,
          data: {
            generated: insertedPayrolls.length,
            employees: employees.length,
            status: 'Pending'
          },
          failedOperations: failedOperations.length > 0 ? failedOperations : null
        };

      } catch (error) {
        attempts++;
        console.error(`Payroll generation attempt ${attempts} failed:`, error);
        
        if (attempts >= maxRetries) {
          // Final attempt failed, rollback any partial changes
          try {
            console.log('Rolling back payroll generation...');
            await supabase
              .from("payrolls")
              .delete()
              .eq("generation_date", generationDate)
              .eq("company_id", await getCompanyId());
          } catch (rollbackError) {
            console.error('Failed to rollback payroll generation:', rollbackError);
            failedOperations.push('Failed to rollback partial payroll generation');
          }
          
          setError(error instanceof Error ? error : new Error(String(error)));
          setLoading(false);
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }, [checkPendingPayrolls, logPayrollToAccounts]);

  return {
    // State
    payrolls,
    loading,
    error,
    payrollStats,

    // Actions
    fetchPayrollHistory,
    fetchSupervisedPayrolls,
    updatePayrollStatus,
    clearError,
    
    // Accounting Integration
    logPayrollToAccounts,
    processPayrollWithAccounting,

    // Enhanced Payroll Generation
    checkPendingPayrolls,
    generatePayrollWithRetry,
  };
}