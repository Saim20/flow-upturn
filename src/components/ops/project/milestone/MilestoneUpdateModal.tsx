import React, { useState, useEffect } from 'react';
import { BaseModal } from '@/components/ui/modals';
import { FormField, SelectField, TextAreaField, DateField, NumberField, AssigneeField } from '@/components/forms';
import { validateMilestone, type MilestoneData } from '@/lib/validation';
import { Employee } from '@/lib/types/schemas';
import { Target } from "@phosphor-icons/react";
import { Button } from '@/components/ui/button';

// Allow partial employee objects with at minimum id and name
type EmployeeBasic = Pick<Employee, 'id' | 'name'> & Partial<Employee>;

interface MilestoneUpdateModalProps {
  currentTotalWeightage: number;
  initialData: MilestoneData;
  onSubmit: (data: MilestoneData) => void;
  onClose: () => void;
  isLoading?: boolean;
  projectStartDate?: string;
  projectEndDate?: string;
  employees: EmployeeBasic[];
}

const statusOptions = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
];

export default function MilestoneUpdateModal({
  currentTotalWeightage,
  initialData,
  onSubmit,
  onClose,
  isLoading = false,
  projectStartDate,
  projectEndDate,
  employees,
}: MilestoneUpdateModalProps) {
  const [formData, setFormData] = useState<MilestoneData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function formatDateForInput(date: string | Date | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    // Use local time to get YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    setFormData(initialData);
    console.log("initial data in modal", initialData)
    setFormData({
      ...initialData,
      start_date: formatDateForInput(initialData.start_date),
      end_date: formatDateForInput(initialData.end_date),
    });
  }, [initialData]);



  const handleInputChange = (field: keyof MilestoneData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If start date is set after end date, adjust end date to match
      if (field === 'start_date' && value && prev.end_date && new Date(value) > new Date(prev.end_date)) {
        newData.end_date = value;
      }
      
      return newData;
    });

    // Clear error when user starts typing
    const fieldKey = field as string;
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    console.log(formData)
    const validation = validateMilestone(formData);

    if (!validation.success && validation.errors) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      return;
    }

    if (validation.success && validation.data) {
      onSubmit(validation.data);
    }
  };

  const isFormValid = () => {
    const validation = validateMilestone(formData);
    return validation.success;
  };

  const hasChanges = () => {
    // Compare only the fields that matter, avoiding circular references
    const fieldsToCompare = [
      'milestone_title',
      'description',
      'start_date',
      'end_date',
      'status',
      'weightage',
    ];
    
    return fieldsToCompare.some(field => {
      const key = field as keyof MilestoneData;
      return formData[key] !== initialData[key];
    }) || JSON.stringify(formData.assignees) !== JSON.stringify(initialData.assignees);
  };

  const getMaxWeightage = () => {
    // For updates, we need to account for the current milestone's weightage
    return 100 - (currentTotalWeightage);
  };

  const getWeightageError = () => {
    const maxWeightage = getMaxWeightage() + (initialData.weightage || 0);
    if (formData.weightage != null && formData.weightage > maxWeightage) {
      return `Weightage cannot exceed ${maxWeightage}% (Available: ${getMaxWeightage()}% + Current: ${initialData.weightage}%)`;
    }
    if (formData.weightage != null && formData.weightage < 1) {
      return 'Weightage must be at least 1%';
    }
    return undefined;
  };


  return (
    <BaseModal
      isOpen={true}
      title="Update Milestone"
      icon={<Target size={24} weight="duotone" />}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-6">
        <FormField
          label="Milestone Title"
          value={formData.milestone_title}
          onChange={(e) => handleInputChange('milestone_title', e.target.value)}
          placeholder="Enter milestone title"
          error={errors.milestone_title}
          required
        />

        <TextAreaField
          label="Description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Enter milestone description"
          error={errors.description}
          rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumberField
            label="Weightage (%)"
            name="weightage"
            value={formData.weightage ?? 0}
            onChange={(e) => handleInputChange('weightage', Number(e.target.value))}
            min={1}
            max={getMaxWeightage() + (initialData.weightage || 0)}
            error={errors.weightage || getWeightageError()}
            placeholder="Enter weightage percentage"
            required
          />

          <SelectField
            label="Status"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            options={statusOptions}
            placeholder="Select status"
            error={errors.status}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateField
            label="Start Date"
            name="start_date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            error={errors.start_date}
            required
            min={projectStartDate}
            max={projectEndDate}
          />

          <DateField
            label="End Date"
            name="end_date"
            value={formData.end_date}
            onChange={(e) => handleInputChange('end_date', e.target.value)}
            error={errors.end_date}
            required
            min={formData.start_date || projectStartDate}
            max={projectEndDate}
          />
        </div>

        {/* Project date hint */}
        {(projectStartDate || projectEndDate) && (
          <p className="text-xs text-foreground-tertiary -mt-2">
            Project timeline: {projectStartDate || 'N/A'} to {projectEndDate || 'N/A'}
          </p>
        )}




        <AssigneeField
          label="Assignees"
          value={formData.assignees || []}
          onChange={(assignees) => handleInputChange('assignees', assignees)}
          employees={employees as Employee[]}
          error={errors.assignees}
          disabled={isLoading}
          placeholder="Search and select assignees..."
        />

        {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Current Project Weightage:</strong> {currentTotalWeightage}%
            <br />
            <strong>Available Weightage:</strong> {getMaxWeightage()}%
            <br />
            <strong>Original Milestone Weightage:</strong> {initialData.weightage}%
          </p>
        </div> */}
      </div>



      <div className="flex justify-end mt-8 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!hasChanges() || isLoading}
        >
          Update Milestone
        </Button>
      </div>
    </BaseModal>
  );
}
