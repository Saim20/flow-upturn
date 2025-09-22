"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "./animations";

type FormNumberFieldProps = {
  name: string;
  label: string;
  icon: React.ReactNode;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  error?: string;
  placeholder?: string;
};

export default function FormNumberField({
  name,
  label,
  icon,
  value,
  onChange,
  min,
  max,
  step = 1,
  readOnly = false,
  error,
  placeholder,
}: FormNumberFieldProps) {
  const hasError = !!error;
  
  // Ensure value is properly handled - convert NaN to empty string, undefined/null to empty string
  const displayValue = value === null || value === undefined || (typeof value === 'number' && isNaN(value)) 
    ? '' 
    : value.toString();
  
  return (
    <div className="mb-4">
      <label 
        htmlFor={name} 
        className="block text-sm font-semibold text-gray-700 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {icon}
        </div>
        <input
          id={name}
          name={name}
          value={displayValue}
          onChange={onChange}
          type="number"
          min={min}
          max={max}
          step={step}
          readOnly={readOnly}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
          className={`w-full pl-10 pr-4 py-2.5 text-gray-900 rounded-lg border shadow-sm ${
            hasError 
              ? "border-red-300 ring-1 ring-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50" 
              : "border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white"
          } ${readOnly ? "bg-gray-100 cursor-not-allowed" : ""} focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200`}
        />
        {hasError && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500"
          >
            <AlertCircle size={16} />
          </motion.div>
        )}
      </div>
      {hasError && (
        <motion.p
          id={`${name}-error`}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
