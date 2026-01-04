'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FloppyDisk, ArrowCounterClockwise, Eye, EyeSlash, DotsNine, CaretUp as ChevronUp, CaretDown as ChevronDown } from "@phosphor-icons/react";
import { WidgetConfig, WidgetSize } from '@/lib/types/widgets';
import { getWidgetDefinition } from '@/app/(home)/home/widgets/widgetRegistry';

interface WidgetCustomizationPanelProps {
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
  onCancel: () => void;
  onReset: () => void;
  saving: boolean;
  isMobile?: boolean;
}

// Desktop size options (affects width and positioning)
const desktopSizeOptions: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'full', label: 'Full Width' },
];

// Mobile size options (only affects height, no "Full Width")
const mobileSizeOptions: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'Compact' },
  { value: 'medium', label: 'Normal' },
  { value: 'large', label: 'Expanded' },
];

export default function WidgetCustomizationPanel({
  widgets,
  onSave,
  onCancel,
  onReset,
  saving,
  isMobile = false,
}: WidgetCustomizationPanelProps) {
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(widgets);
  const [hasChanges, setHasChanges] = useState(false);

  // Select appropriate size options based on device
  const sizeOptions = useMemo(() => 
    isMobile ? mobileSizeOptions : desktopSizeOptions
  , [isMobile]);

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  useEffect(() => {
    const changed = JSON.stringify(localWidgets) !== JSON.stringify(widgets);
    setHasChanges(changed);
  }, [localWidgets, widgets]);

  // Handle ESC key to close panel and set modal state on body
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hasChanges) {
          if (confirm('You have unsaved changes. Are you sure you want to close?')) {
            onCancel();
          }
        } else {
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-modal-open', 'true');
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('data-modal-open');
    };
  }, [hasChanges, onCancel]);

  const toggleWidget = (widgetId: string) => {
    setLocalWidgets(prev =>
      prev.map(w =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  // Get height for a given size
  const getSizeHeight = (size: WidgetSize): number => {
    switch (size) {
      case 'small': return 5;
      case 'medium': return 5;
      case 'large': return 5;
      case 'full': return 6;
      default: return 5;
    }
  };

  // Get width for a given size
  const getSizeWidth = (size: WidgetSize): number => {
    switch (size) {
      case 'small': return 4;
      case 'medium': return 6;
      case 'large': return 12;
      case 'full': return 12;
      default: return 6;
    }
  };

  const updateWidgetSize = (widgetId: string, size: WidgetSize) => {
    setLocalWidgets(prev =>
      prev.map(w => {
        if (w.id !== widgetId) return w;
        
        // On mobile, only update the mobileSize property (affects mobile height only)
        // This doesn't impact desktop layout which uses size and position dimensions
        if (isMobile) {
          return { ...w, mobileSize: size };
        }
        
        // On desktop, update both size and position dimensions to keep them in sync
        const newHeight = getSizeHeight(size);
        const newWidth = getSizeWidth(size);
        
        return {
          ...w,
          size,
          position: w.position 
            ? { ...w.position, width: newWidth, height: newHeight }
            : { row: 0, col: 0, width: newWidth, height: newHeight }
        };
      })
    );
  };

  const moveWidgetUp = (index: number) => {
    if (index === 0) return;
    
    const newWidgets = [...localWidgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index - 1];
    newWidgets[index - 1] = temp;
    
    // Update order
    newWidgets.forEach((w, i) => {
      w.order = i;
    });
    
    setLocalWidgets(newWidgets);
  };

  const moveWidgetDown = (index: number) => {
    if (index === localWidgets.length - 1) return;
    
    const newWidgets = [...localWidgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index + 1];
    newWidgets[index + 1] = temp;
    
    // Update order
    newWidgets.forEach((w, i) => {
      w.order = i;
    });
    
    setLocalWidgets(newWidgets);
  };

  const handleSave = () => {
    onSave(localWidgets);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default layout? This cannot be undone.')) {
      onReset();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (hasChanges) {
        if (confirm('You have unsaved changes. Are you sure you want to close?')) {
          onCancel();
        }
      } else {
        onCancel();
      }
    }
  };

  const enabledCount = localWidgets.filter(w => w.enabled).length;
  const totalCount = localWidgets.length;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-primary rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border-primary flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground-primary truncate">Customize Dashboard</h2>
            <p className="text-xs sm:text-sm text-foreground-tertiary mt-1">
              {enabledCount} of {totalCount} widgets enabled · Show/hide, resize, and reorder
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={24} className="text-foreground-tertiary" />
          </button>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 p-3 bg-primary-50 border border-primary-100 rounded-lg dark:bg-primary-950/20 dark:border-primary-900/30">
            <p className="text-xs sm:text-sm text-primary-800 dark:text-primary-300">
              <strong>💡 Tip:</strong> Use the arrows to reorder widgets, toggle visibility with the eye icon, and adjust sizes with the dropdown.
            </p>
          </div>
          
          <div className="space-y-3">
            {localWidgets.map((widget, index) => {
              const definition = getWidgetDefinition(widget.type);
              if (!definition) return null;

              const Icon = definition.icon;

              return (
                <motion.div
                  key={widget.id}
                  layout
                  className={`border rounded-lg p-3 sm:p-4 transition-all ${
                    widget.enabled
                      ? 'border-border-primary bg-surface-primary'
                      : 'border-border-primary bg-background-secondary opacity-60'
                  }`}
                >
                  {/* Mobile Layout: Two rows for better visibility */}
                  <div className="sm:hidden">
                    {/* Top row: Icon, Name, Toggle */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg shrink-0 ${widget.enabled ? 'bg-primary-50 dark:bg-primary-950/20' : 'bg-background-tertiary'}`}>
                        <Icon size={20} className={widget.enabled ? 'text-primary-600 dark:text-primary-400' : 'text-foreground-tertiary'} />
                      </div>
                      <h3 className="font-medium text-sm text-foreground-primary flex-1">{definition.name}</h3>
                      <button
                        onClick={() => toggleWidget(widget.id)}
                        className={`p-2 rounded-lg transition-colors shrink-0 ${
                          widget.enabled
                            ? 'bg-success/10 hover:bg-success/20 text-success dark:bg-success/20 dark:hover:bg-success/30'
                            : 'bg-background-tertiary hover:bg-surface-hover text-foreground-tertiary'
                        }`}
                        aria-label={widget.enabled ? 'Hide widget' : 'Show widget'}
                      >
                        {widget.enabled ? <Eye size={18} /> : <EyeSlash size={18} />}
                      </button>
                    </div>
                    {/* Bottom row: Reorder buttons, Size selector */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-secondary">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveWidgetUp(index)}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-surface-hover rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp size={18} className="text-foreground-tertiary" />
                        </button>
                        <button
                          onClick={() => moveWidgetDown(index)}
                          disabled={index === localWidgets.length - 1}
                          className="p-1.5 hover:bg-surface-hover rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown size={18} className="text-foreground-tertiary" />
                        </button>
                        <span className="text-xs text-foreground-tertiary ml-1">Reorder</span>
                      </div>
                      <select
                        value={widget.mobileSize || widget.size}
                        onChange={(e) => updateWidgetSize(widget.id, e.target.value as WidgetSize)}
                        disabled={!widget.enabled}
                        className="px-3 py-1.5 border border-border-secondary rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-surface-primary"
                      >
                        {sizeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Desktop Layout: Single row */}
                  <div className="hidden sm:flex items-center gap-4">
                    {/* Drag Handle & Reorder Buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveWidgetUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-surface-hover rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronUp size={16} className="text-foreground-tertiary" />
                      </button>
                      <DotsNine size={16} className="text-foreground-tertiary" />
                      <button
                        onClick={() => moveWidgetDown(index)}
                        disabled={index === localWidgets.length - 1}
                        className="p-1 hover:bg-surface-hover rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronDown size={16} className="text-foreground-tertiary" />
                      </button>
                    </div>

                    {/* Widget Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${widget.enabled ? 'bg-primary-50 dark:bg-primary-950/20' : 'bg-background-tertiary'}`}>
                        <Icon size={18} className={widget.enabled ? 'text-primary-600 dark:text-primary-400' : 'text-foreground-tertiary'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base text-foreground-primary truncate">{definition.name}</h3>
                        <p className="text-sm text-foreground-tertiary truncate">{definition.description}</p>
                      </div>
                    </div>

                    {/* Size Selector */}
                    <select
                      value={widget.size}
                      onChange={(e) => updateWidgetSize(widget.id, e.target.value as WidgetSize)}
                      disabled={!widget.enabled}
                      className="px-3 py-2 border border-border-secondary rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed shrink-0 bg-surface-primary"
                    >
                      {sizeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {/* Toggle Button */}
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        widget.enabled
                          ? 'bg-success/10 hover:bg-success/20 text-success dark:bg-success/20 dark:hover:bg-success/30'
                          : 'bg-background-tertiary hover:bg-surface-hover text-foreground-tertiary'
                      }`}
                      aria-label={widget.enabled ? 'Hide widget' : 'Show widget'}
                    >
                      {widget.enabled ? <Eye size={18} /> : <EyeSlash size={18} />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border-primary bg-background-secondary flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-hover rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowCounterClockwise size={16} />
            <span className="hidden sm:inline">Reset to Default</span>
            <span className="sm:hidden">Reset</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex-1 sm:flex-none px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <FloppyDisk size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
