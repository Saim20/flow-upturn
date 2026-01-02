"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Department, useDepartments } from "@/hooks/useDepartments";
import { useEmployeeInfo } from "@/hooks/useEmployeeInfo";
import { useProjects } from "@/hooks/useProjects";
import { useMilestones } from "@/hooks/useMilestones";
import { WarningCircle, Building, X, CircleNotch } from "@phosphor-icons/react";
import ProjectForm, { type ProjectDetails } from "./ProjectForm";
import MilestoneList from "./milestone/MilestoneList";
import MilestoneForm, { type Milestone } from "./milestone/MilestoneForm";
import { supabase } from "@/lib/supabase/client";
import { fadeIn, fadeInUp, staggerContainer } from "@/components/ui/animations";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { captureError } from "@/lib/sentry";

const initialMilestone: Milestone = {
  milestone_title: "",
  description: "",
  start_date: "",
  end_date: "",
  weightage: 0,
  status: "",
  project_id: "",
  assignees: [],
};

const initialProjectDetails: ProjectDetails = {
  project_title: "",
  start_date: "",
  description: "",
  goal: "",
  end_date: "",
  project_lead_id: "",
  department_ids: [],
  status: "Ongoing",
  assignees: [],
};

export default function CreateNewProjectPage({ setActiveTab }: { setActiveTab: (key: string) => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, employeeInfo } = useAuth()
  const { departments, fetchDepartments, loading: departmentsLoading } = useDepartments();
  const { employees, fetchEmployeeInfo, loading: employeesLoading } = useEmployeeInfo();
  const { createProject } = useProjects();
  const { createMilestone } = useMilestones();

  const isDataLoading = departmentsLoading || employeesLoading;

  useEffect(() => {
    // Only fetch when user is authenticated AND employeeInfo with company_id is available
    if (user && employeeInfo?.company_id) {
      fetchDepartments();
      fetchEmployeeInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, employeeInfo?.company_id]); // Only re-run when user or company_id changes

  const handleSubmit = async (
    data: ProjectDetails,
    milestones: any[]
  ) => {
    setIsSubmitting(true);

    try {
      const projectResult = await createProject({ ...data });
      if (!projectResult || !projectResult.success) {
        throw new Error("Failed to create project");
      }

      let projectId: string | undefined;
      if (projectResult.data) {
        if (
          Array.isArray(projectResult.data) &&
          projectResult.data.length > 0
        ) {
          projectId = projectResult.data[0].id;
        } else if (
          typeof projectResult.data === "object" &&
          "id" in projectResult.data
        ) {
          projectId = projectResult.data.id;
        }
      }
      if (!projectId) {
        throw new Error("Project ID not returned after creation");
      }

      // Create milestones if provided
      if (milestones.length > 0) {
        for (const m of milestones) {
          // Remove temporary ID before sending to database - database will generate real ID
          const { id: _tempId, ...milestoneWithoutId } = m;
          const milestoneToCreate = { ...milestoneWithoutId, project_id: projectId };
          const milestoneResult = await createMilestone(milestoneToCreate);
          if (!milestoneResult.success) {
            await supabase.from("project_records").delete().match({ id: projectId });
            throw new Error("Failed to create milestones", { cause: milestoneResult.error });
          }
        }
      }

      toast.success("Project created successfully!");

      // Explicitly navigate to ongoing tab - this ensures URL updates for tests
      router.push('/ops/project?tab=ongoing');
      setActiveTab('ongoing')
    } catch (error) {
      captureError(error, { 
        operation: "createProject", 
        projectTitle: data.project_title,
        milestonesCount: milestones.length 
      });
      toast.error(
        error instanceof Error ? error.message : "Failed to create project"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="w-full p-4 sm:p-6 lg:p-10 space-y-6"
    >
      <motion.div
        variants={fadeInUp}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <Building size={24} className="text-foreground-secondary dark:text-foreground-secondary" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold text-foreground-primary dark:text-foreground-primary">
            Create New Project
          </h2>
        </div>
      </motion.div>

      {/* Loading indicator for data fetching */}
      {isDataLoading && (
        <motion.div 
          variants={fadeInUp}
          className="flex items-center gap-2 px-4 py-3 mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-700 dark:text-primary-300"
        >
          <CircleNotch size={16} className="animate-spin" />
          <span className="text-sm">Loading departments and employees...</span>
        </motion.div>
      )}

      <motion.div variants={fadeInUp}>
        <ProjectForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          departments={
            departments.filter((d) => d.id != null) as {
              id: number;
              name: string;
            }[]
          }
          mode="create"
        />
      </motion.div>
    </motion.div>
  );
}
export function UpdateProjectPage({
  initialData,
  employees,
  departments,
  onSubmit,
  onClose,
}: {
  initialData: ProjectDetails;
  employees: { id: string; name: string }[];
  departments: Department[];
  onSubmit: (data: ProjectDetails) => void;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createMilestone, updateMilestone } = useMilestones()

  const handleSubmit = async (data: ProjectDetails, milestones: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);

      const projectId = data.id;

      if (milestones.length > 0) {
        for (const m of milestones) {
          // Check if this is a new milestone (no ID or temp ID) or existing milestone
          const isNewMilestone = !m.id || (typeof m.id === 'string' && m.id.startsWith('temp_'));
          
          if (isNewMilestone) {
            // Create new milestone - don't include the temp ID
            const { id, ...milestoneData } = m;
            const milestoneToCreate = { ...milestoneData, project_id: projectId };
            const milestoneResult = await createMilestone(milestoneToCreate);
            if (!milestoneResult.success) {
              await supabase.from("project_records").delete().match({ id: projectId });
              throw new Error("Failed to create milestones", { cause: milestoneResult.error });
            }
          } else {
            // Update existing milestone - don't include ID in the payload
            const { id, ...milestoneData } = m;
            const milestoneToUpdate = { ...milestoneData, project_id: projectId };
            await updateMilestone(m.id, milestoneToUpdate);
          }
        }
      }
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="w-full p-4 sm:p-6 lg:p-10 space-y-6"
    >
      <motion.div variants={fadeInUp} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building size={24} className="text-foreground-secondary dark:text-foreground-secondary" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold text-foreground-primary dark:text-foreground-primary">Update Project</h2>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-error/10 dark:hover:bg-error/20 text-foreground-tertiary dark:text-foreground-tertiary hover:text-error"
        >
          <X size={20} strokeWidth={2} />
        </Button>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ProjectForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
          departments={departments.filter(d => d.id != null) as { id: number; name: string }[]}
          mode="edit"
        />
      </motion.div>
    </motion.div>
  );
} 