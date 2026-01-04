"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building, Code, Briefcase, Globe } from "@phosphor-icons/react";
import { FormField, SelectField } from "@/components/forms";
import { SectionHeader } from "@/components/ui";
import { staggerContainer } from "@/components/ui/animations";
import { validateCompanyBasics, validationErrorsToObject } from "@/lib/utils/validation";
import { CompanyBasics } from "@/lib/types/schemas";
import CompanyBasicsConfigView from "@/components/admin/CompanyBasicsConfigView";
import CompanySettingsConfigView from "@/components/admin/CompanySettingsConfigView";

import { useAdminData } from "@/contexts/AdminDataContext";

type CompanyBasicsFormData = CompanyBasics;

interface SetupStep1Props {
  onStepComplete: (isComplete: boolean) => void;
}

export default function SetupStep1({
  onStepComplete
}: SetupStep1Props) {
  // Use context instead of props
  const {
    companyInfo,
    countries,
    industries,
    employees,
    departments,
    divisions,
    grades,
    positions,
    isSetupComplete,
    updateCompanySettings
  } = useAdminData();
  const [formValues, setFormValues] = useState<CompanyBasicsFormData>({
    company_name: "",
    company_id: "",
    industry_id: "",
    country_id: "",
    // Operations Settings
    live_absent_enabled: false,
    fiscal_year_start: "2024-01-01",
    // Security Settings
    device_approval_enabled: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyBasicsFormData, string>>>({});
  const [isValid, setIsValid] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSettingsChange = async (field: string, value: any) => {
    // Update local state immediately for responsive UI
    setFormValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));

    // Auto-save to database
    try {
      await updateCompanySettings({ [field]: value });
    } catch (error) {
      console.error('Failed to update company setting:', error);
      // Could add toast notification here
    }
  };

  useEffect(() => {
    if (companyInfo) {
      setFormValues({
        company_name: companyInfo.name || "",
        company_id: companyInfo.code || "",
        industry_id: companyInfo.industry_id?.toString() || "",
        country_id: companyInfo.country_id?.toString() || "",
        // Operations Settings - add defaults if not present
        live_absent_enabled: companyInfo.live_absent_enabled ?? false,
        fiscal_year_start: companyInfo.fiscal_year_start ?? "2024-01-01",
        // Security Settings
        device_approval_enabled: companyInfo.device_approval_enabled ?? false,
      });
    }
  }, [companyInfo]);

  useEffect(() => {
    const result = validateCompanyBasics(formValues);
    if (result.success) {
      setIsValid(true);
      setErrors({});
    } else {
      setIsValid(false);
      const newErrors = validationErrorsToObject(result.errors);
      setErrors(newErrors);
    }
  }, [formValues]);

  // Check if step 1 is complete and notify parent
  useEffect(() => {
    // Step 1 is complete if company basics are valid and we have at least one of each core entity
    const stepComplete = isValid &&
      departments.length > 0 &&
      divisions.length > 0 &&
      grades.length > 0 &&
      positions.length > 0;
    onStepComplete(stepComplete);
  }, [isValid, departments.length, divisions.length, grades.length, positions.length, onStepComplete]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formValues);
    // Handle form submission here
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-foreground-primary mb-2">Step 1: Company Basics</h2>
        <p className="text-foreground-secondary">Set up your company information and organizational structure</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-surface-primary rounded-xl shadow-sm mb-8"
      >
        <SectionHeader
          title="Company Information"
          icon={<Building className="w-5 h-5" />}
        />

        <form onSubmit={onSubmit} className="p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              name="company_name"
              label="Company Name"
              value={formValues.company_name}
              onChange={handleChange}
              readOnly={true}
              error={errors.company_name}
            />

            <FormField
              name="company_id"
              label="Company Code"
              value={formValues.company_id || ""}
              onChange={handleChange}
              readOnly={true}
              error={errors.company_id}
            />

            <SelectField
              name="industry_id"
              label="Industry"
              options={industries.map(industry => ({
                value: industry.id.toString(),
                label: industry.name
              }))}
              placeholder="Select Industry"
              value={formValues.industry_id}
              onChange={handleChange}
              error={errors.industry_id}
            />

            <SelectField
              name="country_id"
              label="Country"
              options={countries.map(country => ({
                value: country.id.toString(),
                label: country.name
              }))}
              placeholder="Select Country"
              value={formValues.country_id}
              onChange={handleChange}
              error={errors.country_id}
            />
          </div>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8"
      >
        <CompanySettingsConfigView
          formValues={{
            live_absent_enabled: formValues.live_absent_enabled,
            fiscal_year_start: formValues.fiscal_year_start,
            device_approval_enabled: formValues.device_approval_enabled,
          }}
          onChange={handleSettingsChange}
          errors={{
            live_absent_enabled: errors.live_absent_enabled,
            fiscal_year_start: errors.fiscal_year_start,
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-surface-primary rounded-xl shadow-sm p-2"
      >
        <CompanyBasicsConfigView />
      </motion.div>
    </motion.div>
  );
}
