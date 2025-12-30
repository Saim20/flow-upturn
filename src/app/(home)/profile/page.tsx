"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { BasicInfoTab, PersonalInfoTab } from "@/components/profile";
import EducationExperienceTab from "./tabs/EducationExperienceTab";
import EmailPreferencesSettings from "@/components/settings/EmailPreferencesSettings";
import { User, ClipboardText, GraduationCap, ChartBarHorizontal, FileText, Bell } from "@phosphor-icons/react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PageHeader from "@/components/ui/PageHeader";
import TabView, { TabItem } from "@/components/ui/TabView";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getEmployeeId } from "@/lib/utils/auth";

// Client component
function ProfileContent() {
  const [activeTab, setActiveTab] = useState("basic");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { fetchUserName } = useUserProfile();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        // Get current user name
        const userId = await getEmployeeId()
        const userInfo = await fetchUserName(userId);
        if (userInfo) {
          setUserName(userInfo.name || "");
        } else {
          setError("Could not find employee record");
        }
      } catch (err) {
        setError("Error loading user information");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
      },
    },
  };

  const TABS: TabItem[] = useMemo(
    () => [
      {
        key: "basic",
        label: "Basic Information",
        icon: <User className="h-5 w-5" />,
        color: "text-primary-600",
        content: <BasicInfoTab />,
      },
      {
        key: "personal",
        label: "Personal Information",
        icon: <ClipboardText className="h-5 w-5" />,
        color: "text-primary-700",
        content: <PersonalInfoTab />,
      },
      {
        key: "education",
        label: "Education & Experience",
        icon: <GraduationCap className="h-5 w-5" />,
        color: "text-success",
        content: <EducationExperienceTab />,
      },
      {
        key: "key-performance-indicator",
        label: "Key Performance Indicator",
        icon: <ChartBarHorizontal className="h-5 w-5" />,
        color: "text-warning",
        content: (
          <div className="flex flex-col items-center justify-center py-16 text-foreground-tertiary">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <ChartBarHorizontal className="h-16 w-16 text-warning/40 mb-4" />
            </motion.div>
            <h3 className="text-xl font-medium mb-2">
              Key Performance Indicator
            </h3>
            <p className="mt-2 text-center max-w-md">
              This feature is coming soon. Performance indicators will help you
              track your progress and achievements.
            </p>
          </div>
        ),
      },
      {
        key: "performance-evaluation",
        label: "Performance Evaluation",
        icon: <FileText className="h-5 w-5" />,
        color: "text-info",
        content: (
          <div className="flex flex-col items-center justify-center py-16 text-foreground-tertiary">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <FileText className="h-16 w-16 text-info/40 mb-4" />
            </motion.div>
            <h3 className="text-xl font-medium mb-2">Performance Evaluation</h3>
            <p className="mt-2 text-center max-w-md">
              This feature is coming soon. Performance evaluations will provide
              feedback on your work and achievements.
            </p>
          </div>
        ),
      },
      {
        key: "notifications",
        label: "Email Preferences",
        icon: <Bell className="h-5 w-5" />,
        color: "text-primary-500",
        content: <EmailPreferencesSettings />,
      },
    ],
    []
  );

  if (loading) {
    return (
      <LoadingSpinner
        text="Loading profile information..."
        height="h-screen"
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-4">
        <div className="bg-error/10 text-error dark:bg-error/20 p-4 rounded-lg mb-4">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-1">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className="w-full px-4 py-6 sm:px-6 lg:px-8"
    >
      <PageHeader
        title="My Profile"
        description="View and update your profile information"
      />

      <TabView tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
    </motion.div>
  );
}

// Main page component with Suspense boundary
export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <LoadingSpinner
          text="Loading profile data..."
          height="h-screen"
        />
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
