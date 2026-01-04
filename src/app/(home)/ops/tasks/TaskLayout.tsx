"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ClipboardText, CheckSquare, Archive, Plus, PlusSquare } from "@phosphor-icons/react";
import TabView, { TabItem } from "@/components/ui/TabView";
import OngoingTaskPage from "@/components/ops/tasks/OngoingTasks";
import CompletedTasksList from "@/components/ops/tasks/CompletedTasks";
import TaskCreateModal from "@/components/ops/tasks/shared/TaskModal";
import { useTasks, Task } from "@/hooks/useTasks";
import { TaskData } from "@/lib/validation/schemas/advanced";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import TaskDetails from "@/components/ops/tasks/shared/TaskDetails";
import { useRouter } from "next/navigation";

const TABS = [
  {
    key: "ongoing",
    label: "Ongoing",
    icon: <ClipboardText className="h-5 w-5" />,
    color: "text-indigo-600",
  },
  {
    key: "completed",
    label: "Completed",
    icon: <CheckSquare className="h-5 w-5" />,
    color: "text-success",
  },
  {
    key: "archived",
    label: "Archived",
    icon: <Archive className="h-5 w-5" />,
    color: "text-foreground-secondary",
  },
];

export default function TaskLayout({
  selectedTaskId,
  activeTab,
  initialActiveTab = "ongoing",
  setActiveTab: setParentActiveTab,
}: {
  selectedTaskId?: string | null;
  activeTab?: string;
  initialActiveTab?: string;
  setActiveTab?: (tab: string) => void;
}) {
  const router = useRouter()
  const handleTabChange = useCallback((tab: string) => {
    router.push(`/ops/tasks?tab=${tab}`);
  }, [router]);

  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { employeeInfo } = useAuth();

  // Ref to track initial data fetch - prevents re-fetching on tab switch
  const hasInitialized = useRef(false);

  const {
    hasMoreOngoingTasks,
    hasMoreCompletedTasks,

    ongoingTasks,
    completedTasks,
    loading,
    ongoingTasksLoading,
    createTask,
    updateTask,
    deleteTask,
    fetchOngoingTasks,
    fetchCompletedTasks,
  } = useTasks();

  // Load tasks only once on initial mount
  useEffect(() => {
    if (hasInitialized.current || !employeeInfo) return;
    hasInitialized.current = true;
    
    fetchOngoingTasks();
    fetchCompletedTasks();
  }, [employeeInfo, fetchOngoingTasks, fetchCompletedTasks]);

  // Tab content
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const loadMoreOngoing = useCallback(async () => {
    setLoadMoreLoading(true)
    await fetchOngoingTasks(true, 10)
    setLoadMoreLoading(false)
  }, [fetchOngoingTasks]);

  const loadMoreCompleted = useCallback(() => {
    fetchCompletedTasks(true, 10);
  }, [fetchCompletedTasks]);
  const ongoingTaskPage = useMemo(
    () => (
      <OngoingTaskPage
        loadMoreLoading={loadMoreLoading}
        hasMoreOngoingTasks={hasMoreOngoingTasks}
        onLoadMore={loadMoreOngoing}
        ongoingTasks={ongoingTasks}
        loading={ongoingTasksLoading}
        updateTask={updateTask}
        deleteTask={deleteTask}
        adminScoped={false}

      />
    ),
    [ongoingTasks, ongoingTasksLoading, loadMoreLoading, hasMoreOngoingTasks, updateTask, deleteTask, loadMoreOngoing]
  );

  const completedTasksList = useMemo(
    () => (
      <CompletedTasksList
        tasks={completedTasks}
        loading={loading}
        deleteTask={deleteTask}
        adminScoped={false}
        hasMoreCompletedTasks={hasMoreCompletedTasks}
        onLoadMore={loadMoreCompleted}
      />
    ),
    [completedTasks, loading, deleteTask, hasMoreCompletedTasks, loadMoreCompleted]
  );

  const archivedContent = useMemo(
    () => (
      <div className="flex flex-col items-center justify-center p-12 bg-background-secondary rounded-xl border border-border-primary text-center">
        <Archive className="h-16 w-16 text-foreground-tertiary mb-4" />
        <h3 className="text-xl font-semibold text-foreground-primary mb-2">
          Archived Tasks
        </h3>
        <p className="text-foreground-secondary max-w-md mb-6">
          This section will store your archived tasks that are no longer active but you want to keep for reference.
        </p>
        <p className="text-foreground-tertiary text-sm">Feature coming soon...</p>
      </div>
    ),
    []
  );

  const getTabContent = useMemo(() => {
    return (key: string) => {
      switch (key) {
        case "ongoing":
          return ongoingTaskPage;
        case "completed":
          return completedTasksList;
        case "archived":
          return archivedContent;
        default:
          return ongoingTaskPage;
      }
    };
  }, [ongoingTaskPage, completedTasksList, archivedContent]);

  useEffect(() => {
    setTabs(TABS.map(tab => ({ ...tab, content: getTabContent(tab.key) })));
  }, [getTabContent]);

  const handleCreateTask = useCallback(async (taskData: TaskData) => {
    const task: Task = {
      task_title: taskData.task_title,
      task_description: taskData.task_description || "",
      start_date: taskData.start_date || new Date().toLocaleDateString("sv-SE"),
      end_date: taskData.end_date || new Date().toLocaleDateString("sv-SE"),
      priority: taskData.priority,
      project_id: taskData.project_id,
      milestone_id: taskData.milestone_id,
      department_id: taskData.department_id,
      assignees: taskData.assignees,
      status: taskData.status || false,
    };

    const { success, error } = await createTask(task);
    if (success) {
      toast.success("Task created successfully");
      setShowCreateModal(false);
    } else {
      toast.error("Failed to create task");
      console.error("Error creating task:", error);
    }
  }, [createTask]);

  const handleOpenCreateModal = useCallback(() => setShowCreateModal(true), []);
  const handleCloseCreateModal = useCallback(() => setShowCreateModal(false), []);
  const handleCloseTaskDetails = useCallback(() => window.history.back(), []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full p-4 sm:p-6 lg:p-8"
    >
      <motion.div className="mb-8 flex justify-between items-center">
        <div data-tutorial="task-header">
          <h1 className="text-2xl font-bold text-foreground-primary flex items-center mb-2">
            <ClipboardText className="mr-2 h-6 w-6 text-indigo-500" />
            Task Management
          </h1>
          <p className="text-foreground-secondary max-w-3xl">
            Manage and track your tasks efficiently. Create, assign, and monitor progress to ensure timely completion of all your activities.
          </p>
        </div>
        <button
          data-tutorial="task-create-btn"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusSquare className="h-5 w-5" />
          Create Task
        </button>
      </motion.div>

      <TabView
        tabs={tabs}
        activeTab={selectedTaskId ? "" : activeTab || ""} // no tab active if viewing task
        setActiveTab={handleTabChange}
        tutorialPrefix="task"
      />

      {/* Task Details */}
      {selectedTaskId && (
        <TaskDetails
          id={selectedTaskId}
          onClose={handleCloseTaskDetails}
          onTaskStatusUpdate={() => { }}
        />
      )}

      {showCreateModal && (
        <TaskCreateModal
          onSubmit={handleCreateTask}
          departmentId={employeeInfo?.department_id as number}
          onClose={handleCloseCreateModal}
        />
      )}
    </motion.div>
  );
}
