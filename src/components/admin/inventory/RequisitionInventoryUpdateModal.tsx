import React, { useEffect } from 'react';
import { FormModal } from '@/components/ui/modals';
import { FormField, SelectField, TextAreaField, NumberField, SingleEmployeeSelector } from '@/components/forms';
import { validateRequisitionInventory, type RequisitionInventoryData } from '@/lib/validation';
import { useDepartments } from '@/hooks/useDepartments';
import { useEmployees } from '@/hooks/useEmployees';
import { Package, UserPlus, Buildings, Tag } from "@phosphor-icons/react";

interface RequisitionInventoryUpdateModalProps {
  isOpen: boolean;
  initialData: RequisitionInventoryData;
  requisitionCategories: Array<{ id?: number; name: string }>;
  onSubmit: (data: RequisitionInventoryData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const RequisitionInventoryUpdateModal: React.FC<RequisitionInventoryUpdateModalProps> = ({
  isOpen,
  initialData,
  requisitionCategories,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  const { items: departments, fetchItems: fetchDepartments } = useDepartments();
  const { 
    employees: assetOwners, 
    loading: loadingEmployees, 
    fetchEmployees 
  } = useEmployees();

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchEmployees();
    }
  }, [isOpen, fetchDepartments, fetchEmployees]);

  if (!isOpen) return null;

  return (
    <FormModal<RequisitionInventoryData>
      title="Update Inventory Item"
      icon={<Package size={24} weight="duotone" className="text-foreground-secondary" />}
      initialValues={initialData}
      validationFn={validateRequisitionInventory}
      onSubmit={onSubmit}
      onClose={onClose}
      isOpen={isOpen}
      isLoading={isLoading}
      submitButtonText="Update Item"
      size="md"
    >
      {({ values, handleChange, errors, setFieldValue }) => {
        const handleIncrement = () => {
          const currentQuantity = Number(values.quantity) || 0;
          const event = {
            target: {
              name: 'quantity',
              value: String(currentQuantity + 1)
            }
          } as React.ChangeEvent<HTMLInputElement>;
          handleChange(event);
        };

        const handleDecrement = () => {
          const currentQuantity = Number(values.quantity) || 1;
          if (currentQuantity > 1) {
            const event = {
              target: {
                name: 'quantity',
                value: String(currentQuantity - 1)
              }
            } as React.ChangeEvent<HTMLInputElement>;
            handleChange(event);
          }
        };

        return (
          <>
            <FormField
              name="name"
              label="Item Name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              required
              placeholder="Enter Item Name"
              icon={<Package size={18} weight="duotone" className="text-foreground-tertiary" />}
            />

            <TextAreaField
              name="description"
              label="Description"
              value={values.description || ''}
              onChange={handleChange}
              error={errors.description}
              placeholder="Enter Description"
              rows={3}
            />

            <NumberField
              name="quantity"
              label="Quantity"
              value={values.quantity}
              onChange={handleChange}
              error={errors.quantity}
              required
              min={1}
              showIncrementButtons
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
            />

            <SingleEmployeeSelector
              label="Asset Owner"
              value={values.asset_owner}
              onChange={(value) => setFieldValue('asset_owner', value)}
              employees={assetOwners}
              placeholder="Search and select asset owner..."
              error={errors.asset_owner}
              required
            />

            <SelectField
              name="requisition_category_id"
              label="Category"
              value={values.requisition_category_id || ''}
              onChange={handleChange}
              error={errors.requisition_category_id}
              placeholder="Select Category"
              options={requisitionCategories
                .filter(category => category.id !== undefined)
                .map(category => ({
                  value: category.id!,
                  label: category.name
                }))
              }
            />

            <SelectField
              name="department_id"
              label="Department"
              value={values.department_id || ''}
              onChange={handleChange}
              error={errors.department_id}
              placeholder="Select Department"
              options={departments.map((department: any) => ({
                value: department.id,
                label: department.name
              }))}
            />
          </>
        );
      }}
    </FormModal>
  );
};

export default RequisitionInventoryUpdateModal;
