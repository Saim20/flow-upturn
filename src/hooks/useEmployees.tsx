"use client";

import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Employee } from "@/lib/types/schemas";
import { captureSupabaseError } from "@/lib/sentry";
import { ACTIVE_STATUSES, OFFBOARDED_STATUSES } from "@/lib/constants";
import { employeeCache } from "@/lib/utils/requestCache";

export interface ExtendedEmployee extends Employee {
  role?: string;
  phone?: string;
  joinDate?: string;
  basic_salary?: number;
  supervisor_id?: string | null;
  supervisor_name?: string;
  job_status?: string;
}

export function useEmployees() {
  const { employeeInfo } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [extendedEmployees, setExtendedEmployees] = useState<ExtendedEmployee[]>([]);
  const [offboardedEmployees, setOffboardedEmployees] = useState<ExtendedEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch active employees only (excludes Resigned/Terminated)
   * Use this for most employee selections and listings
   */
  const fetchEmployees = useCallback(async (company_id?: number) => {
    const companyId = company_id ?? employeeInfo?.company_id;
    if (!companyId) {
      return [];
    }

    setLoading(true);
    setError(null);
    
    try {
      const cacheKey = `active-${companyId}`;
      
      const employees = await employeeCache.fetch<Employee[]>(cacheKey, async () => {
        const { data, error } = await supabase
          .from("employees")
          .select("id, first_name, last_name, email, designation, department_id(name)")
          .eq("company_id", companyId)
          .in("job_status", ACTIVE_STATUSES);

        if (error) throw error;

        return data?.map((employee) => ({
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          designation: employee.designation || undefined,
          department: (employee.department_id as unknown as { name: string })?.name || undefined
        })) || [];
      });

      setEmployees(employees);
      return employees;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      captureSupabaseError(
        { message: errorObj.message },
        "fetchEmployees",
        { companyId }
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, [employeeInfo?.company_id]);

  /**
   * Fetch extended employee data for active employees only
   * Includes additional fields like phone, join date, salary, supervisor
   */
  const fetchExtendedEmployees = useCallback(async () => {
    const companyId = employeeInfo?.company_id;
    if (!companyId) {
      return [];
    }

    setLoading(true);
    setError(null);
    
    try {
      const cacheKey = `extended-${companyId}`;
      
      const employees = await employeeCache.fetch<ExtendedEmployee[]>(cacheKey, async () => {
        const { data, error } = await supabase
          .from("employees")
          .select("id, first_name, last_name, email, phone_number, department_id(name), designation, hire_date, basic_salary, supervisor_id, job_status")
          .eq("company_id", companyId)
          .in("job_status", ACTIVE_STATUSES);

        if (error) throw error;

        // Create a map for quick supervisor name lookup
        const employeeMap = new Map<string, string>();
        data?.forEach((emp) => {
          employeeMap.set(emp.id, `${emp.first_name} ${emp.last_name}`);
        });

        return data?.map((employee) => ({
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          designation: employee.designation || undefined,
          department: (employee.department_id as unknown as { name: string })?.name || undefined,
          phone: employee.phone_number,
          joinDate: employee.hire_date,
          basic_salary: employee.basic_salary,
          supervisor_id: employee.supervisor_id,
          supervisor_name: employee.supervisor_id ? employeeMap.get(employee.supervisor_id) || "Unknown" : undefined,
          job_status: employee.job_status,
        })) || [];
      });

      setExtendedEmployees(employees);
      return employees;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      captureSupabaseError(
        { message: errorObj.message },
        "fetchExtendedEmployees",
        { companyId: employeeInfo?.company_id }
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, [employeeInfo?.company_id]);

  /**
   * Fetch offboarded employees (Resigned/Terminated) for viewing in dedicated section
   */
  const fetchOffboardedEmployees = useCallback(async () => {
    const companyId = employeeInfo?.company_id;
    if (!companyId) {
      return [];
    }

    setLoading(true);
    setError(null);
    
    try {
      const cacheKey = `offboarded-${companyId}`;
      
      const employees = await employeeCache.fetch<ExtendedEmployee[]>(cacheKey, async () => {
        const { data, error } = await supabase
          .from("employees")
          .select("id, first_name, last_name, email, phone_number, department_id(name), designation, hire_date, basic_salary, supervisor_id, job_status")
          .eq("company_id", companyId)
          .in("job_status", OFFBOARDED_STATUSES)
          .order("first_name", { ascending: true });

        if (error) throw error;

        // Create a map for quick supervisor name lookup - fetch all employees for supervisor lookup
        const { data: allEmployees } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("company_id", companyId);

        const employeeMap = new Map<string, string>();
        allEmployees?.forEach((emp) => {
          employeeMap.set(emp.id, `${emp.first_name} ${emp.last_name}`);
        });

        return data?.map((employee) => ({
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          designation: employee.designation || undefined,
          department: (employee.department_id as unknown as { name: string })?.name || undefined,
          phone: employee.phone_number,
          joinDate: employee.hire_date,
          basic_salary: employee.basic_salary,
          supervisor_id: employee.supervisor_id,
          supervisor_name: employee.supervisor_id ? employeeMap.get(employee.supervisor_id) || "Unknown" : undefined,
          job_status: employee.job_status,
        })) || [];
      });

      setOffboardedEmployees(employees);
      return employees;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      captureSupabaseError(
        { message: errorObj.message },
        "fetchOffboardedEmployees",
        { companyId: employeeInfo?.company_id }
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, [employeeInfo?.company_id]);

  /**
   * Fetch employees by specific IDs - use this to avoid N+1 queries
   * when you only need to display names for specific employees
   */
  const fetchEmployeesByIds = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) {
      return [];
    }

    // FunnelSimple out null/undefined and deduplicate
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, designation, department_id(name)")
        .in("id", uniqueIds);

      if (error) throw error;

      const fetchedEmployees: Employee[] = data?.map((employee) => ({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        designation: employee.designation || undefined,
        department: (employee.department_id as unknown as { name: string })?.name || undefined
      })) || [];

      // Merge with existing employees to avoid losing data
      setEmployees((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newEmployees = fetchedEmployees.filter((e) => !existingIds.has(e.id));
        return [...prev, ...newEmployees];
      });

      return fetchedEmployees;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      captureSupabaseError(
        { message: errorObj.message },
        "fetchEmployeesByIds",
        { ids: uniqueIds }
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Invalidate employee cache - call after mutations (add/update/delete employee)
   */
  const invalidateEmployeeCache = useCallback(() => {
    employeeCache.invalidateAll();
  }, []);

  return useMemo(() => ({
    employees,
    extendedEmployees,
    offboardedEmployees,
    loading,
    error,
    fetchEmployees,
    fetchExtendedEmployees,
    fetchOffboardedEmployees,
    fetchEmployeesByIds,
    invalidateEmployeeCache,
  }), [employees, extendedEmployees, offboardedEmployees, loading, error, fetchEmployees, fetchExtendedEmployees, fetchOffboardedEmployees, fetchEmployeesByIds, invalidateEmployeeCache]);
}
