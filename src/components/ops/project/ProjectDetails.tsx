"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useMilestones } from "@/hooks/useMilestones";
import { useComments } from "@/hooks/useComments";
import MilestoneDetails from "./milestone/MilestoneDetails";
import { formatDate } from "@/lib/utils";
import {
  validateProject,
  validationErrorsToObject,
} from "@/lib/utils/validation";
import { type MilestoneData } from "@/lib/validation/schemas/advanced";
import { useTasks, TaskStatus, TaskScope } from "@/hooks/useTasks";
import { Plus, Building, User, Clock, Users, CheckCircle, X, Target, Calendar, Pencil, TrashSimple, Monitor, ArrowSquareOut } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import TaskCreateModal from "../tasks/shared/TaskCreateModal";
import TaskUpdateModal from "../tasks/shared/TaskUpdateModal";
import { motion } from "framer-motion";
import MilestoneForm from "./milestone/MilestoneForm";
import { Department, Milestone, Project, Task } from "@/lib/types/schemas";
import { TaskData } from "@/lib/validation/schemas/advanced";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, InfoRow } from "@/components/ui/Card";
import BaseModal from "@/components/ui/modals/BaseModal";
import LoadingSection from "@/app/(home)/home/components/LoadingSection";
import { getCompanyId, getEmployeeId } from "@/lib/utils/auth";
import { MilestoneUpdateModal } from "./milestone";
import MilestoneListItem from "./milestone/MilestoneListItem";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSION_MODULES } from "@/lib/constants";
import { captureSupabaseError } from "@/lib/sentry";

interface ProjectDetailsProps {
  id: string;
  employees: { id: string; name: string }[];
  departments: Department[];
  onClose: () => void;
  onSubmit?: (data: Project) => void;
  setActiveTab: (key: string) => void;
}

function formatTime(timestamp: number | Date): string {
  const now = new Date();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Time intervals in seconds
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}

