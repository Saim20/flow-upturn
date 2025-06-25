"use client";

import {
  createMilestone as cMilestone,
  deleteMilestone as dMilestone,
  getMilestones,
  updateMilestone as uMilestone,
} from "@/lib/api/operations-and-services/project/milestone";
import { Milestone } from "@/lib/types/schemas";
import { useState, useCallback } from "react";

// Re-export Milestone type for components
export type { Milestone };

export function useMilestones() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMilestones();
      setMilestones(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createMilestone = async (milestone: Milestone) => {
    const data = await cMilestone(milestone);
    return { success: true, status: 200, data };
  };

  const updateMilestone = async (milestone: Milestone) => {
    const data = await uMilestone(milestone);
    return { success: true, status: 200, data };
  };

  const deleteMilestone = async (id: number) => {
    const data = await dMilestone(id);
    return { success: true, status: 200, data };
  };

  return {
    milestones,
    loading,
    fetchMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  };
}
