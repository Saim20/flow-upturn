"use client";

import { useState, useCallback } from "react";
import {
  BaseEntity,
  CrudHookResult,
  ApiResponse,
  EnhancedQueryOptions,
  QueryFilters,
  QueryOptions,
} from "./types";
import { useApiCall } from "./useApiCall";
import { api } from "@/lib/api";

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
  const [items, setItems] = useState<T[]>([]);
  const [item, setItem] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { loading, error, callApi, clearError } = useApiCall();

  config.companyScoped = config.companyScoped ?? true; // Default to true if not provided

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

      const result = await callApi(
        async () => {
          // Apply default scoping
          const scopingFilters: QueryFilters = { ...filters };

          // Add company scoping if enabled
          if (config.companyScoped) {
            const { getCompanyId } = await import("@/lib/api");
            const companyId = await getCompanyId();
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.company_id = companyId;
          }

          // Add user scoping if enabled
          if (config.userScoped) {
            const { getUserId } = await import("@/lib/api");
            const userId = await getUserId();
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.user_id = userId;
          }

          // Start with select
          let query = api.client
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

      if (result) {
        setItems(result);
        return result;
      }

      return [];
    },
    [callApi, config, buildQuery, applyQueryOptions]
  );

  // Enhanced method to fetch a single item with custom query
  const fetchSingleWithQuery = useCallback(
    async (queryConfig: EnhancedQueryOptions): Promise<T | null> => {
      const { filters = {}, options = {} } = queryConfig;

      const result = await callApi(
        async () => {
          // Apply default scoping
          const scopingFilters: QueryFilters = { ...filters };

          // Add company scoping if enabled
          if (config.companyScoped) {
            const { getCompanyId } = await import("@/lib/api");
            const companyId = await getCompanyId();
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.company_id = companyId;
          }

          // Add user scoping if enabled
          if (config.userScoped) {
            const { getUserId } = await import("@/lib/api");
            const userId = await getUserId();
            if (!scopingFilters.eq) scopingFilters.eq = {};
            scopingFilters.eq.user_id = userId;
          }

          // Start with select
          let query = api.client
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

          // Use single() for single record
          const { data, error } = await query.single();
          if (error) {
            if (error.code === "PGRST116") {
              return null; // No rows found
            }
            throw error;
          }

          return data as unknown as T;
        },
        {
          showErrorMessage: true,
        }
      );

      if (result !== null) {
        setItem(result);
      }

      return result;
    },
    [callApi, config, buildQuery, applyQueryOptions]
  );

  const fetchItems = useCallback(
    async (company_id?: number): Promise<void> => {
      const filters: Record<string, any> = {};

      // Add company scoping if enabled
      if (config.companyScoped) {
        if (company_id !== undefined) {
          filters.company_id = company_id;
        } else {
          // If no company_id provided, fetch from API
          // This allows the hook to be used without passing company_id explicitly
          const { getCompanyId } = await import("@/lib/api");
          filters.company_id = await getCompanyId();
        }
      }

      // Add user scoping if enabled
      if (config.userScoped) {
        const { getUserId } = await import("@/lib/api");
        filters.user_id = await getUserId();
      }

      // Handle department scoping with direct Supabase query
      if (config.departmentScoped) {
        const { getEmployeeInfo } = await import("@/lib/api");
        const employeeInfo = await getEmployeeInfo();

        // For department scoped items, we want items that are either:
        // 1. For the user's department, OR
        // 2. Global (department_id is null)
        if (employeeInfo.department_id) {
          let query = api.client.from(config.tableName).select("*");

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
          if (result) {
            setItems(result || []);
          }
          return;
        }
      }

      const result = await callApi(
        () => api.getAll<T>(config.tableName, { filters }),
        {
          showErrorMessage: true,
        }
      );
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
    ]
  );

  const fetchItem = useCallback(
    async (id: string | number): Promise<void> => {
      const result = await callApi(() => api.getById<T>(config.tableName, id), {
        showErrorMessage: true,
      });
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
          const { getCompanyId } = await import("@/lib/api");
          (createData as any).company_id = await getCompanyId();
        }

        // Add user scoping if enabled
        if (config.userScoped) {
          const { getUserId } = await import("@/lib/api");
          (createData as any).user_id = await getUserId();
        }

        const result = await callApi(
          () => api.create<T>(config.tableName, createData),
          {
            showSuccessMessage: true,
            showErrorMessage: true,
          }
        );

        if (result) {
          setItems((prev) => [...prev, result]);
          setCreating(false);
          return { success: true, data: result };
        }

        setCreating(false);
        return { success: false, error: error || "Failed to create item" };
      } catch (err) {
        setCreating(false);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create item";
        return { success: false, error: errorMessage };
      }
    },
    [callApi, config.tableName, config.companyScoped, config.userScoped, error]
  );

  const updateItem = useCallback(
    async (id: string | number, data: Partial<T>): Promise<ApiResponse<T>> => {
      setUpdating(true);
      try {
        const result = await callApi(
          () => api.update<T>(config.tableName, id, data),
          {
            showSuccessMessage: true,
            showErrorMessage: true,
          }
        );

        if (result) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? result : item))
          );
          setItem(result);
          setUpdating(false);
          return { success: true, data: result };
        }

        setUpdating(false);
        return { success: false, error: error || "Failed to update item" };
      } catch (err) {
        setUpdating(false);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update item";
        return { success: false, error: errorMessage };
      }
    },
    [callApi, config.tableName, error]
  );

  const deleteItem = useCallback(
    async (id: string | number): Promise<ApiResponse<boolean>> => {
      setDeleting(true);
      try {
        await callApi(() => api.delete(config.tableName, id), {
          showSuccessMessage: true,
          showErrorMessage: true,
        });

        setItems((prev) => prev.filter((item) => item.id !== id));
        if (item?.id === id) {
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
    [callApi, config.tableName, error, item]
  );

  const clearItem = useCallback(() => {
    setItem(null);
  }, []);

  return {
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
  };
}

export default useBaseEntity;
