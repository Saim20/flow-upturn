"use client";

import { Building, CheckCircle, FolderDashed } from "@phosphor-icons/react";
import BaseProjectListView, { ProjectListConfig } from "./BaseProjectListView";
import { fadeInUp } from "@/components/ui/animations";
import { motion } from "framer-motion";

// ============================================
// ONGOING PROJECTS VIEW
// ============================================
const ongoingConfig: ProjectListConfig = {
  variant: "ongoing",
  icon: Building,
  loadingColor: "blue",
  searchPlaceholder: "Search projects...",
  emptyTitle: "No projects found",
  emptyDescription: "No ongoing projects available. Create one to get started.",
  emptySearchDescription: "Try a different keyword or create a new project.",
  deleteModalTitle: "Delete Project",
  deleteModalMessage: (title) =>
    `Are you sure you want to delete "${title}"? This action cannot be undone and will also delete all associated milestones.`,
  successMessages: {
    update: "Project updated successfully",
    delete: "Project deleted successfully",
  },
  showCreateAction: true,
  showEditAction: true,
};

export function OngoingProjectsView({ setActiveTab }: { setActiveTab: (key: string) => void }) {
  return <BaseProjectListView setActiveTab={setActiveTab} config={ongoingConfig} />;
}

// ============================================
// COMPLETED PROJECTS VIEW
// ============================================
const completedConfig: ProjectListConfig = {
  variant: "completed",
  icon: CheckCircle,
  loadingColor: "emerald",
  searchPlaceholder: "Search completed projects...",
  emptyTitle: "No completed projects yet",
  emptyDescription: "Projects will appear here once they're marked as complete.",
  emptySearchDescription: "Try a different keyword.",
  deleteModalTitle: "Delete Project",
  deleteModalMessage: (title) =>
    `Are you sure you want to delete "${title}"? This action cannot be undone.`,
  successMessages: {
    update: "Project updated successfully",
    delete: "Project deleted successfully",
  },
  showCreateAction: false,
  showEditAction: false,
  statusIcon: <CheckCircle size={18} className="text-success mt-1 shrink-0" />,
};

export function CompletedProjectsView({ setActiveTab }: { setActiveTab: (key: string) => void }) {
  return <BaseProjectListView setActiveTab={setActiveTab} config={completedConfig} />;
}

// ============================================
// DRAFT PROJECTS VIEW
// ============================================
const DraftInfoBanner = (
  <motion.div
    variants={fadeInUp}
    className="bg-warning/10 border border-warning/30 dark:bg-warning/20 p-4 rounded-md"
  >
    <p className="text-warning-700 dark:text-warning-300 text-sm">
      <strong>Draft projects</strong> are only visible to you. When you publish a draft, all
      assigned team members will be notified.
    </p>
  </motion.div>
);

const draftsConfig: ProjectListConfig = {
  variant: "drafts",
  icon: FolderDashed,
  loadingColor: "amber",
  searchPlaceholder: "Search drafts...",
  emptyTitle: "No draft projects",
  emptyDescription: "You don't have any draft projects. Create one to save your work in progress.",
  emptySearchDescription: "Try a different keyword or create a new project.",
  deleteModalTitle: "Delete Draft",
  deleteModalMessage: (title) =>
    `Are you sure you want to delete "${title}"? This action cannot be undone and will also delete all associated milestones.`,
  successMessages: {
    update: "Draft updated successfully",
    delete: "Draft deleted successfully",
    publish: "Project published successfully! Team members have been notified.",
  },
  showCreateAction: true,
  showEditAction: true,
  isDraft: true,
  infoBanner: DraftInfoBanner,
};

export function DraftProjectsView({ setActiveTab }: { setActiveTab: (key: string) => void }) {
  return <BaseProjectListView setActiveTab={setActiveTab} config={draftsConfig} />;
}

// Default exports for backwards compatibility
export default OngoingProjectsView;
