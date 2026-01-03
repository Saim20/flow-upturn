// Project Components - Main exports
export { default as ProjectCard } from "./ProjectCard";
export { default as ProjectDetails } from "./ProjectDetails";
export { default as ProjectForm } from "./ProjectForm";
export { default as AssigneeSelect } from "./AssigneeSelect";

// Project List Views - Consolidated
export {
  OngoingProjectsView,
  CompletedProjectsView,
  DraftProjectsView,
} from "./ProjectListViews";

// Base component for list views
export { default as BaseProjectListView, type ProjectListConfig, type ProjectListVariant } from "./BaseProjectListView";

// Create/Update pages
export { default as CreateNewProjectPage, UpdateProjectPage } from "./CreateNewProject";

// Milestone exports
export * from "./milestone";

// Navigation exports
export * from "./navigation";
