"use client";

import { use, useEffect, useState } from "react";
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
import { createClient } from '@/lib/supabase/client';
import { getCompanyId } from '@/lib/utils/auth';
import { Milestone } from "@/hooks/useMilestones";

export default function MilestoneDetailsPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id: projectId, milestoneId } = use(params);
  const router = useRouter();
  const { employees, loading: employeesLoading } = useEmployees();
  const { fetchSingleProject } = useProjects();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [milestoneLoading, setMilestoneLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  // Fetch project and milestone details
  useEffect(() => {
    async function fetchData() {
      setMilestoneLoading(true);
      setProjectLoading(true);
      const client = createClient();
      const company_id = await getCompanyId();

      try {
        // Fetch both project and milestone in parallel
        const [milestoneResult, projectResult] = await Promise.all([
          client
            .from("milestone_records")
            .select("*")
            .eq("id", milestoneId)
            .eq("company_id", company_id)
            .single(),
          fetchSingleProject(projectId)
        ]);

        if (!milestoneResult.error && milestoneResult.data) {
          setMilestone(milestoneResult.data);
        }

        if (projectResult) {
          setProject(projectResult);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setMilestoneLoading(false);
        setProjectLoading(false);
      }
    }

    fetchData();
  }, [milestoneId, projectId, fetchSingleProject]);

  const handleClose = () => {
    router.push(`/ops/project/${projectId}`);
  };

  if (employeesLoading || milestoneLoading || projectLoading) {
    return (
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="bg-surface-primary p-4 sm:p-6 lg:p-8 rounded-lg w-full"
      >
        <div className="flex items-center justify-center min-h-100">
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
        milestoneTitle={milestone?.milestone_title}
      />

      <MilestoneDetailsView
        id={parseInt(milestoneId)}
        projectId={projectId}
        onClose={handleClose}
        project_created_by={project?.created_by || ""}
        employees={employees}
        milestoneDetails={milestone}
      />
    </motion.section>
  );
}
