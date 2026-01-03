"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Target, Building, UserCircle, Calendar, Check, X, WarningCircle } from "@phosphor-icons/react";
import {
  validateProject,
  validationErrorsToObject,
} from "@/lib/utils/validation";
import { type MilestoneData } from "@/lib/validation/schemas/advanced";
import { FormField, SelectField, DateField } from "@/components/forms";
import { SingleEmployeeSelector } from "@/components/forms";
import AssigneeSelect from "./AssigneeSelect";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Project, Employee } from "@/lib/types/schemas";
import { Milestone } from "./milestone/MilestoneForm";
import MilestoneList from "./milestone/MilestoneList";
import MilestoneForm from "./milestone/MilestoneForm";
import { useMilestones } from "@/hooks/useMilestones";
import { MilestoneUpdateModal } from "./milestone";
import { fadeInUp } from "@/components/ui/animations";
import { useEmployeeInfo } from "@/hooks/useEmployeeInfo";
import { useAuth } from "@/lib/auth/auth-context";

export type ProjectDetails = Project;

interface ProjectFormProps {
  initialData?: ProjectDetails;
  initialMilestone?: Milestone;
  onSubmit: (data: ProjectDetails, milestones: Milestone[], isDraft?: boolean) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  departments: { id: number; name: string }[];
  mode: "create" | "edit";
  initialMilestones?: Milestone[];
}

const initialProjectDetails: ProjectDetails = {
  project_title: "",
  start_date: "",
  description: "",
  goal: "",
  end_date: "",
  project_lead_id: "",
  department_ids: [],
  status: "Ongoing",
  assignees: [],
  is_draft: false,
};



