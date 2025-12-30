import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { createDeviceNotification } from '@/lib/utils/notifications';

export interface DeviceRequest {
  id: string;
  user_id: string;
  device_id: string;
  device_info: string | null;
  status: 'approved' | 'pending' | 'rejected';
  last_login: string;
  created_at: string;
  // Joined from employees table
  employee?: {
    id: string;
    name: string;
    email: string;
    designation: string | null;
  };
  // Parsed device details
  browser?: string;
  os?: string;
  device_type?: string;
  model?: string;
  ip_address?: string;
  location?: string;
  user_agent?: string;
}

export function useDevices() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDevices, setPendingDevices] = useState<DeviceRequest[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceRequest[]>([]);

  const fetchPendingDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First fetch devices
      const { data: devicesData, error: devicesError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (devicesError) throw devicesError;

      // Then fetch employee info for each device
      const devicesWithEmployees = await Promise.all(
        (devicesData || []).map(async (device) => {
          const { data: employee } = await supabase
            .from('employees')
            .select('id, first_name, last_name, email, designation')
            .eq('id', device.user_id)
            .single();

          return {
            ...device,
            employee: employee ? {
              name: `${employee.first_name} ${employee.last_name}`,
              email: employee.email,
              designation: employee.designation,
              id: employee.id
            } : undefined,
          };
        })
      );

      setPendingDevices(devicesWithEmployees);
    } catch (err: any) {
      console.error('Error fetching pending devices:', err);
      setError(err.message || 'Failed to fetch pending devices');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First fetch devices
      const { data: devicesData, error: devicesError } = await supabase
        .from('user_devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (devicesError) throw devicesError;

      // Then fetch employee info for each device
      const devicesWithEmployees = await Promise.all(
        (devicesData || []).map(async (device) => {
          const { data: employee } = await supabase
            .from('employees')
            .select('id, first_name, last_name, email, designation')
            .eq('id', device.user_id)
            .single();

          return {
            ...device,
            employee: employee ? {
              name: `${employee.first_name} ${employee.last_name}`,
              email: employee.email,
              designation: employee.designation,
              id: employee.id
            } : undefined,
          };
        })
      );

      setAllDevices(devicesWithEmployees);
    } catch (err: any) {
      console.error('Error fetching all devices:', err);
      setError(err.message || 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDeviceStatus = useCallback(async (
    deviceId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => {
    try {
      // Fetch device and user info first for notification
      const { data: deviceData, error: fetchError } = await supabase
        .from('user_devices')
        .select('user_id, device_info')
        .eq('id', deviceId)
        .single();

      if (fetchError) throw fetchError;

      // Get user_id from employees table (user_id in devices is employee_id)
      const { data: employeeData } = await supabase
        .from('employees')
        .select('users!inner(id)')
        .eq('id', deviceData.user_id)
        .single();

      const { error: updateError } = await supabase
        .from('user_devices')
        .update({ 
          status,
          ...(reason && { rejection_reason: reason })
        })
        .eq('id', deviceId);

      if (updateError) throw updateError;

      // Send notification only for rejection (per user preference - no email)
      if (status === 'rejected' && employeeData?.users?.id) {
        try {
          // Parse device info for notification
          let deviceName = 'Unknown Device';
          if (deviceData.device_info) {
            try {
              const info = JSON.parse(deviceData.device_info);
              deviceName = info.browser || info.device_type || 'Unknown Device';
            } catch {
              deviceName = deviceData.device_info;
            }
          }
          
          await createDeviceNotification(
            employeeData.users.id,
            'rejected',
            deviceName,
            reason
          );
        } catch (notifError) {
          console.error("Failed to send device rejection notification:", notifError);
        }
      }

      // Refresh the list
      await fetchPendingDevices();
      
      return { success: true, message: `Device ${status} successfully` };
    } catch (err: any) {
      console.error('Error updating device status:', err);
      throw new Error(err.message || 'Failed to update device status');
    }
  }, [fetchPendingDevices]);

  const deleteDevice = useCallback(async (deviceId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceId);

      if (deleteError) throw deleteError;

      // Refresh the list
      await fetchPendingDevices();
      
      return { success: true, message: 'Device deleted successfully' };
    } catch (err: any) {
      console.error('Error deleting device:', err);
      throw new Error(err.message || 'Failed to delete device');
    }
  }, [fetchPendingDevices]);

  return {
    loading,
    error,
    pendingDevices,
    allDevices,
    fetchPendingDevices,
    fetchAllDevices,
    updateDeviceStatus,
    deleteDevice,
  };
}
