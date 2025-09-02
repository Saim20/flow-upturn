"use client";

import { useState, useCallback } from "react";
import { validateCompanyCode as validateCompanyCodeApi } from "@/lib/utils/company";

interface ValidationResult {
  isValid: boolean;
  id: number | null;
  error?: string;
}

export function useCompanyValidation() {
  const [isValid, setIsValid] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCompanyCode = useCallback(
    async (
      companyName: string,
      companyCode: string
    ): Promise<ValidationResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await validateCompanyCodeApi(companyName, companyCode);
        setIsValid(result.isValid);
        setCompanyId(result.id);
        if (result.id !== null)
          localStorage.setItem("company_id", result.id?.toString() ?? "0");
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to validate company code";
        setError(errorMessage);
        console.error(errorMessage, err);
        return { isValid: false, id: null, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsValid(false);
    setCompanyId(null);
    setError(null);
  }, []);

  return {
    isValid,
    companyId,
    loading,
    error,
    validateCompanyCode,
    reset,
  };
}
