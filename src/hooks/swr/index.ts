"use client";

/**
 * SWR-based Data Fetching Hooks
 * 
 * These hooks provide automatic caching, deduplication, and revalidation
 * for data fetching. They prevent refetching on tab switches and
 * provide optimistic updates.
 * 
 * @example
 * ```tsx
 * // In a component
 * const { tasks, isLoading, error, refresh } = useTasksSWR();
 * 
 * // With filters
 * const { tasks } = useTasksSWR({ status: 'ongoing', limit: 20 });
 * ```
 */

import useSWR, { SWRConfiguration, mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Task } from "@/lib/types/schemas";
import { Project } from "@/lib/types";
import { Employee } from "@/lib/types/schemas";
import { useCallback, useMemo } from "react";

// Default SWR options optimized for performance
const defaultSWROptions: SWRConfiguration = {
  revalidateOnFocus: false,      // Don't refetch on tab switch
  revalidateOnReconnect: false,  // Don't refetch on reconnect
  dedupingInterval: 60000,       // Dedupe requests within 1 minute
  errorRetryCount: 3,            // Retry failed requests 3 times
  shouldRetryOnError: true,      // Enable retry on error
};

// ============ TASKS ============

export interface TasksSWROptions {
  status?: "ongoing" | "completed" | "all";
  limit?: number;
  projectId?: string;
  milestoneId?: number;
}

/**
 * Fetch tasks with SWR caching
 */
export function useTasksSWR(options: TasksSWROptions = {}) {
  const { employeeInfo } = useAuth();
  const { status = "all", limit = 50, projectId, milestoneId } = options;

  const cacheKey = useMemo(() => {
    if (!employeeInfo?.company_id) return null;
    return ["tasks", employeeInfo.company_id, status, limit, projectId, milestoneId];
  }, [employeeInfo?.company_id, status, limit, projectId, milestoneId]);

  const fetcher = useCallback(async () => {
    if (!employeeInfo?.company_id) return [];

    let query = supabase
      .from("task_records")
      .select("*")
      .eq("company_id", employeeInfo.company_id)
      .limit(limit);

    // Apply status filter
    if (status === "ongoing") {
      query = query.eq("status", false);
    } else if (status === "completed") {
      query = query.eq("status", true);
    }

    // Apply project filter
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    // Apply milestone filter
    if (milestoneId) {
      query = query.eq("milestone_id", milestoneId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data as Task[];
  }, [employeeInfo?.company_id, status, limit, projectId, milestoneId]);

  const { data, error, isLoading, isValidating, mutate: mutateTasks } = useSWR(
    cacheKey,
    fetcher,
    defaultSWROptions
  );

  // Optimistic update helper
  const optimisticUpdate = useCallback(
    async (updateFn: (tasks: Task[]) => Task[], serverFn: () => Promise<void>) => {
      // Optimistically update the UI
      await mutateTasks(
        async (currentData) => {
          const updatedData = updateFn(currentData || []);
          // Perform server update
          await serverFn();
          return updatedData;
        },
        { revalidate: false }
      );
    },
    [mutateTasks]
  );

  return {
    tasks: data || [],
    isLoading,
    isValidating,
    error,
    refresh: () => mutateTasks(),
    optimisticUpdate,
  };
}

// ============ PROJECTS ============

export interface ProjectsSWROptions {
  status?: "ongoing" | "completed" | "draft";
  limit?: number;
}

/**
 * Fetch projects with SWR caching
 */
export function useProjectsSWR(options: ProjectsSWROptions = {}) {
  const { employeeInfo } = useAuth();
  const { status = "ongoing", limit = 50 } = options;

  const cacheKey = useMemo(() => {
    if (!employeeInfo?.company_id) return null;
    return ["projects", employeeInfo.company_id, status, limit];
  }, [employeeInfo?.company_id, status, limit]);

  const fetcher = useCallback(async () => {
    if (!employeeInfo?.company_id) return [];

    let query = supabase
      .from("project_records")
      .select("*")
      .eq("company_id", employeeInfo.company_id)
      .limit(limit);

    // Apply status filter
    if (status === "ongoing") {
      query = query.eq("status", "Ongoing").eq("is_draft", false);
    } else if (status === "completed") {
      query = query.eq("status", "Completed").eq("is_draft", false);
    } else if (status === "draft") {
      query = query.eq("is_draft", true);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data as Project[];
  }, [employeeInfo?.company_id, status, limit]);

  const { data, error, isLoading, isValidating, mutate: mutateProjects } = useSWR(
    cacheKey,
    fetcher,
    defaultSWROptions
  );

  return {
    projects: data || [],
    isLoading,
    isValidating,
    error,
    refresh: () => mutateProjects(),
  };
}

// ============ EMPLOYEES ============

/**
 * Fetch employees with SWR caching
 */
export function useEmployeesSWR() {
  const { employeeInfo } = useAuth();

  const cacheKey = useMemo(() => {
    if (!employeeInfo?.company_id) return null;
    return ["employees", employeeInfo.company_id];
  }, [employeeInfo?.company_id]);

  const fetcher = useCallback(async () => {
    if (!employeeInfo?.company_id) return [];

    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, designation, department_id(name)")
      .eq("company_id", employeeInfo.company_id)
      .in("job_status", ["Active", "Probation", "On Leave"]);

    if (error) throw error;

    return data?.map((emp) => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      email: emp.email,
      designation: emp.designation || undefined,
      department: (emp.department_id as unknown as { name: string })?.name || undefined,
    })) as Employee[];
  }, [employeeInfo?.company_id]);

  const { data, error, isLoading, mutate: mutateEmployees } = useSWR(
    cacheKey,
    fetcher,
    {
      ...defaultSWROptions,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes for employees (changes less often)
    }
  );

  return {
    employees: data || [],
    isLoading,
    error,
    refresh: () => mutateEmployees(),
  };
}

// ============ GLOBAL INVALIDATION ============

/**
 * Invalidate all SWR caches for a specific type
 */
export function invalidateSWRCache(type: "tasks" | "projects" | "employees" | "all") {
  if (type === "all") {
    mutate(() => true, undefined, { revalidate: true });
  } else {
    mutate(
      (key) => Array.isArray(key) && key[0] === type,
      undefined,
      { revalidate: true }
    );
  }
}

/**
 * Prefetch data into SWR cache
 */
export function prefetchSWR<T>(key: any[], fetcher: () => Promise<T>) {
  return mutate(key, fetcher(), { revalidate: false });
}

export default {
  useTasksSWR,
  useProjectsSWR,
  useEmployeesSWR,
  invalidateSWRCache,
  prefetchSWR,
};
