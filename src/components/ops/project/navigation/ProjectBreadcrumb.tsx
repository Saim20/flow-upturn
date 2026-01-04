"use client";

import Link from "next/link";
import { CaretRight, Folder, Target, House } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface ProjectBreadcrumbProps {
  projectId?: string;
  projectTitle?: string;
  milestoneId?: number;
  milestoneTitle?: string;
  taskId?: string;
  taskTitle?: string;
}

export default function ProjectBreadcrumb({
  projectId,
  projectTitle,
  milestoneId,
  milestoneTitle: initialMilestoneTitle,
  taskId,
  taskTitle,
}: ProjectBreadcrumbProps) {
  const [milestoneTitle, setMilestoneTitle] = useState(initialMilestoneTitle);

  // Fetch milestone title if not provided but ID is
  useEffect(() => {
    async function fetchMilestoneTitle() {
      if (milestoneId && !milestoneTitle) {
        const supabase = createClient();
        const { data } = await supabase
          .from("milestones")
          .select("milestone_title")
          .eq("id", milestoneId)
          .single();
        
        if (data?.milestone_title) {
          setMilestoneTitle(data.milestone_title);
        }
      }
    }
    fetchMilestoneTitle();
  }, [milestoneId, milestoneTitle]);

  const breadcrumbs = useMemo(() => {
    const items: BreadcrumbItem[] = [
      {
        label: "Projects",
        href: "/ops/project?tab=ongoing",
        icon: <Folder size={16} weight="fill" />,
      },
    ];

    if (projectId) {
      items.push({
        label: projectTitle || "Project Details",
        href: milestoneId ? `/ops/project/${projectId}` : undefined,
        icon: <Folder size={16} />,
        current: !milestoneId,
      });
    }

    if (milestoneId) {
      items.push({
        label: milestoneTitle || `Milestone ${milestoneId}`,
        href: taskId ? `/ops/project/${projectId}/milestone/${milestoneId}` : undefined,
        icon: <Target size={16} />,
        current: !taskId,
      });
    }

    if (taskId) {
      items.push({
        label: taskTitle || "Task Details",
        icon: <House size={16} />,
        current: true,
      });
    }

    return items;
  }, [projectId, projectTitle, milestoneId, milestoneTitle, taskId, taskTitle]);

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <motion.ol
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center flex-wrap gap-1 text-sm"
      >
        {breadcrumbs.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <CaretRight
                size={14}
                className="mx-2 text-foreground-tertiary"
                weight="bold"
              />
            )}
            {item.href && !item.current ? (
              <Link
                href={item.href}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary dark:hover:bg-surface-secondary transition-colors duration-150"
              >
                {item.icon}
                <span className="max-w-50 truncate">{item.label}</span>
              </Link>
            ) : (
              <span
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                  item.current
                    ? "text-foreground-primary font-medium bg-primary-100 dark:bg-primary-900/30"
                    : "text-foreground-secondary"
                }`}
              >
                {item.icon}
                <span className="max-w-50 truncate">{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </motion.ol>
    </nav>
  );
}
