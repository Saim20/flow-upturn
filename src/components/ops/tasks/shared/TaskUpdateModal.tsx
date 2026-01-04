import React, { useState, useEffect } from 'react';
import { BaseModal } from '@/components/ui/modals';
import { FormField, SelectField, TextAreaField, DateField, AssigneeField } from '@/components/forms';
import { validateTask, type TaskData } from '@/lib/validation';
import { useEmployees } from '@/hooks/useEmployees';
import { CheckSquare } from "@phosphor-icons/react";
import { Button } from '@/components/ui/button';

interface TaskUpdateModalProps {
  initialData: TaskData;
  milestoneTitle?: string;
  onSubmit: (data: TaskData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

export default function TaskUpdateModal({
  initialData,
  milestoneTitle,
  onSubmit,
  onClose,
  isLoading = false
}: TaskUpdateModalProps) {
  const [formData, setFormData] = useState<TaskData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isLoading);

  const { employees, loading: employeesLoading, fetchEmployees } = useEmployees();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleInputChange = (field: keyof TaskData, value: any) => {
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

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const validation = validateTask(formData);

      if (!validation.success && validation.errors) {
        const errorMap: Record<string, string> = {};
        validation.errors.forEach(error => {
          errorMap[error.field] = error.message;
        });
        setErrors(errorMap);
        return;
      }

      if (validation.success && validation.data) {
        await onSubmit(validation.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const validation = validateTask(formData);
    return validation.success;
  };

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  return (
    <BaseModal
      data-testid="task-create-modal"
      isOpen={true}
      title="Update Task"
      icon={<CheckSquare size={24} weight="duotone" />}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-6">
        <FormField
          label="Task Title"
          value={formData.task_title}
          onChange={(e) => handleInputChange('task_title', e.target.value)}
          placeholder="Enter task title"
          error={errors.title}
          required
        />

        <TextAreaField
          label="Description"
          value={formData.task_description || ''}
          onChange={(e) => handleInputChange('task_description', e.target.value)}
          placeholder="Enter task description"
          error={errors.description}
          rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateField
            label="Due Date"
            name="due_date"
            value={formData.end_date || ''}
            onChange={(e) => handleInputChange('end_date', e.target.value)}
            error={errors.due_date}
          />

          <SelectField
            label="Priority"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            options={priorityOptions}
            placeholder="Select priority"
            error={errors.priority}
            required
          />
        </div>

        <SelectField
          label="Status"
          value={formData.status ? 'completed' : 'pending'}
          onChange={(e) => handleInputChange('status', e.target.value === 'completed')}
          options={statusOptions}
          placeholder="Select status"
          error={errors.status}
          required
        />

        <AssigneeField
          label="Assignees"
          value={formData.assignees}
          onChange={(assignees) => handleInputChange('assignees', assignees)}
          employees={employees}
          error={errors.assignees}
          disabled={loading || employeesLoading}
          placeholder="Search and select assignees..."
        />

        {formData.milestone_id && (
          <div className="bg-info/10 dark:bg-info/20 border border-info/30 dark:border-info/40 rounded-lg p-4">
            <p className="text-sm text-foreground-primary">
              <strong>Note:</strong> This task is associated with milestone: <span className="font-semibold">{milestoneTitle || `ID ${formData.milestone_id}`}</span>
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-8 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={loading}
          disabled={!isFormValid() || !hasChanges() || isLoading}
        >
          Update Task
        </Button>
      </div>
    </BaseModal>
  );
}
