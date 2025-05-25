"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { getEmployeeInfo } from "@/lib/api/employee";
import { getCompanyId } from "@/lib/api/company/companyInfo";

export function useSettlementRequests() {
  const [settlementRequests, setSettlementRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchSettlementRequests = useCallback(
    async () => {
      setLoading(true);

      try {
        const user = await getEmployeeInfo();
        const company_id = await getCompanyId();

        const { data, error } = await supabase
          .from("settlement_records")
          .select("*")
          .eq("company_id", company_id)
          .eq("requested_to", user.id)
          .eq("status", "Pending");

        if (error) {
          setError("Failed to fetch settlement requests");
          throw error;
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

      const { data, error } = await supabase
        .from("settlement_records")
        .select("*")
        .eq("company_id", company_id)
        .eq("claimant_id", user.id);

      if (error) {
        setError("Failed to fetch settlement requests");
        throw error;
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
    async (action: string, id: number, comment: string) => {
      setProcessingId(id);

      try {
        const user = await getEmployeeInfo();
        const company_id = await getCompanyId();

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
          setError("Failed to update settlement request");
          throw error;
        }

        // Refresh the requests
        await fetchSettlementRequests();
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

  return {
    settlementRequests,
    loading,
    error,
    processingId,
    fetchSettlementRequests,
    fetchSettlementHistory,
    updateSettlementRequest,
  };
}
