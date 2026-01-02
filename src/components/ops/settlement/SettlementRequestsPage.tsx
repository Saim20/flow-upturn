"use client";

import React, { useEffect, useState } from "react";
import { extractFileNameFromStoragePath, extractFilenameFromUrl } from "@/lib/utils";
import { useClaimTypes } from "@/hooks/useConfigTypes";
import { useEmployees } from "@/hooks/useEmployees";
import { useSettlementRequests } from "@/hooks/useSettlement";
import { FileText, CurrencyDollar, Calendar, User, Clock, Check, X, ChatCircle, List } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, CardHeader, CardContent, StatusBadge, InfoRow } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import LoadingSection from "@/app/(home)/home/components/LoadingSection";
import { ArrowBendUpLeft } from "@phosphor-icons/react";
import { extractEmployeeIds } from "@/lib/utils/project-utils";

// Define the structure of a settlement request
interface SettlementRequest {
  id: number;
  settlement_type_id: number;
  amount: number;
  event_date?: string;
  claimant_id: string;
  description?: string;
  in_advance?: boolean;
  attachments?: string[];
  attachment_download_urls?: string[];
  status: string;
}

export default function SettlementRequestsPage() {
  const [comment, setComment] = useState<string>("");
  const [currentlyProcessingId, setCurrentlyProcessingId] = useState<number | null>(null);
  const { employees, fetchEmployeesByIds } = useEmployees();
  const { claimTypes, fetchClaimTypes } = useClaimTypes();
  const { 
    settlementRequests, 
    loading, 
    error, 
    processingId, 
    fetchSettlementRequests, 
    updateSettlementRequest 
  } = useSettlementRequests();

  useEffect(() => {
    const initData = async () => {
      const requests = await fetchSettlementRequests();
      // Only fetch employees that are referenced in the requests
      if (requests && requests.length > 0) {
        const employeeIds = extractEmployeeIds(requests, ["claimant_id"]);
        if (employeeIds.length > 0) {
          fetchEmployeesByIds(employeeIds);
        }
      }
    };
    initData();
  }, [fetchSettlementRequests, fetchEmployeesByIds]);

  useEffect(() => {
    fetchClaimTypes();
  }, [fetchClaimTypes]);

  const handleUpdateRequest = async (action: string, id: number, claimantId: string) => {
    setCurrentlyProcessingId(id);
    const success = await updateSettlementRequest(action, id, comment, claimantId);
    if (success) {
      toast.success(`Settlement request ${action.toLowerCase()} successfully`);
      setComment("");
      fetchSettlementRequests();
    } else {
      toast.error(`Failed to ${action.toLowerCase()} settlement request`);
    }
    setCurrentlyProcessingId(null);
  };

  if (loading) {
    return <LoadingSection 
          text="Loading settlement requests..."
          icon={List}
          color="blue"
          />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-error mb-2">Error loading settlement requests</div>
        <p className="text-foreground-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {settlementRequests.length > 0 ? (
        settlementRequests.map((settlement) => (
          <SettlementRequestCard
            key={settlement.id}
            settlement={settlement}
            employees={employees}
            claimTypes={claimTypes}
            comment={comment}
            setComment={setComment}
            onApprove={() => handleUpdateRequest("Approved", settlement.id, settlement.claimant_id)}
            onReject={() => handleUpdateRequest("Rejected", settlement.id, settlement.claimant_id)}
            isProcessing={currentlyProcessingId === settlement.id}
          />
        ))
      ) : (
        <EmptyState
          icon={<CurrencyDollar className="w-12 h-12" />}
          title="No pending settlement requests"
          description="When users submit settlement requests, they'll appear here for review."
        />
      )}
    </div>
  );
}

function SettlementRequestCard({
  settlement,
  employees,
  claimTypes,
  comment,
  setComment,
  onApprove,
  onReject,
  isProcessing
}: {
  settlement: SettlementRequest;
  employees: any[];
  claimTypes: any[];
  comment: string;
  setComment: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) {
  const employee = employees.find(emp => emp.id === settlement.claimant_id);
  const claimType = claimTypes.find(type => type.id === settlement.settlement_type_id);

  const actions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onReject}
        disabled={isProcessing}
        className="flex items-center gap-2 text-error border-error/20 hover:bg-error/10"
      >
        <X size={14} />
        Reject
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onApprove}
        disabled={isProcessing}
        className="flex items-center gap-2"
        isLoading={isProcessing}
      >
        <Check size={14} />
        Approve
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader
        title={claimType?.settlement_item || "Unknown Settlement Type"}
        subtitle={`Amount: ${settlement.amount} BDT${settlement.in_advance ? " (Advance)" : ""}`}
        icon={<CurrencyDollar size={20} className="text-success" />}
        action={actions}
      />
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <InfoRow
            icon={<User size={16} />}
            label="Requested by"
            value={employee?.name || "Unknown"}
          />
          {settlement.event_date && (
            <InfoRow
              icon={<Calendar size={16} />}
              label="Event Date"
              value={settlement.event_date}
            />
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <StatusBadge status="Pending" variant="warning" size="sm" />
          {settlement.in_advance && (
            <StatusBadge status="In Advance" variant="info" size="sm" />
          )}
        </div>

        {settlement.description && (
          <div className="mb-4 p-3 bg-background-secondary dark:bg-background-tertiary border border-border-primary rounded-lg">
            <h4 className="text-sm font-medium text-foreground-primary mb-2">Description:</h4>
            <p className="text-sm text-foreground-secondary">{settlement.description}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-primary mb-2">
              <ChatCircle size={16} className="inline mr-2" />
              Add Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your feedback here..."
              rows={3}
              className="w-full border border-border-primary rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-primary text-foreground-primary"
            />
          </div>

          {settlement.attachments && settlement.attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground-primary mb-2 flex items-center gap-2">
                <FileText size={16} />
                Attachments
              </h4>
              <div className="flex flex-wrap gap-2">
                {settlement.attachments.map((attachment: string, idx: number) => (
                  <a
                    key={idx}
                    href={settlement.attachment_download_urls ? settlement.attachment_download_urls[idx] : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-background-secondary dark:bg-background-tertiary hover:bg-background-tertiary dark:hover:bg-surface-primary transition-colors text-foreground-primary text-xs px-3 py-2 rounded-md"
                  >
                    <FileText size={12} />
                    {extractFileNameFromStoragePath(attachment)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
