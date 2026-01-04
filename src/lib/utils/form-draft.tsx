"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Form Draft Persistence Utility
 * 
 * This utility provides automatic form draft saving and restoration to prevent
 * data loss when users switch browser tabs or navigate away temporarily.
 * 
 * Features:
 * - Automatic persistence to sessionStorage (persists until browser tab is closed)
 * - Debounced saves to avoid performance issues
 * - TypeScript support with generics
 * - Automatic cleanup on form submission
 * 
 * Usage:
 * ```tsx
 * const { draftData, saveDraft, clearDraft, hasDraft } = useFormDraft<TaskFormData>('task-create');
 * 
 * // Restore draft on mount
 * useEffect(() => {
 *   if (draftData) {
 *     setFormData(draftData);
 *   }
 * }, []);
 * 
 * // Save draft on change
 * const handleChange = (field, value) => {
 *   setFormData(prev => {
 *     const newData = { ...prev, [field]: value };
 *     saveDraft(newData);
 *     return newData;
 *   });
 * };
 * 
 * // Clear draft on successful submit
 * const handleSubmit = async () => {
 *   const result = await submitForm(formData);
 *   if (result.success) {
 *     clearDraft();
 *   }
 * };
 * ```
 */

const STORAGE_PREFIX = 'flow_draft_';
const DEBOUNCE_MS = 500;

interface FormDraftOptions {
  /** Debounce time in milliseconds for save operations */
  debounceMs?: number;
  /** Whether to use localStorage instead of sessionStorage */
  persistent?: boolean;
}

interface FormDraftResult<T> {
  /** The restored draft data, or null if no draft exists */
  draftData: T | null;
  /** Save the current form data as a draft */
  saveDraft: (data: T) => void;
  /** Clear the saved draft */
  clearDraft: () => void;
  /** Whether a draft exists */
  hasDraft: boolean;
  /** Whether the draft is currently being restored */
  isRestoring: boolean;
}

/**
 * Hook for persisting form data across tab switches and page navigations
 * 
 * @param key - Unique identifier for this form (e.g., 'task-create', 'project-edit-123')
 * @param options - Configuration options
 * @returns Draft management functions and state
 */
export function useFormDraft<T extends object>(
  key: string,
  options: FormDraftOptions = {}
): FormDraftResult<T> {
  const { debounceMs = DEBOUNCE_MS, persistent = false } = options;
  
  const [draftData, setDraftData] = useState<T | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = `${STORAGE_PREFIX}${key}`;
  
  // Get the appropriate storage
  const getStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return persistent ? localStorage : sessionStorage;
  }, [persistent]);
  
  // Restore draft on mount
  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      setIsRestoring(false);
      return;
    }
    
    try {
      const saved = storage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        setDraftData(parsed);
        setHasDraft(true);
      }
    } catch (error) {
      console.warn(`Failed to restore draft for ${key}:`, error);
      // Clear corrupted data
      storage.removeItem(storageKey);
    } finally {
      setIsRestoring(false);
    }
  }, [storageKey, getStorage, key]);
  
  // Debounced save function
  const saveDraft = useCallback((data: T) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const storage = getStorage();
      if (!storage) return;
      
      try {
        storage.setItem(storageKey, JSON.stringify(data));
        setDraftData(data);
        setHasDraft(true);
      } catch (error) {
        console.warn(`Failed to save draft for ${key}:`, error);
      }
    }, debounceMs);
  }, [storageKey, debounceMs, getStorage, key]);
  
  // Clear draft
  const clearDraft = useCallback(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const storage = getStorage();
    if (!storage) return;
    
    try {
      storage.removeItem(storageKey);
      setDraftData(null);
      setHasDraft(false);
    } catch (error) {
      console.warn(`Failed to clear draft for ${key}:`, error);
    }
  }, [storageKey, getStorage, key]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    draftData,
    saveDraft,
    clearDraft,
    hasDraft,
    isRestoring,
  };
}

/**
 * Higher-order component for wrapping forms with draft persistence
 * 
 * @param key - Unique identifier for this form
 * @returns Wrapper component
 */
export function withFormDraft<T extends object, P extends object>(
  WrappedComponent: React.ComponentType<P & { draft: FormDraftResult<T> }>,
  key: string,
  options?: FormDraftOptions
) {
  return function FormWithDraft(props: P) {
    const draft = useFormDraft<T>(key, options);
    return <WrappedComponent {...props} draft={draft} />;
  };
}

/**
 * Utility to manually clear all form drafts
 * Useful for logout or clearing user data
 */
export function clearAllFormDrafts() {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  
  // Check sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  // Check localStorage
  keysToRemove.length = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Get a list of all saved form drafts
 * Useful for debugging or showing users their drafts
 */
export function getFormDraftKeys(): string[] {
  if (typeof window === 'undefined') return [];
  
  const keys: string[] = [];
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      const cleanKey = key.replace(STORAGE_PREFIX, '');
      if (!keys.includes(cleanKey)) {
        keys.push(cleanKey);
      }
    }
  }
  
  return keys;
}
