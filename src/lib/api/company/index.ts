/**
 * Company API Module
 * 
 * This file re-exports all company-related API functions
 */

import { supabase } from "@/lib/supabase/client";
import { getCompanyId } from "./companyInfo";
import { getEmployeeId } from "../employee";

// Re-export company info functions
export * from './companyInfo';
export * from './departments';
export * from './divisions';
export * from './employees';
export * from './grades';
export * from './positions';

export async function getDesignations() {
  const company_id = await getCompanyId();
  const { data, error } = await supabase
    .from("designations")
    .select(
      `
    id,
    positions(
        name
    )
    `
    )
    .eq("company_id", company_id);
  if (error) {
    throw error;
  }
  return data;
}


export async function validateCompanyCode(
  name: string,
  code: string
): Promise<{ isValid: boolean; id: number | null }> {
  const id: number | null = null;
  const isValid: boolean = false;
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .eq("code", code)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No row found (PostgREST code for no result on single)
      return { isValid, id };
    }
    throw error;
  }
  if (!data || data.name !== name) {
    return { isValid: false, id };
  }

  return { isValid: true, id: data.id };
} 