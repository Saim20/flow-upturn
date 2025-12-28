"use client";

"use client";

import { Department } from "@/hooks/useDepartments";
import { Division } from "@/hooks/useDivisions";
import { PencilSimple, TrashSimple, Building, User, Stack, FileText, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeIn, fadeInUp } from "@/components/ui/animations";
import { Employee } from "@/lib/types/schemas";

interface DepartmentDetailsModalProps {
  department: Department;
  divisions: Division[];
  onClose: () => void;
  editDepartment: () => void;
  deleteDepartment: () => void;
  employees: Employee[];
}

export default function DepartmentDetailsModal({
  department,
  onClose,
  editDepartment,
  deleteDepartment,
  divisions,
  employees,
}: DepartmentDetailsModalProps) {
  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.2 } 
    }
  };

  const departmentHead = employees?.find((employee) => employee.id === department.head_id);
  const divisionName = divisions?.find((division) => division.id === department.division_id)?.name;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={modalVariants}
        className="bg-surface-primary p-6 rounded-lg w-full max-w-md shadow-xl border border-border-primary"
      >
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building size={24} weight="duotone" className="text-foreground-secondary" />
            <h2 className="text-xl font-semibold text-foreground-primary">Department Details</h2>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-error/10 dark:hover:bg-error/20 text-foreground-tertiary hover:text-error"
          >
            <X size={20} weight="bold" />
          </Button>
        </motion.div>

        <motion.div variants={fadeInUp} className="mt-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary dark:bg-background-tertiary border border-border-primary">
            <Building size={20} weight="duotone" className="text-foreground-secondary shrink-0" />
            <div>
              <div className="text-sm text-foreground-secondary font-medium">Department Name</div>
              <div className="font-medium text-foreground-primary">{department?.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary dark:bg-background-tertiary border border-border-primary">
            <User size={20} weight="duotone" className="text-foreground-secondary shrink-0" />
            <div>
              <div className="text-sm text-foreground-secondary font-medium">Department Head</div>
              <div className="font-medium text-foreground-primary">
                {departmentHead ? departmentHead.name : "No head assigned"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary dark:bg-background-tertiary border border-border-primary">
            <Stack size={20} weight="duotone" className="text-foreground-secondary shrink-0" />
            <div>
              <div className="text-sm text-foreground-secondary font-medium">Division</div>
              <div className="font-medium text-foreground-primary">{divisionName || "None"}</div>
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-lg bg-background-secondary dark:bg-background-tertiary border border-border-primary">
            <FileText size={20} weight="duotone" className="text-foreground-secondary shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-foreground-secondary font-medium">Description</div>
              <div className="text-foreground-primary">{department?.description || "No description provided"}</div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeIn} className="flex justify-end pt-6 gap-2">
          <Button
            variant="outline"
            onClick={editDepartment}
            className="flex items-center gap-2 border border-border-primary text-foreground-secondary hover:bg-background-secondary dark:hover:bg-background-tertiary"
          >
            <PencilSimple size={18} weight="bold" />
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={deleteDepartment}
            className="flex items-center gap-2 bg-error/10 dark:bg-error/20 hover:bg-error/20 dark:hover:bg-error/30 text-error border border-error/30 dark:border-error/40 hover:border-error/50"
          >
            <TrashSimple size={18} weight="bold" />
            Delete
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
