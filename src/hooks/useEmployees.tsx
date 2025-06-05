"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCompanyId } from "@/lib/api/company/companyInfo";

export interface Employee {
  id: string;
  name: string;
  role?: string;
}

export interface ExtendedEmployee extends Employee {
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [extendedEmployees, setExtendedEmployees] = useState<ExtendedEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("company_id", company_id);

      if (error) throw error;

      const employees = data?.map((employee) => ({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
      })) || [];

      setEmployees(employees);
      return employees;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error("Error fetching employees:", errorObj);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExtendedEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, phone_number, department_id(name), designation, hire_date")
        .eq("company_id", company_id);

      if (error) throw error;

      const employees = data?.map((employee) => ({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        phone: employee.phone_number,
        department: (employee.department_id as unknown as { name: string })?.name,
        designation: employee.designation,
        joinDate: employee.hire_date
      })) || [];

      setExtendedEmployees(employees);
      return employees;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error("Error fetching employees:", errorObj);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    employees,
    extendedEmployees,
    loading,
    error,
    fetchEmployees,
    fetchExtendedEmployees
  };
}
