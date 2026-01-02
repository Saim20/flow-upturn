"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building, Plus, MagnifyingGlass } from "@phosphor-icons/react";

import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { Project, useProjects } from "@/hooks/useProjects";
import { getEmployeeId } from "@/lib/utils/auth";
import { useAuth } from "@/lib/auth/auth-context";
import { extractEmployeeIdsFromProjects } from "@/lib/utils/project-utils";
import { PERMISSION_MODULES } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import ConfirmationModal from "@/components/ui/modals/ConfirmationModal";

import ProjectDetails from "./ProjectDetails";
import { UpdateProjectPage } from "./CreateNewProject";
import ProjectCard from "./ProjectCard";
import LoadingSection from "@/app/(home)/home/components/LoadingSection";
import { EmptyState } from "@/components/ui/EmptyState";
import LoadMore from "@/components/ui/LoadMore";
import { fadeInUp, staggerContainer } from "@/components/ui/animations";

function ProjectsList({ setActiveTab }: { setActiveTab: (key: string) => void }) {
  const {
    ongoingProjects,
    fetchOngoingProjects,
    updateProject,
    deleteProject,
    hasMoreOngoingProjects,
    ongoingLoading,
    searchOngoingProjects,
  } = useProjects();

  const { employees, fetchEmployeesByIds } = useEmployees();
  const { departments, fetchDepartments } = useDepartments();
  const { employeeInfo, canWrite, canDelete } = useAuth();
  const router = useRouter();

  // Permission checks
  const canWriteProjects = canWrite(PERMISSION_MODULES.PROJECTS);
  const canDeleteProjects = canDelete(PERMISSION_MODULES.PROJECTS);

  const [projectDetailsId, setProjectDetailsId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [searching, setSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; projectId: string | null; projectTitle: string }>({
    isOpen: false,
    projectId: null,
    projectTitle: "",
  });

  const hasFetched = useRef(false);

  /** Initialize user ID and fetch data */
  useEffect(() => {
    // Don't fetch if employeeInfo is not available yet
    if (!employeeInfo) return;
    
    if (hasFetched.current) return;
    hasFetched.current = true;

    const initData = async () => {
      const id = await getEmployeeId();
      setUserId(id);
      const projects = await fetchOngoingProjects(10, true);
      
      // Only fetch employees that are referenced in the projects
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
  }, [employeeInfo, fetchOngoingProjects, fetchEmployeesByIds, fetchDepartments]);

  /** Debounced Search */
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        setSearching(false);
        setShowEmpty(false);
        return;
      }
      setSearching(true);
      setShowEmpty(false);
      const results = await searchOngoingProjects(term, 20, false);
      setSearchResults(results);
      setSearching(false);
      
      // Show empty state after search completes if no results
      if (results.length === 0) {
        setTimeout(() => setShowEmpty(true), 100);
      }
    }, 400),
    [searchOngoingProjects]
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    // Hide empty state immediately when typing
    setShowEmpty(false);
    
    // If clearing search, reset immediately
    if (!term.trim()) {
      setSearchResults([]);
      setSearching(false);
      debouncedSearch.cancel();
    } else {
      debouncedSearch(term);
    }
  };

  const displayProjects = searchTerm ? searchResults : ongoingProjects;

  /** Empty state only after initial load is complete and not searching */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Only show empty if:
    // 1. Not currently searching
    // 2. Not loading
    // 3. Initial load complete
    // 4. No projects to display
    // 5. Not in the middle of typing (handled by handleSearchChange)
    if (
      initialLoadComplete && 
      !ongoingLoading && 
      !searching && 
      displayProjects.length === 0 &&
      (!searchTerm || searchResults.length === 0)
    ) {
      timer = setTimeout(() => setShowEmpty(true), 300);
    } else {
      setShowEmpty(false);
    }
    
    return () => clearTimeout(timer);
  }, [displayProjects.length, ongoingLoading, searching, initialLoadComplete, searchTerm, searchResults.length]);

  /** Update Project */
  const handleUpdateProject = async (values: Project) => {
    try {
      if (!values?.id) return;
      await updateProject(values.id, values);
      toast.success("Project updated successfully");
      setSelectedProject(null);
      if (values.status === "Completed") setActiveTab("completed");
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
      toast.success("Project deleted successfully");
      setDeleteConfirmation({ isOpen: false, projectId: null, projectTitle: "" });
      await fetchOngoingProjects(10, true);
    } catch (error) {
      captureError(error, { operation: "deleteProject", projectId: deleteConfirmation.projectId });
      toast.error("Error deleting project");
    }
  };

  /** Pagination: Load More */
  const handleLoadMore = async () => {
    const newProjects = await fetchOngoingProjects(10, false);
    
    // Fetch any new employees that might be in the newly loaded projects
    if (newProjects && newProjects.length > 0) {
      const employeeIds = extractEmployeeIdsFromProjects(newProjects);
      if (employeeIds.length > 0) {
        fetchEmployeesByIds(employeeIds);
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!selectedProject && !projectDetailsId && (
        <motion.div
          key="project-list"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="px-4 py-4 space-y-6"
        >
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
              placeholder="Search projects..."
              className="w-full border border-border-primary rounded pl-9 pr-3 py-2 text-sm bg-surface-primary text-foreground-primary focus:outline-none focus:ring focus:border-primary-300"
            />
          </motion.div>

          {/* Loading below search bar */}
          {(ongoingLoading && !searchTerm && !searching && ongoingProjects.length === 0) && (
            <LoadingSection icon={Building} text="Loading projects..." color="blue" />
          )}

          {/* Project Cards */}
          <motion.div variants={fadeInUp}>
            <AnimatePresence>
              {searching ? (
                <LoadingSection icon={Building} text="Searching projects..." color="blue" />
              ) : displayProjects.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {displayProjects.map(
                      (project) =>
                        project.id && (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            employees={employees}
                            departments={departments.filter((d) => d.id != null) as any}
                            onEdit={() => setSelectedProject(project)}
                            onDelete={() => openDeleteConfirmation(project.id!, project.project_title || "Untitled Project")}
                            onDetails={() => setProjectDetailsId(project.id!)}
                            showEdit={canWriteProjects && project.created_by === userId}
                            showDelete={canDeleteProjects && project.created_by === userId}
                            showDetails={true}
                          />
                        )
                    )}
                  </div>

                  {!searchTerm && (
                    <LoadMore
                      isLoading={ongoingLoading}
                      hasMore={hasMoreOngoingProjects}
                      onLoadMore={handleLoadMore}
                    />
                  )}
                </>
              ) : (
                showEmpty && (
                  <EmptyState
                    icon={<Building className="h-12 w-12" />}
                    title="No projects found"
                    description={
                      searchTerm 
                        ? "Try a different keyword or create a new project."
                        : "No ongoing projects available. Create one to get started."
                    }
                    action={{
                      label: "Create Project",
                      onClick: handleCreateProject,
                      icon: <Plus size={16} />,
                    }}
                  />
                )
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* Details View */}
      {!selectedProject && projectDetailsId && (
        <ProjectDetails
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
        onClose={() => setDeleteConfirmation({ isOpen: false, projectId: null, projectTitle: "" })}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirmation.projectTitle}"? This action cannot be undone and will also delete all associated milestones.`}
        confirmText="Delete"
        variant="danger"
      />
    </AnimatePresence>
  );
}

export default ProjectsList;