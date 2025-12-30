'use client';

import React, { useEffect, useState, useMemo } from 'react';
import BaseWidget from './BaseWidget';
import { WidgetProps } from '@/lib/types/widgets';
import AttendanceSection from '../components/AttendanceSection';
import { useAttendanceStatus } from "@/hooks/useAttendance";
import { useSites } from "@/hooks/useAttendanceManagement";
import { handleCheckIn, handleCheckOut } from "@/app/(home)/home/components/attendanceUtils";
import { useAuth } from '@/lib/auth/auth-context';
import NoPermissionMessage from '@/components/ui/NoPermissionMessage';
import AttendanceStatusModal from '@/components/ui/modals/AttendanceStatusModal';
import SuccessModal from '@/components/ui/modals/SuccessModal';
import ErrorModal from '@/components/ui/modals/ErrorModal';
import { supabase } from '@/lib/supabase/client';
import { getEmployeeInfo } from '@/lib/utils/auth';
import { createAttendanceRequestNotification } from '@/lib/utils/notifications';
import { formatDateToDayMonth } from '@/lib/utils';

const initialAttendanceRecord: { tag: string; site_id: number | undefined } = {
  tag: "Present",
  site_id: undefined,
};

export default function AttendanceWidget({ config, isEditMode, onToggle, onSizeChange }: WidgetProps) {
  const { canRead } = useAuth();
  const [attendanceRecord, setAttendanceRecord] = useState(initialAttendanceRecord);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<'Present' | 'Late' | 'Wrong_Location'>('Present');
  const [currentRecordId, setCurrentRecordId] = useState<number | undefined>();
  
  const canViewAttendance = canRead('attendance');
  const { today, todayLoading, getTodaysAttendance } = useAttendanceStatus();
  const { sites, loading: sitesLoading, fetchSites } = useSites();

  // Derived attendance status
  const attendanceCheckStatus = useMemo(() => ({
    checkIn: !!today?.check_in_time,
    checkOut: !!today?.check_out_time,
  }), [today]);

  // Fetch initial data
  useEffect(() => {
    if (canViewAttendance) {
      fetchSites();
      getTodaysAttendance();
    }
  }, [canViewAttendance]);

  // Send request to supervisor
  const handleSendRequest = async (recordId: number, reason: string) => {
    try {
      const user = await getEmployeeInfo();
      if (!user) return;
      
      // Create a request in the attendance_requests table
      const { error } = await supabase
        .from('attendance_requests')
        .insert({
          attendance_record_id: recordId,
          employee_id: user.id,
          supervisor_id: user.supervisor_id,
          company_id: user.company_id,
          request_type: attendanceStatus === 'Late' ? 'late' : 'wrong_location',
          status: 'pending',
          reason: reason,
        });

      if (error) {
        console.error('Failed to send request:', error);
        setModalTitle('Request Failed');
        setModalMessage('Failed to send request to supervisor. Please try again.');
        setShowErrorModal(true);
      } else {
        // Send notification to supervisor
        if (user.supervisor_id) {
          try {
            const requestType = attendanceStatus === 'Late' ? 'late arrival' : 'wrong location';
            await createAttendanceRequestNotification(
              user.supervisor_id,
              'requestSubmitted',
              {
                employeeName: user.name,
                requestType,
                date: formatDateToDayMonth(new Date().toISOString()),
              },
              {
                actionUrl: '/ops/attendance?tab=request',
              }
            );
          } catch (notifError) {
            console.error('Failed to send notification:', notifError);
          }
        }

        setModalTitle('Request Sent!');
        setModalMessage('Your request has been sent to your supervisor for approval.');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error sending request:', error);
      setModalTitle('Request Failed');
      setModalMessage('An error occurred while sending the request.');
      setShowErrorModal(true);
    }
  };

  // Check-in handler
  const onCheckIn = async () => {
    setAttendanceLoading(true);
    try {
      const result = await handleCheckIn(attendanceRecord, sites, getTodaysAttendance);
      if (result.success && result.status) {
        setAttendanceStatus(result.status as 'Present' | 'Late' | 'Wrong_Location');
        setCurrentRecordId(result.recordId);
        setShowStatusModal(true);
      } else {
        setModalTitle('Check-in Failed');
        setModalMessage(result.message || 'Failed to record check-in.');
        setShowErrorModal(true);
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Check-out handler
  const onCheckOut = async () => {
    setAttendanceLoading(true);
    try {
      if (today?.id) {
        const result = await handleCheckOut(today.id);
        if (result.success) {
          if (result.isEarly) {
            // Show warning modal for early checkout
            setModalTitle('Early Check-out');
            setModalMessage(result.message || 'You checked out early.');
            setShowErrorModal(true); // Using error modal to show warning
          } else {
            // Show success modal for on-time checkout
            setModalTitle('Check-out Successful!');
            setModalMessage(result.message || 'Your check-out has been recorded.');
            setShowSuccessModal(true);
          }
        } else {
          setModalTitle('Check-out Failed');
          setModalMessage(result.message || 'Failed to record check-out.');
          setShowErrorModal(true);
        }
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  return (
    <>
      <BaseWidget config={config} isEditMode={isEditMode} onToggle={onToggle} onSizeChange={onSizeChange}>
        {!canViewAttendance ? (
          <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary h-full flex flex-col overflow-hidden">
            <NoPermissionMessage moduleName="attendance" />
          </div>
        ) : (
          <AttendanceSection
            loading={todayLoading}
            attendanceLoading={attendanceLoading}
            attendanceStatus={attendanceCheckStatus}
            attendanceRecord={attendanceRecord}
            sites={sites}
            sitesLoading={sitesLoading}
            onRecordChange={setAttendanceRecord}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
          />
        )}
      </BaseWidget>

      {/* Attendance Status Modal (for check-in with different statuses) */}
      <AttendanceStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        status={attendanceStatus}
        recordId={currentRecordId}
        onSendRequest={handleSendRequest}
      />

      {/* Success Modal (for check-out and request sent) */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={modalTitle}
        message={modalMessage}
        autoCloseDuration={0}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={modalTitle}
        message={modalMessage}
      />
    </>
  );
}
