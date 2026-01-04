"use client";

import { useCallback, useState } from "react";
import { useBaseEntity } from "./core";
import { Department } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { departmentCache } from "@/lib/utils/requestCache";

export type { Department };

export function useDepartments() {
  const { user, isLoading: authLoading, employeeInfo } = useAuth();
  const baseResult = useBaseEntity<Department>({
    tableName: "departments",
    entityName: "department",
    companyScoped: true,
  });

  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)

  // Manual fetch all departments
  const fetchDepartments = useCallback(async (company_id?: number | undefined) => {
    const companyId = company_id ?? employeeInfo?.company_id;
    if (!companyId) {
      setDepartments([]);
      return [];
    }

    try {
      setLoading(true);
      const cacheKey = `all-${companyId}`;
      
      const data = await departmentCache.fetch<Department[]>(cacheKey, async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("departments")
          .select("*")
          .eq("company_id", companyId);

        if (error) throw error;
        return data || [];
      });

      setDepartments(data);
      return data;
    } catch (error) {
      setDepartments([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [employeeInfo?.company_id]);

  // Manual create department
  const createDepartment = useCallback(async (dept: Department) => {
    if (authLoading || !user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      const supabase = await createClient();
      const companyId = employeeInfo?.company_id;
      if (!companyId) {
        throw new Error('Company ID not available');
      }

      // Remove `id` before inserting
      const { id, ...insertData } = dept;

      insertData.company_id = companyId;


      const { data, error } = await supabase
        .from("departments")
        .insert([insertData]) // <-- id is not included
        .select()
        .single();

      if (error) throw error;

      // update head employee if head_id exists
      if (data?.head_id) {
        await supabase
          .from("employees")
          .update({ department_id: data.id })
          .eq("id", data.head_id);
      }

      // Invalidate cache and re-fetch
      departmentCache.invalidateAll();
      await fetchDepartments();

      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, employeeInfo?.company_id, fetchDepartments]);

  // Manual update department
  const updateDepartment = useCallback(async (id: number, dept: Partial<Department>) => {
    if (authLoading || !user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true)

      const supabase = await createClient();

      const { data, error } = await supabase
        .from("departments")
        .update(dept)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // update head employee if head_id exists
      if (dept.head_id) {
        await supabase
          .from("employees")
          .update({ department_id: id })
          .eq("id", dept.head_id);
      }

      // Invalidate cache and re-fetch
      departmentCache.invalidateAll();
      await fetchDepartments();

      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, fetchDepartments]);

  // Manual delete department
  const deleteDepartment = useCallback(async (id: number) => {
    if (authLoading || !user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true)

      const supabase = await createClient();

      // remove department from employees first
      await supabase
        .from("employees")
        .update({ department_id: null })
        .eq("department_id", id);

      const { data, error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache and re-fetch
      departmentCache.invalidateAll();
      await fetchDepartments();

      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, fetchDepartments]);

  /**
   * Invalidate department cache - call after external mutations
   */
  const invalidateDepartmentCache = useCallback(() => {
    departmentCache.invalidateAll();
  }, []);

  return {
    ...baseResult,
    loading,
    departments,
    department: baseResult.item,
    fetchDepartment: baseResult.fetchItem,
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    invalidateDepartmentCache,
  }
}
