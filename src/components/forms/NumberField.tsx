import React from 'react';
import { Hash, Plus, Minus } from "@phosphor-icons/react";
import { Button } from '@/components/ui/button';

interface NumberFieldProps {
  name: string;
  label: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  icon?: React.ReactNode;
  className?: string;
  showIncrementButtons?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
  disabled?: boolean;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  min,
  max,
  step = 1,
  icon,
  className = "",
  showIncrementButtons = false,
  onIncrement,
  onDecrement,
  disabled=false
}) => {
  const IconComponent = icon || <Hash size={18} weight="duotone" className="text-foreground-tertiary" />;

  return (
    <div className={className}>
      <label className="block font-medium text-foreground-primary mb-1">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      
      {showIncrementButtons ? (
        <div className="flex items-center">
          <Button
            type="button"
            onClick={onDecrement}
            className="bg-surface-secondary hover:bg-surface-hover text-foreground-primary rounded-l-lg p-2.5 border border-border-primary border-r-0"
          >
            <Minus size={16} weight="bold" />
          </Button>
          <input
            type="number"
            name={name}
            value={value ?? ''}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            placeholder={placeholder}
            className="w-16 text-center p-2.5 border-t border-b border-border-primary outline-none bg-surface-primary text-foreground-primary focus:ring-2 focus:ring-primary-500"
          />
          <Button
            type="button"
            onClick={onIncrement}
            className="bg-surface-secondary hover:bg-surface-hover text-foreground-primary rounded-r-lg p-2.5 border border-border-primary border-l-0"
          >
            <Plus size={16} weight="bold" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {IconComponent}
          </div>
          <input
            type="number"
            name={name}
            value={value ?? ''}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            placeholder={placeholder}
            className={`w-full pl-10 rounded-lg bg-surface-primary p-2.5 border border-border-primary focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-foreground-primary ${error ? 'border-error focus:ring-error' : ''}`}
          />
        </div>
      )}
      
      {error && <p className="text-error text-sm mt-1">{error}</p>}
    </div>
  );
};

export default NumberField;