export default function ProjectDetails({
  id: projectId,
  onClose,
  onSubmit,
  employees,
  departments,
  setActiveTab,
}: ProjectDetailsProps) {
  const [projectDetails, setProjectDetails] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [displaySubmissionModal, setDisplaySubmissionModal] = useState(false);
  const [remark, setRemark] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tasks states and functions
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { getProjectTasks, createTask, updateTask, deleteTask } = useTasks();
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);


  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { canWrite, canDelete } = useAuth();
  const canWriteProjects = canWrite(PERMISSION_MODULES.PROJECTS);
  const canWriteMilestones = canWrite(PERMISSION_MODULES.MILESTONES);
  const canDeleteMilestones = canDelete(PERMISSION_MODULES.MILESTONES);

  const {updateProject} = useProjects()

  useEffect(() => {
    async function fetchUserId() {
      const id = await getEmployeeId();
      setCurrentUserId(id);
    }
    fetchUserId();
  }, []);


  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };



  useEffect(() => {
    fetchProjectDetails(projectId);
    fetchMilestonesByProjectId(projectId);
    getProjectTasks(projectId, TaskStatus.INCOMPLETE);
  }, [projectId, getProjectTasks]);

  const router = useRouter()

  const submitProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const validation = validateProject({
        ...projectDetails,
        remark: remark,
        status: "Completed",
      });
      if (!validation.success) {
        const error = new Error("Validation failed");
        (error as any).issues = validation.errors;
        throw error;
      }
      
      await updateProject(projectDetails?.id || "", validation.data);

      console.log(validation.data)
      setDisplaySubmissionModal(false);

      toast.success("Project submitted successfully!");
      router.push("/ops/project?tab=completed");
    } catch (error) {
      console.error("Error updating project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Milestones states and functions
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState<boolean>(false);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null
  );
  const [milestoneDetailsId, setMilestoneDetailsId] = useState<number | null>(
    null
  );

  // Memoized calculations
  const totalMilestoneWeightage = useMemo(() => {
    return milestones.reduce((sum, m) => sum + (m.weightage || 0), 0);
  }, [milestones]);

  const getTotalMilestoneWeightage = useCallback(() => {
    return totalMilestoneWeightage;
  }, [totalMilestoneWeightage]);

  // Memoized employee lookup map for faster lookups
  const employeeMap = useMemo(() => {
    return new Map(employees.map(emp => [emp.id, emp]));
  }, [employees]);

  const getEmployeeName = useCallback((id: string) => {
    return employeeMap.get(id)?.name || "Not assigned";
  }, [employeeMap]);



  const { createMilestone, updateMilestone, deleteMilestone, updateMilestoneStatus } = useMilestones();

  const handleCreateMilestone = async (values: MilestoneData) => {
    try {
      // Ensure weightage is a number before creating milestone
      const milestoneData = {
        ...values,
        weightage: values.weightage ?? 0
      };
      await createMilestone(milestoneData);
      toast.success("Milestone created!");
      setIsCreatingMilestone(false);
      fetchMilestonesByProjectId(projectId);
    } catch {
      toast.error("Error creating Milestone.");
    }
  };

  const handleUpdateMilestone = async (values: MilestoneData) => {
    try {
      if (selectedMilestone?.id) {
        // Ensure weightage is a number before updating milestone
        const milestoneData = {
          ...values,
          weightage: values.weightage ?? 0
        };
        await updateMilestone(selectedMilestone.id, milestoneData);
        setSelectedMilestone(null);
        fetchMilestonesByProjectId(projectId);
        toast.success("Milestone updated!");
      }
    } catch {
      toast.error("Error updating Milestone.");
    }
  };

  const handleDeleteMilestone = async (id: number) => {
    try {
      await deleteMilestone(id);
      toast.success("Milestone deleted!");
      fetchMilestonesByProjectId(projectId);
    } catch {
      toast.error("Error deleting Milestone.");
    }
  };

  const handleCreateTask = async (values: TaskData) => {
    try {
      await createTask({ ...values, project_id: projectId });
      toast.success("Task created!");
      setIsCreatingTask(false);
      getProjectTasks(projectId, TaskStatus.INCOMPLETE);
    } catch {
      toast.error("Error creating Task.");
    }
  };

  const handleUpdateTask = async (values: TaskData) => {
    try {
      if (selectedTask?.id) {
        // Note: Update this based on actual updateTask hook signature
        // await updateTask(selectedTask.id, values);
        toast.success("Task updated!");
        setSelectedTask(null);
        getProjectTasks(projectId, TaskStatus.INCOMPLETE);
      }
    } catch {
      toast.error("Error updating Task.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      toast.success("Task deleted!");
      getProjectTasks(projectId, TaskStatus.INCOMPLETE);
    } catch {
      toast.error("Error deleting Task.");
    }
  };

  // Comments functionality
  const { comments, loading: loadingComments } = useComments();

  async function fetchProjectDetails(id: string) {
    setLoading(true);
    const client = createClient();
    const company_id = await getCompanyId();

    try {
      const { data, error } = await client
        .from("project_records")
        .select("*")
        .eq("id", id)
        .eq("company_id", company_id);

      if (error) {
        setError("Error fetching Project details");
        captureSupabaseError(error, "fetchProjectDetails", { projectId: id, companyId: company_id });
        return;
      }

      setProjectDetails(data[0]);
    } catch (error) {
      setError("Error fetching Project details");
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchProjectDetails",
        { projectId: id }
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchMilestonesByProjectId(id: string) {
    setLoadingMilestones(true);
    const client = createClient();
    const company_id = await getCompanyId();

    try {
      const { data, error } = await client
        .from("milestone_records")
        .select("*")
        .eq("project_id", id)
        .eq("company_id", company_id)
        .order("created_at", { ascending: true });

      if (error) {
        setError("Error fetching milestones");
        captureSupabaseError(error, "fetchMilestonesByProjectId", { projectId: id, companyId: company_id });
        return;
      }

      const formatData =
        data?.map((item: any) => {
          const { created_at, updated_at, department_id, ...rest } = item;
          return {
            ...rest,
            start_date: formatDate(item.start_date),
            end_date: formatDate(item.end_date),
          };
        }) || [];

      setMilestones(formatData);
    } catch (error) {
      setError("Error fetching milestones");
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "fetchMilestonesByProjectId",
        { projectId: id }
      );
    } finally {
      setLoadingMilestones(false);
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "ongoing":
      case "in-progress":
        return "info";
      case "pending":
        return "warning";
      default:
        return "info";
    }
  };

  const onMilestoneStatusUpdate = async (milestoneId: number, updatedMilestoneData: Milestone) => {
    try {
      await updateMilestoneStatus(milestoneId, updatedMilestoneData, projectDetails?.progress || 0);
      toast.success("Milestone status updated!");
      fetchMilestonesByProjectId(projectId);
      fetchProjectDetails(projectId);
    } catch {
      toast.error("Error updating milestone status.");
    }
  }





  if (loading) {
    return (
      <LoadingSection
        text="Loading project details..."
        icon={Monitor}
        color="blue"
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Building className="h-12 w-12" />}
        title="Error loading project"
        description={error}
      />
    );
  }

  if (!projectDetails) {
    return (
      <EmptyState
        icon={<Building className="h-12 w-12" />}
        title="Project not found"
        description="The requested project could not be found"
      />
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 space-y-6">
      {!milestoneDetailsId && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-6"
        >
          {/* Header */}
          <motion.div
            variants={fadeInUp}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Building size={24} className="text-blue-600" />
              <h1 className="text-2xl font-bold text-foreground-primary">
                Project Details
              </h1>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="p-2 hover:bg-background-tertiary dark:bg-surface-secondary rounded-full"
            >
              <X size={20} />
            </Button>
          </motion.div>

          {/* Project Overview */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader
                title={projectDetails.project_title}
                subtitle={projectDetails.description}
                icon={<Building size={20} />}
                action={
                  <StatusBadge
                    status={projectDetails.status || "pending"}
                    variant={getStatusVariant(projectDetails.status)}
                  />
                }
              />

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow
                    icon={<User size={16} />}
                    label="Project Lead"
                    value={
                      employees.find(
                        (emp) => emp.id === projectDetails.project_lead_id
                      )?.name || "Not assigned"
                    }
                  />

                  <InfoRow
                    icon={<Clock size={16} />}
                    label="Progress"
                    value={`${projectDetails.progress || 0}%`}
                  />

                  <InfoRow
                    icon={<Calendar size={16} />}
                    label="Start Date"
                    value={formatDate(projectDetails.start_date || "")}
                  />

                  <InfoRow
                    icon={<Calendar size={16} />}
                    label="End Date"
                    value={formatDate(projectDetails.end_date || "")}
                  />

                  {projectDetails.assignees &&
                    projectDetails.assignees.length > 0 && (
                      <InfoRow
                        icon={<Users size={16} />}
                        label="Team Members"
                        value={`${projectDetails.assignees.length} members`}
                      />
                    )}
                </div>

                {projectDetails.assignees &&
                  projectDetails.assignees.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-foreground-secondary mb-2">
                        Assigned Team:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {projectDetails.assignees.map((assigneeId: string) => {
                          const employee = employees.find(
                            (emp) => emp.id === assigneeId
                          );
                          return employee ? (
                            <span
                              key={assigneeId}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200"
                            >
                              {employee.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                {projectDetails.status !== "Completed" && canWriteProjects && (projectDetails.created_by === currentUserId || projectDetails.project_lead_id === currentUserId) && (
                  <div className="pt-4 border-t border-border-primary">
                    <Button
                      onClick={() => setDisplaySubmissionModal(true)}
                      className="flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Submit Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Milestones Section */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader
                title="Milestones"
                icon={<Target size={20} />}
                action={
                  projectDetails.status !== "Completed" &&
                  canWriteMilestones &&
                  milestones.reduce((acc, m) => acc + m.weightage, 0) < 100 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingMilestone(true)}
                      aria-label="Add new milestone"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Milestone
                    </Button>
                  )
                }
              />

              <CardContent>
                {loadingMilestones ? (
                  <LoadingSection
                    text="Loading milestones..."
                    icon={Monitor}
                    color="blue"
                  />
                ) : milestones.length > 0 ? (
                  <div className="space-y-4">
                    {milestones.map((milestone, index) => (
                      <MilestoneListItem
                        key={milestone.id ?? index}
                        milestone={milestone}
                        projectDetails={projectDetails}
                        onMilestoneStatusUpdate={onMilestoneStatusUpdate}
                        setSelectedMilestone={setSelectedMilestone}
                        setMilestoneDetailsId={setMilestoneDetailsId}
                        index={index}
                        canWriteMilestones={canWriteMilestones}
                      />
                    ))}

                  </div>
                ) : (
                  <EmptyState
                    icon={<Target className="h-8 w-8" />}
                    title="No milestones yet"
                    description="Add milestones to track project progress"
                    action={
                      projectDetails.status !== "Completed" && canWriteMilestones
                        ? {
                          label: "Add First Milestone",
                          onClick: () => setIsCreatingMilestone(true),
                          icon: <Plus size={16} />,
                        }
                        : undefined
                    }
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Submission Modal */}
      {displaySubmissionModal && (
        <BaseModal
          isOpen={displaySubmissionModal}
          onClose={() => setDisplaySubmissionModal(false)}
          title="Project Submission"
          icon={<CheckCircle size={20} />}
        >
          <form onSubmit={submitProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Remarks
              </label>
              <textarea
                name="remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Add your final remarks about the project..."
                className="w-full h-32 rounded-md border border-border-secondary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisplaySubmissionModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!remark || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Project"}
              </Button>
            </div>
          </form>
        </BaseModal>
      )}

      {/* Milestone Details Modal */}
      {milestoneDetailsId && (
        <MilestoneDetails
          id={milestoneDetailsId}
          onClose={() => setMilestoneDetailsId(null)}
          project_created_by={projectDetails.created_by || ""}
          employees={employees}
        />
      )}

      {/* Milestone Create Modal */}
      {isCreatingMilestone && (
        <MilestoneForm
          milestone={{
            milestone_title: "",
            description: "",
            start_date: "",
            end_date: "",
            weightage: 100 - getTotalMilestoneWeightage(),
            status: "Not Started",
            project_id: projectDetails.id || "",
            assignees: [],
          }}
          isSubmitting={isSubmittingMilestone}
          onSubmit={async (data) => {
            setIsSubmittingMilestone(true);
            await handleCreateMilestone(data);
            setIsSubmittingMilestone(false);
          }}
          onCancel={() => setIsCreatingMilestone(false)}
          employees={employees}
          currentMilestones={milestones}
          mode="create"
          currentWeightage={milestones.reduce((acc, m) => acc + (m.weightage || 0), 0)}
        />
      )}

      {selectedMilestone && (
        <MilestoneUpdateModal
          initialData={selectedMilestone}
          currentTotalWeightage={milestones.reduce(
            (acc, m) =>
              acc + (m.weightage || 0) - (selectedMilestone?.weightage || 0),
            0
          )}
          onClose={() => setSelectedMilestone(null)}
          onSubmit={handleUpdateMilestone}
          employees={employees}
        />
      )}
    </div>
  );
}
