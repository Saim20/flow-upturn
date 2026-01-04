"use client";

import { useEffect, useState, useCallback, useRef, ReactNode, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MagnifyingGlass, Plus, Icon } from "@phosphor-icons/react";

import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { Project, useProjects } from "@/hooks/useProjects";
import { getEmployeeId } from "@/lib/utils/auth";
import { useAuth } from "@/lib/auth/auth-context";
import { extractEmployeeIdsFromProjects } from "@/lib/utils/project-utils";
import { PERMISSION_MODULES } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import { WindowedList } from "@/components/ui/VirtualizedList";
import ConfirmationModal from "@/components/ui/modals/ConfirmationModal";

import ProjectDetails from "./ProjectDetails";
import { UpdateProjectPage } from "./CreateNewProject";
import ProjectCard from "./ProjectCard";
import LoadingSection from "@/app/(home)/home/components/LoadingSection";
import { EmptyState } from "@/components/ui/EmptyState";
import LoadMore from "@/components/ui/LoadMore";
import { fadeInUp, staggerContainer } from "@/components/ui/animations";

// Types for project list configuration
export type ProjectListVariant = "ongoing" | "completed" | "drafts";

export interface ProjectListConfig {
  variant: ProjectListVariant;
  icon: Icon;
  loadingColor: "blue" | "emerald" | "purple" | "amber" | "red" | "gray";
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  emptySearchDescription: string;
  deleteModalTitle: string;
  deleteModalMessage: (title: string) => string;
  successMessages: {
    update: string;
    delete: string;
    publish?: string;
  };
  showCreateAction?: boolean;
  showEditAction?: boolean;
  isDraft?: boolean;
  statusIcon?: ReactNode;
  infoBanner?: ReactNode;
}

interface BaseProjectListViewProps {
  setActiveTab: (key: string) => void;
  config: ProjectListConfig;
}

