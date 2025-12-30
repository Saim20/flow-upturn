"use client";

import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { StakeholderIssue, StakeholderIssueAttachment, LinkedStepField, StakeholderIssueRequiredField } from "@/lib/types/schemas";
import { createStakeholderIssueNotification } from "@/lib/utils/notifications";
import { captureSupabaseError, logError } from "@/lib/sentry";
import { sendNotificationEmailAction } from "@/app/actions/send-notification-email";
import { checkUserEmailPreference } from "./useEmailPreferences";

// ==============================================================================
// Form Data Interfaces
// ==============================================================================

export interface StakeholderIssueFormData {
  stakeholder_id: number;
  title: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Pending Approval' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigned_to?: string; // Employee ID assigned to handle this issue
  assigned_team_id?: number; // Team ID assigned to handle this issue (either employee OR team)
  checker_team_id?: number; // Team ID assigned to verify and approve the resolution
  category_id?: number; // Optional category
  subcategory_id?: number; // Optional subcategory
  linked_step_data_ids?: number[]; // DEPRECATED: Array of stakeholder_step_data IDs linked to this issue
  linked_fields?: LinkedStepField[]; // Array of specific field references linked to this issue
  required_fields?: StakeholderIssueRequiredField[]; // Fields that must be filled before resolution
  attachments?: File[];
}

export interface StakeholderIssueSearchOptions {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  filterStatus?: "all" | "Pending" | "In Progress" | "Pending Approval" | "Resolved";
  filterPriority?: "all" | "Low" | "Medium" | "High" | "Urgent";
  filterCategoryId?: number | "all"; // FunnelSimple by category
  filterSubcategoryId?: number | "all"; // FunnelSimple by subcategory
  assignedToId?: string; // FunnelSimple by assigned employee
  assignedTeamId?: number; // FunnelSimple by assigned team
  checkerTeamId?: number; // Filter by checker team
  pendingCheckerApproval?: boolean; // Filter for issues pending checker approval
}

