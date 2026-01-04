"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Calendar, Pencil, TrashSimple, Plus, Target, ArrowUpRight, Clock, CheckCircle, Tag, User } from "@phosphor-icons/react";
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

type EmployeeBasic = Pick<Employee, 'id' | 'name'> & Partial<Employee>;

interface MilestoneDetailsViewProps {
  id: number;
  projectId: string;
  onClose: () => void;
  project_created_by: string;
  employees: EmployeeBasic[];
  milestoneDetails: Milestone | null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  const [year, month, dayStr] = dateStr.split("-");
  const day = parseInt(dayStr, 10);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = months[parseInt(month, 10) - 1];
  return `${day} ${monthName}, ${year}`;
}

export default function MilestoneDetailsView({
  id,
  projectId,
  employees,
  milestoneDetails: initialMilestoneDetails,
}: MilestoneDetailsViewProps) {
  const [milestoneId] = useState<number>(id);
  const [milestoneDetails] = useState<Milestone | null>(initialMilestoneDetails);
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { createTask, updateTask, deleteTask } = useTasks();
  const [taskDetailsId, setTaskDetailsId] = useState<string | null>(null);
  const { canWrite, canDelete } = useAuth();

  const canWriteTasks = canWrite(PERMISSION_MODULES.TASKS);
  const canDeleteTasks = canDelete(PERMISSION_MODULES.TASKS);
  
  // Prevent re-fetching on tab switch
  const hasInitialized = useRef(false);
  const lastFetchedMilestoneId = useRef<number | null>(null);

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
      toast.success("Task deleted successfully");
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

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-error/10 dark:bg-error/20 text-error border-error/30';
      case 'high':
        return 'bg-warning/10 dark:bg-warning/20 text-warning border-warning/30';
      case 'normal':
      case 'medium':
        return 'bg-info/10 dark:bg-info/20 text-info border-info/30';
      case 'low':
        return 'bg-success/10 dark:bg-success/20 text-success border-success/30';
      default:
        return 'bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary border-border-primary';
    }
  };

  const formatDueDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(dateStr);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
      } else if (diffDays === 0) {
        return { text: 'Due today', isToday: true };
      } else if (diffDays === 1) {
        return { text: 'Due tomorrow', isUrgent: true };
      } else if (diffDays <= 3) {
        return { text: `${diffDays}d left`, isUrgent: true };
      } else {
        return { text: `${diffDays}d left`, isNormal: true };
      }
    } catch {
      return null;
    }
  };

  const getAssigneeCount = (assignees: string[] | null | undefined) => {
    return assignees ? assignees.length : 0;
  };

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
        captureSupabaseError(error, "fetchTasksByMilestoneId", { milestoneId: id, companyId: company_id });
        return;
      }

      const formatData = data?.map((item) => {
        const { created_at, updated_at, department_id, ...rest } = item;
        return rest;
      });

      setTasks(formatData || []);
    } catch (error) {
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
    // Skip if already initialized with the same milestone ID
    if (hasInitialized.current && lastFetchedMilestoneId.current === id) {
      return;
    }
    
    if (id) {
      fetchTasksByMilestoneId(id);
      hasInitialized.current = true;
      lastFetchedMilestoneId.current = id;
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-100 text-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!taskDetailsId ? (
        <>
          {/* Milestone Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-primary rounded-lg border border-border-primary p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground-primary mb-2">
                  {milestoneDetails?.milestone_title || "Milestone"}
                </h2>
                <StatusBadge status={milestoneDetails?.status || "N/A"} />
              </div>
              {milestoneDetails?.weightage && (
                <div className="text-right">
                  <span className="text-sm text-foreground-secondary">Weight</span>
                  <div className="text-2xl font-bold text-primary-600">{milestoneDetails.weightage}%</div>
                </div>
              )}
            </div>

            {milestoneDetails?.description && (
              <p className="text-foreground-secondary mb-4">{milestoneDetails.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-primary">
              <div className="flex items-center gap-2 text-foreground-secondary">
                <Calendar size={16} weight="regular" />
                <span><span className="font-medium">Start:</span> {formatDate(milestoneDetails?.start_date || "")}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground-secondary">
                <Calendar size={16} weight="regular" />
                <span><span className="font-medium">End:</span> {formatDate(milestoneDetails?.end_date || "")}</span>
              </div>
            </div>

            {milestoneDetails?.assignees && milestoneDetails.assignees.length > 0 && (
              <div className="pt-4 border-t border-border-primary mt-4">
                <span className="text-sm font-medium text-foreground-secondary mb-2 block">Assignees</span>
                <div className="flex flex-wrap gap-2">
                  {milestoneDetails.assignees.map((assignee: string, i: number) => (
                    <span
                      key={i}
                      className="bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary text-sm px-3 py-1 rounded-full"
                    >
                      {employees.find((emp) => emp.id === assignee)?.name || "Unknown"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Tasks Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Target size={20} className="text-foreground-secondary" weight="regular" />
                <h3 className="text-lg font-semibold">Tasks ({tasks.length})</h3>
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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {!loadingTasks && tasks.length > 0 ? (
                tasks.map((task) => {
                  const dueInfo = formatDueDate(task.end_date);
                  const assigneeCount = getAssigneeCount(task.assignees);
                  const isCompleted = task.status === true;
                  
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2 }}
                      className="bg-surface-primary rounded-lg border border-border-primary p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {isCompleted && (
                              <CheckCircle size={18} weight="fill" className="text-success shrink-0" />
                            )}
                            <h4 className={`font-medium text-foreground-primary truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>
                              {task.task_title}
                            </h4>
                          </div>
                          
                          {task.task_description && (
                            <p className="text-sm text-foreground-secondary line-clamp-2">{task.task_description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {canWriteTasks && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label={`Edit task ${task.task_title}`}
                              onClick={() => task.id && handleDisplayUpdateTaskModal(task.id)}
                              className="p-1.5 text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary dark:hover:bg-surface-secondary rounded-full transition-colors duration-150"
                            >
                              <Pencil size={15} weight="regular" />
                            </motion.button>
                          )}
                          
                          {canDeleteTasks && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label={`Delete task ${task.task_title}`}
                              onClick={() => task.id && handleDeleteTask(task.id)}
                              className="p-1.5 text-foreground-secondary hover:text-error hover:bg-error/10 dark:hover:bg-error/20 rounded-full transition-colors duration-150"
                            >
                              <TrashSimple size={15} weight="regular" />
                            </motion.button>
                          )}

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label={`View task ${task.task_title}`}
                            onClick={() => task.id && setTaskDetailsId(task.id)}
                            className="p-1.5 text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary dark:hover:bg-surface-secondary rounded-full transition-colors duration-150"
                          >
                            <ArrowUpRight size={15} weight="regular" />
                          </motion.button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-secondary">
                        {task.priority && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                            <Tag size={14} weight="fill" />
                            <span className="capitalize">{task.priority}</span>
                          </div>
                        )}
                        
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isCompleted 
                            ? 'bg-success/10 dark:bg-success/20 text-success border-success/30' 
                            : 'bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary border-border-primary'
                        }`}>
                          <span>{isCompleted ? "Complete" : "Pending"}</span>
                        </div>
                        
                        {dueInfo && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            dueInfo.isOverdue 
                              ? 'bg-error/10 dark:bg-error/20 text-error border-error/30'
                              : dueInfo.isToday || dueInfo.isUrgent
                              ? 'bg-warning/10 dark:bg-warning/20 text-warning border-warning/30'
                              : 'bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary border-border-primary'
                          }`}>
                            <Clock size={14} weight="bold" />
                            <span>{dueInfo.text}</span>
                          </div>
                        )}
                        
                        {assigneeCount > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary border-border-primary">
                            <User size={14} weight="fill" />
                            <span>{assigneeCount} {assigneeCount === 1 ? 'assignee' : 'assignees'}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
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
              projectId={projectId}
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
        </>
      ) : (
        <TaskDetails
          id={taskDetailsId}
          onTaskStatusUpdate={() => fetchTasksByMilestoneId(milestoneId)}
          onClose={() => setTaskDetailsId(null)}
        />
      )}
    </div>
  );
}
