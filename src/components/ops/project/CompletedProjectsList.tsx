"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from "lodash";
import { toast } from "sonner";
import { CheckCircle, MagnifyingGlass } from "@phosphor-icons/react";

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
import ProjectCard from "./ProjectCard";
import LoadingSection from "@/app/(home)/home/components/LoadingSection";
import { EmptyState } from "@/components/ui/EmptyState";
import LoadMore from "@/components/ui/LoadMore";
import { fadeInUp, staggerContainer } from "@/components/ui/animations";

function CompletedProjectsList({ setActiveTab }: { setActiveTab: (key: string) => void }) {
  const {
    completedProjects,
    fetchCompletedProjects,
    updateProject,
    deleteProject,
    hasMoreCompletedProjects,
    completedLoading,
    searchCompletedProjects,
  } = useProjects();

  const { employees, fetchEmployeesByIds } = useEmployees();
  const { departments, fetchDepartments } = useDepartments();
  const { employeeInfo, canWrite, canDelete } = useAuth();

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
      const projects = await fetchCompletedProjects(10, true);
      
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
  }, [employeeInfo, fetchCompletedProjects, fetchEmployeesByIds, fetchDepartments]);

  /** Debounced Search */
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        setSearching(false);
        setShowEmpty(false);
        return;
      }
      // setSearching(true) is handled in handleSearchChange, but we ensure it's still true here
      const results = await searchCompletedProjects(term, 20, false);
      setSearchResults(results);
      setSearching(false);
      // The empty state logic is now primarily handled by the useEffect below and the JSX structure
    }, 400),
    [searchCompletedProjects]
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term) {
      setSearching(true); // Start searching immediately on input change
    }
    debouncedSearch(term);
  };

  const displayProjects = searchTerm ? searchResults : completedProjects;

  /** Empty state only after initial load is complete and no search is active */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    // Condition to show empty state for initial load (no search term, no projects)
    const isInitialEmpty = initialLoadComplete && !completedLoading && !searchTerm && completedProjects.length === 0;
    // Condition to show empty state for search (search completed, no results)
    const isSearchEmpty = !!searchTerm && !searching && searchResults.length === 0;

    if (isInitialEmpty || isSearchEmpty) {
      timer = setTimeout(() => setShowEmpty(true), 300);
    } else {
      setShowEmpty(false);
    }
    return () => clearTimeout(timer);
  }, [completedProjects.length, completedLoading, searching, initialLoadComplete, searchTerm, searchResults.length]);

  /** Update Project */
  const handleUpdateProject = async (values: Project) => {
    try {
      if (!values?.id) return;
      await updateProject(values.id, values);
      toast.success("Project updated successfully");
      setSelectedProject(null);
      if (values.status === "Ongoing") setActiveTab("ongoing");
      await fetchCompletedProjects(10, true);
    } catch (error) {
      captureError(error, { operation: "updateProject", projectId: values.id });
      toast.error("Error updating project");
    }
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
      await fetchCompletedProjects(10, true);
    } catch (error) {
      captureError(error, { operation: "deleteProject", projectId: deleteConfirmation.projectId });
      toast.error("Error deleting project");
    }
  };

  /** Pagination: Load More */
  const handleLoadMore = async () => {
    const newProjects = await fetchCompletedProjects(10, false);
    
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
          key="completed-project-list"
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
              placeholder="Search completed projects..."
              className="w-full border border-border-primary rounded pl-9 pr-3 py-2 text-sm bg-surface-primary text-foreground-primary focus:outline-none focus:ring focus:border-primary-300"
            />
          </motion.div>

          {/* Conditional Rendering of Content */}
          <motion.div variants={fadeInUp}>
            <AnimatePresence mode="wait">
              {/* 1. Initial Load State */}
              {(completedLoading && !searchTerm && completedProjects.length === 0) && (
                <LoadingSection key="initial-load" icon={CheckCircle} text="Loading completed projects..." color="blue" />
              )}

              {/* 2. Searching State */}
              {(searching && searchTerm) && (
                <LoadingSection key="searching" icon={CheckCircle} text="Searching completed projects..." color="blue" />
              )}

              {/* 3. Projects List (Show if not loading and projects exist) */}
              {(!completedLoading || searchTerm) && displayProjects.length > 0 && (
                <motion.div key="project-list" className="space-y-4">
                  {displayProjects.map(
                    (project) =>
                      project.id && (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          employees={employees}
                          departments={departments.filter((d) => d.id != null) as any}
                          onEdit={undefined}
                          onDelete={() => openDeleteConfirmation(project.id!, project.project_title || "Untitled Project")}
                          onDetails={() => setProjectDetailsId(project.id!)}
                          showEdit={false}
                          showDelete={canDeleteProjects && project.created_by === userId}
                          showDetails={true}
                          statusIcon={
                            <CheckCircle
                              size={18}
                              className="text-success mt-1 shrink-0"
                            />
                          }
                          progressColor="bg-success/10 text-success dark:bg-success/20"
                        />
                      )
                  )}

                  {!searchTerm && (
                    <LoadMore
                      isLoading={completedLoading}
                      hasMore={hasMoreCompletedProjects}
                      onLoadMore={handleLoadMore}
                    />
                  )}
                </motion.div>
              )}

              {/* 4. Empty State (Show if initial load/search is complete and no projects) */}
              {showEmpty && (
                <EmptyState
                  key="empty-state"
                  icon={<CheckCircle className="h-12 w-12" />}
                  title={searchTerm ? "No matching projects" : "No completed projects yet"}
                  description={
                    searchTerm
                      ? "Try a different keyword."
                      : "Projects will appear here once they're marked as complete."
                  }
                />
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, projectId: null, projectTitle: "" })}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirmation.projectTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </AnimatePresence>
  );
}

export default CompletedProjectsList;