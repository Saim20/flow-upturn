"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";
import { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createServerNotification } from "@/lib/notifications/utils";

export async function login({
  email,
  password,
  deviceId,
  deviceDetails,
}: {
  email: string;
  password: string;
  deviceId?: string;
  deviceDetails?: {
    browser: string;
    os: string;
    device_type: string;
    model: string;
    user_agent: string;
    device_info: string;
    location?: string;
  };
}) : Promise<{ error?: AuthError | { message: string }; success?: boolean }> {
  const supabase = await createClient();
  const headersList = await headers();
  
  // Get IP address - try multiple headers for production environments
  let ip = headersList.get('x-forwarded-for') || 
           headersList.get('x-real-ip') || 
           headersList.get('cf-connecting-ip') || // Cloudflare
           'Unknown IP';
  
  // If x-forwarded-for has multiple IPs (proxy chain), get the first one
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // For localhost, show a user-friendly message
  if (ip === '::1' || ip === '127.0.0.1') {
    ip = 'localhost';
  }

  const data = {
    email,
    password,
  };

  const { data: authData, error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    Sentry.withScope((scope) => {
      scope.setTag("auth_action", "login");
      scope.setTag("error_code", error.code || "unknown");
      scope.setContext("auth_error", {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      // Don't include email for privacy
      Sentry.captureException(error);
    });
    return { error };
  }

  // Device Check Logic - only if we have valid device information
  if (deviceId && deviceId.length > 0 && deviceDetails?.device_info && authData.user) {
    const userId = authData.user.id;
    
    console.log('Device check - deviceId:', deviceId, 'userId:', userId);
    
    // Check if user is a superadmin - they bypass device checks entirely
    const { data: isSuperadmin } = await supabase.rpc('is_superadmin', { check_user_id: userId });
    
    if (isSuperadmin) {
      console.log('Superadmin detected - bypassing device check');
      revalidatePath("/", "layout");
      return { success: true };
    }
    
    // Get employee info to find company
    const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', userId)
        .single();
        
    if (employee && employee.company_id) {
        // Get company limit
        const { data: company } = await supabase
            .from('companies')
            .select('max_device_limit')
            .eq('id', employee.company_id)
            .single();
            
        const limit = company?.max_device_limit || 3;
        
        // Check device
        const { data: device } = await supabase
            .from('user_devices')
            .select('*')
            .eq('user_id', userId)
            .eq('device_id', deviceId)
            .single();
            
        if (device) {
            if (device.status === 'approved') {
                // Update last login and details
                await supabase.from('user_devices').update({ 
                    last_login: new Date().toISOString(),
                    ip_address: ip,
                    // Update details in case they changed (e.g. browser update)
                    ...(deviceDetails ? {
                        browser: deviceDetails.browser,
                        os: deviceDetails.os,
                        device_type: deviceDetails.device_type,
                        model: deviceDetails.model,
                        user_agent: deviceDetails.user_agent,
                        device_info: deviceDetails.device_info,
                        location: deviceDetails.location || device.location // Update location if provided
                    } : {})
                }).eq('id', device.id);
            } else if (device.status === 'pending') {
                // Device is pending approval - sign out user and show message
                await supabase.auth.signOut();
                return { error: { message: "Your device is pending approval. Please wait for an administrator to approve your device before logging in." } as AuthError };
            } else {
                // Device is rejected
                await supabase.auth.signOut();
                return { error: { message: "This device has been rejected. Please contact your administrator." } as AuthError };
            }
        } else {
            // New device
            // Check count
            const { count } = await supabase
                .from('user_devices')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);
                
            if ((count || 0) >= limit) {
                await supabase.auth.signOut();
                return { error: { message: `Device limit reached (${limit}). Please ask your admin to remove an old device.` } as AuthError };
            } else {
                // Register as pending and sign out
                await supabase.from('user_devices').insert({
                    user_id: userId,
                    device_id: deviceId,
                    device_info: deviceDetails?.device_info || 'Unknown Device',
                    status: 'pending',
                    ip_address: ip,
                    location: deviceDetails?.location,
                    browser: deviceDetails?.browser,
                    os: deviceDetails?.os,
                    device_type: deviceDetails?.device_type,
                    model: deviceDetails?.model,
                    user_agent: deviceDetails?.user_agent
                });

                // Get user's name and supervisor for notification
                const { data: userForNotif } = await supabase
                  .from('employees')
                  .select('first_name, last_name, supervisor_id')
                  .eq('id', userId)
                  .single();

                console.log('User info for notification:', userForNotif);
                console.log('Company ID:', employee.company_id);

                if (userForNotif && userForNotif.supervisor_id && employee.company_id) {
                  const userName = `${userForNotif.first_name} ${userForNotif.last_name}`;
                  console.log('Sending notification to supervisor:', userForNotif.supervisor_id);
                  
                  const notificationResult = await createServerNotification({
                    recipient_id: [userForNotif.supervisor_id],
                    company_id: employee.company_id,
                    title: 'New Device Approval Request',
                    message: `${userName} has a new device pending approval.`,
                    type_id: 4, // General/System Notification Type
                    action_url: '/ops/onboarding/devices'
                  });
                  
                  console.log('Notification result:', notificationResult);
                } else {
                  console.log('Skipping notification - missing data:', {
                    hasUserInfo: !!userForNotif,
                    hasSupervisor: !!userForNotif?.supervisor_id,
                    hasCompanyId: !!employee.company_id
                  });
                }

                // Sign out and inform user to wait for approval
                await supabase.auth.signOut();
                return { error: { message: "New device detected. Your device has been registered and is pending approval. Please wait for an administrator to approve your device before logging in." } as AuthError };
            }
        }
    }
  }

  // Successful login - revalidate and redirect
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function signup({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email,
    password,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    Sentry.withScope((scope) => {
      scope.setTag("auth_action", "signup");
      scope.setTag("error_code", error.code || "unknown");
      scope.setContext("auth_error", {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      Sentry.captureException(error);
    });
    redirect("/error");
  }

  revalidatePath("/", "layout");
  redirect(`/verify?email=${email}`);
}

function getSiteUrl(){
  if (process.env.NODE_ENV === "production") {
    return "https://flow.upturn.com.bd";
  }
  return "http://localhost:3000";
}

export async function googleSignIn(){
  const supabase = await createClient();

  const response = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options:{
      redirectTo: getSiteUrl() + "/auth/callback",
    }
  });

  const error = response.error;

  if (error) {
    Sentry.withScope((scope) => {
      scope.setTag("auth_action", "google_signin");
      scope.setTag("error_code", error.code || "unknown");
      scope.setContext("auth_error", {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      Sentry.captureException(error);
    });
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(response.data.url);
}

export async function logout(){
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    Sentry.withScope((scope) => {
      scope.setTag("auth_action", "logout");
      scope.setTag("error_code", error.code || "unknown");
      scope.setContext("auth_error", {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      Sentry.captureException(error);
    });
    throw error;
  }
  redirect("/login");
}
