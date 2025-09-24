"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building, Code, Briefcase, Globe, LoaderCircle } from "lucide-react";
import FormInputField from "@/components/ui/FormInputField";
import FormSelectField from "@/components/ui/FormSelectField";
import { fadeIn, staggerContainer } from "@/components/ui/animations";
import { validateCompanyBasics, validationErrorsToObject } from "@/lib/utils/validation";
import { CompanyBasics } from "@/lib/types/schemas";
import CompanyBasicsConfigView from "@/components/admin-management/CompanyBasicsConfigView";
import CompanySettingsConfigView from "@/components/admin-management/CompanySettingsConfigView";
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
    company_id: "",
    industry_id: "",
    country_id: "",
    // Operations Settings
    live_absent_enabled: false,
    // Payroll Settings
    fiscal_year_start: "2024-01-01",
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
        className="bg-white rounded-xl shadow-sm mb-8"
      >
        <div className="border-b border-gray-200 px-3 py-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
            <Building className="w-5 h-5 mr-2 text-gray-600" />
            Company Basics
          </h3>
        </div>
        
        <form onSubmit={onSubmit} className="p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInputField
              name="company_name"
              label="Company Name"
              icon={<Building size={18} />}
              value={formValues.company_name}
              onChange={handleChange}
              readOnly={true}
              error={errors.company_name}
            />

            <FormInputField
              name="company_id"
              label="Company Code"
              icon={<Code size={18} />}
              value={formValues.company_id}
              onChange={handleChange}
              readOnly={true}
              error={errors.company_id}
            />

            <FormSelectField
              name="industry_id"
              label="Industry"
              icon={<Briefcase size={18} />}
              options={industries.map(industry => ({
                value: industry.id.toString(),
                label: industry.name
              }))}
              placeholder="Select Industry"
              value={formValues.industry_id}
              onChange={handleChange}
              error={errors.industry_id}
            />

            <FormSelectField
              name="country_id"
              label="Country"
              icon={<Globe size={18} />}
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
        className="bg-white rounded-xl shadow-sm p-2"
      >
        <CompanyBasicsConfigView />
      </motion.div>
    </motion.div>
  );
}
