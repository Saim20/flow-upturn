"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

// Types
import { Schooling, Experience } from "@/lib/types";
import { BasicInfoFormData, PersonalFormData } from "@/components/profile";

// Type aliases for consistency
export type Education = Schooling;

// Comprehensive profile hook that combines basic info, personal info, and education/experience
export function useProfile() {
  const { employeeInfo } = useAuth();
  // State for basic info
  const [basicInfo, setBasicInfo] = useState<BasicInfoFormData | null>(null);
  
  // State for personal info
  const [personalInfo, setPersonalInfo] = useState<PersonalFormData | null>(null);
  
  // State for education and experience
  const [educations, setEducations] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  
  // Shared states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(true);

  // Basic Info methods
  const fetchCurrentUserBasicInfo = useCallback(async () => {
    if (!employeeInfo) {
      console.warn('Cannot fetch basic info: Employee info not available');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: result, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeInfo.id)
        .single();

      if (error) throw error;
      
      setBasicInfo(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch basic info";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserBasicInfo = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) throw error;
      
      setBasicInfo(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch user's basic info";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBasicInfo = useCallback(async (data: Partial<BasicInfoFormData>) => {
    if (!employeeInfo) {
      console.warn('Cannot update basic info: Employee info not available');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      // FunnelSimple out undefined values and empty objects
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== null)
      );
      
      if (Object.keys(updateData).length === 0) {
        // No data to update, return current info
        const { data: currentData, error: fetchError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeInfo.id)
          .single();
        
        if (fetchError) throw fetchError;
        setBasicInfo(currentData);
        return { data: currentData };
      }
      
      const { data: result, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employeeInfo.id)
        .select()
        .single();

      if (error) throw error;
      
      setBasicInfo(result);
      return { data: result };
    } catch (err: any) {
      let errorMessage = "Failed to update basic info";
      
      // Handle specific PostgreSQL error codes
      if (err?.code === '23505') {
        if (err?.details?.includes('email')) {
          errorMessage = "This email address is already in use by another employee.";
        } else {
          errorMessage = "This information conflicts with existing data. Please check your inputs.";
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error("Update basic info error:", err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Personal Info methods
  const fetchCurrentUserPersonalInfo = useCallback(async () => {
    if (!employeeInfo) {
      console.warn('Cannot fetch personal info: Employee info not available');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: result, error } = await supabase
        .from('personal_infos')
        .select('*')
        .eq('id', employeeInfo.id)
        .single();

      // Handle case where no personal info record exists yet
      if (error && error.code === 'PGRST116') {
        // No personal info record found - this is not an error, just return null
        setPersonalInfo(null);
        return null;
      }
      
      if (error) throw error;
      
      setPersonalInfo(result);
      return result;
    } catch (err: any) {
      // Don't treat missing records as errors
      if (err?.code === 'PGRST116') {
        setPersonalInfo(null);
        return null;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch personal info";
      setError(errorMessage);
      console.error("Fetch personal info error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserPersonalInfo = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error } = await supabase
        .from('personal_infos')
        .select('*')
        .eq('id', uid)
        .single();

      // Handle case where no personal info record exists yet
      if (error && error.code === 'PGRST116') {
        // No personal info record found - this is not an error, just return null
        setPersonalInfo(null);
        return null;
      }
      
      if (error) throw error;
      
      setPersonalInfo(result);
      return result;
    } catch (err: any) {
      // Don't treat missing records as errors
      if (err?.code === 'PGRST116') {
        setPersonalInfo(null);
        return null;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch user's personal info";
      setError(errorMessage);
      console.error("Fetch user personal info error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePersonalInfo = useCallback(async (data: Partial<PersonalFormData>) => {
    if (!employeeInfo) {
      console.warn('Cannot update personal info: Employee info not available');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      // FunnelSimple out empty values and enum fields that are empty strings
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([key, value]) => {
          // Remove completely empty values
          if (value === null || value === undefined) return false;
          
          // For enum fields (gender, blood_group, marital_status), filter out empty strings
          const enumFields = ['gender', 'blood_group', 'marital_status'];
          if (enumFields.includes(key) && value === '') return false;
          
          // Keep all other non-empty values (including empty strings for text fields)
          return true;
        })
      );
      
      // If no valid data to update, return current data
      if (Object.keys(cleanData).length === 0) {
        const { data: currentData } = await supabase
          .from('personal_infos')
          .select('*')
          .eq('id', employeeInfo.id)
          .single();
        
        if (currentData) {
          setPersonalInfo(currentData);
          return currentData;
        }
      }
      
      // Try to update existing record
      const { data: result, error } = await supabase
        .from('personal_infos')
        .update(cleanData)
        .eq('id', employeeInfo.id)
        .select()
        .single();

      // If record doesn't exist, create it (upsert)
      if (error && error.code === 'PGRST116') {
        const { data: insertResult, error: insertError } = await supabase
          .from('personal_infos')
          .insert({ id: employeeInfo.id, company_id: employeeInfo.company_id, ...cleanData })
          .select()
          .single();
          
        if (insertError) throw insertError;
        setPersonalInfo(insertResult);
        return insertResult;
      }
      
      if (error) throw error;
      
      setPersonalInfo(result);
      return result;
    } catch (err: any) {
      let errorMessage = "Failed to update personal info";
      
      // Handle specific enum validation errors
      if (err?.code === '22P02' && err?.message?.includes('enum')) {
        errorMessage = "Invalid selection for dropdown fields. Please check your selections.";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error("Update personal info error:", err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Education and Experience methods
  const fetchUserEducation = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('schoolings')
        .select('*')
        .eq('employee_id', uid);

      if (error) throw error;
      
      const educationData = data || [];
      setEducations(educationData);
      return educationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch education data";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserExperience = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('employee_id', uid);

      if (error) throw error;
      
      const experienceData = data || [];
      setExperiences(experienceData);
      return experienceData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch experience data";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Education CRUD operations
  const createEducation = useCallback(async (educationData: Omit<Education, "id">) => {
    if (!employeeInfo) {
      console.warn('Cannot create education: Employee info not available');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      // Ensure employee_id and company_id are set
      const dataWithEmployeeId = {
        ...educationData,
        employee_id: educationData.employee_id || employeeInfo.id,
        company_id: employeeInfo.company_id,
      };

      const { data, error } = await supabase
        .from('schoolings')
        .insert([dataWithEmployeeId])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setEducations(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create education";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [employeeInfo]);

  const updateEducation = useCallback(async (id: number, educationData: Partial<Education>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('schoolings')
        .update(educationData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setEducations(prev => prev.map(item => item.id === id ? data : item));
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update education";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEducation = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('schoolings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setEducations(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete education";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Experience CRUD operations
  const createExperience = useCallback(async (experienceData: Omit<Experience, "id">) => {
    if (!employeeInfo) {
      console.warn('Cannot create experience: Employee info not available');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      // Ensure employee_id and company_id are set
      const dataWithEmployeeId = {
        ...experienceData,
        employee_id: experienceData.employee_id || employeeInfo.id,
        company_id: employeeInfo.company_id,
      };

      const { data, error } = await supabase
        .from('experiences')
        .insert([dataWithEmployeeId])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setExperiences(prev => [...prev, data]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create experience";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [employeeInfo]);

  const updateExperience = useCallback(async (id: number, experienceData: Partial<Experience>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('experiences')
        .update(experienceData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setExperiences(prev => prev.map(item => item.id === id ? data : item));
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update experience";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteExperience = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('experiences')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setExperiences(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete experience";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current user's education and experience
  const fetchCurrentUserEducation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      return await fetchUserEducation(user.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch current user education";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUserEducation]);

  const fetchCurrentUserExperience = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      return await fetchUserExperience(user.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch current user experience";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUserExperience]);

  // Comprehensive user data fetch
  const fetchUserProfile = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      // Check if this is the current user's profile
      const currentUserId = employeeInfo?.id;
      const isCurrentUserResult = currentUserId === uid;
      setIsCurrentUser(isCurrentUserResult);
      
      // Fetch all user data in parallel
      const [basicInfoResult, personalInfoResult, educationResult, experienceResult] = await Promise.all([
        supabase.from('employees').select('*').eq('id', uid).single(),
        supabase.from('personal_infos').select('*').eq('id', uid).single(),
        supabase.from('schoolings').select('*').eq('employee_id', uid),
        supabase.from('experiences').select('*').eq('employee_id', uid)
      ]);
      
      // Handle any errors
      if (basicInfoResult.error) throw basicInfoResult.error;
      if (personalInfoResult.error) throw personalInfoResult.error;
      if (educationResult.error) throw educationResult.error;
      if (experienceResult.error) throw experienceResult.error;
      
      const basicInfoData = basicInfoResult.data;
      const personalInfoData = personalInfoResult.data;
      const educationData = educationResult.data || [];
      const experienceData = experienceResult.data || [];
      
      // Update all states
      setBasicInfo(basicInfoData);
      setPersonalInfo(personalInfoData);
      setEducations(educationData);
      setExperiences(experienceData);
      
      return {
        basicInfo: basicInfoData,
        personalInfo: personalInfoData,
        educations: educationData,
        experiences: experienceData,
        isCurrentUser: isCurrentUserResult
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch user profile";
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // States
    basicInfo,
    personalInfo,
    educations,
    experiences,
    loading,
    error,
    isCurrentUser,
    
    // Basic Info methods
    fetchCurrentUserBasicInfo,
    fetchUserBasicInfo,
    updateBasicInfo,
    
    // Personal Info methods
    fetchCurrentUserPersonalInfo,
    fetchUserPersonalInfo,
    updatePersonalInfo,
    
    // Education and Experience methods
    fetchUserEducation,
    fetchUserExperience,
    fetchCurrentUserEducation,
    fetchCurrentUserExperience,
    
    // Education CRUD operations
    createEducation,
    updateEducation,
    deleteEducation,
    
    // Experience CRUD operations
    createExperience,
    updateExperience,
    deleteExperience,
    
    // Comprehensive fetch method
    fetchUserProfile
  };
} 