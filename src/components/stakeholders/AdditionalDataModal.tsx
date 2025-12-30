"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, TrashSimple, FloppyDisk, CaretDown, CaretRight, CheckSquare, MapPin } from "@phosphor-icons/react";
import { StakeholderStepData, StakeholderProcessStep } from "@/lib/types/schemas";

interface AdditionalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => Promise<void>;
  stepData?: StakeholderStepData[]; // Completed step data to select from
  processSteps?: StakeholderProcessStep[]; // Process steps for context
  existingData?: Record<string, any>; // Existing additional data for editing
  title?: string;
}

interface DataField {
  key: string;
  value: any;
  label: string;
  fieldKey: string; // Original field key
  sourceStep?: string; // Which step this data came from
  stepOrder?: number; // For ordering steps
}

interface StepGroup {
  stepName: string;
  stepOrder: number;
  fields: DataField[];
}

// Helper to convert snake_case or camelCase to human-readable labels
const toHumanReadable = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Handle camelCase
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
};

// Helper to detect if a value looks like coordinates
const isCoordinates = (value: any): { lat: number; lng: number } | null => {
  // Handle object with lat/lng or latitude/longitude
  if (typeof value === "object" && value !== null) {
    const lat = value.lat ?? value.latitude ?? value.Lat ?? value.Latitude;
    const lng = value.lng ?? value.lon ?? value.longitude ?? value.Lng ?? value.Lon ?? value.Longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  }
  
  // Handle string like "23.8103, 90.4125" or "23.8103,90.4125"
  if (typeof value === "string") {
    const match = value.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  
  return null;
};

// Helper to check if field key suggests it's a location field
const isLocationField = (key: string): boolean => {
  const locationKeywords = ['location', 'coordinates', 'lat', 'lng', 'latitude', 'longitude', 'geo', 'position', 'coords'];
  const lowerKey = key.toLowerCase();
  return locationKeywords.some(keyword => lowerKey.includes(keyword));
};

// Helper to format values for display
const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (value instanceof Date) return value.toLocaleDateString();
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map(item => formatDisplayValue(item)).join(", ");
  }
  
  // Handle objects (not file objects)
  if (typeof value === "object" && value !== null) {
    // Skip file objects
    if ('path' in value) return "[File]";
    
    // Check for coordinates
    const coords = isCoordinates(value);
    if (coords) {
      return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    }
    
    // Try to extract meaningful info from object
    if ('name' in value) return String(value.name);
    if ('label' in value) return String(value.label);
    if ('title' in value) return String(value.title);
    // Return a summary of keys
    const keys = Object.keys(value);
    if (keys.length === 0) return "—";
    return keys.map(k => `${toHumanReadable(k)}: ${formatDisplayValue(value[k])}`).join(", ");
  }
  
  // Handle string values
  if (typeof value === "string") {
    // Check if it's coordinates string
    const coords = isCoordinates(value);
    if (coords) {
      return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    }
    
    // Check if it looks like a date string
    if (!isNaN(Date.parse(value)) && value.includes("-") && value.length >= 10) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    // Check if it's a snake_case status-like value (e.g., in_progress, not_started)
    if (/^[a-z]+(_[a-z]+)+$/.test(value)) {
      return toHumanReadable(value);
    }
    
    // Check if it's a camelCase value
    if (/^[a-z]+([A-Z][a-z]+)+$/.test(value)) {
      return toHumanReadable(value);
    }
  }
  
  return String(value);
};

// Component to render value with optional maps link
const ValueDisplay = ({ value, fieldKey }: { value: any; fieldKey?: string }) => {
  const coords = isCoordinates(value);
  const showMapsLink = coords || (fieldKey && isLocationField(fieldKey) && isCoordinates(value));
  
  if (coords) {
    const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    return (
      <span className="inline-flex items-center gap-2 flex-wrap">
        <span>{formatDisplayValue(value)}</span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
        >
          <MapPin size={12} />
          Open in Maps
        </a>
      </span>
    );
  }
  
  return <span>{formatDisplayValue(value)}</span>;
};

