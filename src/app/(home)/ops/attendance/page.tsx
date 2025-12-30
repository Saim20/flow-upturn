"use client";

import AttendanceAbsentPage from "@/components/ops/attendance/AbsentPage";
import AttendanceLatePage from "@/components/ops/attendance/LatePage";
import AttendancePresentPage from "@/components/ops/attendance/PresentPage";
import AttendanceRecordsPage from "@/components/ops/attendance/RecordsPage";
import AttendanceRequestsPage from "@/components/ops/attendance/RequestsPage";
import AttendanceSection from "@/app/(home)/home/components/AttendanceSection";

import ServicePageTemplate from "@/components/ui/ServicePageTemplate";
import { TabItem } from "@/components/ui/TabView";
import { Calendar, UserCheck, UserMinus, Clock, ClipboardText } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect, useMemo } from "react";
import { PERMISSION_MODULES } from "@/lib/constants";
import { useSites } from "@/hooks/useAttendanceManagement";
import { useAuth } from "@/lib/auth/auth-context";
import { useAttendanceStatus } from "@/hooks/useAttendance";
import { handleCheckIn, handleCheckOut } from "@/app/(home)/home/components/attendanceUtils";
import AttendanceStatusModal from "@/components/ui/modals/AttendanceStatusModal";
import SuccessModal from "@/components/ui/modals/SuccessModal";
import ErrorModal from "@/components/ui/modals/ErrorModal";
import { supabase } from "@/lib/supabase/client";
import { getEmployeeInfo } from "@/lib/utils/auth";
import { createAttendanceRequestNotification } from "@/lib/utils/notifications";
import { formatDateToDayMonth } from "@/lib/utils";

function AttendancePageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tab || "today");

  const [attendanceRecord, setAttendanceRecord] = useState({
    tag: "Present",
    site_id: undefined as number | undefined,
  });

  const { sites, fetchSites, loading: sitesLoading } = useSites();
  const { user } = useAuth();
  const { today, todayLoading, getTodaysAttendance } = useAttendanceStatus();

  // Modal states
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<'Present' | 'Late' | 'Wrong_Location'>('Present');
  const [currentRecordId, setCurrentRecordId] = useState<number | undefined>();

  // Derived attendance status
  const attendanceCheckStatus = useMemo(() => ({
    checkIn: !!today?.check_in_time,
    checkOut: !!today?.check_out_time,
  }), [today]);

  useEffect(() => {
    fetchSites();
    getTodaysAttendance();
  }, [user]);

  useEffect(() => {
    setActiveTab(tab || "today");
  }, [tab]);

  // Send request to supervisor
  const handleSendRequest = async (recordId: number, reason: string) => {
    try {
      const user = await getEmployeeInfo();
      if (!user) return;

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

  const handleRecordChange = (record: any) => {
    setAttendanceRecord(record);
  };

  // 🟦 Define all tabs including the new "Today" one
  const tabs: TabItem[] = [
    {
      key: "today",
      label: "Today",
      icon: <Clock className="h-5 w-5" />,
      color: "text-primary-600",
      content: todayLoading || sitesLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Clock className="h-8 w-8 text-primary-600 animate-pulse" />
            <p className="text-sm text-foreground-secondary">Loading attendance...</p>
          </div>
        </div>
      ) : (
        <AttendanceSection
          loading={todayLoading}
          attendanceLoading={attendanceLoading}
          attendanceStatus={attendanceCheckStatus}
          attendanceRecord={attendanceRecord}
          sites={sites}
          sitesLoading={sitesLoading}
          onRecordChange={handleRecordChange}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
        />
      ),
      link: "/ops/attendance?tab=today",
    },
    {
      key: "records",
      label: "Records",
      icon: <Calendar className="h-5 w-5" />,
      color: "text-foreground-secondary",
      content: <AttendanceRecordsPage />,
      link: "/ops/attendance?tab=records",
    },
    {
      key: "request",
      label: "Request",
      icon: <ClipboardText className="h-5 w-5" />,
      color: "text-primary-600",
      content: <AttendanceRequestsPage />,
      link: "/ops/attendance?tab=request",
    },
  ];

  return (
    <>
      <ServicePageTemplate
        title="Attendance"
        description="View and manage your attendance records, check your history, and submit attendance requests."
        icon={<Calendar className="h-6 w-6" />}
        primaryColor="text-primary-600"
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLinked={true}
        module={PERMISSION_MODULES.ATTENDANCE}
        showPermissionBanner={true}
        tutorialPrefix="attendance"
      />

      {/* Attendance Status Modal */}
      <AttendanceStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        status={attendanceStatus}
        recordId={currentRecordId}
        onSendRequest={handleSendRequest}
      />

      {/* Success Modal */}
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

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600 animate-pulse" />
            <p className="text-sm text-foreground-secondary">Loading attendance...</p>
          </div>
        </div>
      }
    >
      <AttendancePageContent />
    </Suspense>
  );
}
