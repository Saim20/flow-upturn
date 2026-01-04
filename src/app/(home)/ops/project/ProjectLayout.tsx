"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Archive, FolderPlus, Folder, FolderOpen, FolderDashed } from "@phosphor-icons/react";
import TabView, { TabItem } from "@/components/ui/TabView";
import { fadeInUp } from "@/components/ui/animations";
import { useRouter, useSearchParams } from "next/navigation";

import CompletedProjectsList from "@/components/ops/project/CompletedProjectsList";
import CreateNewProjectPage from "@/components/ops/project/CreateNewProject";
import ProjectsList from "@/components/ops/project/OngoingProjectsView";
import DraftProjectsList from "@/components/ops/project/DraftProjectsView";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ModulePermissionsBanner } from "@/components/permissions";
import { PERMISSION_MODULES } from "@/lib/constants";


const TABS = [
    {
        key: "ongoing",
        label: "Ongoing",
        icon: <FolderOpen size={16} />,
        color: "text-primary-600 dark:text-primary-400",
    },
    {
        key: "completed",
        label: "Completed",
        icon: <Folder size={16} />,
        color: "text-success",
    },
    {
        key: "drafts",
        label: "Drafts",
        icon: <FolderDashed size={16} />,
        color: "text-warning-600 dark:text-warning-400",
    },
    {
        key: "create",
        label: "Create New",
        icon: <FolderPlus size={16} />,
        color: "text-indigo-600 dark:text-indigo-400",
    },
    {
        key: "archived",
        label: "Archived",
        icon: <Archive size={16} />,
        color: "text-foreground-secondary",
    },
];

export default function ProjectLayout({
    activeTab: initialActiveTab = "ongoing",
    overrideContent,
}: {
    activeTab?: string;
    overrideContent?: React.ReactNode;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { canWrite } = useAuth();
    const pathname = usePathname();

    const [activeTab, setActiveTab] = useState(initialActiveTab);
    const [tabs, setTabs] = useState<TabItem[]>([]);
    
    // Track initial tab setup
    const hasSetupTabs = useRef(false);

    // Sync tab from URL - only when URL changes
    useEffect(() => {
        if (pathname === "/ops/project") {
            const urlTab = searchParams.get("tab");
            if (urlTab && urlTab !== activeTab) {
                setActiveTab(urlTab);
            } else if (!urlTab) {
                router.replace(`/ops/project?tab=${initialActiveTab}`);
            }
        }
    }, [pathname, searchParams, activeTab, initialActiveTab, router]);

    // Memoize tab change handler
    const handleTabChange = useCallback((tab: string) => {
        router.push(`/ops/project?tab=${tab}`);
        setActiveTab(tab);
    }, [router]);

    // Memoize archived content
    const archivedContent = useMemo(() => (
        <div className="flex flex-col items-center justify-center p-12 bg-background-secondary dark:bg-background-tertiary rounded-xl border border-border-primary text-center">
            <Archive className="h-16 w-16 text-foreground-tertiary mb-4" />
            <h3 className="text-xl font-semibold text-foreground-primary mb-2">
                Archived Projects
            </h3>
            <p className="text-foreground-secondary max-w-md mb-6">
                This section stores projects that are no longer active but kept
                for reference purposes.
            </p>
            <p className="text-foreground-tertiary text-sm">Feature coming soon...</p>
        </div>
    ), []);

    // Tab content mapper - memoized
    const getTabContent = useCallback((key: string) => {
        switch (key) {
            case "create":
                return <CreateNewProjectPage setActiveTab={setActiveTab} />;
            case "ongoing":
                return <ProjectsList setActiveTab={setActiveTab} />;
            case "completed":
                return <CompletedProjectsList setActiveTab={setActiveTab} />;
            case "drafts":
                return <DraftProjectsList setActiveTab={setActiveTab} />;
            case "archived":
                return archivedContent;
            default:
                return <ProjectsList setActiveTab={setActiveTab} />;
        }
    }, [archivedContent]);

    // Setup tabs once based on permissions
    useEffect(() => {
        if (hasSetupTabs.current) return;
        hasSetupTabs.current = true;
        
        const hasWritePermission = canWrite(PERMISSION_MODULES.PROJECTS);
        const visibleTabs = hasWritePermission
            ? TABS
            : TABS.filter((tab) => tab.key !== "create" && tab.key !== "drafts");

        setTabs(
            visibleTabs.map((tab) => ({
                ...tab,
                content: getTabContent(tab.key),
            }))
        );
    }, [canWrite, getTabContent]);

    return (
        <motion.section
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeInUp}
            className="bg-surface-primary p-4 sm:p-6 lg:p-8 rounded-lg w-full"
        >
            <div className="border-b border-border-primary pb-4 mb-4" data-tutorial="project-header">
                <h1 className="text-2xl font-bold text-foreground-primary flex items-center mb-1">
                    <Folder className="mr-2 h-6 w-6 text-primary-500" />
                    Project Management
                </h1>
                <p className="max-w-3xl text-foreground-secondary">
                    Efficiently manage your projects from start to finish. Create, assign,
                    and track progress to ensure successful completion of all project
                    milestones.
                </p>
            </div>

            {/* Permission Banner */}
            <ModulePermissionsBanner module={PERMISSION_MODULES.PROJECTS} title="Projects" compact />

            {overrideContent ? (
                <>
                    <TabView
                        tabs={tabs}
                        activeTab=""
                        setActiveTab={handleTabChange}
                        tutorialPrefix="project"
                    />
                    {overrideContent}
                </>
            ) : (
                <TabView
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={handleTabChange}
                    tutorialPrefix="project"
                />
            )}
        </motion.section>
    );
}
