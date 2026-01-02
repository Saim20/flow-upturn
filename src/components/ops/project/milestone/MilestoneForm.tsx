"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, MagnifyingGlass, WarningCircle, X, Check, Target } from "@phosphor-icons/react";
import { Milestone } from "@/lib/types/schemas";
import { FormField, DateField } from "@/components/forms";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { matchesEmployeeSearch } from "@/lib/utils/user-search";

export type { Milestone };

interface MilestoneFormProps {
  milestone: Milestone;
  isSubmitting: boolean;
  onSubmit: (milestone: Milestone) => void;
  onCancel: () => void;
  employees: { id: string; name: string; email?: string; designation?: string }[];
  currentMilestones: Milestone[];
  mode: "create" | "edit";
  currentWeightage: number;
  projectStartDate?: string;
  projectEndDate?: string;
}

export const validateMilestone = (
  milestone: Milestone,
  currentMilestones: Milestone[]
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!milestone.milestone_title) errors.milestone_title = "Title is required";
  if (!milestone.start_date) errors.start_date = "Start date is required";
  if (!milestone.end_date) errors.end_date = "End date is required";
  if (!milestone.status) errors.status = "Status is required";
  if (!milestone.weightage) errors.weightage = "Weightage is required";

  if (milestone.start_date && milestone.end_date) {
    const start = new Date(milestone.start_date);
    const end = new Date(milestone.end_date);
    if (end < start) {
      errors.end_date = "End date must be after start date";
    }
  }

  const totalExistingWeightage = currentMilestones
    .filter((m) => m.milestone_title !== milestone.milestone_title)
    .reduce((sum, m) => sum + m.weightage, 0);

  const remainingWeightage = 100 - totalExistingWeightage;

  if (milestone.weightage > remainingWeightage) {
    errors.weightage = `Weightage cannot exceed ${remainingWeightage}%`;
  }

  return errors;
};

