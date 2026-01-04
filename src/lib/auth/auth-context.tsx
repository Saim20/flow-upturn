"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { navItems } from "@/app/(home)/nav-items";
import { getEmployeeInfo } from "../utils/auth";
import type { UserPermissions } from "@/lib/types/schemas";
import { captureSupabaseError } from "@/lib/sentry";

export type EmployeeInfo = {
  id: string;
  name: string;
  has_approval: string;
  company_id?: string | number;
  supervisor_id?: string | null;
  department_id?: string | number;
  email?: string;
  phone_number?: string;
  designation?: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  employeeInfo: EmployeeInfo | null;
  isApproved: boolean;
  permissions: UserPermissions;
  permissionsLoading: boolean;
  getAuthorizedNavItems: () => typeof navItems;
  
  // Basic permission checks
  hasPermission: (module: string, action: string) => boolean;
  canRead: (module: string) => boolean;
  canWrite: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  canApprove: (module: string) => boolean;
  canComment: (module: string) => boolean;
  
  // Advanced permission checks
  hasAnyPermission: (module: string) => boolean;
  hasAllPermissions: (module: string, actions: string[]) => boolean;
  hasAnyOfPermissions: (module: string, actions: string[]) => boolean;
  
  // Permission utilities
  getAccessibleModules: () => string[];
  getModulesWithAction: (action: string) => string[];
  getModulePermissions: (module: string) => {
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
    can_approve: boolean;
    can_comment: boolean;
  };
  isAdmin: () => boolean;
  canManageOperations: () => boolean;
  
  // Permissions management
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [employeeDataLoading, setEmployeeDataLoading] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.getSession();
      
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch employee data when user changes
  useEffect(() => {
    async function fetchEmployeeData() {
      if (!user) {
        setEmployeeInfo(null);
        setEmployeeDataLoading(false);
        return;
      }

      setEmployeeDataLoading(true);

      try {
        const data = await getEmployeeInfo();
        setEmployeeInfo(data);
      } catch (error) {
        captureSupabaseError(
          { message: error instanceof Error ? error.message : String(error) },
          "getEmployeeInfo",
          { userId: user?.id }
        );
        console.error('Failed to get employee info', error);
        setEmployeeInfo(null);
      } finally {
        setEmployeeDataLoading(false);
      }
    }

    fetchEmployeeData();
  }, [user]);

  // Fetch user permissions when user changes
  useEffect(() => {
    async function fetchUserPermissions() {
      if (!user) {
        setPermissions({});
        return;
      }

      setPermissionsLoading(true);
      try {
        // Call the database function to get aggregated permissions
        const { data, error } = await supabase
          .rpc('get_user_permissions', { user_id: user.id });

        if (error) throw error;

        // Transform array to object for easier lookups
        const permissionsMap: UserPermissions = {};
        (data || []).forEach((perm: any) => {
          permissionsMap[perm.module_name] = {
            can_read: perm.can_read,
            can_write: perm.can_write,
            can_delete: perm.can_delete,
            can_approve: perm.can_approve,
            can_comment: perm.can_comment,
          };
        });

        setPermissions(permissionsMap);
      } catch (error) {
        captureSupabaseError(
          { message: error instanceof Error ? error.message : String(error) },
          "fetchUserPermissions",
          { userId: user?.id }
        );
        console.error('Failed to fetch permissions:', error);
        setPermissions({});
      } finally {
        setPermissionsLoading(false);
      }
    }

    fetchUserPermissions();
  }, [user]);

  // Determine if the user is approved
  const isApproved = employeeInfo?.has_approval === "ACCEPTED";

  /**
   * Check if user has a specific permission for a module
   * @param module - Module name (e.g., 'tasks', 'projects', 'leave')
   * @param action - Permission action (e.g., 'can_read', 'can_write', 'can_delete', 'can_approve', 'can_comment')
   * @returns True if user has the permission, false otherwise
   */
  const hasPermission = (module: string, action: string): boolean => {
    if (!permissions[module]) return false;
    const actionKey = action as keyof typeof permissions[typeof module];
    return permissions[module][actionKey] === true;
  };

  /** Check if user can read from a module */
  const canRead = (module: string): boolean => hasPermission(module, 'can_read');
  
  /** Check if user can write to a module */
  const canWrite = (module: string): boolean => hasPermission(module, 'can_write');
  
  /** Check if user can delete from a module */
  const canDelete = (module: string): boolean => hasPermission(module, 'can_delete');
  
  /** Check if user can approve in a module */
  const canApprove = (module: string): boolean => hasPermission(module, 'can_approve');
  
  /** Check if user can comment in a module */
  const canComment = (module: string): boolean => hasPermission(module, 'can_comment');

  /**
   * Refresh user permissions from the server
   * 
   * Call this after:
   * - User is added to or removed from a team
   * - Team permissions are modified
   * - User's role changes
   * 
   * @returns Promise that resolves when permissions are refreshed
   */
  const refreshPermissions = async () => {
    if (!user) return;

    setPermissionsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id: user.id });

      if (error) throw error;

      const permissionsMap: UserPermissions = {};
      (data || []).forEach((perm: any) => {
        permissionsMap[perm.module_name] = {
          can_read: perm.can_read,
          can_write: perm.can_write,
          can_delete: perm.can_delete,
          can_approve: perm.can_approve,
          can_comment: perm.can_comment,
        };
      });

      setPermissions(permissionsMap);
    } catch (error) {
      captureSupabaseError(
        { message: error instanceof Error ? error.message : String(error) },
        "refreshPermissions",
        { userId: user?.id }
      );
      console.error('Failed to refresh permissions:', error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  /**
   * Check if user has any permission for a module
   * @param module - Module name
   * @returns True if user has at least one permission for the module
   */
  const hasAnyPermission = (module: string): boolean => {
    if (!permissions[module]) return false;
    
    const modulePerms = permissions[module];
    return modulePerms.can_read || 
           modulePerms.can_write || 
           modulePerms.can_delete || 
           modulePerms.can_approve || 
           modulePerms.can_comment;
  };

  /**
   * Check if user has all specified permissions for a module
   * @param module - Module name
   * @param actions - Array of permission actions to check
   * @returns True if user has all specified permissions
   */
  const hasAllPermissions = (module: string, actions: string[]): boolean => {
    return actions.every(action => hasPermission(module, action));
  };

  /**
   * Check if user has any of the specified permissions for a module
   * @param module - Module name
   * @param actions - Array of permission actions to check
   * @returns True if user has at least one of the specified permissions
   */
  const hasAnyOfPermissions = (module: string, actions: string[]): boolean => {
    return actions.some(action => hasPermission(module, action));
  };

  /**
   * Get all modules the user has access to
   * @returns Array of module names the user can access
   */
  const getAccessibleModules = (): string[] => {
    return Object.keys(permissions).filter(module => hasAnyPermission(module));
  };

  /**
   * Get all modules where user has a specific action
   * @param action - Permission action (e.g., 'can_write', 'can_approve')
   * @returns Array of module names where user has the specified action
   */
  const getModulesWithAction = (action: string): string[] => {
    return Object.keys(permissions).filter(module => 
      hasPermission(module, action)
    );
  };

  /**
   * Get full permission object for a module
   * @param module - Module name
   * @returns Permission object with all actions for the module
   */
  const getModulePermissions = (module: string) => {
    return permissions[module] || {
      can_read: false,
      can_write: false,
      can_delete: false,
      can_approve: false,
      can_comment: false,
    };
  };

  /**
   * Check if user is in admin team (has team management permissions)
   * @returns True if user can manage teams
   */
  const isAdmin = (): boolean => {
    return hasPermission('teams', 'can_write');
  };

  /**
   * Check if user can manage operational modules
   * @returns True if user can write to onboarding, offboarding, or hris
   */
  const canManageOperations = (): boolean => {
    return canWrite('onboarding') || canWrite('offboarding') || canWrite('hris');
  };

  // Function to get navigation items based on user permissions and approval
  const getAuthorizedNavItems = () => {
    if (!employeeInfo || !isApproved) {
      return [];
    }
    
    // FunnelSimple nav items based on required permissions
    return navItems.filter(item => {
      // Permission-based filtering
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        return item.requiredPermissions.some(perm => {
          const [module, action] = perm.split(':');
          return hasPermission(module, action);
        });
      }
      
      // If no permissions specified, show to all approved users
      return true;
    });
  };

  const value = {
    user,
    session,
    isLoading: isLoading || employeeDataLoading,
    employeeInfo,
    isApproved,
    permissions,
    permissionsLoading,
    getAuthorizedNavItems,
    
    // Basic permission checks
    hasPermission,
    canRead,
    canWrite,
    canDelete,
    canApprove,
    canComment,
    
    // Advanced permission checks
    hasAnyPermission,
    hasAllPermissions,
    hasAnyOfPermissions,
    
    // Permission utilities
    getAccessibleModules,
    getModulesWithAction,
    getModulePermissions,
    isAdmin,
    canManageOperations,
    
    // Permissions management
    refreshPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
