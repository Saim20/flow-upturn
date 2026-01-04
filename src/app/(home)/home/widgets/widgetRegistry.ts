import { Calendar, Bell, CheckSquare, FolderOpen, WarningCircle, Briefcase } from "@phosphor-icons/react";
import { WidgetDefinition } from '@/lib/types/widgets';
import AttendanceWidget from './AttendanceWidget';
import NoticesWidget from './NoticesWidget';
import TasksWidget from './TasksWidget';
import ProjectsWidget from './ProjectsWidget';
import StakeholderIssuesWidget from './StakeholderIssuesWidget';
import ServicesWidget from './ServicesWidget';

/**
 * Widget Registry
 * Maps widget types to their definitions and components
 */
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  attendance: {
    type: 'attendance',
    name: 'Attendance',
    description: 'Track your daily attendance with check-in and check-out',
    icon: Calendar,
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'full',
    component: AttendanceWidget as any,
  },
  notices: {
    type: 'notices',
    name: 'News & Reminders',
    description: 'View important company notices and announcements',
    icon: Bell,
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'large',
    component: NoticesWidget as any,
  },
  tasks: {
    type: 'tasks',
    name: 'Tasks',
    description: 'View and manage your assigned tasks',
    icon: CheckSquare,
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'large',
    component: TasksWidget as any,
  },
  projects: {
    type: 'projects',
    name: 'Projects',
    description: 'View your ongoing projects and milestones',
    icon: FolderOpen,
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'large',
    component: ProjectsWidget,
  },
  'stakeholder-issues': {
    type: 'stakeholder-issues',
    name: 'Stakeholder Issues',
    description: 'View and manage stakeholder issues assigned to you',
    icon: WarningCircle,
    defaultSize: 'medium',
    minSize: 'medium',
    maxSize: 'large',
    component: StakeholderIssuesWidget,
  },
  services: {
    type: 'services',
    name: 'Services',
    description: 'Quick access to all available services',
    icon: Briefcase,
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'large',
    component: ServicesWidget,
  },
};

/**
 * Get widget definition by type
 */
export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[type];
}

/**
 * Get all available widget definitions
 */
export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY);
}
