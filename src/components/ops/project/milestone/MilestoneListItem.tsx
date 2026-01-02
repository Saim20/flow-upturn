"use client";

import React from "react";
import { motion } from "framer-motion";
import { Pencil, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Milestone, Project } from "@/lib/types/schemas";
import Link from "next/link";

interface MilestoneListItemProps {
  milestone: Milestone;
  projectDetails: Project;
  onMilestoneStatusUpdate: (id: number, updated: Milestone) => void;
  setSelectedMilestone: (milestone: Milestone) => void;
  setMilestoneDetailsId?: (id: number) => void; // Now optional - for backward compatibility
  index?: number;
  canWriteMilestones?: boolean;
}

const MilestoneListItem: React.FC<MilestoneListItemProps> = ({
  milestone,
  projectDetails,
  onMilestoneStatusUpdate,
  setSelectedMilestone,
  setMilestoneDetailsId,
  index,
  canWriteMilestones = false,
}) => {
  const milestoneUrl = `/ops/project/${projectDetails.id}/milestone/${milestone.id}`;
  
  return (
    <motion.div
      key={milestone.id ?? index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border-primary rounded-lg p-4 space-y-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center gap-3">
          <h4 className="font-semibold text-foreground-primary">
            {milestone.milestone_title}
          </h4>
          <span className="text-xs font-medium bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded-full text-primary-600 dark:text-primary-300">
            {milestone.weightage}%
          </span>

          {milestone.status === "Completed" && (
            <span className="text-xs font-medium text-success bg-success/10 dark:bg-success/20 px-2 py-1 rounded-full">
              Completed
            </span>
          )}
          {milestone.status === "In Progress" && (
            <span className="text-xs font-medium text-warning bg-warning/10 dark:bg-warning/20 px-2 py-1 rounded-full">
              In Progress
            </span>
          )}
          {milestone.status === "Not Started" && (
            <span className="text-xs font-medium text-error bg-error/10 dark:bg-error/20 px-2 py-1 rounded-full">
              Not Started
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canWriteMilestones && milestone.status === "Not Started" && (
            <Button
              variant="pending"
              size="sm"
              aria-label="Mark milestone as in progress"
              onClick={() =>
                milestone.id &&
                onMilestoneStatusUpdate(milestone.id, {
                  ...milestone,
                  status: "In Progress",
                })
              }
            >
              Mark as In Progress
            </Button>
          )}

          {canWriteMilestones && milestone.status === "In Progress" && (
            <Button
              variant="complete"
              size="sm"
              aria-label="Mark milestone as complete"
              onClick={() =>
                milestone.id &&
                onMilestoneStatusUpdate(milestone.id, {
                  ...milestone,
                  status: "Completed",
                })
              }
            >
              Mark as Complete
            </Button>
          )}

          {projectDetails.status !== "Completed" && (
            <div className="flex gap-1">
              {canWriteMilestones && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Edit milestone"
                  onClick={() => setSelectedMilestone(milestone)}
                >
                  <Pencil size={14} />
                </Button>
              )}
              <Link href={milestoneUrl}>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="View milestone details"
                >
                  <ArrowSquareOut size={14} />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-foreground-secondary">{milestone.description}</p>

      <div className="flex items-center justify-between text-sm text-foreground-tertiary">
        <span>
          {milestone.start_date} - {milestone.end_date}
        </span>
      </div>
    </motion.div>
  );
};

export default MilestoneListItem;
