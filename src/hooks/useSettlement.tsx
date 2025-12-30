"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { getEmployeeInfo, getCompanyId, DatabaseError } from "@/lib/utils/auth";
import { uploadManyFiles } from "@/lib/utils/files";
import { useNotifications } from "./useNotifications";

export function useSettlementRequests() {
  const [settlementRequests, setSettlementRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { createNotification } = useNotifications();

  const fetchSettlementRequests = useCallback(
    async () => {
      setLoading(true);

      try {
        const user = await getEmployeeInfo();
        const company_id = await getCompanyId();
        if (!user) return [];

        const { data, error } = await supabase
          .from("settlement_records")
          .select("*")
          .eq("company_id", company_id)
          .eq("requested_to", user.id)
          .eq("status", "Pending");

        if (error) {
          const message = "Failed to fetch settlement requests";
          setError(message);
          throw new DatabaseError(`${message}: ${error.message}`);
        }

        setSettlementRequests(data || []);
        return data;
      } catch (error) {
        setError("Failed to fetch settlement requests");
        console.error(error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchSettlementHistory = useCallback(async () => {
    setLoading(true);

    try {
      const user = await getEmployeeInfo();
      const company_id = await getCompanyId();
      if (!user) return [];

      const { data, error } = await supabase
        .from("settlement_records")
        .select("*")
        .eq("company_id", company_id)
        .eq("claimant_id", user.id);

      if (error) {
        const message = "Failed to fetch settlement history";
        setError(message);
        throw new DatabaseError(`${message}: ${error.message}`);
      }

      setSettlementRequests(data || []);
      return data;
    } catch (error) {
      setError("Failed to fetch settlement requests");
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSettlementRequests]);

  const updateSettlementRequest = useCallback(
    async (action: string, id: number, comment: string, claimantId: string) => {
      setProcessingId(id);

      try {
        const user = await getEmployeeInfo();
        const company_id = await getCompanyId();
        if (!user) return false;

        const { data, error } = await supabase
          .from("settlement_records")
          .update({
            status: action,
            approved_by_id: user.id,
            comment: comment,
          })
          .eq("company_id", company_id)
          .eq("id", id);

        if (error) {
          const message = "Failed to update settlement request";
          setError(message);
          throw new DatabaseError(`${message}: ${error.message}`);
        }

        // Refresh the requests
        await fetchSettlementRequests();

        // Notify the claimant (employee who submitted the request), not the supervisor
        const recipients = [claimantId].filter(Boolean) as string[];

        createNotification({
          title: "Settlement Request Update",
          message: `Your settlement request has been ${action.toLowerCase()}.`,
          priority: 'normal',
          type_id: 6,
          recipient_id: recipients,
          action_url: '/ops/settlement',
          company_id: user.company_id,
          department_id: user.department_id
        });

        return true;
      } catch (error) {
        setError("Failed to update settlement request");
        console.error(error);
        return false;
      } finally {
        setProcessingId(null);
      }
    },
    [fetchSettlementRequests]
  );

  const createSettlementRequest = useCallback(
    async (settlementData: any, attachments: File[] = []) => {
      setLoading(true);
      setError(null);

      try {
        const user = await getEmployeeInfo();
        const company_id = await getCompanyId();
        if (!user) return { success: false, error: "User not authenticated" };

        // Upload files if any
        let uploadedFilePaths: string[] = [];
        let uploadResult = null;
        if (attachments.length > 0) {
          uploadResult = await uploadManyFiles(attachments, "settlement");
          if (uploadResult.error) {
            throw new Error(uploadResult.error);
          }
          uploadedFilePaths = uploadResult.uploadedFilePaths;
        }

        // Prepare settlement data
        const formattedSettlementData = {
          ...settlementData,
          claimant_id: user.id,
          company_id,
          attachments: uploadedFilePaths,
          attachment_download_urls: uploadResult ? uploadResult.publicUrls : [],
        };

        const { data, error } = await supabase
          .from("settlement_records")
          .insert(formattedSettlementData)
          .select()
          .single();

        if (error) {
          const message = "Failed to create settlement request";
          setError(message);
          throw new DatabaseError(`${message}: ${error.message}`);
        }


        const recipients = [user.supervisor_id].filter(Boolean) as string[]

        createNotification({
          title: "New Settlement Request",
          message: `A new settlement request has been submitted by ${user.name}.`,
          priority: 'normal',
          type_id: 6,
          recipient_id: recipients,
          action_url: '/ops/settlement',
          company_id: user.company_id,
          department_id: settlementData.department_id
        });

        return { success: true, data };
      } catch (error) {
        const errorMessage = "Failed to create settlement request";
        setError(errorMessage);
        console.error(error);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    settlementRequests,
    loading,
    error,
    processingId,
    fetchSettlementRequests,
    fetchSettlementHistory,
    updateSettlementRequest,
    createSettlementRequest,
  };
}
