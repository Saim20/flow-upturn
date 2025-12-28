"use client";

import { useEffect, useState } from "react";
import { Building, Code, Briefcase, Globe, CircleNotch } from "@phosphor-icons/react";
import { FormField, SelectField } from "@/components/forms";
import { SectionHeader } from "@/components/ui";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { validateCompanyBasics, validationErrorsToObject } from "@/lib/utils/validation";
import { CompanyBasics } from "@/lib/types/schemas";
import CompanyBasicsConfigView from "@/components/admin/CompanyBasicsConfigView";
import CompanySettingsConfigView from "@/components/admin/CompanySettingsConfigView";
import { useAdminData } from "@/contexts/AdminDataContext";

type CompanyBasicsFormData = CompanyBasics;

export default function BasicTab() {
  // Use context instead of props
  const {
    companyInfo,
    countries,
    industries,
    employees,
    loading,
    updateCompanySettings
  } = useAdminData();

  const [formValues, setFormValues] = useState<CompanyBasicsFormData>({
    company_name: "",
    industry_id: "",
    country_id: "",
    // Operations Settings
    live_absent_enabled: false,
    // Payroll Settings
    fiscal_year_start: "2024-01-01",
    max_device_limit: 3,
    max_users: 50,
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
        industry_id: companyInfo.industry_id?.toString() || "",
        country_id: companyInfo.country_id?.toString() || "",
        // Operations Settings - add defaults if not present
        live_absent_enabled: companyInfo.live_absent_enabled ?? false,
        fiscal_year_start: companyInfo.fiscal_year_start ?? "2024-01-01",
        max_device_limit: companyInfo.max_device_limit ?? 3,
        max_users: companyInfo.max_users ?? 50,
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formValues);
    // Handle form submission here
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <LoadingSpinner
        text="Loading configuration..."
        height="h-screen"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-primary rounded-xl shadow-sm mb-6 p-4">
        <SectionHeader
          title="Company Basics"
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
      </div>

      <div className="mb-8">
        <CompanySettingsConfigView
          formValues={{
            live_absent_enabled: formValues.live_absent_enabled,
            fiscal_year_start: formValues.fiscal_year_start,
            max_device_limit: formValues.max_device_limit,
            max_users: formValues.max_users,
          }}
          onChange={handleSettingsChange}
          errors={{
            live_absent_enabled: errors.live_absent_enabled,
            fiscal_year_start: errors.fiscal_year_start,
          }}
        />
      </div>

      <div className="bg-surface-primary rounded-xl shadow-sm p-2">
        <CompanyBasicsConfigView />
      </div>
    </div>
  );
}
