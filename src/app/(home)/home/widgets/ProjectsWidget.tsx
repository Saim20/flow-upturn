'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Clock, ArrowsClockwise, Plus } from "@phosphor-icons/react";
import SectionHeader from '@/app/(home)/home/components/SectionHeader';
import LoadingSection from '@/app/(home)/home/components/LoadingSection';
import EmptyState from '@/app/(home)/home/components/EmptyState';
import BaseWidget from './BaseWidget';
import { WidgetProps } from '@/lib/types/widgets';
import { useProjects } from '@/hooks/useProjects';
import { formatDateToDayMonth } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import NoPermissionMessage from '@/components/ui/NoPermissionMessage';

export default function ProjectsWidget({ config, isEditMode, onToggle, onSizeChange }: WidgetProps) {
  const router = useRouter();
  const { canRead, canWrite, employeeInfo } = useAuth();
  const { fetchOngoingProjects, ongoingProjects, ongoingLoading } = useProjects();
  const [loading, setLoading] = useState(true);

  // Check permissions
  const canViewProjects = canRead('projects');
  const canCreateProjects = canWrite('projects');

  useEffect(() => {
    const loadProjects = async () => {
      // Wait for employeeInfo to be available before fetching
      if (!employeeInfo) {
        return; // Keep loading state until employeeInfo is available
      }
      if (!canViewProjects) {
        setLoading(false);
        return;
      }
      setLoading(true);
      await fetchOngoingProjects(5, true); // Fetch 5 most recent ongoing projects
      setLoading(false);
    };
    loadProjects();
  }, [fetchOngoingProjects, canViewProjects, employeeInfo]);

  const handleRefresh = async () => {
    await fetchOngoingProjects(5, true);
  };

  const handleProjectClick = () => {
    router.push(`/ops/project`);
  };

  const handleCreateProject = () => {
    router.push('/ops/project');
  };

  return (
    <BaseWidget config={config} isEditMode={isEditMode} onToggle={onToggle} onSizeChange={onSizeChange}>
      <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary h-full flex flex-col overflow-hidden">
        <div className="p-5 shrink-0">
          <SectionHeader title="My Projects" icon={FolderOpen} iconColor="text-primary-600" />
        </div>
        
        {!canViewProjects ? (
          <NoPermissionMessage moduleName="projects" />
        ) : loading || ongoingLoading ? (
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <LoadingSection text="Loading projects..." icon={FolderOpen} />
          </div>
        ) : (
          <div
            className="px-5 pb-5 flex-1 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-sm font-medium text-foreground-secondary">Ongoing Projects</h3>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                  onClick={handleRefresh}
                  className="rounded-full p-2 bg-surface-secondary hover:bg-surface-hover transition-colors"
                >
                  <ArrowsClockwise size={16} className="text-foreground-secondary" />
                </motion.button>
                {canCreateProjects && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateProject}
                    className="rounded-full p-2 bg-primary-600 hover:bg-primary-700 transition-colors"
                    title="Create new project"
                  >
                    <Plus size={16} className="text-white" />
                  </motion.button>
                )}
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
              {ongoingProjects.length > 0 ? (
                ongoingProjects.slice(0, 5).map((project) => (
                    <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    onClick={handleProjectClick}
                    className="flex items-center justify-between px-4 py-3 bg-surface-secondary hover:bg-surface-hover rounded-lg transition-colors text-sm font-medium border border-border-primary cursor-pointer"
                    >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0"></div>
                      <span className="truncate text-foreground-primary">{project.project_title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Clock size={14} className="text-foreground-tertiary" />
                      <span className="whitespace-nowrap text-foreground-secondary text-xs">
                      {formatDateToDayMonth(project.end_date)}
                      </span>
                    </div>
                    </motion.div>
                ))
              ) : (
                <EmptyState 
                  icon={FolderOpen} 
                  message="No ongoing projects at this time" 
                />
              )}
            </div>

            {ongoingProjects.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push('/ops/project')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all projects →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
