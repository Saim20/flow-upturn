"use client";

import React, { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Pencil, TrashSimple, Plus, Target, Users, ArrowUpRight, CaretLeft } from "@phosphor-icons/react";
import { Employee } from "@/lib/types/schemas";
import { Milestone } from "@/hooks/useMilestones";
import { Task, useTasks } from "@/hooks/useTasks";
import { createClient } from '@/lib/supabase/client';
import TaskCreateModal from "../../tasks/shared/TaskCreateModal";
import TaskUpdateModal from "../../tasks/shared/TaskUpdateModal";
import TaskDetails from "../../tasks/shared/TaskDetails";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getCompanyId, getEmployeeId } from "@/lib/utils/auth";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/auth-context";
import { captureSupabaseError } from "@/lib/sentry";
import { PERMISSION_MODULES } from "@/lib/constants";

// Allow partial employee objects with at minimum id and name
type EmployeeBasic = Pick<Employee, 'id' | 'name'> & Partial<Employee>;

interface MilestoneDetailsProps {
  id: number;
  onClose: () => void;
  project_created_by: string;
  employees: EmployeeBasic[];
}

function formatDate(dateStr: string): string {
  const [year, month, dayStr] = dateStr.split("-");
  const day = parseInt(dayStr, 10);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthName = months[parseInt(month, 10) - 1];

  return `${day} ${monthName}, ${year}`;
}

