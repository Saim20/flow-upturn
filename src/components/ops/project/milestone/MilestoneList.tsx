"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, Pencil, TrashSimple, Plus, Target, Users, Scales, Copy } from "@phosphor-icons/react";
import { type Milestone as MilestoneType } from "./MilestoneForm";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/Card";

interface MilestoneListProps {
  milestones: MilestoneType[];
  onEdit: (milestone_title: string) => void;
  onDelete: (milestone_title: string) => void;
  onAdd: () => void;
  onCopy?: (milestone: MilestoneType) => void;
  onDistributeEvenly?: () => void;
  employees: { id: string; name: string }[];
}

// Weightage progress bar component
function WeightageProgressBar({ total }: { total: number }) {
  const getProgressColor = () => {
    if (total === 100) return "bg-success";
    if (total > 100) return "bg-error";
    return "bg-primary-500";
  };

  const getTextColor = () => {
    if (total === 100) return "text-success";
    if (total > 100) return "text-error";
    return "text-primary-600 dark:text-primary-400";
  };

  const getBgColor = () => {
    if (total === 100) return "bg-success/10 border-success/30 dark:bg-success/20";
    if (total > 100) return "bg-error/10 border-error/30 dark:bg-error/20";
    return "bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-700";
  };

  return (
    <div className={`p-3 rounded-lg border ${getBgColor()} mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${getTextColor()}`}>
          Total Weightage: {total}%
        </span>
        <span className={`text-xs ${getTextColor()}`}>
          {total === 100 ? "✓ Complete" : total > 100 ? "⚠ Over allocated" : `${100 - total}% remaining`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(total, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-2.5 rounded-full ${getProgressColor()}`}
        />
      </div>
    </div>
  );
}

export default function MilestoneList({
  milestones,
  onEdit,
  onDelete,
  onAdd,
  onCopy,
  onDistributeEvenly,
  employees,
}: MilestoneListProps) {
  const totalWeightage = milestones.reduce((sum, m) => sum + m.weightage, 0);

  return (
    <Card>
      <CardHeader 
        title="Milestones"
        subtitle={milestones.length > 0 ? `${milestones.length} milestone${milestones.length > 1 ? 's' : ''}` : undefined}
        icon={<Target size={20} />}
        action={
          <div className="flex items-center gap-2">
            {milestones.length >= 2 && onDistributeEvenly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDistributeEvenly}
                title="Distribute weightage evenly"
              >
                <Scales size={16} className="mr-1" />
                Distribute
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAdd}
            >
              <Plus size={16} className="mr-2" />
              Add Milestone
            </Button>
          </div>
        }
      />
      
      <CardContent>
        {/* Weightage Progress Bar - show when there are milestones */}
        {milestones.length > 0 && (
          <WeightageProgressBar total={totalWeightage} />
        )}

        {milestones.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {milestones.map((m) => (
                <motion.div
                  key={m.milestone_title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border border-border-primary rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg text-foreground-primary">
                      {m.milestone_title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-2 py-1 rounded-full">
                        {m.weightage}%
                      </span>
                      <div className="flex gap-1">
                        {onCopy && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onCopy(m)}
                            title="Copy milestone"
                          >
                            <Copy size={14} />
                          </Button>
                        )}
                        <Button
                        data-testid="edit-milestone-button"
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log(m)
                            m.milestone_title && onEdit(m.milestone_title)
                          }}
                          title="Edit milestone"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => m.milestone_title && onDelete(m.milestone_title)}
                          title="Delete milestone"
                        >
                          <TrashSimple size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground-secondary line-clamp-2">{m.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoRow 
                      icon={<Calendar size={14} />}
                      label="Start"
                      value={m.start_date}
                    />
                    <InfoRow 
                      icon={<ArrowRight size={14} />}
                      label="End"
                      value={m.end_date}
                    />
                  </div>
                  
                  {m.assignees && m.assignees.length > 0 && (
                    <div className="pt-2 border-t border-border-primary">
                      <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-2">
                        <Users size={14} />
                        <span>Assigned to:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.assignees.map((assigneeId: string) => {
                          const employee = employees.find(e => e.id === assigneeId);
                          return employee ? (
                            <span 
                              key={assigneeId}
                              className="text-xs bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary px-2 py-1 rounded-full"
                            >
                              {employee.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState 
            icon={<Target className="h-8 w-8" />}
            title="No milestones yet"
            description="Add milestones to track project progress and break down work into manageable parts. Milestones help divide your project into phases with specific weightage."
            action={{
              label: "Add First Milestone",
              onClick: onAdd,
              icon: <Plus size={16} />
            }}
          />
        )}
      </CardContent>
    </Card>
  );
} 