export default function ProjectForm({
  initialData = initialProjectDetails,
  initialMilestones,
  onSubmit,
  onCancel,
  isSubmitting,
  departments,
  mode,
}: ProjectFormProps) {
  const [projectDetails, setProjectDetails] =
    useState<ProjectDetails>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({}); // track touched fields


  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const { fetchProjectMilestones, updateMilestone } = useMilestones();

  const { employees, fetchEmployeeInfo } = useEmployeeInfo();
  const { user } = useAuth()

  useEffect(() => {
    fetchEmployeeInfo();
  }, [fetchEmployeeInfo]);

  const getTotalMilestoneWeightage = () => {
    return milestones.reduce((sum, m) => sum + m.weightage, 0);
  }

  const initialMilestone: Milestone = {
    milestone_title: "",
    description: "",
    start_date: "",
    end_date: "",
    weightage: 100 - getTotalMilestoneWeightage(),
    status: "Not Started",
    project_id: initialData.id || "",
    assignees: [],
  };

  // Show all active employees in the company (no department filtering)
  const filteredEmployees = employees;

  // Convert projectDetails.assignees (ids) -> employee objects
  const selectedAssigneeObjects: Employee[] = [
    ...(projectDetails.assignees || [])
      .map(id => employees.find(emp => emp.id === id))
      .filter((emp): emp is Employee => !!emp),

    // add project lead if found
    ...(projectDetails.project_lead_id
      ? employees.filter(emp => emp.id === projectDetails.project_lead_id)
      : []),
  ];



  // milestone state
  const [milestone, setMilestone] = useState<Milestone>(initialMilestone);

  useEffect(() => {
    const fetchMilestones = async () => {
      const projectMilestones = await fetchProjectMilestones(initialData.id || "");
      console.log(projectMilestones)
      if (projectMilestones) {
        setMilestones(projectMilestones);
      }
    };

    fetchMilestones();
  }, [initialData.id]);


  const handleAddMilestoneClick = () => {
    // Smart date defaults:
    // - First milestone: use project start/end dates
    // - Subsequent milestones: start from last milestone's end date
    const isFirstMilestone = milestones.length === 0;
    
    let defaultStartDate = "";
    let defaultEndDate = "";
    
    if (isFirstMilestone) {
      defaultStartDate = projectDetails.start_date || "";
      defaultEndDate = projectDetails.end_date || "";
    } else {
      // Find the latest end date among existing milestones
      const sortedByEndDate = [...milestones]
        .filter(m => m.end_date)
        .sort((a, b) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime());
      
      if (sortedByEndDate.length > 0) {
        // Start from the day after the last milestone ends
        const lastEndDate = new Date(sortedByEndDate[0].end_date!);
        lastEndDate.setDate(lastEndDate.getDate() + 1);
        defaultStartDate = lastEndDate.toISOString().split('T')[0];
        // Default end date to project end date
        defaultEndDate = projectDetails.end_date || "";
      }
    }
    
    setMilestone({
      milestone_title: "",
      description: "",
      start_date: defaultStartDate,
      end_date: defaultEndDate,
      weightage: Math.max(1, 100 - getTotalMilestoneWeightage()),
      status: "Not Started",
      project_id: initialData.id || "",
      assignees: [],
    });
    setIsCreatingMilestone(true);
  };


  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // mark as touched
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (name.startsWith("department_")) {
      // department_0, department_1, etc.
      const index = parseInt(name.split("_")[1], 10);
      setProjectDetails((prev: ProjectDetails) => {
        const newDepartments = [...(prev.department_ids || [])];
        newDepartments[index] = Number(value);
        return { ...prev, department_ids: newDepartments };
      });
    } else if (name === "start_date" || name === "end_date") {
      setProjectDetails((prev: ProjectDetails) => ({
        ...prev,
        [name]: new Date(value).toLocaleDateString("sv-SE"),
      }));
    } else {
      setProjectDetails((prev: ProjectDetails) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddAssignee = (id: string) => {
    setProjectDetails((prev: ProjectDetails) => ({
      ...prev,
      assignees: [...(prev.assignees || []), id],
    }));
  };

  const handleRemoveAssignee = (id: string) => {
    setProjectDetails((prev: ProjectDetails) => ({
      ...prev,
      assignees: (prev.assignees || []).filter((a: string) => a !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();

    // mark all fields as touched on submit
    const allFields = Object.keys(projectDetails);
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])));

    // check milestone weightage - only enforce 100% rule when publishing (not saving as draft)
    if (!isDraft && milestones.length > 0) {
      const totalWeightage = milestones.reduce(
        (sum, m) => sum + m.weightage,
        0
      );
      if (totalWeightage !== 100) {
        setErrors({
          milestone_weightage: "Total milestone weightage must equal 100%",
        });
        return;
      }
      console.log(totalWeightage)
    }

    // validate before submit
    const result = validateProject(projectDetails);
    if (!result.success) {
      setErrors(validationErrorsToObject(result.errors));
      return;
    }

    onSubmit(projectDetails, milestones, isDraft);
  };

  const handleSaveAsDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, true);
  };

  useEffect(() => {
    const result = validateProject(projectDetails);

    setErrors((prevErrors) => {
      const fieldErrors: Record<string, string> = {};

      if (!result.success) {
        const newErrors = validationErrorsToObject(result.errors);
        // only keep errors for touched fields
        for (const key in newErrors) {
          if (touched[key]) {
            fieldErrors[key] = newErrors[key];
          }
        }
      }

      // preserve non-field errors
      const nonFieldErrors = Object.fromEntries(
        Object.entries(prevErrors).filter(
          ([key]) => key === "milestone_weightage"
        )
      );

      return { ...fieldErrors, ...nonFieldErrors };
    });

    setIsValid(result.success);
  }, [projectDetails, touched]);


  const handleAddMilestone = (newMilestone: Milestone) => {
    const projectId = initialData.id || ""; // use existing project ID if editing
    // Generate a unique temporary ID for new milestones
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setMilestones((prev) => [
      ...prev,
      { ...newMilestone, project_id: projectId, id: tempId as any },
    ]);
    setIsCreatingMilestone(false);
    // Clear milestone weightage error when milestone is added
    setErrors((prev) => {
      const { milestone_weightage, ...rest } = prev;
      return rest;
    });
  };


  const handleUpdateMilestone = async (updatedMilestone: MilestoneData) => {
    // Ensure weightage is a number before updating
    const milestoneData = {
      ...updatedMilestone,
      weightage: updatedMilestone.weightage ?? 0
    };

    // Use ID for matching, but handle temp IDs (strings starting with 'temp_')
    const isTemporaryMilestone = typeof milestoneData.id === 'string' && String(milestoneData.id).startsWith('temp_');
    
    setMilestones((prev) =>
      prev.map((m) => {
        // Match by ID (works for both DB IDs and temp IDs)
        if (m.id === milestoneData.id) {
          return milestoneData as any;
        }
        return m;
      })
    );

    // Only call updateMilestone API for real DB milestones (not temp ones)
    if (!isTemporaryMilestone && milestoneData.id) {
      await updateMilestone(milestoneData.id as number, milestoneData);
    }

    setSelectedMilestone(null);
    // Clear milestone weightage error when milestone is updated
    setErrors((prev) => {
      const { milestone_weightage, ...rest } = prev;
      return rest;
    });
  };


  const handleDeleteMilestone = (milestone_title: string) => {
    setMilestones((prev) => prev.filter((m) => m.milestone_title !== milestone_title));
    // Clear milestone weightage error when milestone is deleted
    setErrors((prev) => {
      const { milestone_weightage, ...rest } = prev;
      return rest;
    });
  };

  // Distribute weightage evenly among all milestones
  const handleDistributeEvenly = () => {
    if (milestones.length === 0) return;
    
    const evenWeightage = Math.floor(100 / milestones.length);
    const remainder = 100 - (evenWeightage * milestones.length);
    
    setMilestones((prev) =>
      prev.map((m, index) => ({
        ...m,
        // Give the remainder to the first milestone(s)
        weightage: evenWeightage + (index < remainder ? 1 : 0),
      }))
    );
    
    // Clear any weightage errors
    setErrors((prev) => {
      const { milestone_weightage, ...rest } = prev;
      return rest;
    });
  };

  // Copy a milestone
  const handleCopyMilestone = (milestone: Milestone) => {
    const baseName = milestone.milestone_title?.split(' (Copy')[0] || '';
    const copyNumber = milestones.filter(m => 
      m.milestone_title?.startsWith(baseName)
    ).length;
    
    // Generate a unique temporary ID for new milestones (negative to distinguish from DB IDs)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const copiedMilestone: Milestone = {
      ...milestone,
      id: tempId as any, // Temporary unique ID for local state management
      milestone_title: `${baseName} (Copy${copyNumber > 0 ? ` ${copyNumber}` : ''})`,
      weightage: Math.min(milestone.weightage, Math.max(1, 100 - getTotalMilestoneWeightage())),
    };
    
    setMilestones((prev) => [...prev, copiedMilestone]);
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={(e) => {
      const target = e.target as HTMLElement;
      if (e.key === "Enter" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
      }
    }} className="space-y-6 relative">
      {isSubmitting && (
        <div className="absolute inset-0 bg-surface-primary/50 flex items-center justify-center z-50">
          <LoadingSpinner />
        </div>
      )}

      {/* errors */}


      {/* Project fields */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <FormField
          name="project_title"
          label="Project Name"
          value={projectDetails.project_title || ""}
          onChange={handleInputChange}
          error={errors.project_title}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium text-foreground-primary dark:text-foreground-primary mb-1">
          Description
        </label>
        <textarea
          name="description"
          onChange={handleInputChange}
          value={projectDetails.description}
          className={`p-3 w-full h-32 rounded-md border-2 bg-surface-primary dark:bg-surface-primary text-foreground-primary dark:text-foreground-primary
    ${errors.description
              ? "border-error/50 ring-1 ring-error/50 focus:ring-error focus:border-error bg-error/5"
              : "border-border-primary dark:border-border-primary"
            }
    focus:ring-primary-500 focus:border-primary-500 focus:outline-none
  `}
        />


        {errors.description && (
          <motion.p
            id={`${name}-error`}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="mt-1 text-sm text-error"
          >
            {errors.description}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <FormField
          name="goal"
          label="Goal"
          value={projectDetails.goal || ""}
          onChange={handleInputChange}
          error={errors.goal}
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-foreground-primary dark:text-foreground-primary mb-1">
            Departments
          </label>

          <div className="flex flex-col gap-2">
            {projectDetails.department_ids && projectDetails.department_ids.map((deptId, index) => (
              <div key={index} className="flex items-center gap-2">
                <SelectField
                  name={`department_${index}`}
                  value={deptId.toString()}
                  onChange={(e) => {
                    const newDeptId = Number(e.target.value);
                    setProjectDetails((prev) => {
                      const newDepartments = [...(prev.department_ids || [])];
                      newDepartments[index] = newDeptId;
                      return { ...prev, department_ids: newDepartments };
                    });
                  }}
                  options={departments.map((dept) => ({
                    value: dept.id.toString(),
                    label: dept.name,
                  }))}
                  placeholder="Select Department"
                />
                <button
                  type="button"
                  onClick={() =>
                    setProjectDetails((prev) => {
                      const newDepartments = [...(prev.department_ids || [])];
                      newDepartments.splice(index, 1);
                      return { ...prev, department_ids: newDepartments };
                    })
                  }
                  className="text-error p-1 rounded bg-error/10 dark:bg-error/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setProjectDetails((prev) => ({
                  ...prev,
                  department_ids: [...(prev.department_ids || []), 0],
                }))
              }
              className="mt-1 px-3 py-1 bg-background-tertiary dark:bg-background-tertiary text-foreground-primary dark:text-foreground-primary rounded-md hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors w-fit"
            >
              + Add Department
            </button>
          </div>

          {errors.department_ids && (
            <p className="mt-1 text-sm text-error">{errors.department_ids}</p>
          )}
        </motion.div>


        <SingleEmployeeSelector
          value={projectDetails.project_lead_id || ""}
          onChange={(value) => {
            setTouched((prev) => ({ ...prev, project_lead_id: true }));
            setProjectDetails((prev) => ({ ...prev, project_lead_id: value }));
          }}
          employees={filteredEmployees}
          label="Project Lead"
          error={errors.project_lead_id}
          placeholder="Search and select project lead..."
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DateField
          name="start_date"
          label="Start Date"
          value={projectDetails.start_date || ""}
          onChange={handleInputChange}
          error={errors.start_date}
        />

        <DateField
          name="end_date"
          label="End Date"
          value={projectDetails.end_date || ""}
          onChange={handleInputChange}
          error={errors.end_date}
          min={projectDetails.start_date || ""}
          readOnly={!projectDetails.start_date}
        />
      </div>

      <AssigneeSelect
        employees={filteredEmployees}
        selectedAssignees={projectDetails.assignees || []}
        onAddAssignee={handleAddAssignee}
        onRemoveAssignee={handleRemoveAssignee}
        excludeIds={[projectDetails.project_lead_id || ""]}
      />

      {/* Milestones */}
      <MilestoneList
        milestones={milestones}
        onEdit={(milestone_title) => {
          console.log(milestones)
          const milestoneToUpdate = milestones.find((m) => m.milestone_title === milestone_title);
          if (milestoneToUpdate) {
            setSelectedMilestone(milestoneToUpdate);
          }
        }}
        onDelete={handleDeleteMilestone}
        onAdd={handleAddMilestoneClick}
        onCopy={handleCopyMilestone}
        onDistributeEvenly={handleDistributeEvenly}
        employees={selectedAssigneeObjects}
      />


      {isCreatingMilestone && (
        <MilestoneForm
          milestone={milestone}
          onSubmit={handleAddMilestone}
          onCancel={() => setIsCreatingMilestone(false)}
          employees={selectedAssigneeObjects}
          currentMilestones={milestones}
          currentWeightage={getTotalMilestoneWeightage()}
          mode="create"
          isSubmitting={isSubmitting}
          projectStartDate={projectDetails.start_date}
          projectEndDate={projectDetails.end_date}
        />
      )}

      {selectedMilestone && (
        <MilestoneUpdateModal
          initialData={selectedMilestone}
          onSubmit={handleUpdateMilestone}
          onClose={() => setSelectedMilestone(null)}
          currentTotalWeightage={getTotalMilestoneWeightage() - (selectedMilestone.weightage || 0)}
          projectStartDate={projectDetails.start_date}
          projectEndDate={projectDetails.end_date}
          employees={selectedAssigneeObjects}
        />
      )}

      {errors.milestone_weightage && (
        <div className="bg-error/10 border border-error/30 dark:bg-error/20 p-4 rounded-md mb-4">
          <p className="text-error flex items-center">
            {errors.milestone_weightage}
          </p>
        </div>
      )}

      {/* Draft indicator */}
      {initialData?.is_draft && (
        <div className="bg-warning/10 border border-warning/30 dark:bg-warning/20 p-4 rounded-md mb-4">
          <p className="text-warning-700 dark:text-warning-300 flex items-center">
            <WarningCircle size={18} className="mr-2" />
            This project is a draft. Publish it to notify assigned team members.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-4 mt-8">
        {onCancel && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
            onClick={onCancel}
            className="px-5 py-2 border border-border-primary dark:border-border-primary rounded-md text-foreground-primary dark:text-foreground-primary bg-surface-primary dark:bg-surface-primary hover:bg-surface-hover dark:hover:bg-surface-hover shadow-sm transition-colors duration-150 flex items-center"
          >
            <X size={16} className="mr-2" />
            Cancel
          </motion.button>
        )}

        {/* Save as Draft button */}
        <motion.button
          type="button"
          onClick={handleSaveAsDraft}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isSubmitting}
          className={`border border-primary-500 text-primary-700 dark:text-primary-300 py-2 px-5 rounded-md font-medium shadow-sm flex items-center transition-all duration-150 ${isSubmitting
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-primary-50 dark:hover:bg-primary-900/20"
            }`}
          data-testid="save-draft-button"
        >
          <FileText size={16} className="mr-2" />
          {initialData?.is_draft ? "Update Draft" : "Save as Draft"}
        </motion.button>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isSubmitting}
          className={`bg-primary-800 text-white py-2 px-5 rounded-md font-medium shadow-sm flex items-center transition-all duration-150 ${isSubmitting
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-primary-900 active:bg-primary-950"
            }`}
          data-testid={mode === "create" ? "create-project-button" : "update-project-button"}
        >
          <Check size={16} className="mr-2" />
          {mode === "create" ? "Create Project" : (initialData?.is_draft ? "Publish Project" : "Update Project")}

        </motion.button>
      </div>
    </form>
  );
}
