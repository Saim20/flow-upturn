"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Edit3, Save, X, AlertTriangle, CheckCircle, Users, History } from 'lucide-react';
import { useSalaryManagement } from '@/hooks/useSalaryManagement';
import { useEmployees } from '@/hooks/useEmployees';
import { formatDate } from '@/lib/utils';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Manage Salary</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Employee Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-900">{employeeName}</p>
              <p className="text-sm text-gray-600">Current Salary: ৳{currentSalary.toLocaleString()}</p>
            </div>

            {!showHistory ? (
              <>
                {/* New Salary Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Salary (BDT)
                  </label>
                  <input
                    type="number"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new salary amount"
                    min="0"
                    step="100"
                  />
                  
                  {/* Salary Change Indicator */}
                  {salaryDifference !== 0 && !isNaN(salaryDifference) && (
                    <div className={`mt-2 p-2 rounded-md flex items-center text-sm ${
                      isIncrease 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {isIncrease ? 'Increase' : 'Decrease'} of ৳{Math.abs(salaryDifference).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Reason Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Change
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter reason for salary change (optional)"
                  />
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error.message}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleShowHistory}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center"
                  >
                    <History className="h-4 w-4 mr-1" />
                    View History
                  </button>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSalary}
                    disabled={loading || newSalary === currentSalary.toString()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
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
                    <h3 className="text-lg font-medium text-gray-900">Salary History</h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Back to Edit
                    </button>
                  </div>

                  {salaryHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No salary change history found</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {salaryHistory.map((change, index) => {
                        const changeData = change.change_data;
                        const difference = changeData.new_value - changeData.old_value;
                        const isIncrease = difference > 0;
                        
                        return (
                          <div key={change.id} className="bg-gray-50 rounded-lg p-3 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    ৳{changeData.old_value?.toLocaleString()} → ৳{changeData.new_value?.toLocaleString()}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isIncrease 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {isIncrease ? '+' : ''}৳{difference.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {changeData.reason || 'No reason provided'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
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
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            Employee Salary Management
          </h3>
        </div>
        <div className="overflow-hidden">
          {extendedEmployees.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Salary
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {extendedEmployees.map((employee: any) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.department || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ৳{(employee.basic_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditSalary(employee)}
                          className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
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