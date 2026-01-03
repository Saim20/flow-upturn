"use client";

import { useBaseEntity } from "./core";
import { Project, Milestone } from "@/lib/types";
import { useNotifications } from "./useNotifications";
import { useAuth } from "@/lib/auth/auth-context";
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProjectDetails } from "@/components/ops/project/ProjectForm";
import { slugify } from "@/lib/utils";
import { set } from "lodash";
import { captureSupabaseError } from "@/lib/sentry";
import { sendNotificationEmailAction } from "@/lib/actions/email-actions";
import { checkUserEmailPreference } from "./useEmailPreferences";
import { calculateProjectProgress } from "./useMilestones";

export type { Project };

export function useProjects() {
  const { employeeInfo } = useAuth();
  const baseResult = useBaseEntity<Project>({
    tableName: "project_records",
    entityName: "project",
    companyScoped: true,
  });

  const { createNotification } = useNotifications();

  // --- STATES ---
  const [ongoingProjects, setOngoingProjects] = useState<ProjectDetails[]>([]);
  const [completedProjects, setCompletedProjects] = useState<ProjectDetails[]>([]);
  const [draftProjects, setDraftProjects] = useState<ProjectDetails[]>([]);

  const [ongoingLoading, setOngoingLoading] = useState(false);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);

  const [ongoingSearchLoading, setOngoingSearchLoading] = useState(false);
  const [completedSearchLoading, setCompletedSearchLoading] = useState(false);

  // Pagination cursors
  const [lastFetchedOngoingProjectId, setLastFetchedOngoingProjectId] = useState<number | null>(null);
  const [lastFetchedCompletedProjectId, setLastFetchedCompletedProjectId] = useState<number | null>(null);
  const [lastFetchedDraftProjectId, setLastFetchedDraftProjectId] = useState<number | null>(null);

  const [hasMoreOngoingProjects, setHasMoreOngoingProjects] = useState(true);
  const [hasMoreCompletedProjects, setHasMoreCompletedProjects] = useState(true);
  const [hasMoreDraftProjects, setHasMoreDraftProjects] = useState(true);

  // --- FETCH ONGOING PROJECTS WITH PAGINATION ---
  const fetchOngoingProjects = useCallback(
    async (limit = 10, reset = false) => {
      try {
        if (!employeeInfo) {
          return [];
        }
        setOngoingLoading(true);

        let query = supabase
          .from("project_records")
          .select("*")
          .eq("company_id", employeeInfo.company_id)
          .eq("status", "Ongoing")
          .or(`is_draft.is.null,is_draft.eq.false`) // Exclude drafts from ongoing projects
          .or(`project_lead_id.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}},created_by.eq.${employeeInfo.id}`)
          .order("created_at", { ascending: false })
          .limit(limit);

        // Cursor-based pagination
        if (!reset && lastFetchedOngoingProjectId) {
          query = query.gt("id", lastFetchedOngoingProjectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
          setHasMoreOngoingProjects(false);
          return [];
        }

        setOngoingProjects((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = data.filter((p) => !existingIds.has(p.id));
          return reset ? uniqueNew : [...prev, ...uniqueNew];
        });

        setLastFetchedOngoingProjectId(data[data.length - 1].id);
        setHasMoreOngoingProjects(data.length === limit);

        return data;
      } catch (error) {
        captureSupabaseError(
          { message: error instanceof Error ? error.message : String(error) },
          "fetchOngoingProjects",
          { companyId: employeeInfo?.company_id }
        );
        console.error("Error fetching ongoing projects:", error);
        throw error;
      } finally {
        setOngoingLoading(false);
      }
    },
    [lastFetchedOngoingProjectId, employeeInfo]
  );

  // --- FETCH COMPLETED PROJECTS WITH PAGINATION ---
  const fetchCompletedProjects = useCallback(
    async (limit = 10, reset = false) => {
      try {
        if (!employeeInfo) {
          return [];
        }
        setCompletedLoading(true);

        let query = supabase
          .from("project_records")
          .select("*")
          .eq("company_id", employeeInfo.company_id)
          .eq("status", "Completed")
          .or(`project_lead_id.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}},created_by.eq.${employeeInfo.id}`)
          .order("id", { ascending: true })
          .limit(limit);

        // Cursor-based pagination
        if (!reset && lastFetchedCompletedProjectId) {
          query = query.gt("id", lastFetchedCompletedProjectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
          setHasMoreCompletedProjects(false);
          return [];
        }

        setCompletedProjects((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = data.filter((p) => !existingIds.has(p.id));
          return reset ? uniqueNew : [...prev, ...uniqueNew];
        });

        setLastFetchedCompletedProjectId(data[data.length - 1].id);
        setHasMoreCompletedProjects(data.length === limit);

        return data;
      } catch (error) {
        captureSupabaseError(
          { message: error instanceof Error ? error.message : String(error) },
          "fetchCompletedProjects",
          { companyId: employeeInfo?.company_id }
        );
        console.error("Error fetching completed projects:", error);
        throw error;
      } finally {
        setCompletedLoading(false);
      }
    },
    [lastFetchedCompletedProjectId, employeeInfo]
  );

  // --- FETCH DRAFT PROJECTS WITH PAGINATION ---
  const fetchDraftProjects = useCallback(
    async (limit = 10, reset = false) => {
      try {
        if (!employeeInfo) {
          return [];
        }
        setDraftsLoading(true);

        let query = supabase
          .from("project_records")
          .select("*")
          .eq("company_id", employeeInfo.company_id)
          .eq("is_draft", true)
          .eq("created_by", employeeInfo.id) // Only show drafts created by the current user
          .order("created_at", { ascending: false })
          .limit(limit);

        // Cursor-based pagination
        if (!reset && lastFetchedDraftProjectId) {
          query = query.gt("id", lastFetchedDraftProjectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
          setHasMoreDraftProjects(false);
          if (reset) setDraftProjects([]);
          return [];
        }

        setDraftProjects((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = data.filter((p) => !existingIds.has(p.id));
          return reset ? uniqueNew : [...prev, ...uniqueNew];
        });

        setLastFetchedDraftProjectId(data[data.length - 1].id as any);
        setHasMoreDraftProjects(data.length === limit);

        return data;
      } catch (error) {
        captureSupabaseError(
          { message: error instanceof Error ? error.message : String(error) },
          "fetchDraftProjects",
          { companyId: employeeInfo?.company_id }
        );
        console.error("Error fetching draft projects:", error);
        throw error;
      } finally {
        setDraftsLoading(false);
      }
    },
    [lastFetchedDraftProjectId, employeeInfo]
  );

  // --- SEARCH PROJECTS ---
  const searchOngoingProjects = useCallback(
    async (searchTerm: string, limit = 10, companyScopes = false) => {
      try {
        if (!employeeInfo) {
          return [];
        }
        setOngoingSearchLoading(true);

        let query = supabase
          .from("project_records")
          .select("*")
          .eq("status", "Ongoing")
          .order("id", { ascending: true })
          .limit(limit);

        if (!companyScopes) {
          query = query.or(
            `project_lead_id.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}},created_by.eq.${employeeInfo.id}`
          );
        }

        if (searchTerm.trim() !== "") {
          query = query.or(
            `project_title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        setOngoingProjects(data || []);
        return data || [];
      } catch (err) {
        captureSupabaseError(
          { message: err instanceof Error ? err.message : String(err) },
          "searchOngoingProjects",
          { searchTerm }
        );
        console.error("Error searching ongoing projects:", err);
        return [];
      } finally {
        setOngoingSearchLoading(false);
      }
    },
    [employeeInfo]
  );

  const searchCompletedProjects = useCallback(
    async (searchTerm: string, limit = 10, companyScopes = false) => {
      try {
        if (!employeeInfo) {
          return [];
        }
        setCompletedSearchLoading(true);

        let query = supabase
          .from("project_records")
          .select("*")
          .eq("status", "Completed")
          .order("id", { ascending: true })
          .limit(limit);

        if (!companyScopes) {
          query = query.or(
            `project_lead_id.eq.${employeeInfo.id},assignees.cs.{${employeeInfo.id}},created_by.eq.${employeeInfo.id}`
          );
        }

        if (searchTerm.trim() !== "") {
          query = query.or(
            `project_title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        setCompletedProjects(data || []);
        return data || [];
      } catch (err) {
        captureSupabaseError(
          { message: err instanceof Error ? err.message : String(err) },
          "searchCompletedProjects",
          { searchTerm }
        );
        console.error("Error searching completed projects:", err);
        return [];
      } finally {
        setCompletedSearchLoading(false);
      }
    },
    [employeeInfo]
  );

  // --- CREATE PROJECT ---
  const createProject = async (project: Project) => {
    if (!employeeInfo) {
      console.warn('Cannot create project: Employee info not available');
      return null;
    }

    try {
      const company_id = employeeInfo.company_id;
      const projectId = slugify(project.project_title);

      const finalData = {
        id: projectId,
        ...project,
        created_by: employeeInfo.id,
      };

      const result = await baseResult.createItem(finalData);
      
      // Only send notifications if project is NOT a draft
      if (!project.is_draft) {
        // Filter out the creator from recipients
        const recipients = [...(project.assignees || []), project.project_lead_id]
          .filter(Boolean)
          .filter((id) => id !== employeeInfo.id) as string[];

        // Notifications to assigned members (excluding creator)
        if (recipients.length > 0) {
          void createNotification({
            title: "New Project Assigned",
            message: `A new project "${project.project_title}" has been assigned to you.`,
            priority: "normal",
            type_id: 3,
            recipient_id: recipients,
            action_url: "/ops/project",
            company_id: typeof company_id === 'string' ? parseInt(company_id) : company_id!,
            department_id: typeof employeeInfo.department_id === 'string' ? parseInt(employeeInfo.department_id) : employeeInfo.department_id,
          });
        }

        void createNotification({
          title: "New Project Created",
          message: `A new project "${project.project_title}" has been created by ${employeeInfo.name}.`,
          priority: "normal",
          type_id: 3,
          recipient_id: [employeeInfo.supervisor_id].filter(Boolean) as string[],
          action_url: "/ops/project",
          company_id: typeof company_id === 'string' ? parseInt(company_id) : company_id!,
          department_id: typeof employeeInfo.department_id === 'string' ? parseInt(employeeInfo.department_id) : employeeInfo.department_id,
        });
      }

      return result;
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "createProject",
        { companyId: employeeInfo.company_id, projectTitle: project.project_title }
      );
      console.error("Error creating project:", error);
      throw error;
    }
  };

  // --- UPDATE PROJECT ---
  const updateProject = async (projectId: string, project: Project) => {
    if (!employeeInfo) {
      console.warn('Cannot update project: Employee info not available');
      return null;
    }

    try {
      const company_id = employeeInfo.company_id;

      // Fetch the previous project state before updating
      const { data: prevProject } = await supabase
        .from("project_records")
        .select("status, is_draft")
        .eq("id", projectId)
        .single();

      const wasCompleted = prevProject?.status === "Completed";
      const isNowCompleted = project.status === "Completed";
      const wasDraft = prevProject?.is_draft === true;
      const isNowDraft = project.is_draft === true;
      const isPublishing = wasDraft && !isNowDraft;

      const { data: result, error } = await baseResult.updateItem(projectId, project);
      if (error) throw error;

      const updated = result as ProjectDetails;

      setOngoingProjects((prevProjects) =>
        prevProjects.map((p) => (p.id === projectId ? (updated ?? p) : p))
      );
      setCompletedProjects((prevProjects) =>
        prevProjects.map((p) => (p.id === projectId ? (updated ?? p) : p))
      );

      // Filter out the creator/updater from recipients for assignment notifications
      const assignmentRecipients = [...(project.assignees || []), project.project_lead_id]
        .filter(Boolean)
        .filter((id) => id !== employeeInfo.id) as string[];
      
      const recipients = [...(project.assignees || []), project.project_lead_id, employeeInfo.supervisor_id].filter(Boolean) as string[];

      // If project is being published (draft → non-draft), send assignment notifications
      if (isPublishing && assignmentRecipients.length > 0) {
        createNotification({
          title: "New Project Assigned",
          message: `A new project "${project.project_title}" has been assigned to you.`,
          priority: "normal",
          type_id: 3,
          recipient_id: assignmentRecipients,
          action_url: "/ops/project",
          company_id: typeof company_id === 'string' ? parseInt(company_id) : company_id!,
          department_id: typeof employeeInfo.department_id === 'string' ? parseInt(employeeInfo.department_id) : employeeInfo.department_id,
        });

        // Notify supervisor about the published project
        if (employeeInfo.supervisor_id) {
          createNotification({
            title: "New Project Published",
            message: `A new project "${project.project_title}" has been published by ${employeeInfo.name}.`,
            priority: "normal",
            type_id: 3,
            recipient_id: [employeeInfo.supervisor_id],
            action_url: "/ops/project",
            company_id: typeof company_id === 'string' ? parseInt(company_id) : company_id!,
            department_id: typeof employeeInfo.department_id === 'string' ? parseInt(employeeInfo.department_id) : employeeInfo.department_id,
          });
        }

        // Send email notifications for published project
        try {
          for (const recipientId of assignmentRecipients) {
            const { data: employee } = await supabase
              .from("employees")
              .select("id, first_name, last_name, email, users(id)")
              .eq("id", recipientId)
              .single();

            if (!employee?.email) continue;

            const users = employee.users as any;
            const userId = Array.isArray(users) ? users[0]?.id : users?.id;

            if (userId) {
              const canSendEmail = await checkUserEmailPreference(userId, 'project_assignment');
              if (canSendEmail) {
                await sendNotificationEmailAction({
                  recipientEmail: employee.email,
                  recipientName: `${employee.first_name} ${employee.last_name}`,
                  title: `New Project Assigned: ${project.project_title}`,
                  message: `You have been assigned to the project "${project.project_title}".\n\nPlease review the project details and milestones.`,
                  priority: 'normal',
                  actionUrl: `/ops/project`,
                  context: 'project',
                });
              }
            }
          }
        } catch (emailError) {
          console.error("Failed to send project assignment emails:", emailError);
        }
      }

      // If project just got completed, send completion emails
      else if (!wasCompleted && isNowCompleted) {
        createNotification({
          title: "Project Completed",
          message: `The project "${project.project_title}" has been marked as completed.`,
          priority: "normal",
          type_id: 3,
          recipient_id: recipients,
          action_url: "/ops/project",
          company_id: typeof company_id === 'string' ? parseInt(company_id) : company_id!,
        });

        // Send completion emails to all recipients who have email preferences enabled
        try {
          // Fetch employee details for all recipients
          for (const recipientId of recipients) {
            const { data: employee } = await supabase
              .from("employees")
              .select("id, first_name, last_name, email, users(id)")
              .eq("id", recipientId)
              .single();

            if (!employee?.email) continue;

            // Handle users as array (Supabase returns it as array type)
            const users = employee.users as any;
            const userId = Array.isArray(users) ? users[0]?.id : users?.id;

            if (userId) {
              // Check email preference
              const canSendEmail = await checkUserEmailPreference(userId, 'project_completion');
              if (canSendEmail) {
                await sendNotificationEmailAction({
                  recipientEmail: employee.email,
                  recipientName: `${employee.first_name} ${employee.last_name}`,
                  title: `Project Completed: ${project.project_title}`,
                  message: `We are pleased to inform you that the project "${project.project_title}" has been marked as completed.\n\nThank you for your contribution to this project.`,
                  priority: 'normal',
                  actionUrl: `/ops/project`,
                  context: 'project',
                });
              }
            }
          }
        } catch (emailError) {
          console.error("Failed to send project completion emails:", emailError);
        }
      } else if (!isNowDraft) {
        // Regular update notification (only for non-draft projects)
        createNotification({
          title: "Project Updated",
          message: `The project "${project.project_title}" has been updated by ${employeeInfo.name}.`,
          priority: "normal",
          type_id: 3,
          recipient_id: recipients,
          action_url: "/ops/project",
          company_id: typeof company_id === 'string' ? parseInt(company_id) : company_id!,
        });
      }

      return result;
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "updateProject",
        { projectId, companyId: employeeInfo.company_id }
      );
      console.error("Error updating project:", error);
      throw error;
    }
  };

  // --- ENRICH PROJECTS WITH CALCULATED PROGRESS ---
  const enrichProjectsWithProgress = useCallback(
    async (projects: ProjectDetails[]): Promise<(ProjectDetails & { progress: number })[]> => {
      if (!projects || projects.length === 0) return [];

      try {
        // Fetch all milestones for these projects in one query
        const projectIds = projects.map(p => p.id).filter(Boolean);
        
        const { data: milestones, error } = await supabase
          .from("milestone_records")
          .select("project_id, status, weightage")
          .in("project_id", projectIds);

        if (error) throw error;

        // Group milestones by project_id
        const milestonesByProject = new Map<string, Milestone[]>();
        milestones?.forEach(milestone => {
          if (!milestonesByProject.has(milestone.project_id!)) {
            milestonesByProject.set(milestone.project_id!, []);
          }
          milestonesByProject.get(milestone.project_id!)!.push(milestone as Milestone);
        });

        // Calculate progress for each project
        return projects.map(project => ({
          ...project,
          progress: calculateProjectProgress(milestonesByProject.get(project.id!) || [])
        }));
      } catch (error) {
        console.error("Error enriching projects with progress:", error);
        // Return projects with 0 progress on error
        return projects.map(project => ({ ...project, progress: 0 }));
      }
    },
    []
  );

  return {
    ...baseResult,

    ongoingProjects,
    completedProjects,
    draftProjects,

    ongoingLoading,
    completedLoading,
    draftsLoading,

    ongoingSearchLoading,
    completedSearchLoading,

    fetchOngoingProjects,
    fetchCompletedProjects,
    fetchDraftProjects,

    hasMoreOngoingProjects,
    hasMoreCompletedProjects,
    hasMoreDraftProjects,

    searchOngoingProjects,
    searchCompletedProjects,

    enrichProjectsWithProgress,

    createProject,
    updateProject,
    deleteProject: baseResult.deleteItem,
  };
}
