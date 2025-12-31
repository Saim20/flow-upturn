"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Envelope, EnvelopeOpen, Warning, CheckCircle, SpinnerGap } from "@phosphor-icons/react";
import { useEmailPreferences, emailPreferenceCategories, EmailPreferences, EmailPreferencesData } from "@/hooks/useEmailPreferences";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

function ToggleSwitch({ checked, onChange, disabled = false, size = "md" }: ToggleSwitchProps) {
  const sizeClasses = size === "sm" 
    ? "h-5 w-9" 
    : "h-6 w-11";
  const knobSizeClasses = size === "sm"
    ? "h-3 w-3"
    : "h-4 w-4";
  const translateClass = size === "sm"
    ? (checked ? "translate-x-5" : "translate-x-1")
    : (checked ? "translate-x-6" : "translate-x-1");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex items-center rounded-full
        transition-colors duration-200 ease-in-out focus:outline-none 
        focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${sizeClasses}
        ${checked ? 'bg-primary-600' : 'bg-background-tertiary dark:bg-background-tertiary'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          inline-block transform rounded-full bg-surface-primary 
          shadow-lg ring-0 transition-transform duration-200 ease-in-out
          ${knobSizeClasses}
          ${translateClass}
        `}
      />
    </button>
  );
}

interface PreferenceRowProps {
  prefKey: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (key: string, value: boolean) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

function PreferenceRow({ prefKey, title, description, checked, onChange, disabled, isLoading }: PreferenceRowProps) {
  return (
    <div className={`flex items-start justify-between py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground-primary">{title}</span>
          {isLoading && <SpinnerGap className="w-4 h-4 animate-spin text-primary-500" />}
        </div>
        <p className="text-sm text-foreground-secondary mt-0.5">{description}</p>
      </div>
      <ToggleSwitch
        checked={checked}
        onChange={(value) => onChange(prefKey, value)}
        disabled={disabled || isLoading}
        size="sm"
      />
    </div>
  );
}

