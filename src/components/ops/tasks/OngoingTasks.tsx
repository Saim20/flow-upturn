"use client";
import { TaskUpdateModal } from "./shared/TaskModal";
import { TaskFilters, useTasks } from "@/hooks/useTasks";
import { Task } from "@/lib/types/schemas";
import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import TaskDetails from "./shared/TaskDetails";
import { AnimatePresence } from "framer-motion";
import { PencilSimple, TrashSimple, ArrowSquareOut, ClipboardText, Calendar } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardContent,
  PriorityBadge,
  InfoRow,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui";
import { getEmployeeId, getEmployeeInfo } from "@/lib/utils/auth";
import { useRouter } from "next/navigation";
import LoadMore from "@/components/ui/LoadMore";
import Link from "next/link";
import { debounce } from "lodash"; // for debouncing search
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSION_MODULES } from "@/lib/constants";
import { PermissionTooltip } from "@/components/permissions";
import { WindowedList } from "@/components/ui/VirtualizedList";

interface OngoingTaskPageProps {
  adminScoped: boolean;
  ongoingTasks: Task[];
  loading: boolean;
  updateTask: (task: Task) => Promise<{ success: boolean; data?: any; error?: any; }>;
  deleteTask: (taskId: string, projectId?: string, milestoneId?: number, adminScoped?: boolean) => Promise<{ success: boolean; error?: any; }>;
  hasMoreOngoingTasks: boolean;
  onLoadMore: () => void;
  loadMoreLoading: boolean;
}

