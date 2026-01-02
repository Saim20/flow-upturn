"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Building, User, Envelope, Phone, Briefcase, Users, CheckCircle, WarningCircle, Clock, XCircle, SealCheck, PaperPlaneTilt, SignOut, DeviceMobile } from "@phosphor-icons/react";
import { logout } from "@/app/(auth)/auth-actions";
import FormInputField from "@/components/ui/FormInputField";
import FormSelectField from "@/components/ui/FormSelectField";
import SingleEmployeeSelector from "@/components/forms/SingleEmployeeSelector";
import { fadeInUp, staggerContainer } from "@/components/ui/animations";
import { InlineSpinner } from "@/components/ui";
import { useCompanyValidation } from "@/hooks/useCompanyValidation";
import { useOnboarding } from "@/hooks/useOnboarding";
import { validateOnboardingForm, validationErrorsToObject } from "@/lib/utils/validation";
import { OnboardingFormData } from "@/lib/types/schemas";
import { getEmployeeId, getUser } from "@/lib/utils/auth";
import { getDeviceId, getDeviceDetails, getUserLocation, DeviceDetails } from "@/lib/utils/device";

// Types for onboarding data from API
interface OnboardingEmployee {
  id: string;
  name: string;
  email?: string;
  designation?: string;
}

interface OnboardingDepartment {
  id: number;
  name: string;
}

const jobStatuses = [
  "Active",
  "Inactive",
  "Probation",
  "Resigned",
  "Terminated",
] as const;