export default function EmailPreferencesSettings() {
  const {
    preferences,
    loading,
    error,
    fetchPreferences,
    updatePreference,
  } = useEmailPreferences();

  const [localPrefs, setLocalPrefs] = useState<EmailPreferences | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const handlePreferenceChange = async (key: string, value: boolean) => {
    if (!localPrefs) return;

    // Optimistic update
    setLocalPrefs({ ...localPrefs, [key]: value });
    setSavingKey(key);

    try {
      await updatePreference(key as keyof EmailPreferences, value);
      toast.success(`Email preference updated`);
    } catch (err) {
      // Revert on error
      setLocalPrefs({ ...localPrefs, [key]: !value });
      toast.error("Failed to update preference");
    } finally {
      setSavingKey(null);
    }
  };

  const isGlobalDisabled = localPrefs?.preferences?.global_enabled === false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGap className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-foreground-secondary">Loading preferences...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-error">
        <Warning className="w-6 h-6 mr-2" />
        <span>Failed to load email preferences. Please try again.</span>
      </div>
    );
  }

  if (!localPrefs) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground-secondary">
        <Envelope className="w-6 h-6 mr-2" />
        <span>No email preferences found. They will be created automatically.</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground-primary">Email Notifications</h2>
          <p className="text-sm text-foreground-secondary">
            Manage which emails you receive from the system
          </p>
        </div>
      </div>

      {/* Global Toggle */}
      <Card className="border-2 border-primary-200 dark:border-primary-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {localPrefs.preferences.global_enabled ? (
                <EnvelopeOpen className="w-8 h-8 text-success" />
              ) : (
                <Envelope className="w-8 h-8 text-foreground-tertiary" />
              )}
              <div>
                <h3 className="font-semibold text-foreground-primary">
                  {emailPreferenceCategories.general.preferences.global_enabled.title}
                </h3>
                <p className="text-sm text-foreground-secondary">
                  {emailPreferenceCategories.general.preferences.global_enabled.description}
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={localPrefs.preferences.global_enabled}
              onChange={(value) => handlePreferenceChange('global_enabled', value)}
              disabled={savingKey === 'global_enabled'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Disabled Warning */}
      {isGlobalDisabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30"
        >
          <Warning className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-warning">
            Email notifications are disabled. Enable the master switch above to receive emails.
          </p>
        </motion.div>
      )}

      {/* Category Sections */}
      <div className="space-y-4">
        {/* Leave Management */}
        <Card>
          <CardHeader 
            title={emailPreferenceCategories.leave.title}
            subtitle="Notifications about your leave requests"
          />
          <CardContent className="divide-y divide-border-primary">
            {Object.entries(emailPreferenceCategories.leave.preferences).map(([key, config]) => (
              <PreferenceRow
                key={key}
                prefKey={key}
                title={config.title}
                description={config.description}
                checked={(localPrefs.preferences[key as keyof EmailPreferencesData] as boolean) ?? true}
                onChange={handlePreferenceChange}
                disabled={isGlobalDisabled}
                isLoading={savingKey === key}
              />
            ))}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader 
            title={emailPreferenceCategories.projects.title}
            subtitle="Notifications about project updates"
          />
          <CardContent className="divide-y divide-border-primary">
            {Object.entries(emailPreferenceCategories.projects.preferences).map(([key, config]) => (
              <PreferenceRow
                key={key}
                prefKey={key}
                title={config.title}
                description={config.description}
                checked={(localPrefs.preferences[key as keyof EmailPreferencesData] as boolean) ?? true}
                onChange={handlePreferenceChange}
                disabled={isGlobalDisabled}
                isLoading={savingKey === key}
              />
            ))}
          </CardContent>
        </Card>

        {/* Payroll */}
        <Card>
          <CardHeader 
            title={emailPreferenceCategories.payroll.title}
            subtitle="Notifications about salary and payments"
          />
          <CardContent className="divide-y divide-border-primary">
            {Object.entries(emailPreferenceCategories.payroll.preferences).map(([key, config]) => (
              <PreferenceRow
                key={key}
                prefKey={key}
                title={config.title}
                description={config.description}
                checked={(localPrefs.preferences[key as keyof EmailPreferencesData] as boolean) ?? true}
                onChange={handlePreferenceChange}
                disabled={isGlobalDisabled}
                isLoading={savingKey === key}
              />
            ))}
          </CardContent>
        </Card>

        {/* Stakeholders */}
        <Card>
          <CardHeader 
            title={emailPreferenceCategories.stakeholders.title}
            subtitle="Notifications about stakeholder issues"
          />
          <CardContent className="divide-y divide-border-primary">
            {Object.entries(emailPreferenceCategories.stakeholders.preferences).map(([key, config]) => (
              <PreferenceRow
                key={key}
                prefKey={key}
                title={config.title}
                description={config.description}
                checked={(localPrefs.preferences[key as keyof EmailPreferencesData] as boolean) ?? true}
                onChange={handlePreferenceChange}
                disabled={isGlobalDisabled}
                isLoading={savingKey === key}
              />
            ))}
          </CardContent>
        </Card>

        {/* Notices */}
        <Card>
          <CardHeader 
            title={emailPreferenceCategories.notices.title}
            subtitle="Important company announcements"
          />
          <CardContent className="divide-y divide-border-primary">
            {Object.entries(emailPreferenceCategories.notices.preferences).map(([key, config]) => (
              <PreferenceRow
                key={key}
                prefKey={key}
                title={config.title}
                description={config.description}
                checked={(localPrefs.preferences[key as keyof EmailPreferencesData] as boolean) ?? true}
                onChange={handlePreferenceChange}
                disabled={isGlobalDisabled}
                isLoading={savingKey === key}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-2 p-4 rounded-lg bg-info/10 border border-info/30">
        <CheckCircle className="w-5 h-5 text-info shrink-0 mt-0.5" />
        <div className="text-sm text-info">
          <p className="font-medium">Note about mandatory emails</p>
          <p className="mt-1 opacity-80">
            Some emails (like onboarding/offboarding notifications and password resets) are mandatory and cannot be disabled as they contain critical employment information.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
