import React, { useState, useEffect } from 'react';
import { BaseModal } from '@/components/ui/modals';
import { FormField, SelectField, TextAreaField, DateField, NumberField, AssigneeField } from '@/components/forms';
import { validateMilestone, type MilestoneData } from '@/lib/validation';
import { Employee } from '@/lib/types/schemas';
import { Target } from "@phosphor-icons/react";
import { Button } from '@/components/ui/button';

interface MilestoneCreateModalProps {
  currentTotalWeightage: number;
  projectId: string;
  onSubmit: (data: MilestoneData) => void;
  onClose: () => void;
  isLoading?: boolean;
  employees: Employee[];
}

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function MilestoneCreateModal({
  currentTotalWeightage,
  projectId,
  onSubmit,
  onClose,
  isLoading = false,
  employees,
}: MilestoneCreateModalProps) {
  const [formData, setFormData] = useState<MilestoneData>({
    milestone_title: '',
    description: '',
    start_date: '',
    end_date: '',
    weightage: 100 - currentTotalWeightage,
    status: 'not_started',
    project_id: projectId,
    assignees: []
  });
  console.log(formData)
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof MilestoneData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
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

  const getMaxWeightage = () => {
    return 100 - currentTotalWeightage;
  };

  const getWeightageError = () => {
    const maxWeightage = getMaxWeightage();
    if (formData.weightage != null && formData.weightage > maxWeightage) {
      return `Weightage cannot exceed ${maxWeightage}% (Current total: ${currentTotalWeightage}%)`;
    }
    return undefined;
  };

  return (
    <BaseModal
      isOpen={true}
      title="Create Milestone"
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
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Enter milestone description"
          error={errors.description}
          rows={3}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateField
            label="Start Date"
            name="start_date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            error={errors.start_date}
            required
          />

          <DateField
            label="End Date"
            name="end_date"
            value={formData.end_date}
            onChange={(e) => handleInputChange('end_date', e.target.value)}
            error={errors.end_date}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumberField
            label="Weightage (%)"
            name="weightage"
            value={formData.weightage ?? 0}
            onChange={(value) => handleInputChange('weightage', value)}
            min={0}
            max={getMaxWeightage()}
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

        <AssigneeField
          label="Assignees"
          value={formData.assignees || []}
          onChange={(assignees) => handleInputChange('assignees', assignees)}
          employees={employees}
          error={errors.assignees}
          disabled={isLoading}
          placeholder="Search and select assignees..."
        />

        {currentTotalWeightage > 0 && (
          <div className="bg-info/10 dark:bg-info/20 border border-info/30 dark:border-info/40 rounded-lg p-4">
            <p className="text-sm text-foreground-primary dark:text-foreground-primary">
              <strong>Current Project Weightage:</strong> {currentTotalWeightage}%
              <br />
              <strong>Available Weightage:</strong> {getMaxWeightage()}%
            </p>
          </div>
        )}
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
          disabled={!isFormValid() || !!getWeightageError() || isLoading}
        >
          Create Milestone
        </Button>
      </div>
    </BaseModal>
  );
}
