/**
 * Personal Info API functions
 * Handles employee personal information management
 */

import { supabase } from "@/lib/supabase/client";
import { getEmployeeInfo } from "../context";

export async function fetchPersonalInfo() {
  const employeeInfo = await getEmployeeInfo();
  
  const { data, error } = await supabase
    .from('personal_infos')
    .select('*')
    .eq('id', employeeInfo.id)
    .single();

  if (error) throw error;
  return data;
}

// Alias for current user personal info
export const fetchCurrentUserPersonalInfo = fetchPersonalInfo;

// Function to fetch another user's personal info by ID
export async function fetchUserPersonalInfo(userId: string) {
  const { data, error } = await supabase
    .from('personal_infos')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePersonalInfo(updates: any) {
  const employeeInfo = await getEmployeeInfo();
  
  const { data, error } = await supabase
    .from('personal_infos')
    .update(updates)
    .eq('id', employeeInfo.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
