"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Plus, MagnifyingGlass, FunnelSimple, Eye, PencilSimple, TrashSimple, CurrencyDollar, Calendar, Building, CheckCircle, Clock, X, Minus, Users } from "@phosphor-icons/react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { staggerContainer, fadeInUp } from "@/components/ui/animations";
import { useAccounts, AccountFilters } from "@/hooks/useAccounts";
import { useStakeholders } from "@/hooks/useStakeholders";
import { useAuth } from "@/lib/auth/auth-context";
import { Account } from "@/lib/types/schemas";
import { PAYMENT_METHODS, CURRENCIES, STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import FormModal from "@/components/ui/modals/FormModal";
import FormInputField from "@/components/ui/FormInputField";
import FormSelectField from "@/components/ui/FormSelectField";

interface AccountFormData {
  title: string;
  method: string;
  status: 'Complete' | 'Pending';
  from_source: string;
  transaction_date: string;
  amount: number;
  currency: string;
  additional_data: string; // We'll keep this as string for form compatibility
  stakeholder_id: string; // Add stakeholder reference (as string for form, will be converted to number)
}

// KeyValueEditor component for managing additional data
interface KeyValuePair {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  error?: string;
}

function KeyValueEditor({ pairs, onChange, error }: KeyValueEditorProps) {
  const addPair = () => {
    onChange([...pairs, { key: '', value: '' }]);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const updatePair = (index: number, field: 'key' | 'value', newValue: string) => {
    const newPairs = [...pairs];
    newPairs[index][field] = newValue;
    onChange(newPairs);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground-secondary">
          Additional Data (Optional)
        </label>
        <button
          type="button"
          onClick={addPair}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors dark:bg-primary-950 dark:border-primary-800 dark:hover:bg-primary-900"
        >
          <Plus size={14} className="mr-1" />
          Add Field
        </button>
      </div>

      {pairs.length === 0 ? (
        <div className="text-center py-4 border-2 border-dashed border-border-primary rounded-lg">
          <p className="text-sm text-foreground-tertiary italic">No additional data fields</p>
          <p className="text-xs text-foreground-tertiary mt-1">Click "Add Field" to create key-value pairs</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {pairs.map((pair, index) => (
            <div key={index} className="flex gap-2 items-center p-2 bg-background-secondary rounded-lg">
              <input
                type="text"
                placeholder="Key (e.g., reference)"
                value={pair.key}
                onChange={(e) => updatePair(index, 'key', e.target.value)}
                className="flex-1 px-3 py-2 border border-border-secondary rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-primary text-foreground-primary"
              />
              <span className="text-foreground-tertiary font-mono">:</span>
              <input
                type="text"
                placeholder="Value (e.g., REF123)"
                value={pair.value}
                onChange={(e) => updatePair(index, 'value', e.target.value)}
                className="flex-1 px-3 py-2 border border-border-secondary rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-primary text-foreground-primary"
              />
              <button
                type="button"
                onClick={() => removePair(index)}
                className="p-2 text-error hover:text-error/80 hover:bg-error/10 rounded-md transition-colors"
                title="Remove field"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-error text-xs mt-1">{error}</p>
      )}
    </div>
  );
}

export default function AccountsTab() {
  const { employeeInfo } = useAuth();
  
  const {
    accounts,
    loading,
    error,
    summary,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    clearError,
  } = useAccounts();

  const {
    stakeholders,
    fetchStakeholders,
  } = useStakeholders();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'All' | 'Complete' | 'Pending'>('All');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  
  // Default to last 30 days
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };
  
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState<string>(defaultRange.start);
  const [endDate, setEndDate] = useState<string>(defaultRange.end);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [stakeholderFilter, setStakeholderFilter] = useState<string>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Helper function to format additional data for display
  const formatAdditionalData = (data: any) => {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return <span className="text-foreground-tertiary italic text-xs">No additional data</span>;
    }

    const entries = Object.entries(data);
    const displayCount = Math.min(entries.length, 2); // Show max 2 chips to prevent overflow

    return (
      <div className="flex flex-wrap gap-1">
        {entries.slice(0, displayCount).map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-950/30 text-primary-800 dark:text-primary-300 border max-w-32"
            title={`${key}: ${value}`}
          >
            <span className="font-semibold">{key}:</span>
            <span className="ml-1 truncate">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </span>
        ))}
        {entries.length > displayCount && (
          <span
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-foreground-secondary cursor-help"
            title={`Additional fields: ${entries.slice(displayCount).map(([k, v]) => `${k}: ${v}`).join(', ')}`}
          >
            +{entries.length - displayCount} more
          </span>
        )}
      </div>
    );
  };

  // Helper function to parse key-value pairs from array to object
  const parseAdditionalDataFromPairs = (pairs: KeyValuePair[]) => {
    const data: Record<string, string> = {};
    pairs.forEach(pair => {
      if (pair.key.trim() && pair.value.trim()) {
        data[pair.key.trim()] = pair.value.trim();
      }
    });
    return data;
  };

  // Helper function to parse key-value pairs from string to object
  const parseAdditionalData = (text: string) => {
    if (!text.trim()) return {};

    try {
      // Try to parse as JSON first (for backward compatibility)
      return JSON.parse(text);
    } catch {
      // If not JSON, treat as key:value pairs separated by newlines
      const data: Record<string, string> = {};
      const lines = text.split('\n').filter(line => line.trim());

      lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (key && value) {
            data[key] = value;
          }
        }
      });
      return data;
    }
  };

  // Helper function to convert object to key-value pairs array
  const formatDataForEdit = (data: any): KeyValuePair[] => {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return [];
    }

    return Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value)
    }));
  };

  // Helper function to convert key-value pairs array to string
  const stringifyAdditionalData = (pairs: KeyValuePair[]): string => {
    return pairs
      .filter(pair => pair.key.trim() && pair.value.trim())
      .map(pair => `${pair.key.trim()}:${pair.value.trim()}`)
      .join('\n');
  };

  const handleCreateAccount = async (data: AccountFormData) => {
    const accountData = {
      title: data.title.trim(),
      method: data.method.trim() || null,
      status: data.status,
      from_source: data.from_source.trim(),
      transaction_date: data.transaction_date,
      amount: data.amount,
      currency: data.currency.trim(),
      additional_data: parseAdditionalData(data.additional_data),
      stakeholder_id: data.stakeholder_id ? parseInt(data.stakeholder_id) : null,
    };

    await createAccount(accountData);
    setIsCreateModalOpen(false);
  };

  const handleEditAccount = async (data: AccountFormData) => {
    if (!selectedAccount) return;

    const accountData = {
      title: data.title.trim(),
      method: data.method.trim() || null,
      status: data.status,
      from_source: data.from_source.trim(),
      transaction_date: data.transaction_date,
      amount: data.amount,
      currency: data.currency.trim(),
      additional_data: parseAdditionalData(data.additional_data),
      stakeholder_id: data.stakeholder_id ? parseInt(data.stakeholder_id) : null,
    };

    await updateAccount(selectedAccount.id!, accountData);
    setIsEditModalOpen(false);
    setSelectedAccount(null);
  };

  useEffect(() => {
    // Wait for employeeInfo to be loaded before fetching
    if (employeeInfo?.company_id) {
      const filters: AccountFilters = {
        status: statusFilter,
        method: methodFilter !== 'All' ? methodFilter : undefined,
        startDate,
        endDate,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        stakeholderId: stakeholderFilter === 'All' ? undefined : 
                       stakeholderFilter === 'none' ? null : 
                       parseInt(stakeholderFilter),
        searchTerm: searchTerm || undefined,
      };
      
      fetchAccounts(filters);
      fetchStakeholders(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeInfo?.company_id, statusFilter, methodFilter, startDate, endDate, 
      minAmount, maxAmount, stakeholderFilter, searchTerm]); // Re-fetch when filters change

  // Accounts are already filtered server-side
  const filteredAccounts = accounts;

  // Summary already calculated from filtered server-side results
  const filteredSummary = summary;

  const handleEditClick = (account: Account) => {
    setSelectedAccount(account);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (account: Account) => {
    if (window.confirm(`Are you sure you want to delete "${account.title}"?`)) {
      await deleteAccount(account.id!);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}${formatted} ${currency}`;
  };

  if (loading && accounts.length === 0) {
    return (
      <LoadingSpinner
        text="Loading accounts..."
        height="h-64"
        className="bg-surface-primary rounded-xl shadow-sm"
      />
    );
  }

  return (
    <>
        {/* Header with Summary */}
        <motion.div
          variants={fadeInUp}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <CreditCard size={24} className="sm:w-7 sm:h-7" />
              <h2 className="text-xl sm:text-2xl font-bold">Accounts</h2>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto bg-surface-primary/20 hover:bg-surface-primary/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Transaction
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-surface-primary/10 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Building size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm opacity-90">Total</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold">{summary.total}</span>
            </div>
            <div className="bg-surface-primary/10 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm opacity-90">Complete</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold">{summary.complete}</span>
            </div>
            <div className="bg-surface-primary/10 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Clock size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm opacity-90">Pending</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold">{summary.pending}</span>
            </div>
            <div className="bg-surface-primary/10 rounded-lg p-3 sm:p-4 col-span-2 lg:col-span-1">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <CurrencyDollar size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm opacity-90">Net Amount</span>
              </div>
              <span className="text-lg sm:text-xl font-bold">
                {filteredSummary.totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} BDT
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          variants={fadeInUp}
          className="bg-surface-primary rounded-xl shadow-sm p-4 sm:p-6 space-y-4"
        >
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border-secondary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>

          {/* FunnelSimple Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status FunnelSimple */}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                <FunnelSimple size={12} className="inline mr-1" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full border border-border-secondary rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="All">All Status</option>
                <option value="Complete">Complete</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Payment Method FunnelSimple */}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                <CreditCard size={12} className="inline mr-1" />
                Payment Method
              </label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full border border-border-secondary rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="All">All Methods</option>
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Start Date FunnelSimple */}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                <Calendar size={12} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-border-secondary rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* End Date FunnelSimple */}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                <Calendar size={12} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-border-secondary rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* Stakeholder FunnelSimple */}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                <Users size={12} className="inline mr-1" />
                Stakeholder
              </label>
              <select
                value={stakeholderFilter}
                onChange={(e) => setStakeholderFilter(e.target.value)}
                className="w-full border border-border-secondary rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="All">All Stakeholders</option>
                <option value="none">No Stakeholder</option>
                {stakeholders.map(s => (
                  <option key={s.id} value={s.id?.toString()}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Min Amount FunnelSimple */}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                <CurrencyDollar size={12} className="inline mr-1" />
                Min Amount
              </label>
              <input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full border border-border-secondary rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* Max Amount FunnelSimple */}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                <CurrencyDollar size={12} className="inline mr-1" />
                Max Amount
              </label>
              <input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full border border-border-secondary rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  const defaultRange = getDefaultDateRange();
                  setSearchTerm('');
                  setStatusFilter('All');
                  setMethodFilter('All');
                  setStartDate(defaultRange.start);
                  setEndDate(defaultRange.end);
                  setMinAmount('');
                  setMaxAmount('');
                  setStakeholderFilter('All');
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-foreground-secondary px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <X size={14} />
                Reset to Last 30 Days
              </button>
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="flex items-center gap-2 text-xs text-foreground-secondary bg-info/10 dark:bg-info/20 p-3 rounded-lg">
            <FunnelSimple size={12} className="text-info" />
            <span className="font-medium text-foreground-primary">
              Showing {filteredAccounts.length} transaction{filteredAccounts.length !== 1 ? 's' : ''} from {startDate} to {endDate}
            </span>
          </div>
        </motion.div>

        {/* Accounts List */}
        <motion.div
          variants={fadeInUp}
          className="bg-surface-primary rounded-xl shadow-sm overflow-hidden"
        >
          {filteredAccounts.length === 0 ? (
            <div className="p-8 text-center text-foreground-tertiary">
              <CreditCard size={48} className="mx-auto mb-4 text-foreground-tertiary" />
              <p className="text-lg font-medium mb-2">No transactions found</p>
              <p className="text-sm">Create your first transaction to get started</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Stakeholder</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">From</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-primary divide-y divide-gray-200">
                    {filteredAccounts.map((account) => (
                      <tr key={account.id} className="hover:bg-background-secondary">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{account.title}</div>
                        </td>
                        <td className="px-4 py-3">
                          {account.stakeholder ? (
                            <div className="flex items-center gap-1">
                              <Users size={12} className="text-primary-500 shrink-0" />
                              <span className="text-xs text-foreground-primary truncate max-w-[100px]" title={account.stakeholder.name}>
                                {account.stakeholder.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-foreground-tertiary text-xs italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-foreground-primary">
                            {account.method || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900 max-w-[120px] truncate" title={account.from_source}>
                          {account.from_source}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground-tertiary">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(account.transaction_date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                          <span className={account.amount >= 0 ? 'text-success' : 'text-error'}>
                            {formatAmount(account.amount, account.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${account.status === 'Complete'
                            ? 'bg-success/10 text-success dark:bg-success/20'
                            : 'bg-warning/10 text-warning dark:bg-warning/20'
                            }`}>
                            {account.status === 'Complete' ? (
                              <><CheckCircle size={10} className="mr-1" />Complete</>
                            ) : (
                              <><Clock size={10} className="mr-1" />Pending</>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[150px]">
                          {formatAdditionalData(account.additional_data)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditClick(account)}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                              title="Edit"
                            >
                              <PencilSimple size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(account)}
                              className="text-error hover:text-error/80 transition-colors"
                              title="Delete"
                            >
                              <TrashSimple size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 hover:bg-background-secondary transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{account.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-foreground-tertiary mb-1">
                          <Calendar size={12} />
                          <span>{formatDate(account.transaction_date)}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${account.status === 'Complete'
                        ? 'bg-success/10 text-success dark:bg-success/20'
                        : 'bg-warning/10 text-warning dark:bg-warning/20'
                        }`}>
                        {account.status === 'Complete' ? (
                          <><CheckCircle size={10} className="mr-1" />Complete</>
                        ) : (
                          <><Clock size={10} className="mr-1" />Pending</>
                        )}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground-secondary">Amount:</span>
                        <span className={`font-semibold ${account.amount >= 0 ? 'text-success' : 'text-error'}`}>
                          {formatAmount(account.amount, account.currency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground-secondary">From:</span>
                        <span className="text-gray-900 text-xs truncate max-w-[180px]" title={account.from_source}>
                          {account.from_source}
                        </span>
                      </div>

                      {account.method && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground-secondary">Method:</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-foreground-primary">
                            {account.method}
                          </span>
                        </div>
                      )}

                      {account.stakeholder && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground-secondary">Stakeholder:</span>
                          <div className="flex items-center gap-1">
                            <Users size={12} className="text-primary-500" />
                            <span className="text-xs text-foreground-primary">{account.stakeholder.name}</span>
                          </div>
                        </div>
                      )}

                      {account.additional_data && Object.keys(account.additional_data).length > 0 && (
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-xs text-foreground-secondary mb-2 block">Additional Data:</span>
                          {formatAdditionalData(account.additional_data)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleEditClick(account)}
                        className="flex-1 bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 dark:text-primary-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <PencilSimple size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(account)}
                        className="flex-1 bg-error/10 hover:bg-error/20 text-error px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <TrashSimple size={14} />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>

      {/* Create Account Modal */}
      <FormModal<AccountFormData>
        title="Create New Transaction"
        icon={<Plus size={24} />}
        isOpen={isCreateModalOpen}
        initialValues={{
          title: '',
          method: '',
          status: 'Pending',
          from_source: '',
          transaction_date: new Date().toISOString().split('T')[0],
          amount: 0,
          currency: 'BDT',
          additional_data: '',
          stakeholder_id: ''
        }}
        validationFn={(values) => {
          const errors = [];
          if (!values.title.trim()) errors.push({ field: 'title', message: 'Title is required' });
          if (!values.from_source.trim()) errors.push({ field: 'from_source', message: 'From source is required' });
          if (!values.transaction_date) errors.push({ field: 'transaction_date', message: 'Transaction date is required' });
          if (!values.amount) errors.push({ field: 'amount', message: 'Amount is required' });
          if (!values.currency.trim()) errors.push({ field: 'currency', message: 'Currency is required' });
          if (!values.status) errors.push({ field: 'status', message: 'Status is required' });

          // Validate amount is a number
          if (values.amount && isNaN(values.amount)) {
            errors.push({ field: 'amount', message: 'Amount must be a valid number' });
          }

          return errors.length === 0 ? { success: true, data: values } : { success: false, errors };
        }}
        onSubmit={handleCreateAccount}
        onClose={() => setIsCreateModalOpen(false)}
        isLoading={loading}
        submitButtonText="Create Transaction"
      >
        {({ values, errors, handleChange }) => (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInputField
                icon={<CurrencyDollar size={18} />}
                label="Transaction Title"
                name="title"
                value={values.title}
                onChange={handleChange}
                error={errors.title}
              />

              <FormSelectField
                icon={<CreditCard size={18} />}
                label="Payment Method"
                name="method"
                value={values.method}
                onChange={handleChange}
                error={errors.method}
                options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
                placeholder="Select method (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInputField
                icon={<Building size={18} />}
                label="From Source"
                name="from_source"
                value={values.from_source}
                onChange={handleChange}
                error={errors.from_source}
              />

              <FormSelectField
                icon={<Users size={18} />}
                label="Stakeholder (Optional)"
                name="stakeholder_id"
                value={values.stakeholder_id}
                onChange={handleChange}
                error={errors.stakeholder_id}
                options={[
                  { value: '', label: 'No Stakeholder' },
                  ...stakeholders.map(s => ({
                    value: String(s.id),
                    label: `${s.name}${s.is_completed ? ' (Completed)' : ' (Active)'}`
                  }))
                ]}
                placeholder="Select stakeholder (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelectField
                icon={<CheckCircle size={18} />}
                label="Status"
                name="status"
                value={values.status}
                onChange={handleChange}
                error={errors.status}
                options={[
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Complete', label: 'Complete' }
                ]}
                placeholder="Select status"
              />

              <FormInputField
                icon={<Calendar size={18} />}
                label="Transaction Date"
                name="transaction_date"
                type="date"
                value={values.transaction_date}
                onChange={handleChange}
                error={errors.transaction_date}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInputField
                icon={<CurrencyDollar size={18} />}
                label="Amount"
                name="amount"
                type="number"
                value={values.amount.toString()}
                onChange={handleChange}
                error={errors.amount}
              />

              <FormSelectField
                icon={<CurrencyDollar size={18} />}
                label="Currency"
                name="currency"
                value={values.currency}
                onChange={handleChange}
                error={errors.currency}
                options={Object.values(CURRENCIES).map(currency => ({ value: currency, label: currency }))}
                placeholder="Select currency"
              />
            </div>

            <KeyValueEditor
              pairs={formatDataForEdit(parseAdditionalData(values.additional_data))}
              onChange={(pairs) => {
                const stringValue = stringifyAdditionalData(pairs);
                const event = {
                  target: {
                    name: 'additional_data',
                    value: stringValue
                  }
                } as any;
                handleChange(event);
              }}
              error={errors.additional_data}
            />
          </>
        )}
      </FormModal>

      {/* Edit Account Modal */}
      {selectedAccount && (
        <FormModal<AccountFormData>
          title="Edit Transaction"
          icon={<PencilSimple size={24} />}
          isOpen={isEditModalOpen}
          initialValues={{
            title: selectedAccount.title,
            method: selectedAccount.method || '',
            status: selectedAccount.status,
            from_source: selectedAccount.from_source,
            transaction_date: selectedAccount.transaction_date,
            amount: selectedAccount.amount,
            currency: selectedAccount.currency,
            additional_data: stringifyAdditionalData(formatDataForEdit(selectedAccount.additional_data)),
            stakeholder_id: selectedAccount.stakeholder_id ? String(selectedAccount.stakeholder_id) : ''
          }}
          validationFn={(values) => {
            const errors = [];
            if (!values.title.trim()) errors.push({ field: 'title', message: 'Title is required' });
            if (!values.from_source.trim()) errors.push({ field: 'from_source', message: 'From source is required' });
            if (!values.transaction_date) errors.push({ field: 'transaction_date', message: 'Transaction date is required' });
            if (!values.amount) errors.push({ field: 'amount', message: 'Amount is required' });
            if (!values.currency.trim()) errors.push({ field: 'currency', message: 'Currency is required' });
            if (!values.status) errors.push({ field: 'status', message: 'Status is required' });

            // Validate amount is a number
            if (values.amount && isNaN(values.amount)) {
              errors.push({ field: 'amount', message: 'Amount must be a valid number' });
            }

            return errors.length === 0 ? { success: true, data: values } : { success: false, errors };
          }}
          onSubmit={handleEditAccount}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAccount(null);
          }}
          isLoading={loading}
          submitButtonText="Update Transaction"
        >
          {({ values, errors, handleChange }) => (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInputField
                  icon={<CurrencyDollar size={18} />}
                  label="Transaction Title"
                  name="title"
                  value={values.title}
                  onChange={handleChange}
                  error={errors.title}
                />

                <FormSelectField
                  icon={<CreditCard size={18} />}
                  label="Payment Method"
                  name="method"
                  value={values.method}
                  onChange={handleChange}
                  error={errors.method}
                  options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
                  placeholder="Select method (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInputField
                  icon={<Building size={18} />}
                  label="From Source"
                  name="from_source"
                  value={values.from_source}
                  onChange={handleChange}
                  error={errors.from_source}
                />

                <FormSelectField
                  icon={<Users size={18} />}
                  label="Stakeholder (Optional)"
                  name="stakeholder_id"
                  value={values.stakeholder_id}
                  onChange={handleChange}
                  error={errors.stakeholder_id}
                  options={[
                    { value: '', label: 'No Stakeholder' },
                    ...stakeholders.map(s => ({
                      value: String(s.id),
                      label: `${s.name}${s.is_completed ? ' (Completed)' : ' (Active)'}`
                    }))
                  ]}
                  placeholder="Select stakeholder (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelectField
                  icon={<CheckCircle size={18} />}
                  label="Status"
                  name="status"
                  value={values.status}
                  onChange={handleChange}
                  error={errors.status}
                  options={[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Complete', label: 'Complete' }
                  ]}
                  placeholder="Select status"
                />

                <FormInputField
                  icon={<Calendar size={18} />}
                  label="Transaction Date"
                  name="transaction_date"
                  type="date"
                  value={values.transaction_date}
                  onChange={handleChange}
                  error={errors.transaction_date}
                />

                <FormInputField
                  icon={<CurrencyDollar size={18} />}
                  label="Amount"
                  name="amount"
                  type="number"
                  value={values.amount.toString()}
                  onChange={handleChange}
                  error={errors.amount}
                />

                <FormSelectField
                  icon={<CurrencyDollar size={18} />}
                  label="Currency"
                  name="currency"
                  value={values.currency}
                  onChange={handleChange}
                  error={errors.currency}
                  options={Object.values(CURRENCIES).map(currency => ({ value: currency, label: currency }))}
                  placeholder="Select currency"
                />
              </div>

              <KeyValueEditor
                pairs={formatDataForEdit(parseAdditionalData(values.additional_data))}
                onChange={(pairs) => {
                  const stringValue = stringifyAdditionalData(pairs);
                  const event = {
                    target: {
                      name: 'additional_data',
                      value: stringValue
                    }
                  } as any;
                  handleChange(event);
                }}
                error={errors.additional_data}
              />
            </>
          )}
        </FormModal>
      )}
    </>
  );
}