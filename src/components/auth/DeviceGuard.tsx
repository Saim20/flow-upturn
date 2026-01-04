'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getDeviceId } from '@/lib/utils/device';
import { useAuth } from '@/lib/auth/auth-context';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DeviceGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const hasChecked = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'checking' | 'approved' | 'pending' | 'rejected' | 'not_found' | 'no_user'>('checking');

  useEffect(() => {
    let mounted = true;

    async function checkDevice() {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // No user - allow through (skip check)
      if (!user) {
        if (mounted) setDeviceStatus('no_user');
        hasChecked.current = true;
        return;
      }

      // Check if user changed (new login) - reset the check flag
      if (lastUserId.current !== user.id) {
        hasChecked.current = false;
        lastUserId.current = user.id;
      }

      // Only check once per user session
      if (hasChecked.current) {
        return;
      }

      // Mark as checked
      hasChecked.current = true;

      // Check if user is a superadmin - they bypass device checks entirely
      try {
        const { data: isSuperadmin } = await supabase.rpc('is_superadmin', { check_user_id: user.id });
        if (isSuperadmin) {
          console.log('[DeviceGuard] Superadmin detected - bypassing device check');
          if (mounted) setDeviceStatus('approved');
          return;
        }
      } catch (err) {
        console.error('[DeviceGuard] Error checking superadmin status:', err);
        // Continue with normal device check if superadmin check fails
      }

      // Check if device approval is enabled for this company
      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (employee?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('device_approval_enabled')
            .eq('id', employee.company_id)
            .single();

          // Skip device checks if device approval is disabled
          if (!company?.device_approval_enabled) {
            console.log('[DeviceGuard] Device approval disabled for company - bypassing device check');
            if (mounted) setDeviceStatus('approved');
            return;
          }
        }
      } catch (err) {
        console.error('[DeviceGuard] Error checking company device approval setting:', err);
        // Fail open - allow access if we can't determine the setting
        if (mounted) setDeviceStatus('approved');
        return;
      }

      const deviceId = getDeviceId();
      if (!deviceId) {
        console.error('[DeviceGuard] No device ID');
        if (mounted) setDeviceStatus('approved'); // Fail open
        return;
      }

      try {
        const { data: device, error } = await supabase
          .from('user_devices')
          .select('status')
          .eq('user_id', user.id)
          .eq('device_id', deviceId)
          .maybeSingle();

        if (error) {
          console.error('[DeviceGuard] Error:', error);
          if (mounted) setDeviceStatus('approved'); // Fail open
          return;
        }

        if (!device) {
          console.warn('[DeviceGuard] Device not found');
          if (mounted) {
            setDeviceStatus('not_found');
            // Sign out and redirect
            await supabase.auth.signOut();
            window.location.href = '/login';
          }
          return;
        }

        console.log('[DeviceGuard] Device status:', device.status);

        if (mounted) {
          setDeviceStatus(device.status as 'approved' | 'pending' | 'rejected');

          // Handle redirects based on status - but don't redirect if already on the target page
          if (device.status === 'pending' && pathname !== '/auth/device-approval') {
            window.location.href = '/auth/device-approval';
          } else if (device.status === 'rejected') {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }
        }
      } catch (err) {
        console.error('[DeviceGuard] Exception:', err);
        if (mounted) setDeviceStatus('approved'); // Fail open
      }
    }

    checkDevice();

    return () => {
      mounted = false;
    };
  }, [user, authLoading, pathname]);

  // Show loading while checking or auth loading
  if (authLoading || deviceStatus === 'checking') {
    return <LoadingSpinner text="Verifying device..." height="h-screen" />;
  }

  // Show loading while redirecting
  if (deviceStatus === 'pending' || deviceStatus === 'rejected' || deviceStatus === 'not_found') {
    return <LoadingSpinner text="Redirecting..." height="h-screen" />;
  }

  // No user or approved - show content
  if (deviceStatus === 'no_user' || deviceStatus === 'approved') {
    return <>{children}</>;
  }

  // Fallback
  return <LoadingSpinner text="Loading..." height="h-screen" />;
}
