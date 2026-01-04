"use client";
import RequisitionHistoryPage from "@/components/ops/requisition/RequisitionHistoryPage";
import RequisitionRequestsPage from "@/components/ops/requisition/RequisitionRequestsPage";
import UpcomingPage from "@/components/ops/requisition/UpcomingPage";
import ServicePageTemplate from "@/components/ui/ServicePageTemplate";
import { TabItem } from "@/components/ui/TabView";
import { useState, Suspense, useEffect } from "react";
import { motion } from "framer-motion";
import { FilePlus, ClipboardText, ClockCounterClockwise, BookOpen, Warning, Scroll } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PERMISSION_MODULES } from "@/lib/constants";

function RequisitionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tab || "create");

  useEffect(() => {
    setActiveTab(tab || "create");
  }, [tab]);

  const tabs: TabItem[] = [
    {
      key: "create",
      label: "Create New",
      icon: <FilePlus className="h-5 w-5" />,
      color: "text-cyan-600",
      content: <UpcomingPage setActiveTab={setActiveTab} />,
      link: "/ops/requisition?tab=create",
    },
    {
      key: "history",
      label: "History",
      icon: <ClockCounterClockwise className="h-5 w-5" />,
      color: "text-indigo-600",
      content: <RequisitionHistoryPage />,
      link: "/ops/requisition?tab=history",
    },
    {
      key: "requests",
      label: "Requests",
      icon: <ClipboardText className="h-5 w-5" />,
      color: "text-success",
      content: <RequisitionRequestsPage />,
      link: "/ops/requisition?tab=requests",
    },
    {
      key: "policy",
      label: "Policy",
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-amber-600",
      content: (
        <div className="flex flex-col items-center justify-center py-12 text-foreground-secondary">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <BookOpen className="h-16 w-16 text-info/40 mb-4" />
          </motion.div>
          <h3 className="text-xl font-medium mb-2">Requisition Policy</h3>
          <p className="mt-2 text-center max-w-md mb-6">
            Company requisition policies and guidelines will appear here. Please check back later or contact the procurement department for more information.
          </p>
          <div className="bg-info/10 border border-info/30 rounded-lg p-4 max-w-md dark:bg-info/5 dark:border-info/20">
            <div className="flex gap-3">
              <Warning className="h-5 w-5 text-info shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground-primary mb-1">Important Information</h4>
                <p className="text-sm text-foreground-secondary">
                  All requisitions require manager approval and should be submitted at least 7 days before the requested items are needed. Emergency requisitions follow a different approval process.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      link: "/ops/requisition?tab=policy",
    },
  ];

  return (
    <ServicePageTemplate
      title="Requisition Management"
      description="Create, track, and manage requisition requests for your workplace needs efficiently."
      icon={<Scroll className="h-7 w-7" />}
      primaryColor="text-cyan-600"
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      actionButtonLabel="Create Requisition"
      actionButtonIcon={<FilePlus className="h-4 w-4" />}
      actionButtonOnClick={() => {
        router.push("/ops/requisition?tab=create");
      }}
      isLinked={true}
      module={PERMISSION_MODULES.REQUISITION}
      showPermissionBanner={true}
      tutorialPrefix="requisition"
    />
  );
}

export default function RequisitionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <Scroll className="h-8 w-8 text-cyan-600 animate-pulse" />
          <p className="text-sm text-foreground-secondary">Loading requisition...</p>
        </div>
      </div>
    }>
      <RequisitionPageContent />
    </Suspense>
  );
}

