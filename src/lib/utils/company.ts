/**
 * Company validation utilities
 * Functions for validating company information
 */

import { supabase } from "@/lib/supabase/client";
import { getCompanyId, getCompanyInfo, getEmployeeId } from "./auth";

/**
 * Validate company code and return company details
 * Uses API route to bypass RLS for new users during onboarding
 */
export async function validateCompanyCode(code: string) {
  try {
    const response = await fetch('/api/onboarding/verify-company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok && response.status !== 200) {
      throw new Error(data.error || 'Failed to verify company code');
    }

    return {
      exists: data.isValid,
      isValid: data.isValid,
      id: data.id || null,
      name: data.name || null,
      error: data.error,
    };
  } catch (error) {
    console.error('Error validating company code:', error);
    throw error;
  }
}

export async function getDepartmentIds () {
  const companyId = await getCompanyId();
  const { data, error } = await supabase
    .from('departments')
    .select('id')
    .eq('company_id', companyId);
  if (error) {
    console.error("Error fetching department IDs:", error);
    return [];
  }
  return data?.map(dept => dept.id) || [];
}

export async function getDepartmentEmployeesIds(department_id: number) {
  const companyId = await getCompanyId();

  let query = supabase
    .from("employees")
    .select("id")
    .eq("company_id", companyId)
    .in("job_status", ['Active', 'Probation']); // Only active employees

  if (department_id !== 0) {
    query = query.eq("department_id", department_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching department employees:", error);
    return [];
  }

  return data?.map((emp) => emp.id) || [];
}

