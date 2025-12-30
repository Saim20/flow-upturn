"use client";

import { useState, useCallback, useEffect } from "react";
import { getCompanyId, getCompanyInfo as getCompanyInfoApi, updateCompanySettings as updateCompanySettingsApi } from "@/lib/utils/auth";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Employee } from "@/lib/types/schemas";

interface CompanyInfo {
  id: number;
  name: string;
  code: string;
  industry_id: number;
  country_id: number;
  live_absent_enabled?: boolean;
  payroll_generation_day?: number;
  fiscal_year_start?: string;
  live_payroll_enabled?: boolean;
  has_division?: boolean;
  max_device_limit?: number;
}

interface Country {
  id: number;
  name: string;
}

interface Industry {
  id: number;
  name: string;
}

export function useCompanyInfo() {
  const { user, isLoading: authLoading } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchCompanyInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all data in parallel
      const [companyResult, countriesResult, industriesResult, employeesResult] = await Promise.all([
        getCompanyInfoApi(),
        supabase.from('countries').select('id, name').order('name'),
        supabase.from('industries').select('id, name').order('name'),
        supabase.from('employees').select('id, first_name, last_name, email, designation, department_id(name)').eq('company_id', (await getCompanyId())).then(res => {
          if (res.error) {
            console.error('Failed to fetch employees:', res.error);
            return [];
          }
          return (res.data || []).map(emp => ({
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email,
            designation: emp.designation || undefined,
            department: (emp.department_id as unknown as { name: string })?.name || undefined
          }));
        })
      ]);

      setCompanyInfo(companyResult);

      if (countriesResult.error) {
        console.error('Failed to fetch countries:', countriesResult.error);
      } else {
        setCountries(countriesResult.data || []);
      }

      if (industriesResult.error) {
        console.error('Failed to fetch industries:', industriesResult.error);
      } else {
        setIndustries(industriesResult.data || []);
      }

      setEmployees(employeesResult);

      return companyResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch company info";
      setError(errorMessage);
      console.error('Failed to fetch company info:', errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
      setHasInitialized(true);
    }
  }, []);

  const updateCompanySettings = useCallback(async (settings: {
    live_absent_enabled?: boolean;
    payroll_generation_day?: number;
    fiscal_year_start?: string;
    live_payroll_enabled?: boolean;
    industry_id?: number;
    country_id?: number;
    max_device_limit?: number;
  }) => {
    try {
      await updateCompanySettingsApi(settings);

      // Update local state
      setCompanyInfo(prev => prev ? { ...prev, ...settings } : null);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update company settings";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    }
  }, []);

  // Auto-fetch on mount - wait for auth to be ready
  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      return;
    }

    // Don't fetch if user is not authenticated
    if (!user) {
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    fetchCompanyInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  return {
    companyInfo,
    countries,
    industries,
    employees,
    loading,
    error,
    fetchCompanyInfo,
    updateCompanySettings
  };
} 