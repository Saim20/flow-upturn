import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";

// =============================================================================
// USER CONTEXT HOOK
// =============================================================================

/**
 * Hook to set Sentry user context for better error tracking.
 * Call this in your authenticated layout to identify users in error reports.
 */
export function useSentryUser() {
  const { user, employeeInfo } = useAuth();

  useEffect(() => {
    if (user && employeeInfo) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: employeeInfo.name,
        ip_address: "{{auto}}",
      });

      // Set additional context for the employee
      Sentry.setContext("employee", {
        company_id: employeeInfo.company_id,
        designation: employeeInfo.designation,
        department_id: employeeInfo.department_id,
        has_approval: employeeInfo.has_approval,
      });

      // Set tags for filtering in Sentry dashboard
      Sentry.setTag("company_id", String(employeeInfo.company_id));
    } else {
      Sentry.setUser(null);
    }
  }, [user, employeeInfo]);
}

// =============================================================================
// ERROR CAPTURE UTILITIES
// =============================================================================

/**
 * Capture an error with optional context.
 * Use this in catch blocks to report errors to Sentry.
 * 
 * @example
 * ```ts
 * try {
 *   await createEmployee(data);
 * } catch (error) {
 *   captureError(error, { operation: "createEmployee", employeeId: id });
 * }
 * ```
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "error"
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    if (context) {
      scope.setContext("additional", context);
      // Also set tags for easier filtering
      Object.entries(context).forEach(([key, value]) => {
        if (typeof value === "string" || typeof value === "number") {
          scope.setTag(key, String(value));
        }
      });
    }

    // Handle different error types
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else if (typeof error === "string") {
      Sentry.captureMessage(error, level);
    } else {
      // For Supabase errors or other objects
      Sentry.captureException(new Error(JSON.stringify(error)));
    }
  });
}

/**
 * Capture a Supabase database error with proper context.
 * Supabase errors have a specific structure with code, message, details, hint.
 * 
 * @example
 * ```ts
 * const { error } = await supabase.from('employees').select();
 * if (error) {
 *   captureSupabaseError(error, "fetchEmployees", { companyId });
 * }
 * ```
 */
export function captureSupabaseError(
  error: { code?: string; message?: string; details?: string; hint?: string },
  operation: string,
  context?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTag("error_type", "supabase");
    scope.setTag("operation", operation);
    
    if (error.code) {
      scope.setTag("supabase_code", error.code);
    }

    scope.setContext("supabase_error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    if (context) {
      scope.setContext("operation_context", context);
    }

    const errorMessage = `Supabase Error [${operation}]: ${error.message || "Unknown error"}`;
    Sentry.captureException(new Error(errorMessage));
  });
}

/**
 * Capture an API/fetch error with request details.
 * 
 * @example
 * ```ts
 * try {
 *   const response = await fetch('/api/employees');
 *   if (!response.ok) {
 *     captureApiError(response, "GET /api/employees");
 *   }
 * } catch (error) {
 *   captureApiError(error, "GET /api/employees");
 * }
 * ```
 */
export function captureApiError(
  error: unknown,
  endpoint: string,
  context?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTag("error_type", "api");
    scope.setTag("endpoint", endpoint);

    if (context) {
      scope.setContext("request", context);
    }

    if (error instanceof Response) {
      scope.setContext("response", {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
      });
      Sentry.captureException(new Error(`API Error [${endpoint}]: ${error.status} ${error.statusText}`));
    } else if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureException(new Error(`API Error [${endpoint}]: ${JSON.stringify(error)}`));
    }
  });
}

// =============================================================================
// MESSAGE & BREADCRUMB UTILITIES
// =============================================================================

/**
 * Capture a custom message (for non-error events you want to track).
 * 
 * @example
 * ```ts
 * captureMessage("Large file upload completed", { fileSize: "50MB" }, "info");
 * ```
 */
export function captureMessage(
  message: string,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      scope.setContext("additional", context);
    }
    Sentry.captureMessage(message);
  });
}

/**
 * Add a breadcrumb to help trace what happened before an error.
 * Breadcrumbs are included in error reports to show user journey.
 * 
 * @example
 * ```ts
 * addBreadcrumb("User clicked submit", "user-action", { formId: "leave-request" });
 * addBreadcrumb("API call started", "http", { url: "/api/leaves" });
 * ```
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

/**
 * Start a performance transaction for tracking slow operations.
 * 
 * @example
 * ```ts
 * const transaction = startTransaction("loadDashboard", "page-load");
 * await loadDashboardData();
 * transaction.finish();
 * ```
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({
    name,
    op,
    forceTransaction: true,
  });
}

/**
 * Wrap an async function with Sentry performance monitoring.
 * 
 * @example
 * ```ts
 * const result = await withSpan("fetchEmployees", "db.query", async () => {
 *   return await supabase.from("employees").select();
 * });
 * ```
 */
export async function withSpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan({ name, op }, async () => {
    return await fn();
  });
}

// =============================================================================
// ERROR BOUNDARY HELPER
// =============================================================================

/**
 * Create an error handler for use in component error boundaries.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary onError={createErrorHandler("DashboardWidget")}>
 *   <DashboardWidget />
 * </ErrorBoundary>
 * ```
 */
export function createErrorHandler(componentName: string) {
  return (error: Error, errorInfo: { componentStack: string }) => {
    Sentry.withScope((scope) => {
      scope.setTag("component", componentName);
      scope.setContext("react", {
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });
  };
}

// =============================================================================
// FORM ERROR TRACKING
// =============================================================================

/**
 * Track form validation errors (useful for understanding UX issues).
 * 
 * @example
 * ```ts
 * if (validationErrors.length > 0) {
 *   trackFormErrors("LeaveRequestForm", validationErrors);
 * }
 * ```
 */
export function trackFormErrors(
  formName: string,
  errors: Record<string, string> | string[]
) {
  addBreadcrumb(`Form validation failed: ${formName}`, "form", {
    formName,
    errorCount: Array.isArray(errors) ? errors.length : Object.keys(errors).length,
    errors: Array.isArray(errors) ? errors : Object.keys(errors),
  }, "warning");
}

// =============================================================================
// UTILITY FOR SAFE ERROR LOGGING
// =============================================================================

/**
 * Safe console.error wrapper that also reports to Sentry.
 * Use this instead of console.error to ensure errors are tracked.
 * 
 * @example
 * ```ts
 * // Instead of: console.error("Error fetching employees:", error);
 * logError("Error fetching employees", error, { companyId });
 * ```
 */
export function logError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
) {
  // Always log to console for development
  console.error(message, error);

  // Report to Sentry in production
  if (process.env.NODE_ENV === "production") {
    if (error) {
      captureError(error, { message, ...context });
    } else {
      captureMessage(message, context, "error");
    }
  }
}