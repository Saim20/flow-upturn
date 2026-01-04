"use client";

import { useState, Suspense, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Receipt, ClipboardText, ClockCounterClockwise, BookOpen, CurrencyDollar, Warning, FilePlus } from "@phosphor-icons/react";
import ServicePageTemplate from "@/components/ui/ServicePageTemplate";
import { TabItem } from "@/components/ui/TabView";
import SettlementHistoryPage from "@/components/ops/settlement/SettlementHistory";
import SettlementRequestsPage from "@/components/ops/settlement/SettlementRequestsPage";
import UpcomingPage from "@/components/ops/settlement/UpcomingPage";
import { PERMISSION_MODULES } from "@/lib/constants";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

function SettlementPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tab || "create");

  useEffect(() => {
    setActiveTab(tab || "create");
  }, [tab]);

  // Memoized action button handler
  const handleCreateClick = useCallback(() => {
    router.push("/ops/settlement?tab=create");
  }, [router]);

  // Memoized tabs array to prevent unnecessary re-renders
  const tabs: TabItem[] = useMemo(() => [
    {
      key: "create",
      label: "Create New",
      icon: <FilePlus className="h-5 w-5" />,
      color: "text-emerald-600",
      content: <UpcomingPage setActiveTab={setActiveTab} />,
      link: "/ops/settlement?tab=create",
    },
    {
      key: "history",
      label: "History",
      icon: <ClockCounterClockwise className="h-5 w-5" />,
      color: "text-primary-600",
      content: <SettlementHistoryPage />,
      link: "/ops/settlement?tab=history",
    },
    {
      key: "requests",
      label: "Requests",
      icon: <ClipboardText className="h-5 w-5" />,
      color: "text-amber-600",
      content: <SettlementRequestsPage />,
      link: "/ops/settlement?tab=requests",
    },
    {
      key: "policy",
      label: "Policy",
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-purple-600",
      content: (
        <div className="flex flex-col items-center justify-center py-12 text-foreground-secondary">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Receipt className="h-16 w-16 text-success/40 mb-4" />
          </motion.div>
          <h3 className="text-xl font-medium mb-2">Settlement Policy</h3>
          <p className="mt-2 text-center max-w-md mb-6">
            Company claim settlement policies and guidelines will appear here. Please check back later or contact the finance department for more information.
          </p>
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 max-w-md dark:bg-success/5 dark:border-success/20">
            <div className="flex gap-3">
              <Warning className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground-primary mb-1">Important Information</h4>
                <p className="text-sm text-foreground-secondary">
                  All claims require proper documentation and receipts. Claims must be submitted within 30 days of the expense. Reimbursements are typically processed within 7-10 business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      link: "/ops/settlement?tab=policy",
    },
  ], [setActiveTab]);

  return (
    <ServicePageTemplate
      title="Claim Settlement"
      description="Submit, track, and manage reimbursement claims for business expenses efficiently."
      icon={<CurrencyDollar className="h-7 w-7" />}
      primaryColor="text-emerald-600"
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      actionButtonOnClick={handleCreateClick}
      isLinked={true}
      module={PERMISSION_MODULES.SETTLEMENT}
      showPermissionBanner={true}
      tutorialPrefix="settlement"
    />
  );
}

export default function SettlementPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <CurrencyDollar className="h-8 w-8 text-emerald-600 animate-pulse" />
          <p className="text-sm text-foreground-secondary">Loading settlement...</p>
        </div>
      </div>
    }>
      <SettlementPageContent />
    </Suspense>
  );
}
