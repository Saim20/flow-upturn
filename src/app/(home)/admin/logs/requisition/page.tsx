"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRequisitionRequests, RequisitionState } from "@/hooks/useRequisition";
import { supabase } from "@/lib/supabase/client";
import { ClipboardText, Clock, WarningCircle, Plus } from "@phosphor-icons/react";
import InlineSpinner from "@/components/ui/InlineSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import TabView from "@/components/ui/TabView";
import { RequisitionCard } from "@/components/ops/requisition/RequisitionCard";
import RequisitionCreateModal from "@/components/ops/requisition/RequisitionCreateModal";
import RequisitionEditModal from "@/components/ops/requisition/RequisitionEditModal";
import { RequisitionType, RequisitionInventory } from "@/lib/types";
import { useAuth } from "@/lib/auth/auth-context";

export default function RequisitionPage() {
  const {
    requisitionRequests,
    fetchRequisitionRequests,
    fetchRequisitionHistory,
    updateRequisitionRequest,
    updateRequisition,
    loading,
    processingId,
  } = useRequisitionRequests();

  const {
    canApprove,
    canWrite,
    employeeInfo,
  } = useAuth()

  const MODULE = "Requisition";

  const [activeTab, setActiveTab] = useState("requests");
  const [requisitionTypes, setRequisitionTypes] = useState<RequisitionType[]>([]);
  const [requisitionInventories, setRequisitionInventories] = useState<RequisitionInventory[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState(requisitionRequests);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<RequisitionState | null>(null);

  // Check if user can edit a requisition
  const canEditRequisition = useCallback((req: RequisitionState) => {
    if (!employeeInfo) return false;
    
    const isOwner = req.employee_id === employeeInfo.id;
    const hasWritePermission = canWrite('requisition');
    const hasApprovalPermission = canApprove('requisition');
    
    return isOwner || hasWritePermission || hasApprovalPermission;
  }, [employeeInfo, canWrite, canApprove]);

  const handleEditClick = (req: RequisitionState) => {
    setEditingRequisition(req);
  };

  const handleCloseEditModal = () => {
    setEditingRequisition(null);
  };

  const handleUpdateRequisition = async (id: number, data: Partial<RequisitionState>) => {
    const result = await updateRequisition(id, data);
    if (result) {
      refreshData();
    }
    return result;
  };

  // Load requisition types, inventories, and requests/history
  useEffect(() => {
    const load = async () => {
      if (!employeeInfo?.company_id) return;
      
      if (activeTab === "requests") await fetchRequisitionRequests("Pending", true);
      else await fetchRequisitionHistory(true);

      // Filter by company_id for data isolation
      const { data: types } = await supabase
        .from("requisition_types")
        .select("*")
        .eq("company_id", employeeInfo.company_id);
      setRequisitionTypes(types || []);

      const { data: inventories } = await supabase
        .from("requisition_inventories")
        .select("*")
        .eq("company_id", employeeInfo.company_id);
      setRequisitionInventories(inventories || []);

      // Filter employees by company_id and active job status
      const { data: emps } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, designation")
        .eq("company_id", employeeInfo.company_id)
        .in("job_status", ['Active', 'Probation']);
      // Format employees to include name field for RequisitionCard
      const formattedEmployees = (emps || []).map((emp: any) => ({
        ...emp,
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown'
      }));
      setEmployees(formattedEmployees);
    };
    load();
  }, [activeTab, employeeInfo?.company_id]);

  // FunnelSimple requisitions (optional searchTerm can be added here)
  useEffect(() => {
    setFiltered(requisitionRequests);
  }, [requisitionRequests]);

  // Adapter: RequisitionCard expects (status: string, reqId: string, employeeId: string, comment?: string) => void
  const handleUpdateRequest = (
    status: string,
    reqId: string,
    employeeId: string,
    comment?: string
  ) => {
    (async () => {
      const id = parseInt(reqId as any, 10) || 0;
      await updateRequisitionRequest(status as "Approved" | "Rejected", id, comment || "", employeeId);
    })();
  };

  const extractFileNameFromStoragePath = (path: string) => path.split("/").pop() || path;

  const refreshData = async () => {
    if (activeTab === "requests") await fetchRequisitionRequests("Pending", true);
    else await fetchRequisitionHistory(true);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardText className="text-primary-600" size={26} />
          <h1 className="text-2xl font-semibold">Requisition Logs</h1>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add Requisition</span>
        </button>
      </div>

      <div className="mt-4">
        <TabView
          tabs={[
            {
              key: "requests",
              label: "Requests",
              icon: <ClipboardText />,
              color: "text-blue-500",
              content: (
                <>
                  {loading && (
                    <div className="flex justify-center items-center py-20 text-foreground-tertiary">
                      <InlineSpinner size="md" color="primary" className="mr-2" />
                      Loading requisitions...
                    </div>
                  )}

                  {!loading && filtered.length === 0 && (
                    <EmptyState
                      icon={WarningCircle}
                      title="No pending requisition requests"
                      description="There are no pending requisition requests at this time."
                    />
                  )}

                  <div className="space-y-4">
                    {!loading &&
                      filtered.map((req: any) => (
                        <RequisitionCard
                          key={req.id}
                          req={req}
                          requisitionTypes={requisitionTypes}
                          requisitionInventories={requisitionInventories}
                          employees={employees}
                          extractFileNameFromStoragePath={extractFileNameFromStoragePath}
                          mode="request"
                          handleUpdateRequest={handleUpdateRequest}
                          processingId={processingId?.toString()}
                          canApprove={canApprove(MODULE)}
                          canEdit={canEditRequisition(req as RequisitionState)}
                          onEdit={handleEditClick}
                        />
                      ))}
                  </div>
                </>
              ),
            },
            {
              key: "history",
              label: "History",
              icon: <Clock />,
              color: "text-foreground-tertiary",
              content: (
                <>
                  {loading && (
                    <div className="flex justify-center items-center py-20 text-foreground-tertiary">
                      <InlineSpinner size="md" color="primary" className="mr-2" />
                      Loading history...
                    </div>
                  )}

                  {!loading && filtered.length === 0 && (
                    <EmptyState
                      icon={WarningCircle}
                      title="No past requisitions"
                      description="There are no past requisitions in the history."
                    />
                  )}

                  <div className="space-y-4">
                    {!loading &&
                      filtered.map((req: any) => (
                        <RequisitionCard
                          key={req.id}
                          req={req}
                          requisitionTypes={requisitionTypes}
                          requisitionInventories={requisitionInventories}
                          employees={employees}
                          extractFileNameFromStoragePath={extractFileNameFromStoragePath}
                          mode="history"
                          canEdit={canEditRequisition(req as RequisitionState)}
                          onEdit={handleEditClick}
                        />
                      ))}
                  </div>
                </>
              ),
            },
          ]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* Create Modal */}
      <RequisitionCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refreshData}
      />

      {/* Edit Modal */}
      {editingRequisition && (
        <RequisitionEditModal
          isOpen={!!editingRequisition}
          requisition={editingRequisition}
          onClose={handleCloseEditModal}
          onSubmit={handleUpdateRequisition}
        />
      )}
    </div>
  );
}