export default function AdditionalDataModal({
  isOpen,
  onClose,
  onSave,
  stepData = [],
  processSteps = [],
  existingData = {},
  title = "Select Additional Data",
}: AdditionalDataModalProps) {
  const [selectedFields, setSelectedFields] = useState<DataField[]>([]);
  const [customFields, setCustomFields] = useState<DataField[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Initialize with existing data if editing
  useEffect(() => {
    if (Object.keys(existingData).length > 0) {
      const fields = Object.entries(existingData).map(([key, value]) => ({
        key,
        value,
        label: toHumanReadable(key),
        fieldKey: key,
      }));
      setCustomFields(fields);
    }
  }, [existingData]);

  // Build available fields grouped by step
  const stepGroups = useMemo(() => {
    const groups: Map<string, StepGroup> = new Map();
    
    stepData.forEach((sd) => {
      if (!sd.is_completed || !sd.data) return;
      
      const step = processSteps.find((s) => s.id === sd.step_id);
      const stepName = step?.name || `Step ${step?.step_order || "?"}`;
      const stepOrder = step?.step_order || 0;
      
      if (!groups.has(stepName)) {
        groups.set(stepName, {
          stepName,
          stepOrder,
          fields: [],
        });
      }
      
      const group = groups.get(stepName)!;
      
      Object.entries(sd.data).forEach(([key, value]) => {
        // Skip file fields
        if (typeof value === 'object' && value !== null && 'path' in value) {
          return;
        }
        
        // Get the field label from field definitions if available
        const fieldDef = step?.field_definitions?.fields?.find((f) => f.key === key);
        const fieldLabel = fieldDef?.label || toHumanReadable(key);
        
        group.fields.push({
          key: `${stepName}_${key}`,
          value,
          label: fieldLabel,
          fieldKey: key,
          sourceStep: stepName,
          stepOrder,
        });
      });
    });
    
    // Sort groups by step order and return as array
    return Array.from(groups.values()).sort((a, b) => a.stepOrder - b.stepOrder);
  }, [stepData, processSteps]);

  // Expand all steps by default when modal opens
  useEffect(() => {
    if (isOpen && stepGroups.length > 0) {
      setExpandedSteps(new Set(stepGroups.map(g => g.stepName)));
    }
  }, [isOpen, stepGroups]);

  const toggleStepExpansion = (stepName: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepName)) {
        next.delete(stepName);
      } else {
        next.add(stepName);
      }
      return next;
    });
  };

  const selectAllFromStep = (stepGroup: StepGroup) => {
    const newFields = stepGroup.fields.filter(
      field => !selectedFields.some(f => f.key === field.key)
    );
    setSelectedFields([...selectedFields, ...newFields]);
  };

  const deselectAllFromStep = (stepGroup: StepGroup) => {
    setSelectedFields(
      selectedFields.filter(f => f.sourceStep !== stepGroup.stepName)
    );
  };

  const isStepFullySelected = (stepGroup: StepGroup) => {
    return stepGroup.fields.every(field => 
      selectedFields.some(f => f.key === field.key)
    );
  };

  const isStepPartiallySelected = (stepGroup: StepGroup) => {
    const selectedCount = stepGroup.fields.filter(field => 
      selectedFields.some(f => f.key === field.key)
    ).length;
    return selectedCount > 0 && selectedCount < stepGroup.fields.length;
  };

  const handleAddField = (field: DataField) => {
    // Don't add if already selected
    if (selectedFields.some((f) => f.key === field.key)) {
      return;
    }
    setSelectedFields([...selectedFields, field]);
  };

  const handleRemoveField = (key: string) => {
    setSelectedFields(selectedFields.filter((f) => f.key !== key));
  };

  const handleAddCustomField = () => {
    const newField: DataField = {
      key: `custom_field_${Date.now()}`,
      value: "",
      label: "New Field",
      fieldKey: `custom_${Date.now()}`,
    };
    setCustomFields([...customFields, newField]);
  };

  const handleUpdateCustomField = (index: number, updates: Partial<DataField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    setCustomFields(updated);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build structured data object with step groupings
      const data: Record<string, any> = {};
      
      // Group selected fields by step for better organization
      const stepGroupedFields = selectedFields.reduce((acc, field) => {
        const stepKey = field.sourceStep || "General";
        if (!acc[stepKey]) {
          acc[stepKey] = {};
        }
        // Use human-readable label as key
        acc[stepKey][field.label] = field.value;
        return acc;
      }, {} as Record<string, Record<string, any>>);
      
      // Add step-grouped data
      Object.entries(stepGroupedFields).forEach(([stepName, fields]) => {
        data[stepName] = fields;
      });
      
      // Add custom fields under "Custom Data" section
      if (customFields.length > 0) {
        const customData: Record<string, any> = {};
        customFields.forEach((field) => {
          if (field.label.trim() && field.value !== undefined && field.value !== "") {
            customData[field.label] = field.value;
          }
        });
        if (Object.keys(customData).length > 0) {
          data["Custom Data"] = customData;
        }
      }
      
      await onSave(data);
      onClose();
    } catch (error) {
      console.error("Error saving additional data:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-surface-primary rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-primary">
          <h2 className="text-lg sm:text-xl font-bold text-foreground-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-foreground-tertiary hover:text-foreground-secondary transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Available Fields from Steps - Grouped by Step */}
          {stepGroups.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground-primary mb-3">
                Select from Completed Steps
              </h3>
              <div className="space-y-3">
                {stepGroups.map((stepGroup) => {
                  const isExpanded = expandedSteps.has(stepGroup.stepName);
                  const isFullySelected = isStepFullySelected(stepGroup);
                  const isPartiallySelected = isStepPartiallySelected(stepGroup);
                  const selectedCount = stepGroup.fields.filter(field => 
                    selectedFields.some(f => f.key === field.key)
                  ).length;

                  return (
                    <div
                      key={stepGroup.stepName}
                      className="border border-border-primary rounded-lg overflow-hidden"
                    >
                      {/* Step Header */}
                      <div
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          isFullySelected
                            ? "bg-success/10 dark:bg-success/20"
                            : isPartiallySelected
                              ? "bg-primary-50 dark:bg-primary-900/20"
                              : "bg-background-secondary hover:bg-surface-hover"
                        }`}
                        onClick={() => toggleStepExpansion(stepGroup.stepName)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <CaretDown size={18} className="text-foreground-secondary" />
                          ) : (
                            <CaretRight size={18} className="text-foreground-secondary" />
                          )}
                          <span className="font-medium text-foreground-primary">
                            {stepGroup.stepName}
                          </span>
                          <span className="text-xs text-foreground-tertiary">
                            ({selectedCount}/{stepGroup.fields.length} selected)
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isFullySelected) {
                              deselectAllFromStep(stepGroup);
                            } else {
                              selectAllFromStep(stepGroup);
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                            isFullySelected
                              ? "text-success hover:bg-success/10 dark:hover:bg-success/20"
                              : "text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30"
                          }`}
                        >
                          <CheckSquare size={14} />
                          {isFullySelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      {/* Step Fields */}
                      {isExpanded && (
                        <div className="border-t border-border-primary p-3 bg-surface-primary">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {stepGroup.fields.map((field) => {
                              const isSelected = selectedFields.some((f) => f.key === field.key);
                              return (
                                <button
                                  key={field.key}
                                  onClick={() => {
                                    if (isSelected) {
                                      handleRemoveField(field.key);
                                    } else {
                                      handleAddField(field);
                                    }
                                  }}
                                  className={`text-left p-3 rounded-lg border transition-all ${
                                    isSelected
                                      ? "border-success bg-success/10 dark:bg-success/20 ring-1 ring-success"
                                      : "border-border-secondary hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs sm:text-sm font-medium text-foreground-primary">
                                        {field.label}
                                      </p>
                                      <p className="text-xs sm:text-sm text-foreground-tertiary mt-1 truncate">
                                        {formatDisplayValue(field.value)}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-success text-white rounded-full text-xs">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Fields Summary - Grouped by Step */}
          {selectedFields.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground-primary mb-3">
                Selected Fields ({selectedFields.length})
              </h3>
              <div className="space-y-3">
                {/* Group selected fields by step */}
                {Array.from(
                  selectedFields.reduce((acc, field) => {
                    const stepName = field.sourceStep || "General";
                    if (!acc.has(stepName)) {
                      acc.set(stepName, []);
                    }
                    acc.get(stepName)!.push(field);
                    return acc;
                  }, new Map<string, DataField[]>())
                ).map(([stepName, fields]) => (
                  <div key={stepName} className="bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800 overflow-hidden">
                    <div className="px-3 py-2 bg-primary-100 dark:bg-primary-900/40 border-b border-primary-200 dark:border-primary-800">
                      <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">
                        {stepName}
                      </span>
                    </div>
                    <div className="p-3 space-y-2">
                      {fields.map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center justify-between p-2 bg-surface-primary rounded-lg"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-xs sm:text-sm font-medium text-foreground-primary">
                              {field.label}
                            </p>
                            <p className="text-xs text-foreground-tertiary truncate">
                              {formatDisplayValue(field.value)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveField(field.key)}
                            className="shrink-0 p-1 text-error hover:text-error hover:bg-error/10 dark:hover:bg-error/20 rounded transition-colors"
                          >
                            <TrashSimple size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-foreground-primary">
                Custom Fields
              </h3>
              <button
                onClick={handleAddCustomField}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus size={16} />
                Add Field
              </button>
            </div>
            <div className="space-y-3">
              {customFields.length === 0 ? (
                <p className="text-xs sm:text-sm text-foreground-tertiary text-center py-6 bg-background-secondary rounded-lg border-2 border-dashed border-border-secondary">
                  No custom fields added. Click "Add Field" to create one.
                </p>
              ) : (
                customFields.map((field, index) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-3 bg-background-secondary rounded-lg border border-border-primary"
                  >
                    <div>
                      <label className="block text-xs font-medium text-foreground-secondary mb-1">
                        Field Label
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          handleUpdateCustomField(index, { label: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-border-secondary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-surface-primary text-foreground-primary"
                        placeholder="Field name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-secondary mb-1">
                        Value
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) =>
                            handleUpdateCustomField(index, { value: e.target.value })
                          }
                          className="flex-1 px-3 py-2 text-sm border border-border-secondary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-surface-primary text-foreground-primary"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => handleRemoveCustomField(index)}
                          className="shrink-0 px-2 text-error hover:text-error transition-colors"
                        >
                          <TrashSimple size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-border-primary">
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 text-sm border border-border-secondary text-foreground-secondary rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (selectedFields.length === 0 && customFields.length === 0)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FloppyDisk size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
