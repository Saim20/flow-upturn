/**
 * Widget System Type Definitions
 */

import { Icon } from "@phosphor-icons/react";
import { ReactNode } from 'react';

// Widget types available in the system
export type WidgetType = 
  | 'attendance'
  | 'notices'
  | 'tasks'
  | 'projects'
  | 'stakeholder-issues'
  | 'services';

// Widget size options for grid layout
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

// Widget position in grid (row, column)
export interface WidgetPosition {
  row: number;
  col: number;
  width?: number; // Grid width (number of columns)
  height?: number; // Grid height (number of rows)
}

// Widget configuration for individual widget instance
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  position: WidgetPosition;
  size: WidgetSize;
  mobileSize?: WidgetSize; // Separate size for mobile view (affects height only)
  order: number; // Display order
  settings?: Record<string, unknown>; // Widget-specific settings
}

// House page layout configuration
export interface HomeLayoutConfig {
  id?: number;
  employee_id: string;
  company_id: number;
  widgets: WidgetConfig[];
  layout_version: string; // For future migrations
  created_at?: string;
  updated_at?: string;
}

// Widget definition (metadata about widget type)
export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: Icon;
  defaultSize: WidgetSize;
  minSize?: WidgetSize;
  maxSize?: WidgetSize;
  component: React.ComponentType<WidgetProps>;
}

// Props passed to all widget components
export interface WidgetProps {
  config: WidgetConfig;
  isEditMode?: boolean;
  onToggle?: () => void;
  onSizeChange?: (size: WidgetSize) => void;
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
}

// Default widget configuration for new users
export const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'notices-1',
    type: 'notices',
    enabled: true,
    position: { row: 0, col: 8, width: 4, height: 5 },
    size: 'small',
    order: 0,
  },
  {
    id: 'stakeholder-issues-1',
    type: 'stakeholder-issues',
    enabled: true,
    position: { row: 5, col: 4, width: 8, height: 5 },
    size: 'medium',
    order: 1,
  },
  {
    id: 'tasks-1',
    type: 'tasks',
    enabled: true,
    position: { row: 5, col: 0, width: 4, height: 5 },
    size: 'small',
    order: 2,
  },
  {
    id: 'attendance-1',
    type: 'attendance',
    enabled: true,
    position: { row: 0, col: 0, width: 8, height: 5 },
    size: 'medium',
    order: 3,
  },
  {
    id: 'projects-1',
    type: 'projects',
    enabled: true,
    position: { row: 10, col: 0, width: 12, height: 5 },
    size: 'large',
    order: 4,
  },
  {
    id: 'services-1',
    type: 'services',
    enabled: true,
    position: { row: 15, col: 0, width: 12, height: 5 },
    size: 'large',
    order: 5,
  },
];

// Grid layout constants
export const GRID_CONFIG = {
  columns: 2, // 2-column responsive grid
  gap: 6, // Tailwind gap-6
  breakpoints: {
    sm: 1, // 1 column on mobile
    md: 2, // 2 columns on tablet+
    lg: 2, // 2 columns on desktop
    xl: 3, // 3 columns on wide screens
  },
} as const;
