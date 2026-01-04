"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import TaskLayout from "./TaskLayout";

function TasksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<string>(() => {
    // Initial tab from URL
    return searchParams.get("tab") || "ongoing";
  });

  // Sync state whenever URL changes
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "ongoing";
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // Update URL whenever activeTab changes (when changing tabs manually)
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <TaskLayout
      selectedTaskId={null} // No task selected
      activeTab={activeTab}
      initialActiveTab={activeTab} // Pass current active tab
      setActiveTab={handleTabChange} // Pass setter to allow tab switching
    />
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}
