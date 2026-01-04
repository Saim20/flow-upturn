"use client";
import LeaveCreatePage from "@/components/ops/leave/LeaveCreatePage";
import LeaveHistoryPage from "@/components/ops/leave/LeaveHistory";
import LeaveRequestsPage from "@/components/ops/leave/LeaveRequests";
import ServicePageTemplate from "@/components/ui/ServicePageTemplate";
import { TabItem } from "@/components/ui/TabView";
import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, FileText, PlusCircle, WarningCircle, Calendar } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PERMISSION_MODULES } from "@/lib/constants";
import { BookOpen } from "@phosphor-icons/react";

function LeavePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tab || "apply");

  // Memoized action button handler
  const handleApplyClick = useCallback(() => {
    router.push("/ops/leave?tab=apply");
  }, [router]);

  // Memoized tabs array to prevent unnecessary re-renders
  const tabs: TabItem[] = useMemo(() => [
    {
      key: "apply",
      label: "Apply Leave",
      icon: <PlusCircle className="h-5 w-5" />,
      color: "text-primary-600",
      content: <LeaveCreatePage setActiveTab={setActiveTab} />,
      link: "/ops/leave?tab=apply",
    },
    {
      key: "history",
      label: "History",
      icon: <FileText className="h-5 w-5" />,
      color: "text-success",
      content: <LeaveHistoryPage />,
      link: "/ops/leave?tab=history",
    },
    {
      key: "requests",
      label: "Requests",
      icon: <Clock className="h-5 w-5" />,
      color: "text-amber-600",
      content: <LeaveRequestsPage />,
      link: "/ops/leave?tab=requests",
    },
    {
      key: "policy",
      label: "Policy",
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-purple-600",
      content: (
        <div className="flex flex-col items-center justify-center py-6 sm:py-12 text-foreground-tertiary">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-primary-200 mb-4" />
          </motion.div>
          <h3 className="text-lg sm:text-xl font-medium mb-2">Leave Policy</h3>
          <p className="mt-2 text-center max-w-md mb-6 text-sm sm:text-base px-2">
            Company leave policies and guidelines will appear here. Please check back later or contact HR for more information.
          </p>
          <div className="bg-info/10 dark:bg-info/20 border border-info/20 rounded-lg p-3 sm:p-4 max-w-md mx-2">
            <div className="flex gap-2 sm:gap-3">
              <WarningCircle className="h-5 w-5 text-info shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground-primary mb-1">Policy Information</h4>
                <p className="text-xs sm:text-sm text-foreground-secondary">
                  Leave policies typically include annual leave allowance, sick leave limits, maternity/paternity leave, and other special leave arrangements.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      link: "/ops/leave?tab=policy",
    },
  ], [setActiveTab]);

  useEffect(() => {
    setActiveTab(tab || "apply");
  }, [tab]);

  return (
    <ServicePageTemplate
      title="Leave Management"
      description="Apply for leave, track requests, and view leave history. All your leave management in one place."
      icon={<Calendar className="h-7 w-7" />}
      primaryColor="text-primary-600"
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      actionButtonLabel="Apply for Leave"
      actionButtonIcon={<PlusCircle className="h-4 w-4" />}
      actionButtonOnClick={handleApplyClick}
      isLinked={true}
      module={PERMISSION_MODULES.LEAVE}
      showPermissionBanner={true}
      tutorialPrefix="leave"
    />
  );
}

export default function LeavePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <Calendar className="h-8 w-8 text-primary-600 animate-pulse" />
          <p className="text-sm text-foreground-secondary">Loading leave management...</p>
        </div>
      </div>
    }>
      <LeavePageContent />
    </Suspense>
  );
}
