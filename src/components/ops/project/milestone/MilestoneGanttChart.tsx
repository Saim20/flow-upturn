"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Milestone, Project } from "@/lib/types/schemas";
import { 
  CalendarBlank, 
  Clock, 
  CheckCircle, 
  Warning, 
  Hourglass,
  Info,
  ArrowRight
} from "@phosphor-icons/react";
import { formatDate } from "@/lib/utils";

interface MilestoneGanttChartProps {
  milestones: Milestone[];
  project: Project;
}

interface GanttMilestone extends Milestone {
  startOffset: number; // percentage from left
  width: number; // percentage width
  isOverdue: boolean;
  daysRemaining: number;
  daysTotal: number;
  progressDays: number;
}

type MilestoneStatus = "Completed" | "In Progress" | "Not Started";

const statusConfig: Record<MilestoneStatus, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  barBgColor: string;
  icon: React.ReactNode;
  label: string;
}> = {
  "Completed": {
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    borderColor: "border-emerald-400 dark:border-emerald-600",
    barBgColor: "bg-emerald-500 dark:bg-emerald-600",
    icon: <CheckCircle size={14} weight="fill" />,
    label: "Completed"
  },
  "In Progress": {
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
    borderColor: "border-amber-400 dark:border-amber-600",
    barBgColor: "bg-amber-500 dark:bg-amber-600",
    icon: <Hourglass size={14} weight="fill" />,
    label: "In Progress"
  },
  "Not Started": {
    color: "text-slate-600 dark:text-slate-300",
    bgColor: "bg-slate-200 dark:bg-slate-700/50",
    borderColor: "border-slate-400 dark:border-slate-500",
    barBgColor: "bg-slate-400 dark:bg-slate-500",
    icon: <Clock size={14} />,
    label: "Not Started"
  }
};

