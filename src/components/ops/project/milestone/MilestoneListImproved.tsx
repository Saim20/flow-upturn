"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, Pencil, TrashSimple, Plus, Target, Users } from "@phosphor-icons/react";
import { type Milestone as MilestoneType } from "./MilestoneForm";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/Card";

interface MilestoneListProps {
  milestones: MilestoneType[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  employees: { id: string; name: string }[];
}

export default function MilestoneList({
  milestones,
  onEdit,
  onDelete,
  onAdd,
  employees,
}: MilestoneListProps) {
  const totalWeightage = milestones.reduce((sum, m) => sum + m.weightage, 0);

  return (
    <Card>
      <CardHeader 
        title="Milestones"
        subtitle={`Total weightage: ${totalWeightage}%`}
        icon={<Target size={20} />}
        action={
          totalWeightage < 100 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAdd}
            >
              <Plus size={16} className="mr-2" />
              Add Milestone
            </Button>
          )
        }
      />
      
      <CardContent>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => m.id && onEdit(m.id)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => m.id && onDelete(m.id)}
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
            description="Add milestones to track project progress and break down work into manageable parts"
            action={
              totalWeightage < 100 ? {
                label: "Add First Milestone",
                onClick: onAdd,
                icon: <Plus size={16} />
              } : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
