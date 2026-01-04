"use server";

import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'
import { headers, cookies } from 'next/headers';
import { createServerNotification } from '@/lib/notifications/utils';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Redirect authenticated users to /home by default
  const next = searchParams.get('next') ?? '/home'

  // Get device info from cookies (set by client before OAuth redirect)
  const cookieStore = await cookies();
  const deviceId = cookieStore.get('device_id')?.value || '';
  const deviceDetailsStr = cookieStore.get('device_details')?.value || '';

  // Clear the device cookies after reading
  if (deviceId) {
    cookieStore.delete('device_id');
    cookieStore.delete('device_details');
  }

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && sessionData.user) {
      // Device verification for OAuth logins
      if (deviceId && deviceId.length > 0) {
        const userId = sessionData.user.id;

        // Check if user is a superadmin - they bypass device checks entirely
        const { data: isSuperadmin } = await supabase.rpc('is_superadmin', { check_user_id: userId });

        if (isSuperadmin) {
          console.log('OAuth - Superadmin detected - bypassing device check');
          // Proceed with normal redirect
          const forwardedHost = request.headers.get('x-forwarded-host');
          const isLocalEnv = process.env.NODE_ENV === 'development';
          if (isLocalEnv) {
            return NextResponse.redirect(`${origin}${next}`);
          } else if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`);
          } else {
            return NextResponse.redirect(`${origin}${next}`);
          }
        }

        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || 'Unknown';

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

        let deviceDetails = null;
        try {
          deviceDetails = deviceDetailsStr ? JSON.parse(deviceDetailsStr) : null;
        } catch (e) {
          console.error('Failed to parse device details:', e);
        }

        // Get employee info to find company
        const { data: employee } = await supabase
          .from('employees')
          .select('company_id')
          .eq('id', userId)
          .single();

        if (employee?.company_id) {
          // Get company limit and device approval setting
          const { data: company } = await supabase
            .from('companies')
            .select('max_device_limit, device_approval_enabled')
            .eq('id', employee.company_id)
            .single();

          // Skip device checks if device approval is disabled
          if (!company?.device_approval_enabled) {
            console.log('OAuth - Device approval disabled - skipping device check');
            // Proceed with normal redirect
            const forwardedHost = request.headers.get('x-forwarded-host');
            const isLocalEnv = process.env.NODE_ENV === 'development';
            if (isLocalEnv) {
              return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
              return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
              return NextResponse.redirect(`${origin}${next}`);
            }
          }

          const limit = company?.max_device_limit || 3;

          // Check if device exists
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
                user_agent: userAgent,
                // Update device details if available
                ...(deviceDetails ? {
                  browser: deviceDetails.browser,
                  os: deviceDetails.os,
                  device_type: deviceDetails.device_type,
                  model: deviceDetails.model,
                  device_info: deviceDetails.device_info,
                  location: deviceDetails.location || device.location // Update location if provided
                } : {})
              }).eq('id', device.id);

              // Allow login - proceed to redirect
            } else if (device.status === 'pending') {
              // Device pending - sign out and redirect to login with error
              await supabase.auth.signOut();
              return NextResponse.redirect(`${origin}/login?error=device_pending`);
            } else {
              // Device rejected - sign out and redirect to login with error
              await supabase.auth.signOut();
              return NextResponse.redirect(`${origin}/login?error=device_rejected`);
            }
          } else {
            // New device - check limit
            const { count } = await supabase
              .from('user_devices')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId);

            if ((count || 0) >= limit) {
              // Limit reached - sign out
              await supabase.auth.signOut();
              return NextResponse.redirect(`${origin}/login?error=device_limit`);
            } else {
              // Register new device as pending
              await supabase.from('user_devices').insert({
                user_id: userId,
                device_id: deviceId,
                device_info: deviceDetails?.device_info || userAgent,
                status: 'pending',
                ip_address: ip,
                user_agent: userAgent,
                location: deviceDetails?.location,
                browser: deviceDetails?.browser,
                os: deviceDetails?.os,
                device_type: deviceDetails?.device_type,
                model: deviceDetails?.model
              });

              // Send notification to supervisor
              if (employee?.company_id) {
                const { data: userForNotif } = await supabase
                  .from('employees')
                  .select('first_name, last_name, supervisor_id')
                  .eq('id', userId)
                  .single();

                console.log('OAuth - User info for notification:', userForNotif);
                console.log('OAuth - Company ID:', employee.company_id);

                if (userForNotif && userForNotif.supervisor_id) {
                  const userName = `${userForNotif.first_name} ${userForNotif.last_name}`;
                  console.log('OAuth - Sending notification to supervisor:', userForNotif.supervisor_id);

                  const notificationResult = await createServerNotification({
                    recipient_id: [userForNotif.supervisor_id],
                    company_id: employee.company_id,
                    title: 'New Device Approval Request',
                    message: `${userName} has a new device pending approval.`,
                    type_id: 4, // General/System Notification Type
                    action_url: '/ops/onboarding/devices'
                  });

                  console.log('OAuth - Notification result:', notificationResult);
                } else {
                  console.log('OAuth - Skipping notification - missing data:', {
                    hasUserInfo: !!userForNotif,
                    hasSupervisor: !!userForNotif?.supervisor_id,
                    hasCompanyId: !!employee.company_id
                  });
                }
              }

              // Sign out and redirect with pending message
              await supabase.auth.signOut();
              return NextResponse.redirect(`${origin}/login?error=device_pending_new`);
            }
          }
        }
      }

      // If no device check needed or approved, proceed with redirect
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}