import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass as MagnifyingGlass, X, CaretDown, User } from "@phosphor-icons/react";
import { motion, AnimatePresence } from 'framer-motion';
import { matchesEmployeeSearch } from '@/lib/utils/user-search';
import { Employee } from '@/lib/types/schemas';

interface SingleEmployeeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  employees: Employee[];
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  allowClear?: boolean;
}

export default function SingleEmployeeSelector({
  value: selectedEmployeeId,
  onChange: setSelectedEmployeeId,
  employees,
  label = "Employee",
  error,
  disabled = false,
  placeholder = "Search and select employee...",
  required = false,
  allowClear = true
}: SingleEmployeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee => 
    matchesEmployeeSearch(employee, searchTerm)
  );

  const getSelectedEmployee = () => {
    return employees.find(employee => employee.id.toString() === selectedEmployeeId);
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployeeId(employee.id.toString());
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const handleClearSelection = () => {
    // Pass empty string when clearing - parent component handles conversion to null if needed
    setSelectedEmployeeId("");
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleInputClick = () => {
    updateDropdownPosition();
    setIsDropdownOpen(true);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Update position on scroll or resize
  useEffect(() => {
    if (isDropdownOpen) {
      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedEmployee = getSelectedEmployee();

  // Dropdown content to be rendered in portal
  const dropdownContent = isDropdownOpen && !disabled && (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
      className="z-9999 bg-surface-primary border border-border-primary rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      {filteredEmployees.length > 0 ? (
        <div className="p-1">
          {filteredEmployees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => handleEmployeeSelect(employee)}
              className="w-full flex items-center space-x-3 p-3 hover:bg-surface-hover rounded-lg transition-colors text-left"
            >
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary truncate">{employee.name}</p>
                {employee.email && (
                  <p className="text-xs text-foreground-secondary truncate">{employee.email}</p>
                )}
                {employee.designation && (
                  <p className="text-xs text-foreground-tertiary truncate">{employee.designation}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center text-foreground-tertiary text-sm">
          {searchTerm ? `No employees found matching "${searchTerm}"` : 'No employees available'}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-2 mb-4" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground-primary">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Selected Employee Display / Search Input */}
        <div 
          ref={triggerRef}
          className={`w-full border rounded-lg bg-surface-primary cursor-pointer ${
            error
              ? 'border-error focus-within:ring-error focus-within:border-error'
              : 'border-border-primary focus-within:ring-primary-500 focus-within:border-primary-500'
          } ${disabled ? 'bg-background-secondary cursor-not-allowed' : ''}`}
          onClick={!disabled ? handleInputClick : undefined}
        >
          <div className="flex items-center p-3">
            <MagnifyingGlass className="h-4 w-4 text-foreground-tertiary mr-3 shrink-0" />
            
            {selectedEmployee && !isDropdownOpen ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground-primary">{selectedEmployee.name}</p>
                    {selectedEmployee.email && (
                      <p className="text-xs text-foreground-secondary">{selectedEmployee.email}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSelection();
                  }}
                  className="text-foreground-tertiary hover:text-foreground-secondary"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 border-none focus:outline-none focus:ring-0 p-0 text-sm bg-transparent text-foreground-primary placeholder:text-foreground-tertiary"
                  disabled={disabled}
                />
                <CaretDown className={`h-4 w-4 text-foreground-tertiary transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`} />
              </div>
            )}
          </div>
        </div>

        {/* Dropdown rendered via Portal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {dropdownContent}
          </AnimatePresence>,
          document.body
        )}
      </div>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}
