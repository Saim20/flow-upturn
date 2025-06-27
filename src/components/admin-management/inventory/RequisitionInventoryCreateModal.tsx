import React, { useEffect } from 'react';
import { FormModal } from '@/components/ui/modals';
import { FormField, SelectField, TextAreaField, NumberField } from '@/components/forms';
import { validateRequisitionInventory, type RequisitionInventoryData } from '@/lib/validation';
import { useDepartments } from '@/hooks/useDepartments';
import { useEmployees } from '@/hooks/useEmployees';
import { Package, UserPlus, Buildings, Tag } from '@phosphor-icons/react';

interface RequisitionInventoryCreateModalProps {
  isOpen: boolean;
  requisitionCategories: Array<{ id?: number; name: string }>;
  onSubmit: (data: RequisitionInventoryData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const RequisitionInventoryCreateModal: React.FC<RequisitionInventoryCreateModalProps> = ({
  isOpen,
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

  const defaultData: RequisitionInventoryData = {
    name: '',
    description: '',
    quantity: 1,
    asset_owner: '',
    requisition_category_id: undefined,
    department_id: undefined,
  };

  if (!isOpen) return null;

  return (
    <FormModal<RequisitionInventoryData>
      title="Configure Inventory Item"
      icon={<Package size={24} weight="duotone" className="text-gray-600" />}
      initialValues={defaultData}
      validationFn={validateRequisitionInventory}
      onSubmit={onSubmit}
      onClose={onClose}
      isLoading={isLoading}
      submitButtonText="Create Item"
      size="md"
    >
      {({ values, handleChange, errors }) => {
        const handleIncrement = () => {
          const event = {
            target: {
              name: 'quantity',
              value: String(values.quantity + 1)
            }
          } as React.ChangeEvent<HTMLInputElement>;
          handleChange(event);
        };

        const handleDecrement = () => {
          if (values.quantity > 1) {
            const event = {
              target: {
                name: 'quantity',
                value: String(values.quantity - 1)
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
              icon={<Package size={18} weight="duotone" className="text-gray-500" />}
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

            <SelectField
              name="asset_owner"
              label="Asset Owner"
              value={values.asset_owner}
              onChange={handleChange}
              error={errors.asset_owner}
              required
              placeholder="Select Asset Owner"
              options={assetOwners.map((employee: any) => ({
                value: employee.id,
                label: employee.name
              }))}
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

export default RequisitionInventoryCreateModal;