export default function MilestoneDetails({
  id,
  onClose,
  project_created_by,
  employees,
}: MilestoneDetailsProps) {
  const [milestoneId, setMilestoneId] = useState<number>(id);
  const [milestoneDetails, setMilestoneDetails] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tasks states and functions
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { createTask, updateTask, deleteTask } = useTasks();
  const [taskDetailsId, setTaskDetailsId] = useState<string | null>(null);
  const { canWrite, canDelete } = useAuth();

  // Permission checks
  const canWriteTasks = canWrite(PERMISSION_MODULES.TASKS);
  const canDeleteTasks = canDelete(PERMISSION_MODULES.TASKS);

  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    const initUserId = async () => {
      const userId = await getEmployeeId();

      setUserId(userId)
    }

    initUserId()
  }, [])

  const handleCreateTask = async (values: any) => {
    try {
      const result = await createTask(values);
      
      if (!result || !result.success) {
        const errorMessage = result?.error && typeof result.error === 'object' && 'message' in result.error 
          ? (result.error as { message: string }).message 
          : "Failed to create task";
        toast.error(errorMessage);
        return;
      }
      
      setIsCreatingTask(false);
      fetchTasksByMilestoneId(milestoneId);
      toast.success("Task created successfully!");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Error creating task");
    }
  };

  const handleUpdateTask = async (values: any) => {
    try {
      const result = await updateTask(values);
      
      if (!result || !result.success) {
        const errorMessage = result?.error && typeof result.error === 'object' && 'message' in result.error 
          ? (result.error as { message: string }).message 
          : "Failed to update task";
        toast.error(errorMessage);
        return;
      }
      
      setSelectedTask(null);
      fetchTasksByMilestoneId(milestoneId);
      toast.success("Task updated successfully!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Error updating task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      fetchTasksByMilestoneId(milestoneId);
      toast.success("Task deleted successfully")
    } catch (error) {
      toast.error("Error deleting task");
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "handleDeleteTask",
        { taskId: id, milestoneId }
      );
    }
  };

  const handleDisplayUpdateTaskModal = (id: string) => {
    const selectedTask = tasks.find((task: Task) => task.id === id);
    if (selectedTask) setSelectedTask(selectedTask);
  };

  async function fetchMilestoneDetails(id: number) {
    setLoading(true);
    const client = createClient();
    const company_id = await getCompanyId();

    try {
      const { data, error } = await client
        .from("milestone_records")
        .select("*")
        .eq("id", id)
        .eq("company_id", company_id);

      if (error) {
        setError("Error fetching Milestone details");
        captureSupabaseError(error, "fetchMilestoneDetails", { milestoneId: id, companyId: company_id });
        return;
      }

      setMilestoneDetails(data[0]);
    } catch (error) {
      setError("Error fetching Milestone details");
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchMilestoneDetails",
        { milestoneId: id }
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchTasksByMilestoneId(id: number) {
    setLoadingTasks(true);
    const client = createClient();
    const company_id = await getCompanyId();

    try {
      const { data, error } = await client
        .from("task_records")
        .select("*")
        .eq("milestone_id", id)
        .eq("company_id", company_id)
        .order("created_at", { ascending: true });

      if (error) {
        setError("Error fetching tasks");
        captureSupabaseError(error, "fetchTasksByMilestoneId", { milestoneId: id, companyId: company_id });
        return;
      }

      const formatData = data?.map((item) => {
        const { created_at, updated_at, department_id, ...rest } = item;
        return rest;
      });

      setTasks(formatData);
    } catch (error) {
      setError("Error fetching tasks");
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchTasksByMilestoneId",
        { milestoneId: id }
      );
    } finally {
      setLoadingTasks(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchMilestoneDetails(id);
      fetchTasksByMilestoneId(id);
      setMilestoneId(id);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {!taskDetailsId && (
        <div className="w-full p-4 sm:p-6 lg:p-10 text-foreground-primary">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Target size={24} className="text-foreground-secondary" weight="regular" />
              <h2 className="text-xl md:text-2xl font-semibold">
                Milestone Details
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary rounded-md hover:bg-surface-hover transition-colors duration-150"
            >
              <CaretLeft size={16} weight="regular" />
              Back
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-primary rounded-lg border border-border-primary p-6 shadow-sm space-y-4"
          >
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground-secondary">Milestone Name:</span>
                <span className="text-foreground-primary">
                  {milestoneDetails?.milestone_title || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground-secondary">Status:</span>
                {/* <span className="px-2 py-1 rounded-full text-sm bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary">
                  {milestoneDetails?.status || "N/A"}
                </span> */}

                <StatusBadge
                  status={milestoneDetails?.status || "N/A"}
                />
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground-secondary">Assignees:</span>
                <div className="flex flex-wrap gap-2">
                  {(milestoneDetails?.assignees && milestoneDetails.assignees.length > 0) ? (
                    milestoneDetails.assignees.map((assignee: string, i: number) => (
                      <span
                        key={i}
                        className="bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary text-xs px-2 py-1 rounded-full"
                      >
                        {employees.find((employee) => employee.id === assignee)?.name || "N/A"}
                      </span>
                    ))
                  ) : (
                    <span className="text-foreground-tertiary text-sm">No assignees</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-6 pt-4 text-sm border-t border-border-primary">
              <div className="flex items-center gap-2 text-foreground-secondary">
                <Calendar size={16} weight="regular" />
                <span>
                  <span className="font-medium">Start:</span>{" "}
                  {formatDate(milestoneDetails?.start_date || "")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground-secondary">
                <Calendar size={16} weight="regular" />
                <span>
                  <span className="font-medium">End:</span>{" "}
                  {formatDate(milestoneDetails?.end_date || "")}
                </span>
              </div>
            </div>

            {milestoneDetails?.description && (
              <div className="pt-4 border-t border-border-primary">
                <p className="text-foreground-secondary">{milestoneDetails.description}</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Target size={20} className="text-foreground-secondary" weight="regular" />
                <h3 className="text-lg font-semibold">Task List</h3>
              </div>

              {canWriteTasks && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setIsCreatingTask(true)}
                  aria-label="Add new task"
                  className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-150 shadow-sm"
                >
                  <Plus size={16} weight="bold" />
                  Add Task
                </motion.button>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {!loadingTasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="bg-surface-primary rounded-lg border border-border-primary p-4 shadow-sm space-y-3"
                  >
                    <div className="font-medium text-foreground-primary">
                      {task.task_title}
                    </div>
                    <div className="flex justify-end items-center gap-2">
                      {canWriteTasks && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label="Edit task"
                          onClick={() => task.id !== null && handleDisplayUpdateTaskModal(task.id!)}
                          className="p-1.5 text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary dark:hover:bg-surface-secondary rounded-full transition-colors duration-150"
                        >
                          <Pencil size={15} weight="regular" />
                        </motion.button>
                      )}
                      
                      {canDeleteTasks && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label="Delete task"
                          onClick={() => task.id !== null && handleDeleteTask(task.id!)}
                          className="p-1.5 text-foreground-secondary hover:text-error hover:bg-error/10 dark:hover:bg-error/20 rounded-full transition-colors duration-150"
                        >
                          <TrashSimple size={15} weight="regular" />
                        </motion.button>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="View task details"
                        onClick={() => task.id !== null && setTaskDetailsId(task.id!)}
                        className="p-1.5 text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary dark:hover:bg-surface-secondary rounded-full transition-colors duration-150 ml-2"
                      >
                        <ArrowUpRight size={15} weight="regular" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              ) : loadingTasks ? (
                <div className="col-span-3 flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center h-32 text-foreground-tertiary">
                  <Target size={32} weight="thin" className="mb-3 text-foreground-tertiary" />
                  <p>No tasks found</p>
                </div>
              )}
            </div>
          </motion.div>

          {isCreatingTask && (
            <TaskCreateModal
              projectId={milestoneDetails?.project_id ?? ""}
              milestoneId={milestoneId}
              milestoneTitle={milestoneDetails?.milestone_title}
              onClose={() => setIsCreatingTask(false)}
              onSubmit={handleCreateTask}
            />
          )}

          {selectedTask && (
            <TaskUpdateModal
              initialData={{
                id: selectedTask.id,
                task_title: selectedTask.task_title,
                task_description: selectedTask.task_description,
                start_date: selectedTask.start_date,
                end_date: selectedTask.end_date,
                priority: selectedTask.priority,
                status: selectedTask.status || false,
                project_id: selectedTask.project_id,
                milestone_id: selectedTask.milestone_id,
                assignees: selectedTask.assignees,
              }}
              milestoneTitle={milestoneDetails?.milestone_title}
              onClose={() => setSelectedTask(null)}
              onSubmit={handleUpdateTask}
            />
          )}
        </div>
      )}

      {taskDetailsId && (
        <TaskDetails
          id={taskDetailsId}
          onTaskStatusUpdate={() => fetchTasksByMilestoneId(milestoneId)}
          onClose={() => setTaskDetailsId(null)}
        />
      )}
    </div>
  );
}
