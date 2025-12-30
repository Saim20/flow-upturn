"use client";

import { supabase } from "@/lib/supabase/client";
import { useBaseEntity } from "./core";
import { Milestone } from "@/lib/types";
import { createMilestoneNotification } from "@/lib/utils/notifications";

export type { Milestone };

export function useMilestones() {
  const baseResult = useBaseEntity<Milestone>({
    tableName: "milestone_records",
    entityName: "milestone",
    companyScoped: true,
  });

  const updateMilestoneStatus = async (id: number, data: Partial<Milestone>, projectProgress: number) => {
    try {
      const result = await baseResult.updateItem(id, data);
      if (projectProgress === null) projectProgress = 0;

      if (data.status === "Completed") {
        const updatedProjectProgress = projectProgress + (data.weightage || 0)
        console.log("Updated Project Progress:", updatedProjectProgress);
        const { error } = await supabase
          .from("project_records")
          .update({ progress: updatedProjectProgress })
          .eq("id", data.project_id)

        if (error) {
          console.error("Error updating project progress:", error);
          throw error;
        }

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

          if (milestoneData?.project_records?.employees?.users?.id) {
            await createMilestoneNotification(
              milestoneData.project_records.employees.users.id,
              milestoneData.name || "Milestone",
              milestoneData.project_records.name || "Project",
              'completed'
            );
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