export default function EmployeeOnboarding() {
  const [formData, setFormData] = useState<OnboardingFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    department_id: null,
    designation: "",
    job_status: "",
    hire_date: "",
    company_name: "",
    company_id: 0,
    supervisor_id: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const reason = searchParams.get("reason");
  const [isCompanyCodeValid, setIsCompanyCodeValid] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [activeSection, setActiveSection] = useState("company");

  // Device info state - collected automatically for seamless onboarding
  const [deviceInfo, setDeviceInfo] = useState<DeviceDetails | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");

  const {
    validateCompanyCode,
    companyId,
    companyName: validatedCompanyName,
  } = useCompanyValidation();

  // State for employees and departments fetched via API (bypasses RLS)
  const [employees, setEmployees] = useState<OnboardingEmployee[]>([]);
  const [departments, setDepartments] = useState<OnboardingDepartment[]>([]);
  const { getUserOnboardingInfo, submitOnboarding, subscribeToUserOnboardingUpdates } = useOnboarding();

  // Fetch employees and departments via API (bypasses RLS for new users)
  const fetchOnboardingData = useCallback(async (companyIdToFetch: number) => {
    try {
      const response = await fetch(
        `/api/onboarding/employees?companyId=${companyIdToFetch}&includeDepartments=true`
      );
      const data = await response.json();

      if (response.ok) {
        setEmployees(data.employees || []);
        setDepartments(data.departments || []);
      } else {
        console.error('Failed to fetch onboarding data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
    }
  }, []);

  // Collect device information on mount for seamless device registration
  useEffect(() => {
    const collectDeviceInfo = async () => {
      const id = getDeviceId();
      const details = getDeviceDetails();
      const location = await getUserLocation();

      setDeviceId(id);
      setDeviceInfo({ ...details, location });
    };

    collectDeviceInfo();
  }, []);

  useEffect(() => {
    console.log(departments, "Departments fetched in onboarding");
    console.log(employees, "Employees fetched in onboarding");
  }, [departments, employees]);



  useEffect(() => {
    const fetchRejectedData = async () => {
      if (status === "rejected") {
        try {
          setLoading(true);
          const userInfo = await getUserOnboardingInfo();
          if (userInfo) {
            const formatted = {
              ...formData,
              ...userInfo.userData,
              company_name: userInfo.companyData.name,
              company_id: userInfo.userData.company_id,
            };
            setCompanyCode(userInfo.companyData.code);
            setIsCompanyCodeValid(true);
            setFormData(formatted);
            setActiveSection("personal");

            // Fetch departments and employees via API
            await fetchOnboardingData(userInfo.userData.company_id);
          }
        } catch (e) {
          console.error("Failed to fetch rejected data:", e);
        } finally {
          setLoading(false);
        }
      } else {
        const user = await getUser();
        if (user) {
          setFormData((prev) => ({
            ...prev,
            ...prev,
            email: user.email ?? "",
            phone_number: user.phone ?? "",
          }));
        }
      }
    };
    fetchRejectedData();
  }, []);

  useEffect(() => {
    if (isCompanyCodeValid && formData.company_id) {
      fetchOnboardingData(formData.company_id);
      getEmployeeId().then(id => setUserId(id)).catch(() => { });
    }
  }, [isCompanyCodeValid, formData.company_id, fetchOnboardingData]);

  // Set up polling for user's onboarding status (replaces realtime)
  useEffect(() => {
    if (userId) {
      const unsubscribe = subscribeToUserOnboardingUpdates(userId, (payload) => {
        // Redirect to appropriate page based on status change
        if (payload.new.has_approval === "ACCEPTED") {
          router.push("/home");
        } else if (payload.new.has_approval === "REJECTED") {
          router.push(`/onboarding?status=rejected&reason=${encodeURIComponent(payload.new.rejection_reason || "No reason provided")}`);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [userId, subscribeToUserOnboardingUpdates, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "department_id" ? (value ? parseInt(value) : null) : value,
    }));
    setDirty(true);

    // Clear error for the field being changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = validateOnboardingForm(formData);
      if (!result.success) {
        const errorMap = validationErrorsToObject(result.errors);
        setErrors(errorMap);
        return;
      }

      setErrors({});
      setLoading(true);

      // Include device info with the onboarding submission
      await submitOnboarding({
        ...result.data!,
        device_id: deviceId,
        device_info: deviceInfo?.device_info,
        device_browser: deviceInfo?.browser,
        device_os: deviceInfo?.os,
        device_type: deviceInfo?.device_type,
        device_model: deviceInfo?.model,
        device_user_agent: deviceInfo?.user_agent,
        device_location: deviceInfo?.location,
      });
      router.push("/onboarding?status=pending");
    } catch (err: any) {
      console.error("Submission error:", err);
      if (err?.errors) {
        const errorMap = validationErrorsToObject(err.errors);
        setErrors(errorMap);
      } else {
        // Check if it's a duplicate email error
        const errorMessage = err.message || "Something went wrong. Please try again later.";
        if (errorMessage.includes("email") && errorMessage.includes("already")) {
          setErrors({
            email: errorMessage,
            submit: "Please correct the errors above and try again."
          });
        } else {
          setErrors({ submit: errorMessage });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCompanyCode = async () => {
    try {
      setVerifyLoading(true);

      const result = await validateCompanyCode(companyCode);

      if (result.isValid && result.id !== null) {
        setIsCompanyCodeValid(true);
        setFormData((prev) => ({
          ...prev,
          company_id: result.id || 0,
          company_name: result.name || ""
        }));
        setActiveSection("personal");

        // Fetch departments and employees for the validated company
        if (result.id) {
          // await fetchDepartmentsData();
          // await fetchEmployees();
          setVerifyLoading(false);
        }
      } else {
        setIsCompanyCodeValid(false);
        setVerifyLoading(false);
        setErrors({
          company_code: result.error || "Invalid company code. Please check and try again."
        });
      }
    } catch (error) {
      console.error("Error verifying company code:", error);
      setIsCompanyCodeValid(false);
      setVerifyLoading(false);
      setErrors({
        company_code: "Failed to verify company code. Please try again."
      });
    }
  };

  if (status === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full min-h-screen bg-background-primary flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-lg w-full bg-surface-primary rounded-xl shadow-lg overflow-hidden"
        >
          <div className="bg-primary-600 py-4 px-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Application Pending
            </h2>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Clock className="h-12 w-12 text-primary-600" />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-center text-foreground-primary mb-4">Your information is being reviewed</h3>

            <p className="text-foreground-secondary text-center mb-6">
              Thank you for submitting your details. Your application is currently under review by the administrative team.
              You will be notified once the review process is complete.
            </p>

            <div className="bg-info/10 dark:bg-info/20 p-4 rounded-lg border border-info/30 mb-6">
              <p className="text-sm text-info flex items-start">
                <WarningCircle size={16} className="mr-2 mt-0.5 shrink-0" />
                If you have any questions about your application status, please contact your supervisor or the HR department.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={logout}
                className="flex items-center px-6 py-2 bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary rounded-lg hover:bg-surface-hover transition-colors"
              >
                <SignOut className="mr-2 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-screen bg-background-primary py-10 px-4 sm:px-6"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-bold text-foreground-primary mb-2">Employee Onboarding</h1>
          <p className="text-foreground-secondary max-w-2xl mx-auto">
            Complete your employee profile information to get started with our system.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="mb-10 hidden sm:block"
        >
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeSection === "company" ? "bg-primary-600" : isCompanyCodeValid ? "bg-success" : "bg-foreground-tertiary/50"
                  } text-white font-medium`}>
                  {isCompanyCodeValid ? <CheckCircle size={18} /> : 1}
                </div>
                <div className={`h-1 w-20 sm:w-32 ${isCompanyCodeValid ? "bg-success" : "bg-foreground-tertiary/30"}`}></div>
              </div>
              <div className="absolute -bottom-6 left-5 transform -translate-x-1/2 text-sm font-medium text-foreground-secondary">
                Company
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeSection === "personal" ? "bg-primary-600" : "bg-foreground-tertiary/50"
                  } text-white font-medium`}>
                  2
                </div>
                <div className="h-1 w-20 sm:w-32 bg-foreground-tertiary/30"></div>
              </div>
              <div className="absolute -bottom-6 left-5 transform -translate-x-1/2 text-sm font-medium text-foreground-secondary">
                Personal
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-foreground-tertiary/50 text-white font-medium">
                  3
                </div>
              </div>
              <div className="absolute -bottom-6 left-5 transform -translate-x-1/2 text-sm font-medium text-foreground-secondary">
                Submit
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rejected Notice */}
        {status === "rejected" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-error/10 border-l-4 border-error dark:bg-error/20 p-4 rounded-md shadow-sm"
          >
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-error mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-error">Application Rejected</h3>
                <p className="mt-1 text-error/80">
                  Your application was rejected for the following reason:
                </p>
                <p className="mt-2 text-error bg-error/10 dark:bg-error/20 p-2 rounded font-medium">
                  {reason || "No specific reason provided. Please reach out to HR for more details."}
                </p>
                <p className="mt-3 text-sm text-error">
                  Please update your information and resubmit your application.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 flex justify-end"
        >
          <button
            onClick={logout}
            className="flex items-center px-4 py-2 text-sm bg-background-tertiary dark:bg-surface-secondary text-foreground-secondary rounded-lg hover:bg-surface-hover transition-colors"
          >
            <SignOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </motion.div>

        {/* Form Container */}
        <div className="bg-surface-primary rounded-xl shadow-lg overflow-hidden mb-8">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* Company Information Section */}
              {activeSection === "company" && (
                <motion.div
                  key="company"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6"
                >
                  <div className="flex items-center mb-6">
                    <Building className="h-6 w-6 text-primary-600 mr-2" />
                    <h2 className="text-xl font-semibold text-foreground-primary">Company Information</h2>
                  </div>

                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    <FormInputField
                      name="companyCode"
                      label="Company Code"
                      icon={<SealCheck size={18} />}
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      readOnly={!!status || isCompanyCodeValid}
                      error={errors.company_code}
                    />

                    {/* Show company name after successful validation */}
                    {isCompanyCodeValid && formData.company_name && (
                      <FormInputField
                        name="company_name"
                        label="Company Name"
                        icon={<Building size={18} />}
                        value={formData.company_name}
                        onChange={handleChange}
                        readOnly={true}
                      />
                    )}

                    <motion.div
                      variants={fadeInUp}
                      className="flex justify-center mt-8"
                    >
                      {isCompanyCodeValid ? (
                        <button
                          type="button"
                          className="flex items-center justify-center w-full sm:w-auto px-6 py-2 rounded-lg bg-success/10 text-success dark:bg-success/20 cursor-default"
                        >
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Verified Successfully
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!companyCode || verifyLoading}
                          onClick={handleValidateCompanyCode}
                          className="flex items-center justify-center w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifyLoading ? (
                            <>
                              <InlineSpinner size="md" color="white" className="mr-2" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <SealCheck className="mr-2 h-5 w-5" />
                              Verify Company Code
                            </>
                          )}
                        </button>
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}

              {/* Personal Information Section */}
              {activeSection === "personal" && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6"
                >
                  <div className="flex items-center mb-6">
                    <User className="h-6 w-6 text-primary-600 mr-2" />
                    <h2 className="text-xl font-semibold text-foreground-primary">Personal Information</h2>
                  </div>

                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      <FormInputField
                        name="first_name"
                        label="First Name"
                        icon={<User size={18} />}
                        value={formData.first_name}
                        onChange={handleChange}
                        error={errors.first_name}
                      />
                      <FormInputField
                        name="last_name"
                        label="Last Name"
                        icon={<User size={18} />}
                        value={formData.last_name}
                        onChange={handleChange}
                        error={errors.last_name}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      <FormInputField
                        name="email"
                        label="Email Address"
                        icon={<Envelope size={18} />}
                        value={formData.email}
                        onChange={handleChange}
                        type="email"
                        error={errors.email}
                      />
                      <FormInputField
                        name="phone_number"
                        label="Phone Number"
                        icon={<Phone size={18} />}
                        value={formData.phone_number}
                        onChange={handleChange}
                        error={errors.phone_number}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      <FormSelectField
                        name="department_id"
                        label="Department"
                        icon={<Building size={18} />}
                        options={departments
                          .filter(dept => dept.id !== undefined)
                          .map(dept => ({ value: dept.id as number, label: dept.name }))}
                        placeholder="Select Department"
                        value={formData.department_id}
                        onChange={handleChange}
                        error={errors.department_id}
                      />

                      <FormInputField
                        name="designation"
                        label="Designation"
                        icon={<Briefcase size={18} />}
                        value={formData.designation}
                        onChange={handleChange}
                        error={errors.designation}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      <FormSelectField
                        name="job_status"
                        label="Job Status"
                        icon={<Briefcase size={18} />}
                        options={jobStatuses.map(status => ({ value: status, label: status }))}
                        placeholder="Select Job Status"
                        value={formData.job_status}
                        onChange={handleChange}
                        error={errors.job_status}
                      />

                      <FormInputField
                        name="hire_date"
                        label="Joining Date"
                        icon={<Calendar size={18} />}
                        value={formData.hire_date}
                        onChange={handleChange}
                        type="date"
                        error={errors.hire_date}
                      />
                    </div>

                    <SingleEmployeeSelector
                      value={formData.supervisor_id || ""}
                      onChange={(value) => {
                        setFormData((prev) => ({ ...prev, supervisor_id: value || null }));
                        setDirty(true);
                      }}
                      employees={(status !== "rejected"
                        ? employees
                        : employees.filter(employee => employee.id !== userId)
                      ).map(emp => ({
                        id: emp.id,
                        name: emp.name,
                        email: emp.email || "",
                        designation: emp.designation,
                      }))}
                      label="Supervisor"
                      placeholder="Search and select supervisor..."
                      error={errors.supervisor_id}
                    />

                    {/* Device Information Section */}
                    {deviceInfo && (
                      <motion.div
                        variants={fadeInUp}
                        className="mt-6 p-4 bg-primary-50 dark:bg-primary-950/30 rounded-lg border border-primary-200 dark:border-primary-800"
                      >
                        <div className="flex items-center mb-3">
                          <DeviceMobile className="h-5 w-5 text-primary-600 mr-2" />
                          <h3 className="font-medium text-foreground-primary">Device Registration</h3>
                        </div>
                        <p className="text-sm text-foreground-secondary mb-3">
                          Your current device will be automatically registered for access upon approval.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-foreground-tertiary">Browser:</span>
                            <span className="font-medium text-foreground-secondary">{deviceInfo.browser}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-foreground-tertiary">Operating System:</span>
                            <span className="font-medium text-foreground-secondary">{deviceInfo.os}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-foreground-tertiary">Device Type:</span>
                            <span className="font-medium text-foreground-secondary capitalize">{deviceInfo.device_type}</span>
                          </div>
                          {deviceInfo.model && deviceInfo.model !== 'Desktop Computer' && (
                            <div className="flex justify-between">
                              <span className="text-foreground-tertiary">Model:</span>
                              <span className="font-medium text-foreground-secondary">{deviceInfo.model}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      variants={fadeInUp}
                      className="flex justify-end mt-8"
                    >
                      <button
                        type="submit"
                        disabled={loading || (status === "rejected" && !dirty)}
                        className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <InlineSpinner size="md" color="white" className="mr-2" />
                            Processing...
                          </>
                        ) : status === "rejected" ? (
                          <>
                            <PaperPlaneTilt className="mr-2 h-5 w-5" />
                            Resubmit Application
                          </>
                        ) : (
                          <>
                            <PaperPlaneTilt className="mr-2 h-5 w-5" />
                            Submit Application
                          </>
                        )}
                      </button>
                    </motion.div>

                    {errors.submit && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-error/10 border border-error/30 dark:bg-error/20 rounded-md text-error text-sm"
                      >
                        <div className="flex items-start">
                          <WarningCircle className="h-5 w-5 mr-2 shrink-0" />
                          <span>{errors.submit}</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