export default function MilestoneForm({
  milestone,
  isSubmitting,
  onSubmit,
  onCancel,
  employees,
  currentMilestones,
  mode,
  currentWeightage,
  projectStartDate,
  projectEndDate,
}: MilestoneFormProps) {
  const [milestoneData, setMilestoneData] = useState<Milestone>(milestone);
  const [milestoneAssignees, setMilestoneAssignees] = useState<string[]>(
    milestone.assignees || []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "start_date") {
      setMilestoneData((prev) => {
        const newData = { ...prev, start_date: value };
        // If start date is after end date, adjust end date to match
        if (value && prev.end_date && new Date(value) > new Date(prev.end_date)) {
          newData.end_date = value;
        }
        return newData;
      });
    } else if (name === "end_date") {
      setMilestoneData((prev) => ({
        ...prev,
        end_date: value,
      }));
    } else if (name === "weightage") {
      setMilestoneData((prev) => ({
        ...prev,
        [name]: value ? parseInt(value) : 0,
      }));
    } else {
      setMilestoneData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      matchesEmployeeSearch(emp, searchTerm) &&
      !milestoneAssignees.includes(emp.id)
  );

  const handleAddAssignee = (id: string) => {
    setMilestoneAssignees((prev) => [...prev, id]);
    setSearchTerm("");
    setDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveAssignee = (id: string) => {
    setMilestoneAssignees((prev) => prev.filter((a) => a !== id));
  };

  const handleSubmit = () => {
    const validationErrors = validateMilestone(
      { ...milestoneData, assignees: milestoneAssignees },
      currentMilestones
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    milestoneData.status = "Not Started"; // Default status for new milestones

    onSubmit({ ...milestoneData, assignees: milestoneAssignees });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-primary p-6 rounded-lg w-full max-w-md max-h-[calc(100vh-4rem)] overflow-y-auto relative shadow-xl"
      >
        {isSubmitting && (
          <div className="absolute inset-0 bg-surface-primary/50 backdrop-blur-sm flex items-center justify-center z-50">
            <LoadingSpinner />
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <Target size={24} className="text-foreground-secondary" strokeWidth={2} />
          <h2 className="text-xl font-semibold text-foreground-primary">
            {mode === "create" ? "Add Milestone" : "Update Milestone"}
          </h2>
        </div>

        {/* removed <form>, replaced with <div> */}
        <div className="space-y-4">
          <FormField
            name="milestone_title"
            label="Milestone Title"
            value={milestoneData.milestone_title || ""}
            onChange={handleChange}
            error={errors.milestone_title}
          />

          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Description
            </label>
            <textarea
              name="description"
              onChange={handleChange}
              value={milestoneData.description || ""}
              className="w-full h-32 rounded-md border border-border-secondary shadow-sm focus:border-border-secondary focus:ring focus:ring-gray-200 focus:ring-opacity-50 bg-background-secondary dark:bg-background-tertiary p-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DateField
              name="start_date"
              label="Start Date"
              value={milestoneData.start_date || ""}
              onChange={handleChange}
              error={errors.start_date}
              min={projectStartDate || undefined}
              max={projectEndDate || undefined}
            />

            <DateField
              name="end_date"
              label="End Date"
              value={milestoneData.end_date || ""}
              onChange={handleChange}
              error={errors.end_date}
              min={milestoneData.start_date || projectStartDate || undefined}
              max={projectEndDate || undefined}
              readOnly={!milestoneData.start_date}
            />
          </div>

          {/* Project date hint */}
          {(projectStartDate || projectEndDate) && (
            <p className="text-xs text-foreground-tertiary -mt-2">
              Project timeline: {projectStartDate || 'N/A'} to {projectEndDate || 'N/A'}
            </p>
          )}

          {/* <FormSelectField
            name="status"
            label="Status"
            icon={<Target size={16} className="text-foreground-tertiary" strokeWidth={2} />}
            value={milestoneData.status || ""}
            onChange={handleChange}
            error={errors.status}
            options={[
              { value: "Not Started", label: "Not Started" },
              { value: "In Progress", label: "In Progress" },
              { value: "Completed", label: "Completed" },
            ]}
            placeholder="Select status"
          /> */}

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-foreground-secondary mb-1">
              <Target size={14} className="text-foreground-tertiary" strokeWidth={2} />
              Weightage (%)
            </label>
            <input
              name="weightage"
              type="number"
              onChange={handleChange}
              value={milestoneData.weightage?.toString() || ""}
              min="1"
              max={
                100 -
                currentMilestones
                  .filter((m) => m.project_id !== milestoneData.project_id)
                  .reduce((sum, m) => sum + m.weightage, 0)
              }
              className="w-full rounded-md border border-border-secondary shadow-sm focus:border-border-secondary focus:ring focus:ring-gray-200 focus:ring-opacity-50 bg-background-secondary dark:bg-background-tertiary p-3"
            />
            {errors.weightage && (
              <p className="mt-1 text-error text-sm flex items-center">
                <WarningCircle size={14} className="mr-1" strokeWidth={2} />
                {errors.weightage}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-foreground-secondary mb-1">
              <Users size={14} className="text-foreground-tertiary" strokeWidth={2} />
              Assignees
            </label>

            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                placeholder="Search for assignees..."
                className="w-full rounded-md border border-border-secondary shadow-sm focus:border-border-secondary focus:ring focus:ring-gray-200 focus:ring-opacity-50 bg-background-secondary dark:bg-background-tertiary p-3 pr-10"
              />
              <MagnifyingGlass
                size={16}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary"
              />

              <AnimatePresence>
                {dropdownOpen && filteredEmployees.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 mt-1 w-full bg-surface-primary border border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredEmployees.map((emp) => (
                      <motion.li
                        key={emp.id}
                        onClick={() => handleAddAssignee(emp.id)}
                        whileHover={{ backgroundColor: "#f3f4f6" }}
                        className="cursor-pointer px-4 py-2 hover:bg-background-secondary dark:bg-background-tertiary text-sm text-foreground-secondary"
                      >
                        {emp.name}
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              <AnimatePresence>
                {milestoneAssignees.map((assignee) => {
                  const emp = employees.find((e) => e.id === assignee);
                  return (
                    <motion.span
                      key={assignee}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {emp?.name}
                      <button
                        type="button"
                        className="ml-2 text-foreground-tertiary hover:text-foreground-secondary"
                        onClick={() => handleRemoveAssignee(assignee)}
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </motion.span>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              aria-label="Cancel"
              className="flex items-center px-4 py-2 bg-background-tertiary dark:bg-surface-secondary border border-border-primary rounded-md text-foreground-secondary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transition-colors duration-150 shadow-sm"
              onClick={onCancel}
            >
              <X size={16} className="mr-2" strokeWidth={2} />
              Cancel
            </motion.button>

            <motion.button
            data-testid="milestone-submit-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              aria-label={mode === "create" ? "Add milestone" : "Update milestone"}
              onClick={handleSubmit}
              className="flex items-center px-4 py-2 bg-primary-600 rounded-md text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transition-colors duration-150 shadow-sm"
            >
              <Check size={16} className="mr-2" strokeWidth={2} />
              {mode === "create" ? "Add Milestone" : "Update Milestone"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
