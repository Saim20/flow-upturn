"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CurrencyDollar, PencilSimple, FloppyDisk, X, Warning, CheckCircle, Users, ClockCounterClockwise } from "@phosphor-icons/react";
import { useSalaryManagement } from '@/hooks/useSalaryManagement';
import { useEmployees } from '@/hooks/useEmployees';
import { formatDate } from '@/lib/utils';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { NumberField, TextAreaField } from '@/components/forms';

interface SalaryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
  currentSalary?: number;
}

export default function SalaryManagementModal({ 
  isOpen, 
  onClose, 
  employeeId, 
  employeeName, 
  currentSalary = 0 
}: SalaryManagementModalProps) {
  const [newSalary, setNewSalary] = useState(currentSalary.toString());
  const [reason, setReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);

  const { updateEmployeeSalary, getSalaryChangeHistory, loading, error } = useSalaryManagement();

  useEffect(() => {
    if (isOpen) {
      setNewSalary(currentSalary.toString());
      setReason('');
      setShowHistory(false);
      setSalaryHistory([]);
    }
  }, [isOpen, currentSalary]);

  const handleSaveSalary = async () => {
    if (!employeeId) return;
    
    try {
      const salaryAmount = parseFloat(newSalary);
      if (isNaN(salaryAmount) || salaryAmount < 0) {
        alert('Please enter a valid salary amount');
        return;
      }

      await updateEmployeeSalary(employeeId, salaryAmount, reason);
      onClose();
    } catch (err) {
      console.error('Failed to update salary:', err);
    }
  };

  const handleShowHistory = async () => {
    if (!employeeId || showHistory) {
      setShowHistory(!showHistory);
      return;
    }

    try {
      const history = await getSalaryChangeHistory(employeeId);
      setSalaryHistory(history);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to fetch salary history:', err);
    }
  };

  if (!isOpen) return null;

  const salaryDifference = parseFloat(newSalary) - currentSalary;
  const isIncrease = salaryDifference > 0;
  const isDecrease = salaryDifference < 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-surface-primary rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CurrencyDollar className="h-6 w-6 text-success mr-2" />
              <h2 className="text-xl font-semibold text-foreground-primary">Manage Salary</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-foreground-tertiary hover:text-foreground-secondary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Employee Info */}
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="font-medium text-foreground-primary">{employeeName}</p>
              <p className="text-sm text-foreground-secondary">Current Salary: ৳{currentSalary.toLocaleString()}</p>
            </div>

            {!showHistory ? (
              <>
                {/* New Salary Input */}
                <NumberField
                  name="newSalary"
                  label="New Salary (BDT)"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  placeholder="Enter new salary amount"
                  min={0}
                  step={100}
                  icon={<CurrencyDollar size={18} className="text-foreground-tertiary" />}
                />
                  
                {/* Salary Change Indicator */}
                {salaryDifference !== 0 && !isNaN(salaryDifference) && (
                  <div className={`mt-2 p-2 rounded-lg flex items-center text-sm ${
                    isIncrease 
                      ? 'bg-success/10 text-success border border-success/20' 
                      : 'bg-error/10 text-error border border-error/20'
                  }`}>
                    <Warning className="h-4 w-4 mr-1" />
                    {isIncrease ? 'Increase' : 'Decrease'} of ৳{Math.abs(salaryDifference).toLocaleString()}
                  </div>
                )}

                {/* Reason Input */}
                <TextAreaField
                  label="Reason for Change"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for salary change (optional)"
                />

                {/* Error Display */}
                {error && (
                  <div className="bg-error/10 border border-error/30 rounded-md p-3">
                    <div className="flex">
                      <Warning className="h-5 w-5 text-error mr-2" />
                      <p className="text-sm text-error">{error.message}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleShowHistory}
                    className="flex-1 px-4 py-2 text-sm font-medium text-foreground-secondary bg-surface-secondary border border-border-secondary rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-center transition-colors"
                  >
                    <ClockCounterClockwise className="h-4 w-4 mr-1" />
                    View History
                  </button>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-foreground-secondary bg-surface-primary border border-border-secondary rounded-md hover:bg-background-secondary focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSalary}
                    disabled={loading || newSalary === currentSalary.toString()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <InlineSpinner size="xs" color="white" className="mr-1" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FloppyDisk className="h-4 w-4 mr-1" />
                        Update Salary
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Salary History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-foreground-primary">Salary History</h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Back to Edit
                    </button>
                  </div>

                  {salaryHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <ClockCounterClockwise className="h-8 w-8 text-foreground-tertiary mx-auto mb-2" />
                      <p className="text-sm text-foreground-tertiary">No salary change history found</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {salaryHistory.map((change, index) => {
                        const changeData = change.change_data;
                        const difference = changeData.new_value - changeData.old_value;
                        const isIncrease = difference > 0;
                        
                        return (
                          <div key={change.id} className="bg-background-secondary rounded-lg p-3 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-foreground-primary">
                                    ৳{changeData.old_value?.toLocaleString()} → ৳{changeData.new_value?.toLocaleString()}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isIncrease 
                                      ? 'bg-success/10 text-success' 
                                      : 'bg-error/10 text-error'
                                  }`}>
                                    {isIncrease ? '+' : ''}৳{difference.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground-secondary mt-1">
                                  {changeData.reason || 'No reason provided'}
                                </p>
                                <p className="text-xs text-foreground-tertiary mt-1">
                                  {formatDate(change.created_at)} by {change.changed_by_employee?.first_name} {change.changed_by_employee?.last_name}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Employee List Component for Salary Management
export function EmployeeSalaryList() {
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    name: string;
    salary: number;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { extendedEmployees, fetchExtendedEmployees, loading } = useEmployees();

  useEffect(() => {
    fetchExtendedEmployees();
  }, [fetchExtendedEmployees]);

  const handleEditSalary = (employee: any) => {
    setSelectedEmployee({
      id: employee.id,
      name: employee.name,
      salary: employee.basic_salary || 0
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEmployee(null);
    // Refresh the employee list after salary update
    fetchExtendedEmployees();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users className="h-8 w-8 text-foreground-tertiary mx-auto mb-2" />
          <p className="text-sm text-foreground-tertiary">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-primary rounded-lg shadow">
        <div className="px-6 py-4 border-b border-border-primary">
          <h3 className="text-lg font-medium text-foreground-primary flex items-center">
            <CurrencyDollar className="h-5 w-5 text-success mr-2" />
            Employee Salary Management
          </h3>
        </div>
        <div className="overflow-hidden">
          {extendedEmployees.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Users className="h-8 w-8 text-foreground-tertiary mx-auto mb-2" />
              <p className="text-sm text-foreground-tertiary">No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-primary">
                <thead className="bg-background-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                      Current Salary
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-primary divide-y divide-border-primary">
                  {extendedEmployees.map((employee: any) => (
                    <tr key={employee.id} className="hover:bg-background-secondary">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground-primary">{employee.name}</div>
                          <div className="text-sm text-foreground-tertiary">{employee.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground-primary">
                        {employee.department || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground-primary">
                        ৳{(employee.basic_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditSalary(employee)}
                          className="inline-flex items-center px-3 py-1 border border-primary-300 dark:border-primary-600 rounded-md text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                        >
                          <PencilSimple className="h-3 w-3 mr-1" />
                          Edit Salary
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SalaryManagementModal
        isOpen={showModal}
        onClose={handleCloseModal}
        employeeId={selectedEmployee?.id}
        employeeName={selectedEmployee?.name}
        currentSalary={selectedEmployee?.salary}
      />
    </div>
  );
}