"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import MilestoneDetailsView from "@/components/ops/project/milestone/MilestoneDetailsView";
import { useEmployees } from "@/hooks/useEmployees";
import { useProjects } from "@/hooks/useProjects";
import ProjectBreadcrumb from "@/components/ops/project/navigation/ProjectBreadcrumb";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { Folder } from "@phosphor-icons/react";
import { fadeInUp } from "@/components/ui/animations";
import { ModulePermissionsBanner } from "@/components/permissions";
import { PERMISSION_MODULES } from "@/lib/constants";

export default function MilestoneDetailsPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id: projectId, milestoneId } = use(params);
  const router = useRouter();
  const { employees, loading: employeesLoading } = useEmployees();
  const { ongoingProjects, completedProjects, ongoingLoading, completedLoading, fetchOngoingProjects, fetchCompletedProjects } = useProjects();

  // Fetch projects on mount
  useEffect(() => {
    fetchOngoingProjects(100, true);
    fetchCompletedProjects(100, true);
  }, [fetchOngoingProjects, fetchCompletedProjects]);

  const allProjects = [...ongoingProjects, ...completedProjects];
  const project = allProjects.find((p) => p.id === projectId);

  const handleClose = () => {
    router.push(`/ops/project/${projectId}`);
  };

  if (ongoingLoading || completedLoading || employeesLoading) {
    return (
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="bg-surface-primary p-4 sm:p-6 lg:p-8 rounded-lg w-full"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="bg-surface-primary p-4 sm:p-6 lg:p-8 rounded-lg w-full"
    >
      <div className="border-b border-border-primary pb-4 mb-4">
        <h1 className="text-2xl font-bold text-foreground-primary flex items-center mb-1">
          <Folder className="mr-2 h-6 w-6 text-primary-500" />
          Project Management
        </h1>
        <p className="max-w-3xl text-foreground-secondary">
          Efficiently manage your projects from start to finish.
        </p>
      </div>

      <ModulePermissionsBanner module={PERMISSION_MODULES.MILESTONES} title="Milestones" compact />

      <ProjectBreadcrumb
        projectId={projectId}
        projectTitle={project?.project_title || "Project"}
        milestoneId={parseInt(milestoneId)}
      />

      <MilestoneDetailsView
        id={parseInt(milestoneId)}
        projectId={projectId}
        onClose={handleClose}
        project_created_by={project?.created_by || ""}
        employees={employees}
      />
    </motion.section>
  );
}
