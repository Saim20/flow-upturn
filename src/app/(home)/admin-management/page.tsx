"use client";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import CompanyBasicsConfigView from "@/components/admin-management/CompanyBasicsConfigView";
import { motion, AnimatePresence } from "framer-motion";
import { Building, Code, Briefcase, Globe, ChevronRight, LoaderCircle } from "lucide-react";
import FormInputField from "@/components/ui/FormInputField";
import FormSelectField from "@/components/ui/FormSelectField";
import { fadeIn, fadeInUp, staggerContainer } from "@/components/ui/animations";
import { getCompanyInfo, FormattedEmployee } from "@/lib/api/company/companyInfo";

const companyBasicsSchema = z.object({
  company_name: z.string().min(1, "Company Name is required"),
  company_id: z.string().min(1, "Company Code is required"),
  industry_id: z.string().min(1, "Industry is required"),
  country_id: z.string().min(1, "Country is required"),
});

type CompanyBasicsFormData = z.infer<typeof companyBasicsSchema>;

export default function CompanyBasicsForm() {
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [industries, setIndustries] = useState<{ id: number; name: string }[]>([]);
  const [employees, setEmployees] = useState<FormattedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyBasicsFormData>({
    resolver: zodResolver(companyBasicsSchema),
    defaultValues: {
      company_name: "",
      company_id: "",
      industry_id: "",
      country_id: "",
    },
  });

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        // Use client-side function instead of API
        const { company, countries, industries, formattedEmployees } = await getCompanyInfo();

        if (company) {
          reset({
            company_name: company.name,
            company_id: company.code,
            industry_id: company.industry_id.toString(),
            country_id: company.country_id.toString(),
          });
        }
        setCountries(countries);
        setIndustries(industries);
        setEmployees(formattedEmployees);
      } catch (error) {
        console.error("Failed to load company info", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyInfo();
  }, [reset]);

  const onSubmit = (data: CompanyBasicsFormData) => {
    console.log(data);
    // Handle form submission here
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="max-w-6xl mx-auto p-4 sm:p-6 pb-12"
    >
      <motion.div
        variants={fadeInUp}
        className="flex items-center mb-8"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="p-2 rounded-lg bg-blue-100 text-blue-700 mr-3"
        >
          <Building size={24} />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Company Management</h1>
          <p className="text-gray-600">Configure your company details, departments, divisions, positions, and grades</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm p-6"
          >
            <LoaderCircle className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading company information...</p>
          </motion.div>
        ) : (
          <motion.div
            variants={fadeIn}
            className="bg-white rounded-xl shadow-sm mb-8"
          >
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-blue-700 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Company Basics
              </h2>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  control={control}
                  name="company_name"
                  render={({ field }) => (
                    <FormInputField
                      name="company_name"
                      label="Company Name"
                      icon={<Building size={18} />}
                      value={field.value}
                      onChange={field.onChange}
                      readOnly={true}
                      error={errors.company_name?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="company_id"
                  render={({ field }) => (
                    <FormInputField
                      name="company_id"
                      label="Company Code"
                      icon={<Code size={18} />}
                      value={field.value}
                      onChange={field.onChange}
                      readOnly={true}
                      error={errors.company_id?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="industry_id"
                  render={({ field }) => (
                    <FormSelectField
                      name="industry_id"
                      label="Industry"
                      icon={<Briefcase size={18} />}
                      options={industries.map(industry => ({
                        value: industry.id.toString(),
                        label: industry.name
                      }))}
                      placeholder="Select Industry"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.industry_id?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="country_id"
                  render={({ field }) => (
                    <FormSelectField
                      name="country_id"
                      label="Country"
                      icon={<Globe size={18} />}
                      options={countries.map(country => ({
                        value: country.id.toString(),
                        label: country.name
                      }))}
                      placeholder="Select Country"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.country_id?.message}
                    />
                  )}
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={fadeInUp}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <CompanyBasicsConfigView employees={employees} />
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className="flex justify-end mt-6"
      >
        <motion.a
          href="/admin-management/config"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all duration-200"
        >
          <span className="font-medium">Continue to Configuration</span>
          <ChevronRight size={18} />
        </motion.a>
      </motion.div>
    </motion.div>
  );
}
