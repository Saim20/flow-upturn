"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStakeholders } from "@/hooks/useStakeholders";
import { Plus, Gear, TrashSimple, PencilSimple, Warning } from "@phosphor-icons/react";
import { StakeholderProcess } from "@/lib/types/schemas";
import ProcessForm from "@/components/stakeholder-processes/ProcessForm";
import { InlineSpinner } from "@/components/ui";

export default function StakeholderProcessesPage() {
  const router = useRouter();
  const {
    processes,
    stakeholders,
    loading,
    error,
    fetchProcesses,
    fetchStakeholders,
    createProcess,
    deleteProcess,
    processingId,
  } = useStakeholders();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<StakeholderProcess | null>(null);
  const [processToDelete, setProcessToDelete] = useState<StakeholderProcess | null>(null);
  const [deletingProcess, setDeletingProcess] = useState(false);
  const [stakeholderCount, setStakeholderCount] = useState<number>(0);

  useEffect(() => {
    fetchProcesses();
    fetchStakeholders();
  }, [fetchProcesses, fetchStakeholders]);

  const handleDeleteClick = async (process: StakeholderProcess) => {
    // Check how many stakeholders are using this process
    const count = stakeholders.filter(s => s.process_id === process.id).length;
    
    setStakeholderCount(count);
    setProcessToDelete(process);
  };

  const confirmDelete = async () => {
    if (!processToDelete?.id) return;
    
    setDeletingProcess(true);
    try {
      const success = await deleteProcess(processToDelete.id);
      if (success) {
        setProcessToDelete(null);
      }
    } catch (error) {
      console.error("Failed to delete process:", error);
    } finally {
      setDeletingProcess(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground-primary">Stakeholder Processes</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Manage workflow processes for stakeholders and leads
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Create Process
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error/10 border border-error/30 text-error dark:bg-error/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && processes.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <InlineSpinner size="lg" color="blue" />
        </div>
      )}

      {/* Empty State */}
      {!loading && processes.length === 0 && (
        <div className="text-center py-12 bg-background-secondary dark:bg-background-tertiary rounded-lg border-2 border-dashed border-border-secondary">
          <Gear className="mx-auto h-12 w-12 text-foreground-tertiary" />
          <h3 className="mt-2 text-sm font-semibold text-foreground-primary">No processes</h3>
          <p className="mt-1 text-sm text-foreground-tertiary">
            Get started by creating a new stakeholder process.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus size={20} />
              Create Process
            </button>
          </div>
        </div>
      )}

      {/* Process List */}
      {!loading && processes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {processes.map((process) => (
            <div
              key={process.id}
              className="bg-surface-primary rounded-lg border border-border-primary p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground-primary">{process.name}</h3>
                    {process.is_active ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success dark:bg-success/20 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-background-tertiary dark:bg-surface-secondary text-foreground-primary rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {process.description && (
                    <p className="mt-2 text-sm text-foreground-secondary line-clamp-2">
                      {process.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <div className="text-foreground-secondary">
                    <span className="font-medium">{process.step_count || 0}</span> steps
                  </div>
                  <div className="text-foreground-secondary">
                    {process.is_sequential ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-info rounded-full"></span>
                        Sequential
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                        Independent
                      </span>
                    )}
                  </div>
                  {process.is_sequential && process.allow_rollback && (
                    <div className="text-xs text-foreground-tertiary">
                      Rollback allowed
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      router.push(`/admin/config/stakeholder-process/${process.id}`);
                    }}
                    className="p-2 text-foreground-secondary hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 rounded transition-colors"
                    title="Edit process"
                  >
                    <PencilSimple size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(process)}
                    disabled={processingId === process.id}
                    className="p-2 text-foreground-secondary hover:text-error hover:bg-error/10 dark:hover:bg-error/20 rounded transition-colors disabled:opacity-50"
                    title="Delete process"
                  >
                    {processingId === process.id ? (
                      <InlineSpinner size="sm" color="red" />
                    ) : (
                      <TrashSimple size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <ProcessForm
          process={null}
          onSubmit={async (data) => {
            await createProcess(data);
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {processToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-primary rounded-lg p-6 max-w-lg w-full mx-4 border border-error/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                <Warning size={24} weight="fill" className="text-error" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground-primary mb-1">
                  Delete Process: {processToDelete.name}
                </h3>
                <p className="text-sm text-foreground-secondary">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-error/5 border border-error/20 rounded-lg p-4 mb-4 space-y-3">
              <p className="text-sm font-semibold text-error">
                Warning: This will DELETE DATA:
              </p>
              <ul className="text-sm text-foreground-secondary space-y-2 ml-4 list-disc">
                <li>
                  <strong>{processToDelete.step_count || 0}</strong> process step(s) and all their configurations
                </li>
                <li>
                  All step data entered by users for these steps
                </li>
                <li>
                  Historical records of completed steps
                </li>
                {stakeholderCount > 0 && (
                  <li className="text-error font-semibold">
                    <strong>{stakeholderCount}</strong> stakeholder(s) currently using this process
                  </li>
                )}
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setProcessToDelete(null)}
                disabled={deletingProcess}
                className="w-full sm:w-auto px-4 py-2 border border-border-secondary text-foreground-secondary rounded-lg hover:bg-background-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingProcess}
                className="w-full sm:w-auto px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingProcess ? "Deleting..." : "Delete Process"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
