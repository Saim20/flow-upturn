"use client";
import { Notice, useNotices } from "@/hooks/useNotice";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Pencil, TrashSimple, Plus, Clock, CalendarBlank, Info } from "@phosphor-icons/react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { NoticeCreateModal, NoticeUpdateModal } from "@/components/ops/notice";
import { getEmployeeId } from "@/lib/utils/auth";
import { useAuth } from "@/lib/auth/auth-context";
import { PERMISSION_MODULES } from "@/lib/constants";
import { ModulePermissionsBanner, PermissionGate, PermissionTooltip } from "@/components/permissions";
import { formatDate } from "@/lib/utils";

export default function NoticePage() {
  const {
    notices,
    loading,
    fetchNotices,
    createNotice,
    updateNotice,
    deleteNotice,
  } = useNotices();
  const { canWrite, canDelete } = useAuth();
  const [isCreatingNotice, setIsCreatingNotice] = useState(false);
  const [isUpdatingNotice, setIsUpdatingNotice] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [isCreatingNoticeButtonLoading, setIsCreatingNoticeButtonLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");

  // Track initial data fetch
  const hasInitialized = useRef(false);

  // Memoized handlers
  const handleCreateNotice = useCallback(async (values: any) => {
    try {
      setIsCreatingNoticeButtonLoading(true);
      await createNotice(values);
      toast.success("Notice created successfully!");
      setIsCreatingNoticeButtonLoading(false);
      setIsCreatingNotice(false);
      fetchNotices();
    } catch (error) {
      toast.error("Error creating notice. Please try again.");
      console.error(error);
    }
  }, [createNotice, fetchNotices]);

  const handleUpdateNotice = useCallback(async (values: any) => {
    try {
      setIsUpdatingNotice(true);
      if (editNotice?.id) {
        await updateNotice(editNotice.id, values);
        setEditNotice(null);
        fetchNotices();
        setIsUpdatingNotice(false);
        toast.success("Notice updated successfully!");
      }
    } catch (error) {
      toast.error("Error updating notice. Please try again.");
      console.error(error);
    }
  }, [editNotice?.id, updateNotice, fetchNotices]);

  const handleDeleteNotice = useCallback(async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this notice?");
    if (!confirmed) return;

    try {
      await deleteNotice(id);
      toast.success("Notice deleted successfully!");
      fetchNotices();
    } catch (error) {
      toast.error("Error deleting notice. Please try again.");
      console.error(error);
    }
  }, [deleteNotice, fetchNotices]);

  const handleOpenCreateModal = useCallback(() => setIsCreatingNotice(true), []);
  const handleCloseCreateModal = useCallback(() => setIsCreatingNotice(false), []);
  const handleCloseEditModal = useCallback(() => setEditNotice(null), []);

  // Initial data fetch - only run once
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    fetchNotices();
    
    const getUserId = async () => {
      const id = await getEmployeeId();
      setUserId(id);
    };
    getUserId();
  }, [fetchNotices]);

  // Memoized animation variants
  const pageVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren"
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.3
      }
    }
  }), []);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        stiffness: 260,
        damping: 20
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  }), []);

  if (loading) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8 min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner
          text="Loading notices..."
          icon={Bell}
          color="amber"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      <AnimatePresence mode="wait">
        {!isCreatingNotice && !editNotice && (
          <motion.div
            key="notice-main"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={pageVariants}
            className="w-full p-4 sm:p-6 lg:p-8"
          >
            <motion.div
              data-tutorial="notice-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
            >
              <PageHeader
                icon={Bell}
                iconColor="text-warning"
                title="Notices & Announcements"
                description="View and manage company-wide notices and important announcements."
                className="mb-0"
              />
              {canWrite(PERMISSION_MODULES.NOTICE) ? (
                <motion.button
                  data-tutorial="notice-create-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="flex items-center justify-center gap-2 bg-warning hover:brightness-110 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Notice</span>
                </motion.button>
              ) : (
                <PermissionTooltip message="You don't have permission to create notices">
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 bg-background-tertiary text-foreground-tertiary px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Notice</span>
                  </button>
                </PermissionTooltip>
              )}
            </motion.div>

            {/* Permission Banner */}
            <ModulePermissionsBanner module={PERMISSION_MODULES.NOTICE} title="Notices" compact />

            {notices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="mt-10 flex flex-col items-center justify-center p-10 bg-warning/10 rounded-xl border border-warning/30 dark:bg-warning/5 dark:border-warning/20"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <Info className="h-16 w-16 text-warning mb-4" />
                </motion.div>
                <h3 className="text-xl font-medium text-foreground-secondary mb-2">No Notices Available</h3>
                <p className="text-foreground-secondary text-center max-w-md mb-5">
                  There are currently no notices or announcements. Create your first notice to keep everyone informed.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsCreatingNotice(true)}
                  className="px-5 py-2.5 bg-warning text-white rounded-lg shadow-sm hover:brightness-110 transition-colors font-medium flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create your first notice
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 gap-5"
              >
                {notices.map((notice) => (
                  <motion.div
                    key={notice.id}
                    layout
                    whileHover={{
                      y: -4,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                    }}
                    transition={{ layout: { duration: 0.3 } }}
                    className="bg-surface-primary shadow-sm rounded-xl overflow-hidden border border-border-primary"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <h2 className="text-lg font-semibold text-foreground-primary mb-3">{notice.title}</h2>
                        {notice.created_by === userId && (
                          <div className="flex space-x-1">
                            {canWrite(PERMISSION_MODULES.NOTICE) ? (
                              <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setEditNotice(notice)}
                                className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 rounded-full transition-colors"
                                aria-label="Edit notice"
                              >
                                <Pencil className="h-4 w-4" />
                              </motion.button>
                            ) : (
                              <PermissionTooltip message="You don't have permission to edit notices">
                                <button
                                  disabled
                                  className="p-2 text-foreground-tertiary rounded-full cursor-not-allowed opacity-50"
                                  aria-label="Edit notice (disabled)"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </PermissionTooltip>
                            )}
                            {canDelete(PERMISSION_MODULES.NOTICE) ? (
                              <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteNotice(notice.id!)}
                                className="p-2 text-error hover:bg-error/10 dark:hover:bg-error/20 rounded-full transition-colors"
                                aria-label="Delete notice"
                              >
                                <TrashSimple className="h-4 w-4" />
                              </motion.button>
                            ) : (
                              <PermissionTooltip message="You don't have permission to delete notices">
                                <button
                                  disabled
                                  className="p-2 text-foreground-tertiary rounded-full cursor-not-allowed opacity-50"
                                  aria-label="Delete notice (disabled)"
                                >
                                  <TrashSimple className="h-4 w-4" />
                                </button>
                              </PermissionTooltip>
                            )}
                          </div>

                        )}
                      </div>
                      <p className="text-foreground-secondary mb-4">{notice.description}</p>
                      <div className="flex flex-col gap-2 pt-4 border-t border-border-primary">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div className="flex items-center text-sm text-foreground-tertiary">
                            <Clock className="h-4 w-4 mr-1.5" />
                            <span>
                              Posted on {formatDate(notice.created_at || '')}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-foreground-secondary">
                            <CalendarBlank className="h-4 w-4 mr-1.5" />
                            <span>
                              Valid: {formatDate(notice.valid_from)} → {formatDate(notice.valid_till)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {isCreatingNotice && (
          <NoticeCreateModal
            onClose={() => setIsCreatingNotice(false)}
            onSubmit={handleCreateNotice}
            isLoading={isCreatingNoticeButtonLoading}
          />
        )}

        {editNotice && (
          <NoticeUpdateModal
            initialData={{
              ...editNotice,
              notice_type_id: editNotice.notice_type_id === null ? undefined : editNotice.notice_type_id
            }}
            onClose={() => setEditNotice(null)}
            onSubmit={handleUpdateNotice}
            isLoading={isUpdatingNotice}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
