"use client";

import { supabase } from "@/lib/supabase/client";
import { useBaseEntity } from "./core";
import { Milestone } from "@/lib/types";
import { createMilestoneNotification } from "@/lib/utils/notifications";

export type { Milestone };

// Calculate project progress from completed milestones
export function calculateProjectProgress(milestones: Milestone[]): number {
  if (!milestones || milestones.length === 0) return 0;
  
  const completedWeightage = milestones
    .filter(m => m.status === "Completed")
    .reduce((sum, m) => sum + (m.weightage || 0), 0);
  
  return Math.min(completedWeightage, 100);
}

export function useMilestones() {
  const baseResult = useBaseEntity<Milestone>({
    tableName: "milestone_records",
    entityName: "milestone",
    companyScoped: true,
  });

  const updateMilestoneStatus = async (id: number, data: Partial<Milestone>) => {
    try {
      const result = await baseResult.updateItem(id, data);

      if (data.status === "Completed") {
        // Send notification to project manager about milestone completion
        try {
          // Fetch milestone details with project info
          const { data: milestoneData } = await supabase
            .from("milestone_records")
            .select(`
              name,
              project_records!inner(
                name,
                project_manager_id,
                employees!project_records_project_manager_id_fkey(
                  users!inner(id)
                )
              )
            `)
            .eq("id", id)
            .single();

          if (milestoneData?.project_records) {
            const projectRecord = Array.isArray(milestoneData.project_records) 
              ? milestoneData.project_records[0] 
              : milestoneData.project_records;
            
            if (projectRecord?.employees) {
              const employee = Array.isArray(projectRecord.employees) 
                ? projectRecord.employees[0] 
                : projectRecord.employees;
              
              const users = employee?.users as any;
              const userId = Array.isArray(users) ? users[0]?.id : users?.id;
              
              if (userId) {
                await createMilestoneNotification(
                  userId,
                  'completed',
                  { 
                    milestoneName: milestoneData.name || "Milestone",
                    projectName: projectRecord.name || "Project"
                  },
                  { actionUrl: '/ops/milestones' }
                );
              }
            }
          }
        } catch (notifError) {
          console.error("Failed to send milestone completion notification:", notifError);
        }
      }

      return result;
    } catch (error) {
      console.error("Error updating milestone:", error);
      throw error;
    }
  };


  const fetchProjectMilestones = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from("milestone_records")
        .select("*")
        .eq("project_id", projectId);

      if (error) {
        console.error("Error fetching project milestones:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching project milestones:", error);
      throw error;
    }
  };

  return {
    ...baseResult,
    milestones: baseResult.items,
    fetchProjectMilestones,
    fetchMilestones: baseResult.fetchItems,
    createMilestone: baseResult.createItem,
    updateMilestone: baseResult.updateItem,
    updateMilestoneStatus,
    deleteMilestone: baseResult.deleteItem,
  };
}
