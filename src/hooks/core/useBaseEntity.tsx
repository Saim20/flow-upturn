"use client";

import { useState, useCallback, useMemo } from "react";
import {
  BaseEntity,
  CrudHookResult,
  ApiResponse,
  EnhancedQueryOptions,
  QueryFilters,
  QueryOptions,
  ApiCallOptions,
} from "./types";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase/client";
import { captureSupabaseError, captureError } from "@/lib/sentry";

interface BaseEntityHookConfig<T> {
  tableName: string;
  entityName: string;
  companyScoped?: boolean;
  userScoped?: boolean;
  departmentScoped?: boolean; // New option for department scoping
}

export function useBaseEntity<T extends BaseEntity>(
  config: BaseEntityHookConfig<T>
): CrudHookResult<T> {
  const { employeeInfo } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(false); // Changed from true to false
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  config.companyScoped = config.companyScoped ?? true; // Default to true if not provided

  // Simplified API call handler without loading state management
  const callApi = useCallback(
    async <K,>(
      apiFunction: () => Promise<K>,
      options: ApiCallOptions = {}
    ): Promise<K | null> => {
      setError(null);

      try {
        const result = await apiFunction();

        if (options.onSuccess) {
          options.onSuccess();
        }

        return result;
      } catch (error) {
        let errorMessage: string;
        if (error instanceof Error) {
          errorMessage = error.message;
          // Capture standard Error instances using the generic captureError function
          captureError(error, { 
            operation: `${config.tableName}_operation`,
            entityName: config.entityName 
          });
        } else if (typeof error === 'object' && error !== null) {
          // Handle Supabase errors which may have different structures
          const errorObj = error as { message?: string; error_description?: string; code?: string; details?: string; hint?: string };
          errorMessage = errorObj.message 
            || errorObj.error_description 
            || errorObj.details
            || errorObj.hint
            || JSON.stringify(error);
          
          // Capture Supabase error to Sentry with context
          // Use the resolved errorMessage to ensure we never pass undefined
          captureSupabaseError(
            { code: errorObj.code, message: errorMessage, details: errorObj.details, hint: errorObj.hint },
            `${config.tableName}_operation`,
            { entityName: config.entityName }
          );
        } else {
          errorMessage = String(error) || "An unknown error occurred";
          // Capture non-object errors using the generic captureError function
          captureError(
            new Error(errorMessage), 
            { 
              operation: `${config.tableName}_operation`,
              entityName: config.entityName 
            }
          );
        }

        if (options.showErrorMessage) {
          console.error(`API call failed (${config.tableName}):`, errorMessage);
        }

        if (options.onError) {
          options.onError(errorMessage);
        }

        setError(errorMessage);
        return null;
      }
    },
    [config.tableName, config.entityName]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper function to build query with filters
  const buildQuery = useCallback((baseQuery: any, filters: QueryFilters) => {
    let query = baseQuery;

    // Apply eq filters
    if (filters.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply neq filters
    if (filters.neq) {
      Object.entries(filters.neq).forEach(([key, value]) => {
        query = query.neq(key, value);
      });
    }

    // Apply gt filters
    if (filters.gt) {
      Object.entries(filters.gt).forEach(([key, value]) => {
        query = query.gt(key, value);
      });
    }

    // Apply gte filters
    if (filters.gte) {
      Object.entries(filters.gte).forEach(([key, value]) => {
        query = query.gte(key, value);
      });
    }

    // Apply lt filters
    if (filters.lt) {
      Object.entries(filters.lt).forEach(([key, value]) => {
        query = query.lt(key, value);
      });
    }

    // Apply lte filters
    if (filters.lte) {
      Object.entries(filters.lte).forEach(([key, value]) => {
        query = query.lte(key, value);
      });
    }

    // Apply like filters
    if (filters.like) {
      Object.entries(filters.like).forEach(([key, value]) => {
        query = query.like(key, value);
      });
    }

    // Apply ilike filters
    if (filters.ilike) {
      Object.entries(filters.ilike).forEach(([key, value]) => {
        query = query.ilike(key, value);
      });
    }

    // Apply in filters
    if (filters.in) {
      Object.entries(filters.in).forEach(([key, value]) => {
        query = query.in(key, value);
      });
    }

    // Apply contains filters
    if (filters.contains) {
      Object.entries(filters.contains).forEach(([key, value]) => {
        query = query.contains(key, value);
      });
    }

    // Apply is filters (for null checks)
    if (filters.is) {
      Object.entries(filters.is).forEach(([key, value]) => {
        query = query.is(key, value);
      });
    }

    // Apply or filter
    if (filters.or) {
      query = query.or(filters.or);
    }

    // Apply and filter (this is usually implicit, but can be used for complex conditions)
    if (filters.and) {
      query = query.and(filters.and);
    }

    return query;
  }, []);

  // Helper function to apply query options
  const applyQueryOptions = useCallback((query: any, options: QueryOptions) => {
    // Apply ordering
    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach(({ column, ascending = true }) => {
        query = query.order(column, { ascending });
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Apply range/offset
    if (options.offset !== undefined && options.limit) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    }

    return query;
  }, []);

  // Enhanced method to fetch items with custom query
  const fetchItemsWithQuery = useCallback(
    async (queryConfig: EnhancedQueryOptions): Promise<T[]> => {
      const { filters = {}, options = {} } = queryConfig;

      setLoading(true); // Set loading at the method level

      const result = await callApi(
        async () => {
          // Apply default scoping
          const scopingFilters: QueryFilters = { ...filters };

          // Add company scoping if enabled
          if (config.companyScoped) {
            const companyId = employeeInfo?.company_id;
            if (!companyId) {
              // Return empty array for fetch operations when company_id not available
              setLoading(false);
              return [];
            }
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.company_id = companyId;
          }

          // Add user scoping if enabled
          if (config.userScoped) {
            const userId = employeeInfo?.id;
            if (!userId) throw new Error('User ID not available');
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.user_id = userId;
          }

          // Start with select
          let query = supabase
            .from(config.tableName)
            .select(options.select || "*");

          // Build query with filters
          query = buildQuery(query, scopingFilters);

          // Apply query options (excluding select since it's already applied)
          const queryOptions = { ...options, select: undefined };
          query = applyQueryOptions(query, queryOptions);

          const { data, error } = await query;
          if (error) throw error;

          return (data || []) as unknown as T[];
        },
        {
          showErrorMessage: true,
        }
      );

      setLoading(false); // Clear loading at the method level

      if (result) {
        setItems(result);
        return result;
      }

      return [];
    },
    [callApi, config, buildQuery, applyQueryOptions, employeeInfo?.company_id, employeeInfo?.id]
  );

  // Enhanced method to fetch a single item with custom query
  const fetchSingleWithQuery = useCallback(
    async (queryConfig: EnhancedQueryOptions): Promise<T | null> => {
      const { filters = {}, options = {} } = queryConfig;

      setLoading(true); // Set loading at the method level

      const result = await callApi(
        async () => {
          // Apply default scoping
          const scopingFilters: QueryFilters = { ...filters };

          // Add company scoping if enabled
          if (config.companyScoped) {
            const companyId = employeeInfo?.company_id;
            if (!companyId) {
              // Return null for single item fetch when company_id not available
              setLoading(false);
              return null;
            }
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.company_id = companyId;
          }

          // Add user scoping if enabled
          if (config.userScoped) {
            const userId = employeeInfo?.id;
            if (!userId) throw new Error('User ID not available');
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.user_id = userId;
          }

          // Start with select
          let query = supabase
            .from(config.tableName)
            .select(options.select || "*");

          // Build query with filters
          query = buildQuery(query, scopingFilters);

          // Apply query options (excluding limit and select since we want single)
          const singleOptions = {
            ...options,
            limit: undefined,
            select: undefined,
          };
          query = applyQueryOptions(query, singleOptions);

          // Use maybeSingle() to handle 0 or 1 rows gracefully (returns null if not found)
          const { data, error } = await query.maybeSingle();
          if (error) {
            throw error;
          }

          return data as unknown as T;
        },
        {
          showErrorMessage: true,
        }
      );

      setLoading(false); // Clear loading at the method level

      if (result !== null) {
        setItem(result);
      }

      return result;
    },
    [callApi, config, buildQuery, applyQueryOptions, employeeInfo?.company_id, employeeInfo?.id]
  );

  const fetchItems = useCallback(
    async (company_id?: number): Promise<void> => {
      setLoading(true); // Set loading at the method level

      const filters: Record<string, any> = {};

      // Add company scoping if enabled
      if (config.companyScoped) {
        if (company_id !== undefined) {
          filters.company_id = company_id;
        } else {
          // If no company_id provided, get from employee info
          const companyId = employeeInfo?.company_id;
          if (!companyId) {
            // Return empty for fetch when company_id not available
            setItems([]);
            setLoading(false);
            return;
          }
          filters.company_id = companyId;
        }
      }

      // Add user scoping if enabled
      if (config.userScoped) {
        const userId = employeeInfo?.id;
        if (!userId) throw new Error('User ID not available');
        filters.user_id = userId;
      }

      // Handle department scoping with direct Supabase query
      if (config.departmentScoped) {
        if (!employeeInfo) {
          console.warn('Cannot fetch department-scoped items: Employee info not available');
          setItems([]);
          setLoading(false);
          return;
        }

        
        // For department scoped items, we want items that are either:
        // 1. For the user's department, OR
        // 2. Global (department_id is null)
        if (employeeInfo.department_id) {
          let query = supabase.from(config.tableName).select("*");

          // Apply company scoping if enabled
          if (config.companyScoped && filters.company_id) {
            query = query.eq("company_id", filters.company_id);
          }

          // Apply department OR null filter
          query = query.or(
            `department_id.eq.${employeeInfo.department_id},department_id.is.null`
          );

          const result = await callApi(
            async () => {
              const { data, error } = await query;
              if (error) throw error;
              return data;
            },
            {
              showErrorMessage: true,
            }
          );

          setLoading(false); // Clear loading at the method level

          if (result) {
            setItems(result || []);
          }
          return;
        }
      }

      const result = await callApi(
        async () => {
          let query = supabase.from(config.tableName).select("*");

          // Apply each filter
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          const { data, error } = await query;
          if (error) throw error;
          return data;
        },
        {
          showErrorMessage: true,
        }
      );

      setLoading(false); // Clear loading at the method level

      if (result) {
        setItems(result);
      }
    },
    [
      callApi,
      config.tableName,
      config.companyScoped,
      config.userScoped,
      config.departmentScoped,
      employeeInfo?.company_id,
      employeeInfo?.id,
      employeeInfo?.department_id,
    ]
  );

  const fetchItem = useCallback(
    async (id: string | number): Promise<void> => {
      setLoading(true); // Set loading at the method level

      const result = await callApi(async () => {
        const { data, error } = await supabase.from(config.tableName).select("*").eq("id", id).single();
        if (error) throw error;
        return data;
      }, {
        showErrorMessage: true,
      });

      setLoading(false); // Clear loading at the method level

      if (result) {
        setItem(result);
      }
    },
    [callApi, config.tableName]
  );

  const createItem = useCallback(
    async (data: Partial<T>): Promise<ApiResponse<T>> => {
      setCreating(true);
      try {
        const createData = { ...data };

        // Add company scoping if enabled
        if (config.companyScoped) {
          const companyId = employeeInfo?.company_id;
          if (!companyId) throw new Error('Company ID not available');
          (createData as any).company_id = companyId;
        }

        // Add user scoping if enabled
        if (config.userScoped) {
          const userId = employeeInfo?.id;
          if (!userId) throw new Error('User ID not available');
          (createData as any).user_id = userId;
        }

        const result = await callApi(
          async () => {
            const { data, error } = await supabase
              .from(config.tableName)
              .insert(createData)
              .select()
              .single();
            if (error) throw error;
            return data;
          },
          {
            showSuccessMessage: true,
            showErrorMessage: true,
          }
        );

        if (result) {
          setItems((prev) => [...prev, result as T]);
          setCreating(false);
          return { success: true, data: result as T };
        }

        setCreating(false);
        return { success: false, error: "Failed to create item" };
      } catch (err) {
        setCreating(false);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create item";
        return { success: false, error: errorMessage };
      }
    },
    [callApi, config.tableName, config.companyScoped, config.userScoped, employeeInfo?.company_id, employeeInfo?.id]
  );

  const updateItem = useCallback(
    async (id: string | number, data: Partial<T>): Promise<ApiResponse<T>> => {
      setUpdating(true);
      try {
        const result = await callApi(
          async () => {
            const { data: updatedData, error } = await supabase
              .from(config.tableName)
              .update(data)
              .eq("id", id)
              .select()
              .single();
            if (error) throw error;
            return updatedData;
          },
          {
            showSuccessMessage: true,
            showErrorMessage: true,
          }
        );

        if (result) {
          // Compare with both number and string versions of id for compatibility
          setItems((prev) =>
            prev.map((item) => (item.id == id ? result as T : item))
          );
          setItem(result as T);
          setUpdating(false);
          return { success: true, data: result as T };
        }

        setUpdating(false);
        return { success: false, error: "Failed to update item" };
      } catch (err) {
        setUpdating(false);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update item";
        return { success: false, error: errorMessage };
      }
    },
    [callApi, config.tableName]
  );

  const deleteItem = useCallback(
    async (id: string | number): Promise<ApiResponse<boolean>> => {
      setDeleting(true);
      try {
        await callApi(async () => {
          const { data, error } = await supabase
            .from(config.tableName)
            .delete()
            .eq("id", id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }, {
          showSuccessMessage: true,
          showErrorMessage: true,
        });

        // Compare with both number and string versions of id for compatibility
        setItems((prev) => prev.filter((item) => item.id != id));
        if (item?.id == id) {
          setItem(null);
        }
        setDeleting(false);
        return { success: true, data: true };
      } catch (err) {
        setDeleting(false);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete item";
        return { success: false, error: errorMessage };
      }
    },
    [callApi, config.tableName, item]
  );

  const clearItem = useCallback(() => {
    setItem(null);
  }, []);

  return useMemo(() => ({
    items,
    item,
    loading,
    creating,
    updating,
    deleting,
    error,
    fetchItems,
    fetchItemsWithQuery,
    fetchSingleWithQuery,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    clearError,
    clearItem,
  }), [
    items,
    item,
    loading,
    creating,
    updating,
    deleting,
    error,
    fetchItems,
    fetchItemsWithQuery,
    fetchSingleWithQuery,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    clearError,
    clearItem,
  ]);
}

export default useBaseEntity;