// Parse date string in various formats (ISO, "4 January, 2026", etc.)
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Try ISO format first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try "D Month, YYYY" format (e.g., "4 January, 2026")
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  
  const match = dateStr.match(/^(\d{1,2})\s+(\w+),?\s+(\d{4})$/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthIndex = monthNames.indexOf(match[2].toLowerCase());
    const year = parseInt(match[3], 10);
    
    if (monthIndex !== -1) {
      date = new Date(year, monthIndex, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Fallback to current date
  return new Date();
}

const MilestoneGanttChart: React.FC<MilestoneGanttChartProps> = ({
  milestones,
  project
}) => {
  const [hoveredMilestone, setHoveredMilestone] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; showBelow?: boolean }>({ x: 0, y: 0 });

  // Helper to format date for display
  const formatDateShort = (dateStr: string): string => {
    try {
      const date = parseDate(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Calculate project timeline boundaries
  const { projectStart, projectEnd, totalDays, ganttMilestones, monthMarkers } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse project dates using robust parser
    const pStart = parseDate(project.start_date || "");
    const pEnd = parseDate(project.end_date || "");
    pStart.setHours(0, 0, 0, 0);
    pEnd.setHours(0, 0, 0, 0);

    // Find actual min/max from milestones to ensure all are visible
    let minDate = pStart;
    let maxDate = pEnd;

    milestones.forEach(m => {
      const mStart = parseDate(m.start_date);
      const mEnd = parseDate(m.end_date);
      mStart.setHours(0, 0, 0, 0);
      mEnd.setHours(0, 0, 0, 0);
      if (mStart < minDate) minDate = mStart;
      if (mEnd > maxDate) maxDate = mEnd;
    });

    const totalMs = maxDate.getTime() - minDate.getTime();
    const total = Math.max(Math.ceil(totalMs / (1000 * 60 * 60 * 24)), 1);

    // Calculate position and width for each milestone
    const gantt: GanttMilestone[] = milestones.map(m => {
      const mStart = parseDate(m.start_date);
      const mEnd = parseDate(m.end_date);
      mStart.setHours(0, 0, 0, 0);
      mEnd.setHours(0, 0, 0, 0);

      const startDays = Math.floor((mStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const durationDays = Math.max(Math.ceil((mEnd.getTime() - mStart.getTime()) / (1000 * 60 * 60 * 24)), 1);
      
      const startOffset = (startDays / total) * 100;
      const width = Math.max((durationDays / total) * 100, 2); // Minimum 2% width for visibility

      const isOverdue = m.status !== "Completed" && mEnd < today;
      const daysRemaining = Math.ceil((mEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const progressDays = Math.ceil((today.getTime() - mStart.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...m,
        startOffset,
        width,
        isOverdue,
        daysRemaining,
        daysTotal: durationDays,
        progressDays: Math.max(0, Math.min(progressDays, durationDays))
      };
    });

    // Generate smart time markers based on project duration
    const markers: { label: string; position: number; isMinor?: boolean }[] = [];
    
    if (total <= 14) {
      // For projects <= 2 weeks: Show every day
      const current = new Date(minDate);
      
      while (current <= maxDate) {
        const daysSinceStart = Math.floor((current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const position = (daysSinceStart / total) * 100;
        const isMonday = current.getDay() === 1;
        const isFirstOfMonth = current.getDate() === 1;
        
        if (position >= 0 && position <= 100) {
          markers.push({
            label: current.toLocaleDateString('en-US', { 
              month: isFirstOfMonth ? 'short' : undefined, 
              day: 'numeric' 
            }),
            position,
            isMinor: !isMonday && !isFirstOfMonth
          });
        }
        
        current.setDate(current.getDate() + 1);
      }
    } else if (total <= 31) {
      // For projects <= 1 month: Show every 2-3 days
      const current = new Date(minDate);
      let dayCount = 0;
      
      while (current <= maxDate) {
        const daysSinceStart = Math.floor((current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const position = (daysSinceStart / total) * 100;
        const isFirstOfMonth = current.getDate() === 1;
        const showDay = dayCount % 2 === 0 || isFirstOfMonth; // Every 2 days or first of month
        
        if (position >= 0 && position <= 100 && showDay) {
          markers.push({
            label: current.toLocaleDateString('en-US', { 
              month: isFirstOfMonth ? 'short' : undefined, 
              day: 'numeric' 
            }),
            position,
            isMinor: !isFirstOfMonth && current.getDay() !== 1
          });
        }
        
        current.setDate(current.getDate() + 1);
        dayCount++;
      }
    } else if (total <= 90) {
      // For projects <= 3 months: Show weekly markers with day numbers
      const current = new Date(minDate);
      
      while (current <= maxDate) {
        const daysSinceStart = Math.floor((current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const position = (daysSinceStart / total) * 100;
        const isFirstOfMonth = current.getDate() === 1;
        const isMonday = current.getDay() === 1;
        
        if (position >= 0 && position <= 100 && (isMonday || isFirstOfMonth)) {
          markers.push({
            label: current.toLocaleDateString('en-US', { 
              month: isFirstOfMonth ? 'short' : undefined, 
              day: 'numeric' 
            }),
            position,
            isMinor: !isFirstOfMonth
          });
        }
        
        current.setDate(current.getDate() + 1);
      }
    } else {
      // For longer projects: Show bi-weekly or monthly markers
      const current = new Date(minDate);
      current.setDate(1); // Start from first of month
      
      while (current <= maxDate) {
        const daysSinceStart = Math.floor((current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const position = (daysSinceStart / total) * 100;
        
        if (position >= 0 && position <= 100) {
          markers.push({
            label: current.toLocaleDateString('en-US', { month: 'short', year: total > 365 ? '2-digit' : undefined }),
            position
          });
        }
        
        // For 90-180 days, also add mid-month marker
        if (total <= 180) {
          const midMonth = new Date(current);
          midMonth.setDate(15);
          const midDays = Math.floor((midMonth.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
          const midPosition = (midDays / total) * 100;
          
          if (midPosition >= 0 && midPosition <= 100 && midMonth <= maxDate) {
            markers.push({
              label: '15',
              position: midPosition,
              isMinor: true
            });
          }
        }
        
        current.setMonth(current.getMonth() + 1);
      }
    }

    return {
      projectStart: minDate,
      projectEnd: maxDate,
      totalDays: total,
      ganttMilestones: gantt,
      monthMarkers: markers
    };
  }, [milestones, project]);

  // Calculate today marker position
  const todayPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.floor((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    const position = (daysSinceStart / totalDays) * 100;
    return position >= 0 && position <= 100 ? position : null;
  }, [projectStart, totalDays]);

  const handleMouseEnter = (milestoneId: number, event: React.MouseEvent) => {
    setHoveredMilestone(milestoneId);
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const tooltipHeight = 250; // Approximate tooltip height
    const tooltipWidth = 280; // Approximate tooltip width
    
    // Check available space above and below
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    
    // Prefer showing above, but show below if not enough space above and more space below
    const showBelow = spaceAbove < tooltipHeight && spaceBelow > spaceAbove;
    
    // Clamp X position to keep tooltip within viewport
    let xPos = rect.left + rect.width / 2;
    xPos = Math.max(tooltipWidth / 2 + 10, xPos); // Don't go off left edge
    xPos = Math.min(viewportWidth - tooltipWidth / 2 - 10, xPos); // Don't go off right edge
    
    setTooltipPosition({
      x: xPos,
      y: showBelow ? rect.bottom + 5 : rect.top - 5,
      showBelow
    });
  };

  const handleMouseLeave = () => {
    setHoveredMilestone(null);
  };

  if (milestones.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarBlank size={20} className="text-primary-600" />
          <h3 className="text-lg font-semibold text-foreground-primary">
            Project Timeline
          </h3>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${config.barBgColor}`} />
              <span className="text-foreground-secondary">{config.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500 dark:bg-red-600" />
            <span className="text-foreground-secondary">Overdue</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative bg-background-secondary dark:bg-surface-secondary rounded-lg border border-border-primary overflow-hidden">
        {/* Date markers - matching the row layout exactly */}
        <div className="flex items-start gap-3 h-10 border-b border-border-primary bg-background-tertiary/50 overflow-hidden px-4">
          {/* Spacer for label column - matches milestone label width */}
          <div className="shrink-0 w-48 min-w-0 flex items-center">
            <span className="text-md p-2 text-foreground-tertiary">Timeline</span>
          </div>
          {/* Timeline area with markers - matches bar container */}
          <div className="relative flex-1 h-full overflow-hidden">
            {monthMarkers.map((marker, idx) => (
              <div
                key={idx}
                className={`absolute top-0 h-full flex items-end pb-1 ${marker.isMinor ? 'opacity-60' : ''}`}
                style={{ left: `${marker.position}%` }}
              >
                <div className={`h-full w-px ${marker.isMinor ? 'bg-border-primary/30' : 'bg-border-secondary/50'}`} />
                <span className={`whitespace-nowrap ml-0.5 text-[15px] text-foreground-secondary`}>
                  {marker.label}
                </span>
              </div>
            ))}
          </div>
        </div>



        {/* Gantt Bars */}
        <div className="relative min-h-50 px-4 py-4 space-y-4">
          {ganttMilestones.map((milestone, index) => {
            const status = milestone.status as MilestoneStatus;
            const config = statusConfig[status] || statusConfig["Not Started"];
            const isHovered = hoveredMilestone === milestone.id;
            const isOverdue = milestone.isOverdue;

            return (
              <motion.div
                key={milestone.id ?? index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Gantt Bar Row with label */}
                <div className="flex items-start gap-3">
                  {/* Milestone Label - Left side, flexible width */}
                  <div className="shrink-0 w-48 min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground-primary line-clamp-2 leading-tight" title={milestone.milestone_title}>
                      {milestone.milestone_title}
                    </span>
                    <span className="text-xs text-foreground-tertiary whitespace-nowrap">
                      {milestone.weightage}%
                    </span>
                  </div>

                  {/* Bar container */}
                  <div className="relative h-12 bg-slate-100 dark:bg-slate-800/50 rounded-md overflow-visible flex-1">
                  {/* Today marker - only on first row */}
                  {index === 0 && todayPosition !== null && (
                    <div
                      className="absolute -top-2 bottom-0 w-0.5 bg-error z-20 pointer-events-none"
                      style={{ left: `${todayPosition}%`, height: `calc(100% + ${(ganttMilestones.length - 1) * 64 + 16}px)` }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-error text-white text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                        Today
                      </div>
                    </div>
                  )}
                  {/* Milestone Bar */}
                  <motion.div
                    className={`absolute top-0.5 bottom-0.5 rounded-md cursor-pointer transition-all duration-200 shadow-sm ${
                      isOverdue 
                        ? "bg-red-500 dark:bg-red-600" 
                        : config.barBgColor
                    } ${isHovered ? "ring-2 ring-primary-500 ring-offset-1 ring-offset-background-primary" : ""}`}
                    style={{
                      left: `${milestone.startOffset}%`,
                      width: `${milestone.width}%`,
                      minWidth: "80px"
                    }}
                    onMouseEnter={(e) => milestone.id && handleMouseEnter(milestone.id, e)}
                    onMouseLeave={handleMouseLeave}
                    whileHover={{ scale: 1.02 }}
                  >
                    {/* Progress indicator for In Progress milestones */}
                    {status === "In Progress" && !isOverdue && milestone.progressDays > 0 && (
                      <div 
                        className="absolute top-0 left-0 bottom-0 bg-amber-600 dark:bg-amber-500 rounded-l-md opacity-70"
                        style={{ 
                          width: `${Math.min((milestone.progressDays / milestone.daysTotal) * 100, 100)}%` 
                        }}
                      />
                    )}

                    {/* Bar Content - vertical stack for better space usage */}
                    <div className="relative h-full flex flex-col justify-center px-2 gap-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 text-white min-w-0">
                          <span className="shrink-0">
                            {isOverdue ? <Warning size={12} weight="fill" /> : config.icon}
                          </span>
                          {milestone.width > 10 && (
                            <span className="text-[11px] font-medium truncate drop-shadow-sm">
                              {milestone.milestone_title}
                            </span>
                          )}
                        </div>
                        {milestone.width > 8 && (
                          <span className="text-[10px] text-white/90 whitespace-nowrap drop-shadow-sm shrink-0">
                            {milestone.daysTotal}d
                          </span>
                        )}
                      </div>
                      {/* Show dates on bar when there's space */}
                      {milestone.width > 20 && (
                        <div className="text-[9px] text-white/80 truncate drop-shadow-sm">
                          {formatDateShort(milestone.start_date)} - {formatDateShort(milestone.end_date)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Date range footer - matching the row layout exactly */}
        <div className="flex items-start gap-3 border-t border-border-primary bg-background-tertiary/30 text-xs text-foreground-tertiary px-4 py-2">
          {/* Label column */}
          <div className="shrink-0 w-48 min-w-0 flex items-center">
            <span className="flex items-center gap-1">
              <ArrowRight size={12} />
              {totalDays} days
            </span>
          </div>
          {/* Date range - matches bar container */}
          <div className="flex-1 flex justify-between">
            <span>{formatDate(projectStart.toISOString())}</span>
            <span>{formatDate(projectEnd.toISOString())}</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredMilestone !== null && (
        <MilestoneTooltip
          milestone={ganttMilestones.find(m => m.id === hoveredMilestone)!}
          position={tooltipPosition}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<CalendarBlank size={18} />}
          label="Total Duration"
          value={`${totalDays} days`}
          color="text-primary-600"
        />
        <SummaryCard
          icon={<CheckCircle size={18} />}
          label="Completed"
          value={`${ganttMilestones.filter(m => m.status === "Completed").length}/${ganttMilestones.length}`}
          color="text-success"
        />
        <SummaryCard
          icon={<Hourglass size={18} />}
          label="In Progress"
          value={`${ganttMilestones.filter(m => m.status === "In Progress").length}`}
          color="text-warning"
        />
        <SummaryCard
          icon={<Warning size={18} />}
          label="Overdue"
          value={`${ganttMilestones.filter(m => m.isOverdue).length}`}
          color="text-error"
        />
      </div>
    </div>
  );
};

// Tooltip Component
interface TooltipProps {
  milestone: GanttMilestone;
  position: { x: number; y: number; showBelow?: boolean };
}

const MilestoneTooltip: React.FC<TooltipProps> = ({ milestone, position }) => {
  if (!milestone) return null;
  
  const status = milestone.status as MilestoneStatus;
  const config = statusConfig[status] || statusConfig["Not Started"];

  return (
    <motion.div
      initial={{ opacity: 0, y: position.showBelow ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position.showBelow ? -10 : 10 }}
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x,
        top: position.showBelow ? position.y + 10 : position.y - 10,
        transform: position.showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)"
      }}
    >
      <div className="bg-surface-primary dark:bg-surface-secondary border border-border-primary rounded-lg shadow-lg p-3 min-w-55">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-foreground-primary text-sm">
            {milestone.milestone_title}
          </h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.barBgColor} text-white flex items-center gap-1`}>
            {config.icon}
            {config.label}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-foreground-tertiary">Duration:</span>
            <span className="text-foreground-secondary font-medium">
              {formatDate(milestone.start_date)} - {formatDate(milestone.end_date)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-foreground-tertiary">Weight:</span>
            <span className="text-foreground-secondary font-medium">{milestone.weightage}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-foreground-tertiary">Total Days:</span>
            <span className="text-foreground-secondary font-medium">{milestone.daysTotal} days</span>
          </div>

          {milestone.status !== "Completed" && (
            <div className="flex items-center justify-between">
              <span className="text-foreground-tertiary">
                {milestone.isOverdue ? "Overdue by:" : "Days Remaining:"}
              </span>
              <span className={`font-medium ${milestone.isOverdue ? "text-error" : "text-foreground-secondary"}`}>
                {milestone.isOverdue 
                  ? `${Math.abs(milestone.daysRemaining)} days` 
                  : `${milestone.daysRemaining} days`}
              </span>
            </div>
          )}

          {milestone.description && (
            <p className="text-foreground-tertiary mt-2 pt-2 border-t border-border-primary">
              {milestone.description}
            </p>
          )}
        </div>

        {/* Overdue Warning */}
        {milestone.isOverdue && (
          <div className="mt-2 pt-2 border-t border-border-primary flex items-center gap-1.5 text-error">
            <Warning size={14} weight="fill" />
            <span className="text-xs font-medium">This milestone is overdue!</span>
          </div>
        )}

        {/* Arrow - points up if showing below, down if showing above */}
        {position.showBelow ? (
          <div className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-border-primary" />
          </div>
        ) : (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border-primary" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Summary Card Component
interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-background-secondary dark:bg-surface-secondary rounded-lg border border-border-primary p-3">
    <div className="flex items-center gap-2 mb-1">
      <span className={color}>{icon}</span>
      <span className="text-xs text-foreground-tertiary">{label}</span>
    </div>
    <p className="text-lg font-semibold text-foreground-primary">{value}</p>
  </div>
);

export default MilestoneGanttChart;