export interface StakeholderIssueSearchResult {
  issues: StakeholderIssue[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ==============================================================================
// Main Hook
// ==============================================================================

export function useStakeholderIssues() {
  const { employeeInfo } = useAuth();
  const [issues, setIssues] = useState<StakeholderIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // ==========================================================================
  // ISSUE OPERATIONS
  // ==========================================================================

  const fetchIssues = useCallback(async (stakeholderId?: number) => {
    setLoading(true);
    setError(null);

    try {
      const company_id = employeeInfo?.company_id as number | undefined;
      if (!company_id) {
        setLoading(false);
        return [];
      }

      let query = supabase
        .from("stakeholder_issues")
        .select(`
          *,
          stakeholder:stakeholders(
            id,
            name,
            address,
            kam_id
          ),
          assigned_employee:employees!stakeholder_issues_assigned_to_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          assigned_team:teams!stakeholder_issues_assigned_team_id_fkey(
            id,
            name
          ),
          checker_team:teams!stakeholder_issues_checker_team_id_fkey(
            id,
            name
          ),
          category:stakeholder_issue_categories(
            id,
            name,
            color
          ),
          subcategory:stakeholder_issue_subcategories(
            id,
            name
          )
        `)
        .eq("company_id", company_id);

      if (stakeholderId) {
        query = query.eq("stakeholder_id", stakeholderId);
      }

      const { data, error: fetchError } = await query.order("created_at", { ascending: false });

      if (fetchError) {
        captureSupabaseError(fetchError, "fetchIssues", { company_id, stakeholderId });
        setError("Failed to fetch issues");
        throw fetchError;
      }

      // Transform employee data to combine first_name and last_name
      const transformedData = data?.map((issue) => ({
        ...issue,
        assigned_employee: issue.assigned_employee ? {
          id: issue.assigned_employee.id,
          name: `${issue.assigned_employee.first_name} ${issue.assigned_employee.last_name}`,
          email: issue.assigned_employee.email,
        } : undefined,
      })) || [];

      setIssues(transformedData);
      return transformedData;
    } catch (err) {
      logError("Error fetching stakeholder issues", err);
      setError("Failed to fetch issues");
      return [];
    } finally {
      setLoading(false);
    }
  }, [employeeInfo]);

  const fetchIssueById = useCallback(async (issueId: number) => {
    setLoading(true);
    setError(null);

    try {
      const company_id = employeeInfo?.company_id as number | undefined;
      if (!company_id) {
        setLoading(false);
        return null;
      }

      const { data, error: fetchError } = await supabase
        .from("stakeholder_issues")
        .select(`
          *,
          stakeholder:stakeholders(
            id,
            name,
            address,
            kam_id,
            contact_persons
          ),
          assigned_employee:employees!stakeholder_issues_assigned_to_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          assigned_team:teams!stakeholder_issues_assigned_team_id_fkey(
            id,
            name
          ),
          checker_team:teams!stakeholder_issues_checker_team_id_fkey(
            id,
            name
          ),
          category:stakeholder_issue_categories(
            id,
            name,
            color
          ),
          subcategory:stakeholder_issue_subcategories(
            id,
            name
          )
        `)
        .eq("company_id", company_id)
        .eq("id", issueId)
        .single();

      if (fetchError) {
        captureSupabaseError(fetchError, "fetchIssueById", { company_id, issueId });
        setError("Failed to fetch issue");
        throw fetchError;
      }

      // Transform employee data to combine first_name and last_name
      const transformedData = data ? {
        ...data,
        assigned_employee: data.assigned_employee ? {
          id: data.assigned_employee.id,
          name: `${data.assigned_employee.first_name} ${data.assigned_employee.last_name}`,
          email: data.assigned_employee.email,
        } : undefined,
      } : null;

      return transformedData;
    } catch (err) {
      logError("Error fetching issue", err);
      setError("Failed to fetch issue");
      return null;
    } finally {
      setLoading(false);
    }
  }, [employeeInfo]);

  const fetchIssuesByAssignedEmployee = useCallback(async (assignedToId?: string, assignedTeamIds?: number[]) => {
    setLoading(true);
    setError(null);

    try {
      const company_id = employeeInfo?.company_id as number | undefined;
      if (!company_id) {
        setLoading(false);
        return [];
      }
      
      const targetAssignedToId = assignedToId || employeeInfo?.id;

      if (!targetAssignedToId && (!assignedTeamIds || assignedTeamIds.length === 0)) {
        setLoading(false);
        return [];
      }

      let query = supabase
        .from("stakeholder_issues")
        .select(`
          *,
          stakeholder:stakeholders(
            id,
            name,
            address,
            kam_id
          ),
          assigned_employee:employees!stakeholder_issues_assigned_to_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          assigned_team:teams!stakeholder_issues_assigned_team_id_fkey(
            id,
            name
          ),
          checker_team:teams!stakeholder_issues_checker_team_id_fkey(
            id,
            name
          ),
          category:stakeholder_issue_categories(
            id,
            name,
            color
          ),
          subcategory:stakeholder_issue_subcategories(
            id,
            name
          )
        `)
        .eq("company_id", company_id);

      // Build OR filter for assigned_to or assigned_team_id
      if (targetAssignedToId && assignedTeamIds && assignedTeamIds.length > 0) {
        // FunnelSimple by either employee OR any of the teams
        const teamIdList = assignedTeamIds.join(',');
        query = query.or(`assigned_to.eq.${targetAssignedToId},assigned_team_id.in.(${teamIdList})`);
      } else if (targetAssignedToId) {
        query = query.eq("assigned_to", targetAssignedToId);
      } else if (assignedTeamIds && assignedTeamIds.length > 0) {
        query = query.in("assigned_team_id", assignedTeamIds);
      }

      const { data, error: fetchError } = await query.order("created_at", { ascending: false });

      if (fetchError) {
        captureSupabaseError(fetchError, "fetchIssuesByAssignedEmployee", { company_id, targetAssignedToId });
        setError("Failed to fetch issues");
        throw fetchError;
      }

      // Transform employee data to combine first_name and last_name
      const transformedData = data?.map((issue) => ({
        ...issue,
        assigned_employee: issue.assigned_employee ? {
          id: issue.assigned_employee.id,
          name: `${issue.assigned_employee.first_name} ${issue.assigned_employee.last_name}`,
          email: issue.assigned_employee.email,
        } : undefined,
      })) || [];

      setIssues(transformedData);
      return transformedData;
    } catch (err) {
      logError("Error fetching issues by assigned employee", err);
      setError("Failed to fetch issues");
      return [];
    } finally {
      setLoading(false);
    }
  }, [employeeInfo]);

  const searchIssues = useCallback(async (options: StakeholderIssueSearchOptions = {}) => {
    const { 
      searchQuery = "", 
      page = 1, 
      pageSize = 25, 
      filterStatus = "all",
      filterPriority = "all",
      filterCategoryId = "all",
      filterSubcategoryId = "all",
      assignedToId,
      assignedTeamId,
      checkerTeamId,
      pendingCheckerApproval
    } = options;
    
    setLoading(true);
    setError(null);
    
    try {
      const company_id = employeeInfo?.company_id as number | undefined;
      if (!company_id) {
        const emptyResult: StakeholderIssueSearchResult = {
          issues: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
        };
        setLoading(false);
        return emptyResult;
      }
      
      const targetAssignedToId = assignedToId || employeeInfo?.id;

      if (!targetAssignedToId && !assignedTeamId && !checkerTeamId && !pendingCheckerApproval) {
        const emptyResult: StakeholderIssueSearchResult = {
          issues: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
        };
        setLoading(false);
        return emptyResult;
      }
      
      // Build query
      let query = supabase
        .from("stakeholder_issues")
        .select(`
          *,
          stakeholder:stakeholders(
            id,
            name,
            address,
            kam_id
          ),
          assigned_employee:employees!stakeholder_issues_assigned_to_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          assigned_team:teams!stakeholder_issues_assigned_team_id_fkey(
            id,
            name
          ),
          checker_team:teams!stakeholder_issues_checker_team_id_fkey(
            id,
            name
          ),
          category:stakeholder_issue_categories(
            id,
            name,
            color
          ),
          subcategory:stakeholder_issue_subcategories(
            id,
            name
          )
        `, { count: 'exact' })
        .eq("company_id", company_id);

      // Add assignment filter (if not filtering by checker team)
      if (!checkerTeamId && !pendingCheckerApproval) {
        if (targetAssignedToId && assignedTeamId) {
          query = query.or(`assigned_to.eq.${targetAssignedToId},assigned_team_id.eq.${assignedTeamId}`);
        } else if (targetAssignedToId) {
          query = query.eq("assigned_to", targetAssignedToId);
        } else if (assignedTeamId) {
          query = query.eq("assigned_team_id", assignedTeamId);
        }
      }
      
      // Filter by checker team
      if (checkerTeamId) {
        query = query.eq("checker_team_id", checkerTeamId);
      }
      
      // Filter for issues pending checker approval
      if (pendingCheckerApproval) {
        query = query.eq("is_pending_checker_approval", true);
      }
      
      // Add search filter if provided
      if (searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
      }
      
      // Add status filter
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      
      // Add priority filter
      if (filterPriority !== "all") {
        query = query.eq("priority", filterPriority);
      }

      // Add category filter
      if (filterCategoryId !== "all" && typeof filterCategoryId === "number") {
        query = query.eq("category_id", filterCategoryId);
      }

      // Add subcategory filter
      if (filterSubcategoryId !== "all" && typeof filterSubcategoryId === "number") {
        query = query.eq("subcategory_id", filterSubcategoryId);
      }
      
      // Add pagination
      const startIndex = (page - 1) * pageSize;
      query = query.range(startIndex, startIndex + pageSize - 1);
      
      // Order by created_at for consistent results
      query = query.order('created_at', { ascending: false });
      
      const { data, error: fetchError, count } = await query;
      
      if (fetchError) {
        captureSupabaseError(fetchError, "searchIssues", { company_id });
        throw fetchError;
      }
      
      // Transform employee data to combine first_name and last_name
      const transformedData = data?.map((issue) => ({
        ...issue,
        assigned_employee: issue.assigned_employee ? {
          id: issue.assigned_employee.id,
          name: `${issue.assigned_employee.first_name} ${issue.assigned_employee.last_name}`,
          email: issue.assigned_employee.email,
        } : undefined,
      })) || [];
      
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      const result: StakeholderIssueSearchResult = {
        issues: transformedData,
        totalCount,
        totalPages,
        currentPage: page,
      };
      
      setIssues(transformedData);
      return result;
    } catch (err) {
      logError("Error searching issues", err);
      setError("Failed to search issues");
      return {
        issues: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
      };
    } finally {
      setLoading(false);
    }
  }, [employeeInfo]);

  const createIssue = useCallback(
    async (issueData: StakeholderIssueFormData) => {
      if (!employeeInfo) {
        console.warn('Cannot create issue: Employee info not available');
        return null;
      }

      setError(null);
      try {
        const company_id = employeeInfo?.company_id as number | undefined;
        if (!company_id) {
          throw new Error('Company ID not available');
        }

        // Get stakeholder data for notifications
        const { data: stakeholderData, error: stakeholderError } = await supabase
          .from("stakeholders")
          .select("id, name, kam_id")
          .eq("id", issueData.stakeholder_id)
          .single();

        if (stakeholderError) throw stakeholderError;

        // Process file attachments if any
        const attachments: StakeholderIssueAttachment[] = [];
        
        if (issueData.attachments && issueData.attachments.length > 0) {
          for (const file of issueData.attachments) {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `${company_id}/stakeholder-issues/${issueData.stakeholder_id}/${fileName}`;

            console.log('Uploading file to path:', filePath);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('stakeholder-documents')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
            }

            console.log('Upload successful:', uploadData);

            attachments.push({
              path: filePath,
              originalName: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
            });
          }
        }

        const { data, error: insertError } = await supabase
          .from("stakeholder_issues")
          .insert([
            {
              stakeholder_id: issueData.stakeholder_id,
              title: issueData.title,
              description: issueData.description,
              status: issueData.status,
              priority: issueData.priority,
              assigned_to: issueData.assigned_to || null,
              assigned_team_id: issueData.assigned_team_id || null,
              checker_team_id: issueData.checker_team_id || null,
              category_id: issueData.category_id || null,
              subcategory_id: issueData.subcategory_id || null,
              linked_step_data_ids: issueData.linked_step_data_ids || [],
              linked_fields: issueData.linked_fields || [],
              required_fields: issueData.required_fields || [],
              attachments,
              company_id,
              created_by: employeeInfo?.id,
            },
          ])
          .select()
          .single();

        if (insertError) {
          captureSupabaseError(insertError, "createIssue", { company_id });
          throw insertError;
        }

        console.log('Issue created with attachments:', data);

        // Send notifications
        try {
          // Notify KAM about new issue
          if (stakeholderData.kam_id) {
            await createStakeholderIssueNotification(
              stakeholderData.kam_id,
              'created',
              {
                stakeholderName: stakeholderData.name,
                issueTitle: issueData.title,
                priority: issueData.priority,
              },
              {
                referenceId: data.id,
                actionUrl: `/stakeholder-issues/${data.id}`,
              }
            );

            // Send email for high priority/urgent issues
            if (issueData.priority === 'High' || issueData.priority === 'Urgent') {
              try {
                // Get KAM employee details
                const { data: kamEmployee } = await supabase
                  .from("employees")
                  .select("first_name, last_name, email, users!inner(id)")
                  .eq("id", stakeholderData.kam_id)
                  .single();

                if (kamEmployee?.email && kamEmployee.users?.id) {
                  const canSendEmail = await checkUserEmailPreference(kamEmployee.users.id, 'stakeholder_issue_high_priority');
                  if (canSendEmail) {
                    await sendNotificationEmailAction({
                      to: kamEmployee.email,
                      subject: `${issueData.priority} Priority Issue: ${issueData.title}`,
                      previewText: `A ${issueData.priority.toLowerCase()} priority issue has been created for ${stakeholderData.name}`,
                      heading: `${issueData.priority} Priority Stakeholder Issue`,
                      mainContent: `Dear ${kamEmployee.first_name} ${kamEmployee.last_name},\n\nA ${issueData.priority.toLowerCase()} priority issue has been created for ${stakeholderData.name}.\n\nTitle: ${issueData.title}\n${issueData.description ? `Description: ${issueData.description}\n` : ""}\nThis requires your immediate attention.`,
                      ctaText: "View Issue",
                      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://flow.sajilohris.com"}/stakeholder-issues/${data.id}`,
                      footerText: "You received this because you are the Key Account Manager for this stakeholder.",
                    });
                  }
                }
              } catch (emailError) {
                console.error("Failed to send high priority issue email to KAM:", emailError);
              }
            }
          }

          // Notify assigned employee if different from KAM
          if (issueData.assigned_to && issueData.assigned_to !== stakeholderData.kam_id) {
            await createStakeholderIssueNotification(
              issueData.assigned_to,
              'assigned',
              {
                stakeholderName: stakeholderData.name,
                issueTitle: issueData.title,
              },
              {
                referenceId: data.id,
                actionUrl: `/stakeholder-issues/${data.id}`,
              }
            );

            // Send email for high priority/urgent issues to assigned employee
            if (issueData.priority === 'High' || issueData.priority === 'Urgent') {
              try {
                const { data: assignedEmployee } = await supabase
                  .from("employees")
                  .select("first_name, last_name, email, users!inner(id)")
                  .eq("id", issueData.assigned_to)
                  .single();

                if (assignedEmployee?.email && assignedEmployee.users?.id) {
                  const canSendEmail = await checkUserEmailPreference(assignedEmployee.users.id, 'stakeholder_issue_high_priority');
                  if (canSendEmail) {
                    await sendNotificationEmailAction({
                      to: assignedEmployee.email,
                      subject: `${issueData.priority} Priority Issue Assigned: ${issueData.title}`,
                      previewText: `A ${issueData.priority.toLowerCase()} priority issue has been assigned to you`,
                      heading: `${issueData.priority} Priority Issue Assigned`,
                      mainContent: `Dear ${assignedEmployee.first_name} ${assignedEmployee.last_name},\n\nA ${issueData.priority.toLowerCase()} priority issue has been assigned to you for ${stakeholderData.name}.\n\nTitle: ${issueData.title}\n${issueData.description ? `Description: ${issueData.description}\n` : ""}\nThis requires your immediate attention.`,
                      ctaText: "View Issue",
                      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://flow.sajilohris.com"}/stakeholder-issues/${data.id}`,
                      footerText: "You received this because this issue was assigned to you.",
                    });
                  }
                }
              } catch (emailError) {
                console.error("Failed to send high priority issue email to assigned employee:", emailError);
              }
            }
          }
        } catch (notificationError) {
          console.warn('Failed to send issue creation notifications:', notificationError);
        }

        await fetchIssues(issueData.stakeholder_id);
        return data;
      } catch (error) {
        console.error("Error creating issue:", error);
        setError(error instanceof Error ? error.message : "Failed to create issue");
        throw error;
      }
    },
    [fetchIssues, employeeInfo]
  );

  const updateIssue = useCallback(
    async (issueId: number, issueData: Partial<StakeholderIssueFormData>) => {
      if (!employeeInfo) {
        console.warn('Cannot update issue: Employee info not available');
        return null;
      }

      setError(null);
      setProcessingId(issueId);

      try {
        // Get current issue data
        const { data: currentIssue } = await supabase
          .from("stakeholder_issues")
          .select(`
            attachments, 
            stakeholder_id,
            status,
            assigned_to,
            title,
            checker_team_id,
            is_pending_checker_approval,
            stakeholder:stakeholders(id, name, kam_id)
          `)
          .eq("id", issueId)
          .single();

        let attachments = currentIssue?.attachments || [];

        // Process new file attachments if any
        if (issueData.attachments && issueData.attachments.length > 0) {
          const company_id = employeeInfo?.company_id as number | undefined;
          if (!company_id) {
            throw new Error('Company ID not available');
          }
          
          for (const file of issueData.attachments) {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `${company_id}/stakeholder-issues/${currentIssue?.stakeholder_id}/${fileName}`;

            console.log('Uploading file to path:', filePath);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('stakeholder-documents')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
            }

            console.log('Upload successful:', uploadData);

            attachments.push({
              path: filePath,
              originalName: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
            });
          }
        }

        const updateData: any = {
          ...issueData,
          attachments,
          updated_by: employeeInfo?.id,
        };

        // Remove the attachments from issueData if present as File[]
        delete updateData.attachments;
        updateData.attachments = attachments;

        // Handle either/or assignment - if one is set, clear the other
        if (issueData.assigned_to) {
          updateData.assigned_team_id = null;
        } else if (issueData.assigned_team_id) {
          updateData.assigned_to = null;
        }

        // Handle linked step data IDs
        if (issueData.linked_step_data_ids !== undefined) {
          updateData.linked_step_data_ids = issueData.linked_step_data_ids;
        }

        // Handle checker team
        if (issueData.checker_team_id !== undefined) {
          updateData.checker_team_id = issueData.checker_team_id || null;
        }

        // Handle required fields
        if (issueData.required_fields !== undefined) {
          updateData.required_fields = issueData.required_fields;
        }

        // If status is being changed to Resolved, check if checker team approval is needed
        if (issueData.status === 'Resolved') {
          // Check if this issue has a checker team
          if (currentIssue?.checker_team_id && !currentIssue?.is_pending_checker_approval) {
            // Set to Pending Approval instead of Resolved
            updateData.status = 'Pending Approval';
            updateData.is_pending_checker_approval = true;
            // Don't set resolved_at and resolved_by yet
          } else if (!currentIssue?.checker_team_id || currentIssue?.is_pending_checker_approval) {
            // No checker team OR this is a checker approval - mark as fully resolved
            updateData.resolved_at = new Date().toISOString();
            updateData.resolved_by = employeeInfo?.id;
            updateData.is_pending_checker_approval = false;
            // If this was a checker approval, record it
            if (currentIssue?.is_pending_checker_approval) {
              updateData.checker_approved_at = new Date().toISOString();
              updateData.checker_approved_by = employeeInfo?.id;
            }
          }
        }

        const { data, error: updateError } = await supabase
          .from("stakeholder_issues")
          .update(updateData)
          .eq("id", issueId)
          .select()
          .single();

        if (updateError) {
          captureSupabaseError(updateError, "updateIssue", { issueId });
          throw updateError;
        }

        // Send notifications based on what changed
        try {
          const stakeholder = Array.isArray(currentIssue?.stakeholder) 
            ? currentIssue?.stakeholder[0] 
            : currentIssue?.stakeholder;
          const stakeholderName = stakeholder?.name || 'Stakeholder';
          const issueTitle = currentIssue?.title || 'Issue';
          const kamId = stakeholder?.kam_id;

          // Notify about status change
          if (issueData.status && issueData.status !== currentIssue?.status) {
            // If status changed to Pending Approval, notify checker team members
            if (updateData.status === 'Pending Approval' && currentIssue?.checker_team_id) {
              try {
                // Fetch all members of the checker team
                const { data: teamMembers } = await supabase
                  .from("team_members")
                  .select(`
                    employee_id,
                    employees!inner(
                      first_name, 
                      last_name, 
                      email,
                      users!inner(id)
                    )
                  `)
                  .eq("team_id", currentIssue.checker_team_id);

                if (teamMembers && teamMembers.length > 0) {
                  // Get team name for notification
                  const { data: teamData } = await supabase
                    .from("teams")
                    .select("name")
                    .eq("id", currentIssue.checker_team_id)
                    .single();

                  const teamName = teamData?.name || "Checker Team";

                  for (const member of teamMembers) {
                    const emp = member.employees as any;
                    if (emp?.users?.id) {
                      // Send notification to checker team member
                      await createStakeholderIssueNotification(
                        emp.users.id,
                        'pendingCheckerApproval',
                        {
                          stakeholderName,
                          issueTitle,
                          teamName,
                        },
                        {
                          referenceId: issueId,
                          actionUrl: `/stakeholder-issues/${issueId}`,
                        }
                      );
                    }
                  }
                }
              } catch (checkerNotifError) {
                console.error("Failed to notify checker team:", checkerNotifError);
              }
            }

            // Notify KAM
            if (kamId) {
              if (issueData.status === 'Resolved') {
                await createStakeholderIssueNotification(
                  kamId,
                  'resolved',
                  {
                    stakeholderName,
                    issueTitle,
                  },
                  {
                    referenceId: issueId,
                    actionUrl: `/stakeholder-issues/${issueId}`,
                  }
                );
              } else {
                await createStakeholderIssueNotification(
                  kamId,
                  'statusChanged',
                  {
                    stakeholderName,
                    issueTitle,
                    newStatus: updateData.status || issueData.status,
                  },
                  {
                    referenceId: issueId,
                    actionUrl: `/stakeholder-issues/${issueId}`,
                  }
                );
              }
            }

            // Notify assigned employee if different from KAM
            const assignedTo = issueData.assigned_to || currentIssue?.assigned_to;
            if (assignedTo && assignedTo !== kamId) {
              if (issueData.status === 'Resolved') {
                await createStakeholderIssueNotification(
                  assignedTo,
                  'resolved',
                  {
                    stakeholderName,
                    issueTitle,
                  },
                  {
                    referenceId: issueId,
                    actionUrl: `/stakeholder-issues/${issueId}`,
                  }
                );
              } else {
                await createStakeholderIssueNotification(
                  assignedTo,
                  'statusChanged',
                  {
                    stakeholderName,
                    issueTitle,
                    newStatus: updateData.status || issueData.status,
                  },
                  {
                    referenceId: issueId,
                    actionUrl: `/stakeholder-issues/${issueId}`,
                  }
                );
              }
            }
          }

          // Notify about assignment change
          if (issueData.assigned_to && issueData.assigned_to !== currentIssue?.assigned_to) {
            await createStakeholderIssueNotification(
              issueData.assigned_to,
              'assigned',
              {
                stakeholderName,
                issueTitle,
              },
              {
                referenceId: issueId,
                actionUrl: `/stakeholder-issues/${issueId}`,
              }
            );
          }
        } catch (notificationError) {
          console.warn('Failed to send issue update notifications:', notificationError);
        }

        await fetchIssues(currentIssue?.stakeholder_id);
        return data;
      } catch (err) {
        logError("Error updating issue", err);
        setError("Failed to update issue");
        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [fetchIssues, employeeInfo]
  );

  const deleteIssue = useCallback(
    async (issueId: number) => {
      setError(null);
      setProcessingId(issueId);

      try {
        // Get issue data to clean up files
        const { data: issue } = await supabase
          .from("stakeholder_issues")
          .select("attachments, stakeholder_id")
          .eq("id", issueId)
          .single();

        // Delete uploaded files if any
        if (issue?.attachments && issue.attachments.length > 0) {
          const filePaths = issue.attachments.map((att: StakeholderIssueAttachment) => att.path);
          
          await supabase.storage
            .from('stakeholder-documents')
            .remove(filePaths);
        }

        const { error: deleteError } = await supabase
          .from("stakeholder_issues")
          .delete()
          .eq("id", issueId);

        if (deleteError) {
          captureSupabaseError(deleteError, "deleteIssue", { issueId });
          throw deleteError;
        }

        await fetchIssues(issue?.stakeholder_id);
        return true;
      } catch (err) {
        logError("Error deleting issue", err);
        setError("Failed to delete issue");
        return false;
      } finally {
        setProcessingId(null);
      }
    },
    [fetchIssues]
  );

  const deleteAttachment = useCallback(
    async (issueId: number, attachmentPath: string) => {
      setError(null);

      try {
        // Get current issue
        const { data: issue } = await supabase
          .from("stakeholder_issues")
          .select("attachments")
          .eq("id", issueId)
          .single();

        if (!issue) throw new Error("Issue not found");

        // Remove attachment from array
        const updatedAttachments = (issue.attachments || []).filter(
          (att: StakeholderIssueAttachment) => att.path !== attachmentPath
        );

        // Delete file from storage
        await supabase.storage
          .from('stakeholder-documents')
          .remove([attachmentPath]);

        // Update issue
        const { error: updateError } = await supabase
          .from("stakeholder_issues")
          .update({ attachments: updatedAttachments })
          .eq("id", issueId);

        if (updateError) {
          captureSupabaseError(updateError, "deleteAttachment", { issueId, attachmentPath });
          throw updateError;
        }

        return true;
      } catch (err) {
        logError("Error deleting attachment", err);
        setError("Failed to delete attachment");
        return false;
      }
    },
    []
  );

  const getAttachmentUrl = useCallback(
    async (filePath: string) => {
      try {
        console.log('Getting URL for file path:', filePath);

        // Since the bucket is public, use public URLs directly
        // Public URLs work even if the file was just uploaded
        const { data: publicData } = supabase.storage
          .from('stakeholder-documents')
          .getPublicUrl(filePath);
        
        if (publicData?.publicUrl) {
          console.log('Using public URL:', publicData.publicUrl);
          return publicData.publicUrl;
        }

        return null;
      } catch (err) {
        logError("Error getting attachment URL", err);
        return null;
      }
    },
    []
  );

  const downloadAttachment = useCallback(
    async (filePath: string, originalName: string) => {
      try {
        console.log('Downloading file:', filePath, 'as', originalName);

        // Download the file as a blob
        const { data, error: downloadError } = await supabase.storage
          .from('stakeholder-documents')
          .download(filePath);

        if (downloadError) {
          logError("Download error", downloadError);
          throw downloadError;
        }

        if (!data) {
          throw new Error('No data received');
        }

        // Create a blob URL and trigger download with correct filename
        const blob = new Blob([data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return true;
      } catch (err) {
        logError("Error downloading attachment", err);
        throw err;
      }
    },
    []
  );

  // ==========================================================================
  // LINKED STEP DATA OPERATIONS
  // ==========================================================================

  /**
   * Fetch available step data for a stakeholder (for linking to issues)
   */
  const fetchStakeholderStepData = useCallback(
    async (stakeholderId: number) => {
      try {
        const { data, error } = await supabase
          .from("stakeholder_step_data")
          .select(`
            id,
            stakeholder_id,
            step_id,
            data,
            is_completed,
            completed_at,
            step:stakeholder_process_steps(id, name, step_order, field_definitions)
          `)
          .eq("stakeholder_id", stakeholderId)
          .order("id", { ascending: true });

        if (error) {
          captureSupabaseError(error, "fetchStakeholderStepData", { stakeholderId });
          throw error;
        }

        return data || [];
      } catch (err) {
        logError("Error fetching stakeholder step data", err);
        throw err;
      }
    },
    []
  );

  /**
   * Update linked step data from an issue
   * This allows editing stakeholder step data directly from the issue
   */
  const updateLinkedStepData = useCallback(
    async (stepDataId: number, newData: Record<string, any>) => {
      if (!employeeInfo) {
        console.warn('Cannot update step data: Employee info not available');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from("stakeholder_step_data")
          .update({
            data: newData,
            updated_by: employeeInfo.id,
          })
          .eq("id", stepDataId)
          .select()
          .single();

        if (error) {
          captureSupabaseError(error, "updateLinkedStepData", { stepDataId });
          throw error;
        }

        return data;
      } catch (err) {
        logError("Error updating linked step data", err);
        throw err;
      }
    },
    [employeeInfo]
  );

  // ==========================================================================
  // CHECKER TEAM OPERATIONS
  // ==========================================================================

  /**
   * Approve an issue resolution (checker team action)
   * This marks the issue as fully resolved
   */
  const approveResolution = useCallback(
    async (issueId: number) => {
      if (!employeeInfo) {
        console.warn('Cannot approve resolution: Employee info not available');
        return null;
      }

      setError(null);
      setProcessingId(issueId);

      try {
        const now = new Date().toISOString();
        
        const { data, error: updateError } = await supabase
          .from("stakeholder_issues")
          .update({
            status: 'Resolved',
            is_pending_checker_approval: false,
            checker_approved_at: now,
            checker_approved_by: employeeInfo.id,
            resolved_at: now,
            resolved_by: employeeInfo.id,
            updated_by: employeeInfo.id,
          })
          .eq("id", issueId)
          .select(`
            *,
            stakeholder:stakeholders(id, name, kam_id)
          `)
          .single();

        if (updateError) {
          captureSupabaseError(updateError, "approveResolution", { issueId });
          throw updateError;
        }

        // Send notification about approval
        try {
          const stakeholder = Array.isArray(data?.stakeholder) 
            ? data?.stakeholder[0] 
            : data?.stakeholder;
          const stakeholderName = stakeholder?.name || 'Stakeholder';
          const kamId = stakeholder?.kam_id;

          if (kamId) {
            await createStakeholderIssueNotification(
              kamId,
              'resolved',
              {
                stakeholderName,
                issueTitle: data.title,
              },
              {
                referenceId: issueId,
                actionUrl: `/stakeholder-issues/${issueId}`,
              }
            );
          }
        } catch (notificationError) {
          console.warn('Failed to send approval notification:', notificationError);
        }

        await fetchIssues(data?.stakeholder_id);
        return data;
      } catch (err) {
        logError("Error approving resolution", err);
        setError("Failed to approve resolution");
        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [fetchIssues, employeeInfo]
  );

  /**
   * Reject an issue resolution (checker team action)
   * This sends the issue back to In Progress with a rejection reason
   */
  const rejectResolution = useCallback(
    async (issueId: number, rejectionReason: string) => {
      if (!employeeInfo) {
        console.warn('Cannot reject resolution: Employee info not available');
        return null;
      }

      setError(null);
      setProcessingId(issueId);

      try {
        const { data, error: updateError } = await supabase
          .from("stakeholder_issues")
          .update({
            status: 'In Progress',
            is_pending_checker_approval: false,
            checker_rejection_reason: rejectionReason,
            updated_by: employeeInfo.id,
          })
          .eq("id", issueId)
          .select(`
            *,
            stakeholder:stakeholders(id, name, kam_id),
            assigned_employee:employees!stakeholder_issues_assigned_to_fkey(id)
          `)
          .single();

        if (updateError) {
          captureSupabaseError(updateError, "rejectResolution", { issueId });
          throw updateError;
        }

        // Send notification about rejection
        try {
          const stakeholder = Array.isArray(data?.stakeholder) 
            ? data?.stakeholder[0] 
            : data?.stakeholder;
          const stakeholderName = stakeholder?.name || 'Stakeholder';
          
          // Notify assigned employee/team about rejection
          const assignedTo = data?.assigned_to;
          if (assignedTo) {
            await createStakeholderIssueNotification(
              assignedTo,
              'statusChanged',
              {
                stakeholderName,
                issueTitle: data.title,
                newStatus: 'In Progress (Resolution Rejected)',
              },
              {
                referenceId: issueId,
                actionUrl: `/stakeholder-issues/${issueId}`,
              }
            );
          }
        } catch (notificationError) {
          console.warn('Failed to send rejection notification:', notificationError);
        }

        await fetchIssues(data?.stakeholder_id);
        return data;
      } catch (err) {
        logError("Error rejecting resolution", err);
        setError("Failed to reject resolution");
        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [fetchIssues, employeeInfo]
  );

  /**
   * Fetch issues pending checker approval for a specific team
   */
  const fetchIssuesPendingCheckerApproval = useCallback(
    async (checkerTeamId: number) => {
      setLoading(true);
      setError(null);

      try {
        const company_id = employeeInfo?.company_id as number | undefined;
        if (!company_id) {
          setLoading(false);
          return [];
        }

        const { data, error: fetchError } = await supabase
          .from("stakeholder_issues")
          .select(`
            *,
            stakeholder:stakeholders(
              id,
              name,
              address,
              kam_id
            ),
            assigned_employee:employees!stakeholder_issues_assigned_to_fkey(
              id,
              first_name,
              last_name,
              email
            ),
            assigned_team:teams!stakeholder_issues_assigned_team_id_fkey(
              id,
              name
            ),
            checker_team:teams!stakeholder_issues_checker_team_id_fkey(
              id,
              name
            ),
            category:stakeholder_issue_categories(
              id,
              name,
              color
            ),
            subcategory:stakeholder_issue_subcategories(
              id,
              name
            )
          `)
          .eq("company_id", company_id)
          .eq("checker_team_id", checkerTeamId)
          .eq("is_pending_checker_approval", true)
          .order("created_at", { ascending: false });

        if (fetchError) {
          captureSupabaseError(fetchError, "fetchIssuesPendingCheckerApproval", { company_id, checkerTeamId });
          setError("Failed to fetch issues pending approval");
          throw fetchError;
        }

        // Transform employee data
        const transformedData = data?.map((issue) => ({
          ...issue,
          assigned_employee: issue.assigned_employee ? {
            id: issue.assigned_employee.id,
            name: `${issue.assigned_employee.first_name} ${issue.assigned_employee.last_name}`,
            email: issue.assigned_employee.email,
          } : undefined,
        })) || [];

        return transformedData;
      } catch (err) {
        logError("Error fetching issues pending checker approval", err);
        setError("Failed to fetch issues");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [employeeInfo]
  );

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const pendingIssues = useMemo(
    () => issues.filter((i) => i.status === 'Pending'),
    [issues]
  );

  const inProgressIssues = useMemo(
    () => issues.filter((i) => i.status === 'In Progress'),
    [issues]
  );

  const pendingApprovalIssues = useMemo(
    () => issues.filter((i) => i.status === 'Pending Approval'),
    [issues]
  );

  const resolvedIssues = useMemo(
    () => issues.filter((i) => i.status === 'Resolved'),
    [issues]
  );

  const highPriorityIssues = useMemo(
    () => issues.filter((i) => i.priority === 'High' || i.priority === 'Urgent'),
    [issues]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    issues,
    loading,
    error,
    processingId,

    // Computed
    pendingIssues,
    inProgressIssues,
    pendingApprovalIssues,
    resolvedIssues,
    highPriorityIssues,

    // Operations
    fetchIssues,
    fetchIssueById,
    fetchIssuesByAssignedEmployee,
    searchIssues,
    createIssue,
    updateIssue,
    deleteIssue,
    deleteAttachment,
    getAttachmentUrl,
    downloadAttachment,
    
    // Checker Team Operations
    approveResolution,
    rejectResolution,
    fetchIssuesPendingCheckerApproval,
    
    // Linked Step Data Operations
    fetchStakeholderStepData,
    updateLinkedStepData,
  };
}
