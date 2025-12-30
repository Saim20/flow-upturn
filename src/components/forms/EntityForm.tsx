import React, { ReactNode } from 'react';
import { BaseForm } from './BaseForm';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { fadeIn } from '@/components/ui/animations';

interface EntityFormProps {
  mode: 'create' | 'update';
  entityName: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  children: ReactNode;
  isLoading?: boolean;
  isValid?: boolean;
  hasChanges?: boolean;
  icon?: ReactNode;
  className?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

export const EntityForm: React.FC<EntityFormProps> = ({
  mode,
  entityName,
  onSubmit,
  onCancel,
  children,
  isLoading = false,
  isValid = true,
  hasChanges = true,
  icon,
  className = "",
  submitLabel,
  cancelLabel = "Cancel",
}) => {
  const defaultSubmitLabel = mode === 'create' ? `Create ${entityName}` : `Update ${entityName}`;
  const finalSubmitLabel = submitLabel || defaultSubmitLabel;
  
  const isSubmitDisabled = isLoading || !isValid || (mode === 'update' && !hasChanges);

  return (
    <BaseForm
      onSubmit={onSubmit}
      title={mode === 'create' ? `Create ${entityName}` : `Edit ${entityName}`}
      icon={icon}
      isLoading={isLoading}
      className={className}
    >
      {children}
      
      <motion.div variants={fadeIn} className="flex justify-end mt-8 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="border border-border-primary dark:border-border-primary text-foreground-primary dark:text-foreground-primary hover:bg-surface-hover dark:hover:bg-surface-hover"
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isSubmitDisabled}
          className="bg-primary-800 hover:bg-primary-900 text-white"
        >
          {finalSubmitLabel}
        </Button>
      </motion.div>
    </BaseForm>
  );
};

export default EntityForm;
