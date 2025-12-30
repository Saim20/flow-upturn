"use client";

import { createClient } from "@/lib/supabase/client";
import { useLeaveTypes } from "@/hooks/useConfigTypes";
import { Leave } from "@/lib/types";
import { validateLeave, validationErrorsToObject } from "@/lib/utils/validation";
import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle, Clock, Info } from "@phosphor-icons/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getEmployeeInfo } from "@/lib/utils/auth";
import { useLeaveRequests } from "@/hooks/useLeaveManagement";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { LoadingSpinner } from "@/components/ui";
import InlineSpinner from "@/components/ui/InlineSpinner";
import { useRouter } from "next/navigation";
import { SelectField, DateField, TextAreaField } from "@/components/forms";

const initialLeaveRecord = {
  type_id: undefined,
  start_date: "",
  end_date: "",
  description: "",
  status: "Pending",
};

export type LeaveState = Leave;



export default function LeaveCreatePage({ setActiveTab }: { setActiveTab: (key: string) => void }) {
  const [leaveRecord, setLeaveRecord] = useState<LeaveState>(initialLeaveRecord);
  const [errors, setErrors] = useState<Partial<Record<keyof LeaveState, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof LeaveState, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [daysCount, setDaysCount] = useState(0);

  const { leaveTypes, fetchLeaveTypes, loading: isLoading } = useLeaveTypes();
  const { createLeaveRequest } = useLeaveRequests();

  const router = useRouter()

  // Fetch leave types
  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);


  // Calculate days between start and end
  useEffect(() => {
    if (leaveRecord.start_date && leaveRecord.end_date) {
      const startDate = new Date(leaveRecord.start_date);
      const endDate = new Date(leaveRecord.end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDaysCount(diffDays);
    } else {
      setDaysCount(0);
    }
  }, [leaveRecord.start_date, leaveRecord.end_date]);

  const [user, setUser] = useState<any>(null);
  const { balances: leaveBalances, loading: balancesLoading } = useLeaveBalances(user?.id, user?.company_id);

  // Fetch employee info
  useEffect(() => {
    getEmployeeInfo().then(setUser);
  }, []);


  // Validate leave
  useEffect(() => {
    const result = validateLeave(leaveRecord);
    if (result.success) {
      setIsValid(true);
      setErrors({});
    } else {
      setIsValid(false);
      const newErrors = validationErrorsToObject(result.errors);
      setErrors(newErrors);
    }
  }, [leaveRecord]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setLeaveRecord((prev: any) => ({
      ...prev,
      [name]: name === "type_id" ? (value === "" ? undefined : Number(value)) : value,
    }));

    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ type_id: true, start_date: true, end_date: true, description: true });

    if (!isValid) return;

    // Check leave balance
    const balanceRecord = leaveBalances.find(b => b.type_id === leaveRecord.type_id);
    if (!balanceRecord) {
      toast.error("No leave balance found for this leave type.");
      return;
    }

    if (daysCount > balanceRecord.balance) {
      toast.error(`Insufficient leave balance. You only have ${balanceRecord.balance} day${balanceRecord.balance !== 1 ? "s" : ""} remaining for the selected leave type.`);
      return;
    }

    const client = createClient();
    const user = await getEmployeeInfo();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const formattedLeave = {
        ...leaveRecord,
        employee_id: user.id,
        company_id: user.company_id,
        requested_to: user.supervisor_id,
      };

      const response = await createLeaveRequest(formattedLeave);
      if (response?.error) throw response.error;

      toast.success("Leave application submitted successfully!");
      setLeaveRecord(initialLeaveRecord);
      setTouched({});
      
      router.push("/ops/leave?tab=history");
    } catch (error) {
      console.error("Error creating Leave:", error);
      toast.error("Failed to submit leave application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="p-4 sm:p-6 space-y-8">
      {/* Leave Balance */}
      <section className="bg-surface-primary rounded-xl shadow-sm p-6 border border-border-primary">
        <h1 className="text-xl font-bold text-foreground-primary mb-4 flex items-center">
          <Clock className="mr-2 h-5 w-5 text-blue-600" /> Leave Balance
        </h1>
        <p className="text-sm text-foreground-tertiary mb-4">
          Showing remaining balance for the current year
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 min-h-[100px]">
          {balancesLoading ? (
            <div className="col-span-full flex justify-center items-center h-full">
              <InlineSpinner size="md" color="blue" />
            </div>
          ) : (
            leaveBalances.map(balance => (
              <div
                key={balance.type_id}
                className={`border rounded-lg px-4 py-5 text-center bg-${balance.color}-100 text-${balance.color}-800 border transition-all hover:shadow-md`}
              >
                <div className="font-bold text-lg mb-1">{balance.balance} Days</div>
                <div className="text-sm font-medium">{balance.leave_type_name}</div>
                <div className="text-xs text-foreground-tertiary mt-1">
                  Used: {balance.used || 0} / {balance.total_quota || balance.balance} days
                </div>
              </div>
            ))
          )}
        </div>
      </section>



      {/* Leave Form */}
      <section className="bg-surface-primary rounded-xl shadow-sm p-6 border border-border-primary">
        <h2 className="text-xl font-bold text-foreground-primary mb-6 flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-blue-600" /> Leave Application
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <SelectField
            name="type_id"
            label="Leave Type"
            required
            value={leaveRecord.type_id ?? ""}
            onChange={handleChange}
            options={[
              { value: "", label: isLoading ? "Loading leave types..." : "Select leave type" },
              ...leaveTypes.filter((type) => type.id !== undefined).map((type) => ({ value: type.id!, label: type.name }))
            ]}
            error={touched.type_id ? errors.type_id : undefined}
          />

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateField
              name="start_date"
              label="From"
              required
              value={leaveRecord.start_date}
              onChange={handleChange}
              error={touched.start_date ? errors.start_date : undefined}
            />

            <DateField
              name="end_date"
              label="To"
              required
              value={leaveRecord.end_date}
              onChange={handleChange}
              min={leaveRecord.start_date}
              error={touched.end_date ? errors.end_date : undefined}
            />
          </div>

          {/* Days count */}
          {daysCount > 0 && (
            <div className="flex items-center p-3 bg-blue-50 rounded-md border border-blue-100">
              <Info className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-800 text-sm">
                You are requesting <strong>{daysCount} day{daysCount !== 1 ? "s" : ""}</strong> of leave
              </span>
            </div>
          )}

          {/* Description */}
          <TextAreaField
            name="description"
            label="Reason for Leave"
            rows={4}
            value={leaveRecord.description}
            onChange={handleChange}
            placeholder="Please provide details about your leave request..."
            error={touched.description ? errors.description : undefined}
          />

          {/* Submit */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-border-primary">
            <div className="text-sm text-foreground-tertiary mb-3 sm:mb-0 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-foreground-tertiary" /> All fields with an asterisk (*) are required
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !isValid || leaveRecord.type_id === undefined}
              className={`flex items-center justify-center w-full sm:w-auto bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${isSubmitting ? "opacity-80" : ""}`}
            >
              {isSubmitting ? (
                <>
                  <InlineSpinner size="sm" color="white" className="mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      </section>
    </motion.div>
  );
}
