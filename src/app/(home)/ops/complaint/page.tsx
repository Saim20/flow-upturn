"use client";
import ComplaintCreatePage from "@/components/ops/complaint/ComplaintCreatePage";
import ComplaintHistoryPage from "@/components/ops/complaint/ComplaintHistory";
import ComplaintRequestsPage from "@/components/ops/complaint/ComplaintRequests";
import ServicePageTemplate from "@/components/ui/ServicePageTemplate";
import { TabItem } from "@/components/ui/TabView";
import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { WarningCircle, ClockCounterClockwise, BookOpen, FilePlus, ClipboardText, Warning } from "@phosphor-icons/react";
import { PERMISSION_MODULES } from "@/lib/constants";


export default function ComplaintPage() {
  const [activeTab, setActiveTab] = useState("home");

  // Memoized action button handler
  const handleNewComplaint = useCallback(() => setActiveTab("home"), []);

  // Memoized tabs array
  const tabs: TabItem[] = useMemo(() => [
    {
      key: "home",
      label: "New Complaint",
      icon: <FilePlus className="h-5 w-5" />,
      color: "text-error",
      content: <ComplaintCreatePage onClose={() => { }} setActiveTab={setActiveTab} />
    },
    {
      key: "history",
      label: "History",
      icon: <ClockCounterClockwise className="h-5 w-5" />,
      color: "text-primary-600",
      content: <ComplaintHistoryPage />
    },
    {
      key: "requests",
      label: "Requests",
      icon: <ClipboardText className="h-5 w-5" />,
      color: "text-amber-600",
      content: <ComplaintRequestsPage />
    },
    {
      key: "policy",
      label: "Policy",
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-purple-600",
      content: (
        <div className="p-6">
          <h2 className="text-xl font-bold text-foreground-primary mb-4 flex items-center">
            <Warning className="mr-2 h-5 w-5 text-error" />
            Complaint Policy
          </h2>
          <div className="prose prose-red max-w-none">
            <p className="text-foreground-secondary">
              Our complaint policy is designed to ensure that all employee concerns are addressed promptly and fairly. Please review the guidelines below before submitting a complaint.
            </p>
            <h3 className="text-lg font-semibold text-foreground-secondary mt-4">Submission Guidelines</h3>
            <ul className="mt-2 space-y-1 text-foreground-secondary">
              <li className="flex items-start">
                <span className="text-error mr-2">•</span>
                All complaints must be factual and include specific details about the incident.
              </li>
              <li className="flex items-start">
                <span className="text-error mr-2">•</span>
                Submit complaints within 7 days of the incident for prompt resolution.
              </li>
              <li className="flex items-start">
                <span className="text-error mr-2">•</span>
                Maintain confidentiality regarding the complaint and involved parties.
              </li>
              <li className="flex items-start">
                <span className="text-error mr-2">•</span>
                Follow up through the appropriate channels as directed.
              </li>
            </ul>
            <h3 className="text-lg font-semibold text-foreground-secondary mt-4">Resolution Process</h3>
            <ol className="mt-2 space-y-2 text-foreground-secondary">
              <li className="flex items-start">
                <span className="bg-error/10 text-error dark:bg-error/20 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold mr-2 shrink-0">1</span>
                <div>
                  <span className="font-medium">Initial Review (1-2 days):</span> Your complaint will be reviewed by HR and relevant department heads.
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-error/10 text-error dark:bg-error/20 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold mr-2 shrink-0">2</span>
                <div>
                  <span className="font-medium">Investigation (3-5 days):</span> Evidence will be gathered and interviews conducted as needed.
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-error/10 text-error dark:bg-error/20 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold mr-2 shrink-0">3</span>
                <div>
                  <span className="font-medium">Decision (2-3 days):</span> A resolution will be determined based on the investigation findings.
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-error/10 text-error dark:bg-error/20 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold mr-2 shrink-0">4</span>
                <div>
                  <span className="font-medium">Implementation:</span> The resolution will be implemented and all parties will be notified.
                </div>
              </li>
            </ol>
          </div>
        </div>
      )
    },
  ], [setActiveTab]);


  return (
    <ServicePageTemplate
      title="Complaint Management"
      description="Submit, track, and manage workplace complaints and concerns. Our system ensures all issues are addressed promptly and fairly."
      icon={<WarningCircle className="h-6 w-6" />}
      primaryColor="text-error"
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      actionButtonLabel="New Complaint"
      actionButtonIcon={<FilePlus className="h-4 w-4" />}
      actionButtonOnClick={handleNewComplaint}
      module={PERMISSION_MODULES.COMPLAINTS}
      showPermissionBanner={true}
      tutorialPrefix="complaint"
    />
  );
}