export default function OngoingTaskPage({
  adminScoped = false,
  ongoingTasks,
  loading,
  updateTask,
  deleteTask,
  hasMoreOngoingTasks,
  onLoadMore,
  loadMoreLoading
}: OngoingTaskPageProps) {
  const router = useRouter();
  const { searchOngoingTasks } = useTasks();

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [searching, setSearching] = useState(false);
  const { isAdmin } = useAuth();

  const userIdInit = async () => {
    const user = await getEmployeeInfo();
    if (!user) return;
    setUserId(user.id);
  };

  useEffect(() => {
    userIdInit();
  }, []);

  // Memoized task update handler
  const handleUpdateTask = useCallback(async (values: any) => {
    try {
      const { data } = await updateTask(values);
      toast.success("Task updated successfully");
      setEditTask(null);
    } catch (error) {
      toast.error("Error updating task");
      console.error(error);
    }
  }, [updateTask]);

  // Memoized task delete handler
  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      setDeletingTaskId(id);
      await deleteTask(id, undefined, undefined, adminScoped);
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error("Error deleting task");
      console.error(error);
    } finally {
      setDeletingTaskId(null);
    }
  }, [adminScoped, deleteTask]);

  // Stable ref for searchOngoingTasks to avoid debounce recreation
  const searchOngoingTasksRef = useRef(searchOngoingTasks);
  searchOngoingTasksRef.current = searchOngoingTasks;

  // Stable debounced search function using useMemo
  const debouncedSearch = useMemo(
    () => debounce(async (term: string, scope: boolean) => {
      if (!term.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const results = await searchOngoingTasksRef.current(term, 20, scope);
      setSearchResults(results);
      setSearching(false);
    }, 300),
    [] // Empty deps - debounce function is stable, uses ref for searchOngoingTasks
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Memoized search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term, adminScoped);
  }, [debouncedSearch, adminScoped]);

  // Memoized display tasks to prevent unnecessary recalculations
  const displayTasks = useMemo(
    () => searchTerm ? searchResults : ongoingTasks,
    [searchTerm, searchResults, ongoingTasks]
  );
  
  const [showEmpty, setShowEmpty] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Track when we've completed the initial load
  useEffect(() => {
    // Mark as loaded when loading finishes (whether we have tasks or not)
    if (!loading && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [loading, hasLoaded]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (displayTasks.length === 0 && !loading && !searching && hasLoaded) {
      // Delay showing empty state by 500ms
      timer = setTimeout(() => {
        setShowEmpty(true);
      }, 500);
    } else {
      setShowEmpty(false);
    }

    return () => clearTimeout(timer);
  }, [displayTasks.length, loading, searching, hasLoaded]);

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search tasks..."
          className="w-full border border-border-primary rounded px-3 py-2 focus:outline-none focus:ring focus:border-primary-300 bg-surface-primary text-foreground-primary"
        />
      </div>

      {/* Loading / searching spinner */}
      {!editTask && (loading || searching) ? (
        <LoadingSpinner text={searching ? "Searching Tasks..." : "Loading Tasks..."} />
      ) : (
        <WindowedList
          items={displayTasks}
          keyExtractor={(task) => task.id || `task-${Math.random()}`}
          maxRenderCount={30}
          className="grid grid-cols-1 gap-4"
          renderItem={(task) => (
            <TaskCard
              userId={userId}
              adminScoped={adminScoped}
              task={task}
              onEdit={() => setEditTask(task)}
              onDelete={() =>
                task.id !== undefined && handleDeleteTask(task.id)
              }
              isDeleting={deletingTaskId === task.id}
            />
          )}
          footer={
            <>
              {displayTasks.length === 0 && !loading && !searching && hasLoaded && (
                <EmptyState
                  icon={<ClipboardText className="w-12 h-12" />}
                  title="No tasks found"
                  description="Try a different keyword to search tasks."
                />
              )}

              {!searchTerm && (!loading && !searching) && displayTasks.length > 0 && (
                <LoadMore
                  isLoading={loadMoreLoading}
                  onLoadMore={onLoadMore}
                  hasMore={hasMoreOngoingTasks}
                />
              )}
            </>
          }
        />
      )}

      <AnimatePresence>
        {editTask && (
          <TaskUpdateModal
            onSubmit={handleUpdateTask}
            onClose={() => setEditTask(null)}
            initialData={{
              id: editTask.id,
              task_title: editTask.task_title,
              task_description: editTask.task_description,
              start_date: editTask.start_date,
              end_date: editTask.end_date,
              priority: editTask.priority,
              status: editTask.status || false,
              project_id: editTask.project_id,
              milestone_id: editTask.milestone_id,
              department_id: editTask.department_id,
              assignees: editTask.assignees,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// TaskCard - memoized to prevent unnecessary re-renders
const TaskCard = memo(function TaskCard({
  adminScoped,
  userId,
  task,
  onEdit,
  onDelete,
  onDetails,
  isDeleting = false,
}: {
  adminScoped: boolean,
  userId: string;
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDetails?: () => void;
  isDeleting?: boolean;
}) {
  const { canWrite, canDelete, isAdmin } = useAuth();

  // Check if user can edit based on permissions OR ownership
  const canEditTask = canWrite(PERMISSION_MODULES.TASKS) || userId === task.created_by || (adminScoped && isAdmin());
  const canDeleteTask = canDelete(PERMISSION_MODULES.TASKS) || userId === task.created_by || (adminScoped && isAdmin());

  const actions = (
    <div className="flex items-center gap-2 task-card">
      {canEditTask && (
        <Button
          data-testid="edit-task-button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="p-2 h-8 w-8 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <PencilSimple size={14} />
        </Button>
      )}

      {!canEditTask && (userId === task.created_by || (adminScoped && isAdmin())) && (
        <PermissionTooltip message="You don't have permission to edit tasks">
          <Button
            data-testid="edit-task-button"
            variant="ghost"
            size="sm"
            disabled
            className="p-2 h-8 w-8 opacity-50 cursor-not-allowed"
          >
            <PencilSimple size={14} />
          </Button>
        </PermissionTooltip>
      )}

      {canDeleteTask && (
        <Button
          data-testid="delete-task-button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          isLoading={isDeleting}
          className="p-2 h-8 w-8 hover:bg-error/10 dark:hover:bg-error/20 hover:text-error"
        >
          <TrashSimple size={14} />
        </Button>
      )}

      {!canDeleteTask && (userId === task.created_by || (adminScoped && isAdmin())) && (
        <PermissionTooltip message="You don't have permission to delete tasks">
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="p-2 h-8 w-8 opacity-50 cursor-not-allowed"
          >
            <TrashSimple size={14} />
          </Button>
        </PermissionTooltip>
      )}

      <Link href={`/ops/tasks/${task.id}`}>
        <Button
          data-testid="view-task-button"
          variant="ghost"
          size="sm"
          onClick={onDetails}
          className="p-2 h-8 w-8 hover:bg-background-secondary dark:hover:bg-background-tertiary hover:text-foreground-primary view-button"
        >
          <ArrowSquareOut size={14} />
        </Button>
      </Link>
    </div>
  );

  return (
    <Card data-testid="task-card">
      <CardHeader
        title={task.task_title}
        subtitle={task.task_description}
        action={actions}
      />
      <CardContent>
        <div className="flex items-center justify-between">
          <PriorityBadge
            priority={task.priority as "urgent" | "high" | "normal" | "low"}
          />
          {task.end_date && (
            <InfoRow
              icon={<Calendar size={16} />}
              label="Due"
              value={task.end_date}
              className="text-xs"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
});
