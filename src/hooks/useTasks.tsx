"use client";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Task } from "@/lib/types/schemas";
import { useState, useCallback, useMemo, useRef } from "react";
import { useNotifications } from "./useNotifications";
import { slugify } from "@/lib/utils";
import { captureSupabaseError } from "@/lib/sentry";
import { taskCache } from "@/lib/utils/requestCache";

// Task status variants
export enum TaskStatus {
  INCOMPLETE = "incomplete",
  COMPLETE = "complete",
  ALL = "all"
}

// Task scope variants
export enum TaskScope {
  USER_TASKS = "user_tasks",
  PROJECT_TASKS = "project_tasks",
  MILESTONE_TASKS = "milestone_tasks",
  COMPANY_TASKS = "company_tasks",
  DEPARTMENT_TASKS = "department_tasks"
}

// Simplified filter interface
export interface TaskFilters {
  scope: TaskScope;
  status: TaskStatus;
  projectId?: string;
  milestoneId?: number;
  departmentId?: number;
  assigneeId?: string;
}

// Task fetch result interface
export interface TaskFetchResult {
  tasks: Task[];
  totalCount: number;
  completedCount: number;
  pendingCount: number;
}

// Re-export Task type for components
export type { Task };

export function useTasks() {
  const { employeeInfo } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false); // Start with loading true
  const [error, setError] = useState<Error | null>(null);
  const [ongoingTasks, setOngoingTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    unassigned: number;
    inProgress: number;
  } | null>(null);

  // Use ref to track loading state to avoid dependency issues
  const isLoadingRef = useRef(false);

  const { createNotification } = useNotifications();

  // Helper function to apply status filtering to query

  // Unified fetch function that handles all scenarios
  const fetchTasks = useCallback(async (filters: TaskFilters): Promise<TaskFetchResult> => {

    // Prevent duplicate calls while loading using ref
    if (isLoadingRef.current) {
      return { tasks: [], totalCount: 0, completedCount: 0, pendingCount: 0 };
    }

    const companyId = employeeInfo?.company_id;
    if (!companyId) {
      console.warn('Cannot fetch tasks: Company ID not available');
      return { tasks: [], totalCount: 0, completedCount: 0, pendingCount: 0 };
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("task_records")
        .select("*")
        .eq("company_id", companyId);

      // Apply scope-specific filters
      switch (filters.scope) {
        case TaskScope.USER_TASKS:
          if (!employeeInfo?.id) {
            console.warn('Cannot fetch user tasks: User ID not available');
            isLoadingRef.current = false;
            setLoading(false);
            return { tasks: [], totalCount: 0, completedCount: 0, pendingCount: 0 };
          }
          query = query.contains("assignees", [employeeInfo.id]);
          break;
        case TaskScope.PROJECT_TASKS:
          if (filters.projectId) {
            query = query.eq("project_id", filters.projectId);
          }
          break;
        case TaskScope.MILESTONE_TASKS:
          if (filters.milestoneId) {
            query = query.eq("milestone_id", filters.milestoneId);
          }
          break;
        case TaskScope.DEPARTMENT_TASKS:
          if (filters.departmentId) {
            query = query.eq("department_id", filters.departmentId);
          }
          break;
        case TaskScope.COMPANY_TASKS:
          // No additional filtering needed
          break;
        default:
          break;
      }

      // Apply assignee filter if specified
      if (filters.assigneeId) {
        query = query.contains("assignees", [filters.assigneeId]);
      }

      // Apply status filter
      query = ((query: any, status: TaskStatus) => {
        if (status === TaskStatus.INCOMPLETE) {
          return query.eq("status", false);
        } else if (status === TaskStatus.COMPLETE) {
          return query.eq("status", true);
        }
        // TaskStatus.ALL - no filter applied
        return query;
      })(query, filters.status);

      const { data, error } = await query;

      if (error) throw error;

      const result: TaskFetchResult = {
        tasks: data || [],
        totalCount: data?.length || 0,
        completedCount: data?.filter(t => t.status).length || 0,
        pendingCount: data?.filter(t => !t.status).length || 0,
      };

      // Only update state if tasks have actually changed
      setTasks(prevTasks => {
        const newTasks = result.tasks;
        // Simple comparison - if length is different or data is different, update
        if (prevTasks.length !== newTasks.length ||
          JSON.stringify(prevTasks.map(t => t.id).sort()) !== JSON.stringify(newTasks.map(t => t.id).sort())) {
          return newTasks;
        }
        return prevTasks;
      });
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      captureSupabaseError(
        { message: errorObj.message },
        "fetchTasks",
        { companyId, scope: filters.scope }
      );
      console.error("Error fetching tasks:", err);
      setError(errorObj);
      return { tasks: [], totalCount: 0, completedCount: 0, pendingCount: 0 };
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, []);





  const [hasMoreOngoingTasks, setHasMoreOngoingTasks] = useState(true);
  const [lastFetchedOngoingTaskId, setLastFetchedOngoingTaskId] = useState<string | null>(null);
  const [ongoingTasksLoading, setOngoingTasksLoading] = useState(false);
  const fetchOngoingTasks = useCallback(
    async (companyScopes = false, limit = 10) => {
      try {
        if (!employeeInfo) {
          // Auth context not loaded yet, skip silently
          return;
        }
        setOngoingTasksLoading(true);
        let query = supabase
          .from("task_records")
          .select("*")
          .eq("status", false)
          .eq("company_id", employeeInfo.company_id) // Always filter by company
          .order("id", { ascending: true }) // pagination cursor
          .limit(limit);

        if (!companyScopes) {
          query = query.or(`created_by.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}}`);
        }

        if (lastFetchedOngoingTaskId) {
          // fetch tasks with id greater than last fetched
          query = query.gt("id", lastFetchedOngoingTaskId);
        }

        const { data, error } = await query;


        if (error) throw error;

        if (data.length > 0) {
          setOngoingTasks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNewTasks = data.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNewTasks];
          });;
          setLastFetchedOngoingTaskId(data[data.length - 1].id);
          setHasMoreOngoingTasks(data.length === limit); // if less than limit, no more tasks
        }

        if (data.length === 0) {
          setHasMoreOngoingTasks(false);
        }
        setOngoingTasksLoading(false);
      } catch (err) {
        captureSupabaseError(
          { message: err instanceof Error ? err.message : String(err) },
          "fetchOngoingTasks",
          { companyId: employeeInfo?.company_id, companyScopes }
        );
        console.error("Error fetching ongoing tasks:", err);
        setOngoingTasksLoading(false);
      }
    },
    [lastFetchedOngoingTaskId, employeeInfo]
  );

  // Search ongoing tasks by a search term (task_title or description) using fuzzy search
  const searchOngoingTasks = useCallback(
    async (searchTerm: string, limit = 10, companyScopes = false) => {
      try {
        if (!employeeInfo) {
          // Auth context not loaded yet, skip silently
          return [];
        }
        setOngoingTasksLoading(true);

        // Base query: ongoing tasks
        let query = supabase
          .from("task_records")
          .select("*")
          .eq("status", false)
          .eq("company_id", employeeInfo.company_id) // Always filter by company
          .order("id", { ascending: true })
          .limit(limit);

        // Apply company/user scope
        if (!companyScopes) {
          query = query.or(`created_by.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}}`);
        }

        // Apply search filter (fuzzy search using ilike)
        if (searchTerm.trim() !== "") {
          query = query.or(
            `task_title.ilike.%${searchTerm}%,task_description.ilike.%${searchTerm}%`
          );
        }

        // Cursor pagination
        if (lastFetchedOngoingTaskId) {
          query = query.gt("id", lastFetchedOngoingTaskId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          setOngoingTasks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNewTasks = data.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNewTasks];
          });;
          setLastFetchedOngoingTaskId(data[data.length - 1].id);
          setHasMoreOngoingTasks(data.length === limit);
        } else {
          setHasMoreOngoingTasks(false);
        }

        setOngoingTasksLoading(false);
        return data || [];
      } catch (err) {
        captureSupabaseError(
          { message: err instanceof Error ? err.message : String(err) },
          "searchOngoingTasks",
          { companyId: employeeInfo?.company_id, searchTerm }
        );
        console.error("Error searching ongoing tasks:", err);
        setOngoingTasksLoading(false);
        return [];
      }
    },
    [lastFetchedOngoingTaskId, employeeInfo]
  );




  const [hasMoreCompletedTasks, setHasMoreCompletedTasks] = useState(true);
  const [lastFetchedCompletedTaskId, setLastFetchedCompletedTaskId] = useState<string | null>(null);

  const fetchCompletedTasks = useCallback(
    async (companyScopes = false, limit = 10) => {
      try {
        if (!employeeInfo) {
          // Auth context not loaded yet, skip silently
          return;
        }
        setLoading(true);

        // Base query: Completed tasks only
        let query = supabase
          .from("task_records")
          .select("*")
          .eq("status", true)
          .eq("company_id", employeeInfo.company_id) // Always filter by company
          .order("id", { ascending: true }) // Order by ID for cursor pagination
          .limit(limit);

        // Apply user-specific filtering unless company scope is true
        if (!companyScopes) {
          query = query.or(`created_by.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}}`);
        }

        // Apply cursor (fetch tasks with id greater than last fetched)
        if (lastFetchedCompletedTaskId) {
          query = query.gt("id", lastFetchedCompletedTaskId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          setCompletedTasks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNewTasks = data.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNewTasks];
          });;
          setLastFetchedCompletedTaskId(data[data.length - 1].id);
          setHasMoreCompletedTasks(data.length === limit); // if less than limit → no more tasks
        } else {
          setHasMoreCompletedTasks(false);
        }

        setLoading(false);
      } catch (err) {
        captureSupabaseError(
          { message: err instanceof Error ? err.message : String(err) },
          "fetchCompletedTasks",
          { companyId: employeeInfo?.company_id, companyScopes }
        );
        console.error("Error fetching completed tasks:", err);
        setLoading(false);
      }
    },
    [lastFetchedCompletedTaskId, employeeInfo]
  );

  // Search completed tasks by a search term (task_title or description) using fuzzy search
  const searchCompletedTasks = useCallback(
    async (searchTerm: string, limit = 10, companyScopes = false) => {
      try {
        if (!employeeInfo) {
          // Auth context not loaded yet, skip silently
          return [];
        }
        setLoading(true);

        // Base query: completed tasks
        let query = supabase
          .from("task_records")
          .select("*")
          .eq("status", true) // completed tasks only
          .eq("company_id", employeeInfo.company_id) // Always filter by company
          .order("id", { ascending: true })
          .limit(limit);

        // Apply company/user scope
        if (!companyScopes) {
          query = query.or(`created_by.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}}`);
        }

        // Apply search filter (fuzzy search using ilike)
        if (searchTerm.trim() !== "") {
          query = query.or(
            `task_title.ilike.%${searchTerm}%,task_description.ilike.%${searchTerm}%`
          );
        }

        // Cursor pagination
        if (lastFetchedCompletedTaskId) {
          query = query.gt("id", lastFetchedCompletedTaskId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          setCompletedTasks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNewTasks = data.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNewTasks];
          });;
          setLastFetchedCompletedTaskId(data[data.length - 1].id);
          setHasMoreCompletedTasks(data.length === limit);
        } else {
          setHasMoreCompletedTasks(false);
        }

        setLoading(false);
        return data || [];
      } catch (err) {
        captureSupabaseError(
          { message: err instanceof Error ? err.message : String(err) },
          "searchCompletedTasks",
          { companyId: employeeInfo?.company_id, searchTerm }
        );
        console.error("Error searching completed tasks:", err);
        setLoading(false);
        return [];
      }
    },
    [lastFetchedCompletedTaskId, employeeInfo]
  );



  // Convenience methods for common use cases
  const getUserTasks = useCallback((status: TaskStatus = TaskStatus.INCOMPLETE) => {
    return fetchTasks({ scope: TaskScope.USER_TASKS, status });
  }, [fetchTasks]);

  const getProjectTasks = useCallback((projectId: string, status: TaskStatus = TaskStatus.INCOMPLETE) => {
    return fetchTasks({ scope: TaskScope.PROJECT_TASKS, projectId, status });
  }, [fetchTasks]);

  const getMilestoneTasks = useCallback((milestoneId: number, status: TaskStatus = TaskStatus.INCOMPLETE) => {
    return fetchTasks({ scope: TaskScope.MILESTONE_TASKS, milestoneId, status });
  }, [fetchTasks]);

  const getCompanyTasks = useCallback((status: TaskStatus = TaskStatus.INCOMPLETE) => {
    return fetchTasks({ scope: TaskScope.COMPANY_TASKS, status });
  }, [fetchTasks]);

  const getDepartmentTasks = useCallback((departmentId: number, status: TaskStatus = TaskStatus.INCOMPLETE) => {
    return fetchTasks({ scope: TaskScope.DEPARTMENT_TASKS, departmentId, status });
  }, [fetchTasks]);

  // Get task statistics for a project
  const fetchTaskStats = useCallback(async (projectId: string) => {
    try {
      const result = await fetchTasks({ scope: TaskScope.PROJECT_TASKS, projectId, status: TaskStatus.ALL });

      const statsData = {
        total: result.totalCount,
        completed: result.completedCount,
        unassigned: result.tasks.filter(t => t.milestone_id === null).length,
        inProgress: result.pendingCount
      };

      setStats(statsData);
      return statsData;
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "fetchTaskStats",
        { projectId }
      );
      console.error("Error fetching task stats:", err);
      return null;
    }
  }, [fetchTasks]);

  // Get a single task by ID
  const getTaskById = useCallback(async (taskId: string) => {
    const companyId = employeeInfo?.company_id;
    if (!companyId) {
      console.warn('Cannot get task: Company ID not available');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("task_records")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", taskId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "getTaskById",
        { taskId, companyId }
      );
      console.error("Error fetching task by ID:", err);
      throw err;
    }
  }, [employeeInfo?.company_id]);

  // Create a new task
  const createTask = async (task: Task) => {
    const companyId = employeeInfo?.company_id;
    const userId = employeeInfo?.id;
    if (!companyId || !userId) {
      console.warn('Cannot create task: Company ID or User ID not available');
      return { success: false, error: new Error('Company ID or User ID not available') };
    }

    try {
      console.log("Creating task:", task);

      const taskId = slugify(task.task_title);

      const finalData = {
        ...task,
        id: taskId,
        created_by: userId,
        company_id: companyId
      };

      console.log(finalData)

      // Clean up undefined values


      const { data, error } = await supabase
        .from("task_records")
        .insert(finalData)
        .select()

      if (error) throw error;

      // Refresh tasks after creation
      // if (task.project_id) {
      //   await getProjectTasks(task.project_id, TaskStatus.INCOMPLETE);
      //   await fetchTaskStats(task.project_id);
      // }


      const newTask = data?.[0];
      setOngoingTasks(prev => [newTask, ...prev]);

      // Notify assignees if any

      const assignees = task.assignees || [];
      createNotification({
        title: "New Task Assigned",
        message: `A new task "${task.task_title}" has been assigned to you.`,
        priority: task.priority,
        type_id: 3, // Assuming 3 is the type ID for task assignment
        recipient_id: assignees,
        action_url: `/ops/tasks/${newTask?.id}`,
        company_id: typeof companyId === 'string' ? parseInt(companyId) : companyId,
        department_id: task.department_id
      });

      createNotification({
        title: "New Task Created",
        message: `A new task "${task.task_title}" has been created by ${employeeInfo.name}.`,
        priority: task.priority,
        type_id: 3, // Assuming 3 is the type ID for task assignment
        recipient_id: [employeeInfo.supervisor_id].filter(Boolean) as string[],
        action_url: `/ops/tasks/${newTask?.id}`,
        company_id: typeof companyId === 'string' ? parseInt(companyId) : companyId,
        department_id: task.department_id
      });



      return { success: true, data };
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "createTask",
        { companyId, taskTitle: task.task_title }
      );
      console.error("Error creating task:", err);
      return { success: false, error: err };
    }
  };

  // Update an existing task
  const updateTask = useCallback(async (task: Task) => {
    const companyId = employeeInfo?.company_id;
    if (!companyId) {
      console.warn('Cannot update task: Company ID not available');
      return { success: false, error: new Error('Company ID not available') };
    }

    try {
      const finalData = { ...task };

      // Remove undefined values
      Object.keys(finalData).forEach(key => {
        if (finalData[key as keyof typeof finalData] === undefined || finalData[key as keyof typeof finalData] === null) {
          delete finalData[key as keyof typeof finalData];
        }
      });

      const { data, error } = await supabase
        .from("task_records")
        .update(finalData)
        .eq("id", task.id)
        .select()
        .maybeSingle();

      console.log(data)

      if (error) {
        console.log(error)
        throw error
      };

      // Refresh tasks after update
      // if (task.project_id) {
      //   if (task.milestone_id) {
      //     await getMilestoneTasks(task.milestone_id, TaskStatus.INCOMPLETE);
      //   } else {
      //     await getProjectTasks(task.project_id, TaskStatus.INCOMPLETE);
      //   }
      //   await fetchTaskStats(task.project_id);
      // }

      setOngoingTasks(prev => prev.map(t => t.id === data.id ? data : t));
      // fetchOngoingTasks()
      fetchCompletedTasks()
      const recipients = task.assignees;
      if (employeeInfo?.supervisor_id) {
        recipients.push(employeeInfo.supervisor_id);
      }
      createNotification({
        title: "Task Updated",
        message: `The task "${task.task_title}" has been updated.`,
        priority: 'normal',
        type_id: 3, // 3 is the type ID for task assignment
        recipient_id: recipients,
        action_url: `/ops/tasks/${task.id}`,
        company_id: typeof companyId === 'string' ? parseInt(companyId) : companyId,
        department_id: task.department_id
      });


      return { success: true, data };
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "updateTask",
        { taskId: task.id, companyId }
      );
      console.error("Error updating task:", err);
      return { success: false, error: err };
    }
  }, [getProjectTasks, getMilestoneTasks, fetchTaskStats, employeeInfo, fetchOngoingTasks, fetchCompletedTasks, createNotification]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string, projectId?: string, milestoneId?: number, adminScoped?: boolean) => {
    const companyId = employeeInfo?.company_id;
    if (!companyId) {
      console.warn('Cannot delete task: Company ID not available');
      return { success: false, error: new Error('Company ID not available') };
    }

    try {
      const { error } = await supabase
        .from("task_records")
        .delete()
        .eq("id", taskId)
        .eq("company_id", companyId);

      if (error) throw error;

      // Refresh tasks after deletion
      if (projectId) {
        if (milestoneId) {
          await getMilestoneTasks(milestoneId, TaskStatus.INCOMPLETE);
        } else {
          await getProjectTasks(projectId, TaskStatus.INCOMPLETE);
        }
        await fetchTaskStats(projectId);
      }

      setOngoingTasks(prev => prev.filter(t => t.id !== taskId));
      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));

      // if (adminScoped) {
      //   fetchOngoingTasks(true)
      //   fetchCompletedTasks(true)

      // } else {
      //   fetchOngoingTasks()
      //   fetchCompletedTasks()
      // }

      return { success: true };
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "deleteTask",
        { taskId, companyId }
      );
      console.error("Error deleting task:", err);
      return { success: false, error: err };
    }
  }, [getProjectTasks, getMilestoneTasks, fetchTaskStats, employeeInfo?.company_id]);

  // Mark a task as complete
  const completeTask = useCallback(async (taskId: string, projectId?: string, milestoneId?: number) => {
    const companyId = employeeInfo?.company_id;
    const userId = employeeInfo?.id;
    if (!companyId || !userId) {
      console.warn('Cannot complete task: Company ID or User ID not available');
      return { success: false, error: new Error('Company ID or User ID not available') };
    }

    try {
      const { data, error } = await supabase
        .from("task_records")
        .update({ status: true })
        .eq("id", taskId)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;

      // Refresh tasks after completion
      if (projectId) {
        if (milestoneId) {
          await getMilestoneTasks(milestoneId, TaskStatus.INCOMPLETE);
        } else {
          await getProjectTasks(projectId, TaskStatus.INCOMPLETE);
        }
        await fetchTaskStats(projectId);
      }

      // Send notification to task creator and supervisor
      if (data) {
        const recipients: string[] = [];
        
        // Add task creator if different from current user
        if (data.created_by && data.created_by !== userId) {
          recipients.push(data.created_by);
        }
        
        // Add supervisor if exists
        if (employeeInfo?.supervisor_id) {
          recipients.push(employeeInfo.supervisor_id);
        }

        if (recipients.length > 0) {
          createNotification({
            title: "Task Completed",
            message: `The task "${data.task_title}" has been marked as complete by ${employeeInfo?.name || 'a team member'}.`,
            priority: 'normal',
            type_id: 3,
            recipient_id: recipients,
            action_url: `/ops/tasks/${taskId}`,
            company_id: typeof companyId === 'string' ? parseInt(companyId) : companyId,
            department_id: data.department_id
          });
        }
      }

      return { success: true, data };
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "completeTask",
        { taskId, companyId }
      );
      console.error("Error completing task:", err);
      return { success: false, error: err };
    }
  }, [getProjectTasks, getMilestoneTasks, fetchTaskStats, employeeInfo?.company_id, employeeInfo?.id, employeeInfo?.name, employeeInfo?.supervisor_id, createNotification]);

  // Reopen a completed task
  const reopenTask = useCallback(async (taskId: string, projectId?: string, milestoneId?: number) => {
    const companyId = employeeInfo?.company_id;
    if (!companyId) {
      console.warn('Cannot reopen task: Company ID not available');
      return { success: false, error: new Error('Company ID not available') };
    }

    try {
      const { data, error } = await supabase
        .from("task_records")
        .update({ status: false })
        .eq("id", taskId)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;

      // Refresh tasks after reopening
      if (projectId) {
        if (milestoneId) {
          await getMilestoneTasks(milestoneId, TaskStatus.INCOMPLETE);
        } else {
          await getProjectTasks(projectId, TaskStatus.INCOMPLETE);
        }
        await fetchTaskStats(projectId);
      }

      return { success: true, data };
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "reopenTask",
        { taskId, companyId }
      );
      console.error("Error reopening task:", err);
      return { success: false, error: err };
    }
  }, [getProjectTasks, getMilestoneTasks, fetchTaskStats, employeeInfo?.company_id]);

  // Bulk update task milestone
  const updateMilestone = useCallback(async (taskIds: string[], milestoneId: number | null, projectId: string) => {
    const companyId = employeeInfo?.company_id;
    const userId = employeeInfo?.id;
    if (!companyId || !userId) {
      console.warn('Cannot update milestone: Company ID or User ID not available');
      return { success: false, error: new Error('Company ID or User ID not available') };
    }

    try {
      const { data, error } = await supabase
        .from("task_records")
        .update({
          milestone_id: milestoneId,
          updated_by: userId,
          updated_at: new Date().toLocaleDateString('sv-SE')
        })
        .in("id", taskIds)
        .eq("company_id", companyId)
        .select();

      if (error) throw error;

      // Refresh tasks after milestone update
      await getProjectTasks(projectId, TaskStatus.INCOMPLETE);
      await fetchTaskStats(projectId);

      return { success: true, data };
    } catch (err) {
      captureSupabaseError(
        { message: err instanceof Error ? err.message : String(err) },
        "updateMilestone",
        { taskIds, milestoneId, projectId, companyId }
      );
      console.error("Error updating task milestone:", err);
      return { success: false, error: err };
    }
  }, [getProjectTasks, fetchTaskStats]);

  // Cache management - must be at top level, not inside useMemo
  const invalidateTaskCache = useCallback(() => taskCache.invalidateAll(), []);

  return useMemo(() => ({
    // State
    tasks,
    ongoingTasks,
    ongoingTasksLoading,
    completedTasks,
    loading,
    error,
    stats,

    hasMoreOngoingTasks,
    lastFetchedOngoingTaskId,
    searchOngoingTasks,

    hasMoreCompletedTasks,
    lastFetchedCompletedTaskId,
    searchCompletedTasks,

    // Main fetch function
    fetchTasks,
    fetchOngoingTasks,
    fetchCompletedTasks,

    // Convenience methods
    getUserTasks,
    getProjectTasks,
    getMilestoneTasks,
    getCompanyTasks,
    getDepartmentTasks,
    getTaskById,

    // Stats
    fetchTaskStats,

    // CRUD operations
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,
    updateMilestone,

    // Cache management
    invalidateTaskCache,
  }), [
    tasks,
    ongoingTasks,
    completedTasks,
    loading,
    ongoingTasksLoading,
    error,
    stats,

    hasMoreOngoingTasks,
    lastFetchedOngoingTaskId,
    searchOngoingTasks,

    hasMoreCompletedTasks,
    lastFetchedCompletedTaskId,
    searchCompletedTasks,



    fetchTasks,
    fetchOngoingTasks,
    fetchCompletedTasks,
    getUserTasks,
    getProjectTasks,
    getMilestoneTasks,
    getCompanyTasks,
    getDepartmentTasks,
    getTaskById,
    fetchTaskStats,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,
    updateMilestone,
    invalidateTaskCache,
  ]);
}