export default function BaseProjectListView({ setActiveTab, config }: BaseProjectListViewProps) {
  const {
    ongoingProjects,
    completedProjects,
    draftProjects,
    fetchOngoingProjects,
    fetchCompletedProjects,
    fetchDraftProjects,
    updateProject,
    deleteProject,
    hasMoreOngoingProjects,
    hasMoreCompletedProjects,
    hasMoreDraftProjects,
    ongoingLoading,
    completedLoading,
    draftsLoading,
    searchOngoingProjects,
    searchCompletedProjects,
    enrichProjectsWithProgress,
  } = useProjects();

  const { employees, fetchEmployeesByIds } = useEmployees();
  const { departments, fetchDepartments } = useDepartments();
  const { employeeInfo, canWrite, canDelete } = useAuth();
  const router = useRouter();

  // Get variant-specific data
  const getVariantData = () => {
    switch (config.variant) {
      case "ongoing":
        return {
          projects: ongoingProjects,
          fetchProjects: fetchOngoingProjects,
          hasMore: hasMoreOngoingProjects,
          loading: ongoingLoading,
          searchProjects: searchOngoingProjects,
        };
      case "completed":
        return {
          projects: completedProjects,
          fetchProjects: fetchCompletedProjects,
          hasMore: hasMoreCompletedProjects,
          loading: completedLoading,
          searchProjects: searchCompletedProjects,
        };
      case "drafts":
        return {
          projects: draftProjects,
          fetchProjects: fetchDraftProjects,
          hasMore: hasMoreDraftProjects,
          loading: draftsLoading,
          searchProjects: null, // Drafts use local filtering
        };
    }
  };

  const variantData = getVariantData();

  // Permission checks
  const canWriteProjects = canWrite(PERMISSION_MODULES.PROJECTS);
  const canDeleteProjects = canDelete(PERMISSION_MODULES.PROJECTS);

  const [projectDetailsId, setProjectDetailsId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [enrichedProjects, setEnrichedProjects] = useState<(Project & { progress: number })[]>([]);
  const [searching, setSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    projectId: string | null;
    projectTitle: string;
  }>({
    isOpen: false,
    projectId: null,
    projectTitle: "",
  });

  const hasFetched = useRef(false);

  // Stable refs for search functions to avoid debounce recreation
  const searchProjectsRef = useRef(variantData.searchProjects);
  const projectsRef = useRef(variantData.projects);
  searchProjectsRef.current = variantData.searchProjects;
  projectsRef.current = variantData.projects;

  /** Initialize user ID and fetch data */
  useEffect(() => {
    if (!employeeInfo) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    const initData = async () => {
      const id = await getEmployeeId();
      setUserId(id);
      const projects = await variantData.fetchProjects(10, true);

      if (projects && projects.length > 0) {
        const employeeIds = extractEmployeeIdsFromProjects(projects);
        if (employeeIds.length > 0) {
          fetchEmployeesByIds(employeeIds);
        }
      }

      fetchDepartments();
      setInitialLoadComplete(true);
    };
    initData();
  }, [employeeInfo, variantData.fetchProjects, fetchEmployeesByIds, fetchDepartments]);

  /** Stable debounced search using useMemo */
  const debouncedSearch = useMemo(
    () => debounce(async (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        setSearching(false);
        setShowEmpty(false);
        return;
      }
      setSearching(true);
      setShowEmpty(false);

      let results: Project[] = [];
      if (searchProjectsRef.current) {
        // Use API search for ongoing/completed
        results = await searchProjectsRef.current(term, 20, false);
      } else {
        // Local filter for drafts
        results = projectsRef.current.filter(
          (p) =>
            p.project_title?.toLowerCase().includes(term.toLowerCase()) ||
            p.description?.toLowerCase().includes(term.toLowerCase())
        );
      }

      setSearchResults(results);
      setSearching(false);

      if (results.length === 0) {
        setTimeout(() => setShowEmpty(true), 100);
      }
    }, 400),
    [] // Empty deps - uses refs for dynamic values
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Memoized search change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setShowEmpty(false);

    if (!term.trim()) {
      setSearchResults([]);
      setSearching(false);
      debouncedSearch.cancel();
    } else {
      debouncedSearch(term);
    }
  }, [debouncedSearch]);

  // Memoized display projects
  const displayProjects = useMemo(
    () => searchTerm ? searchResults : variantData.projects,
    [searchTerm, searchResults, variantData.projects]
  );

  // Enrich projects with calculated progress
  useEffect(() => {
    const enrichProjects = async () => {
      const enriched = await enrichProjectsWithProgress(displayProjects);
      setEnrichedProjects(enriched);
    };
    enrichProjects();
  }, [displayProjects, enrichProjectsWithProgress]);

  /** Empty state logic */
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (
      initialLoadComplete &&
      !variantData.loading &&
      !searching &&
      displayProjects.length === 0 &&
      (!searchTerm || searchResults.length === 0)
    ) {
      timer = setTimeout(() => setShowEmpty(true), 300);
    } else {
      setShowEmpty(false);
    }

    return () => clearTimeout(timer);
  }, [
    displayProjects.length,
    variantData.loading,
    searching,
    initialLoadComplete,
    searchTerm,
    searchResults.length,
  ]);

  /** Update Project */
  const handleUpdateProject = async (values: Project, isDraft = false) => {
    try {
      if (!values?.id) return;
      const { progress, ...projectData } = values as any;

      if (config.isDraft) {
        await updateProject(values.id, { ...projectData, is_draft: isDraft });
        if (!isDraft) {
          toast.success(config.successMessages.publish || "Project published successfully!");
          setActiveTab("ongoing");
        } else {
          toast.success(config.successMessages.update);
        }
      } else {
        await updateProject(values.id, projectData);
        toast.success(config.successMessages.update);

        // Handle status change navigation
        if (config.variant === "ongoing" && values.status === "Completed") {
          setActiveTab("completed");
        } else if (config.variant === "completed" && values.status === "Ongoing") {
          setActiveTab("ongoing");
        }
      }

      setSelectedProject(null);
      await variantData.fetchProjects(10, true);
    } catch (error) {
      captureError(error, { operation: "updateProject", projectId: values.id });
      toast.error("Error updating project");
    }
  };

  /** Create New Project */
  const handleCreateProject = () => {
    router.push("/ops/project?tab=create");
  };

  /** Open Delete Confirmation */
  const openDeleteConfirmation = (id: string, title: string) => {
    setDeleteConfirmation({ isOpen: true, projectId: id, projectTitle: title });
  };

  /** Delete Project */
  const handleDeleteProject = async () => {
    if (!deleteConfirmation.projectId) return;

    try {
      await deleteProject(deleteConfirmation.projectId);
      toast.success(config.successMessages.delete);
      setDeleteConfirmation({ isOpen: false, projectId: null, projectTitle: "" });
      await variantData.fetchProjects(10, true);
    } catch (error) {
      captureError(error, {
        operation: "deleteProject",
        projectId: deleteConfirmation.projectId,
      });
      toast.error("Error deleting project");
    }
  };

  /** Pagination: Load More */
  const handleLoadMore = async () => {
    const newProjects = await variantData.fetchProjects(10, false);

    if (newProjects && newProjects.length > 0) {
      const employeeIds = extractEmployeeIdsFromProjects(newProjects);
      if (employeeIds.length > 0) {
        fetchEmployeesByIds(employeeIds);
      }
    }
  };

  const IconComponent = config.icon;

  return (
    <AnimatePresence mode="wait">
      {!selectedProject && !projectDetailsId && (
        <motion.div
          key={`${config.variant}-list`}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="px-4 py-4 space-y-6"
        >
          {/* Info Banner (for drafts) */}
          {config.infoBanner}

          {/* Search Bar */}
          <motion.div variants={fadeInUp} className="relative mb-4">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={config.searchPlaceholder}
              className="w-full border border-border-primary rounded pl-9 pr-3 py-2 text-sm bg-surface-primary text-foreground-primary focus:outline-none focus:ring focus:border-primary-300"
            />
          </motion.div>

          {/* Loading State */}
          {variantData.loading && !searchTerm && !searching && variantData.projects.length === 0 && (
            <LoadingSection
              icon={IconComponent}
              text={`Loading ${config.variant === "drafts" ? "drafts" : "projects"}...`}
              color={config.loadingColor}
            />
          )}

          {/* Project Cards */}
          <motion.div variants={fadeInUp}>
            {searching ? (
              <LoadingSection
                icon={IconComponent}
                text={`Searching ${config.variant === "drafts" ? "drafts" : "projects"}...`}
                color={config.loadingColor}
              />
            ) : enrichedProjects.length > 0 ? (
              <WindowedList
                items={enrichedProjects}
                keyExtractor={(project, index) => project.id || `project-${index}`}
                maxRenderCount={30}
                className="space-y-4"
                renderItem={(project) =>
                  project.id ? (
                    <ProjectCard
                      project={project}
                      employees={employees}
                      departments={departments.filter((d) => d.id != null) as any}
                      onEdit={
                        config.showEditAction !== false
                          ? () => {
                              const { progress, ...projectData } = project;
                              setSelectedProject(projectData);
                            }
                          : undefined
                      }
                      onDelete={() =>
                        openDeleteConfirmation(
                          project.id!,
                          project.project_title || "Untitled Project"
                        )
                      }
                      onDetails={() => setProjectDetailsId(project.id!)}
                      showEdit={
                        config.showEditAction !== false &&
                        canWriteProjects &&
                        project.created_by === userId
                      }
                      showDelete={canDeleteProjects && project.created_by === userId}
                      showDetails={true}
                      isDraft={config.isDraft}
                      statusIcon={config.statusIcon}
                    />
                  ) : null
                }
                footer={
                  !searchTerm ? (
                    <LoadMore
                      isLoading={variantData.loading}
                      hasMore={variantData.hasMore}
                      onLoadMore={handleLoadMore}
                    />
                  ) : null
                }
              />
            ) : (
              showEmpty && (
                <EmptyState
                  icon={<IconComponent className="h-12 w-12" />}
                  title={searchTerm ? "No matching projects" : config.emptyTitle}
                  description={searchTerm ? config.emptySearchDescription : config.emptyDescription}
                  action={
                    config.showCreateAction
                      ? {
                          label: "Create Project",
                          onClick: handleCreateProject,
                          icon: <Plus size={16} />,
                        }
                      : undefined
                  }
                />
              )
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Details View */}
      {!selectedProject && projectDetailsId && (
        <ProjectDetails
          key="project-details"
          id={projectDetailsId}
          employees={employees}
          departments={departments}
          onClose={() => setProjectDetailsId(null)}
          onSubmit={handleUpdateProject}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Update Form */}
      {!projectDetailsId && selectedProject && (
        <UpdateProjectPage
          key="update-project"
          initialData={selectedProject}
          employees={employees}
          departments={departments}
          onSubmit={handleUpdateProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({ isOpen: false, projectId: null, projectTitle: "" })
        }
        onConfirm={handleDeleteProject}
        title={config.deleteModalTitle}
        message={config.deleteModalMessage(deleteConfirmation.projectTitle)}
        confirmText="Delete"
        variant="danger"
      />
    </AnimatePresence>
  );
}
