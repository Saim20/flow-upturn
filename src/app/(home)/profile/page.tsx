"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import BasicInfoTab from "./tabs/BasicInfoTab";
import PersonalInfoTab from "./tabs/PersonalInfoTab";
import EducationExperienceTab from "./tabs/EducationExperienceTab";
import {
  User,
  ClipboardList,
  GraduationCap,
  BarChart2,
  FileCheck,
  Loader2,
} from "lucide-react";
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
        color: "text-blue-600",
        content: <BasicInfoTab />,
      },
      {
        key: "personal",
        label: "Personal Information",
        icon: <ClipboardList className="h-5 w-5" />,
        color: "text-purple-600",
        content: <PersonalInfoTab />,
      },
      {
        key: "education",
        label: "Education & Experience",
        icon: <GraduationCap className="h-5 w-5" />,
        color: "text-emerald-600",
        content: <EducationExperienceTab />,
      },
      {
        key: "key-performance-indicator",
        label: "Key Performance Indicator",
        icon: <BarChart2 className="h-5 w-5" />,
        color: "text-amber-600",
        content: (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <BarChart2 className="h-16 w-16 text-amber-200 mb-4" />
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
        icon: <FileCheck className="h-5 w-5" />,
        color: "text-indigo-600",
        content: (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <FileCheck className="h-16 w-16 text-indigo-200 mb-4" />
            </motion.div>
            <h3 className="text-xl font-medium mb-2">Performance Evaluation</h3>
            <p className="mt-2 text-center max-w-md">
              This feature is coming soon. Performance evaluations will provide
              feedback on your work and achievements.
            </p>
          </div>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading profile information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
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
      className="w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          My Profile
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">
          View and update your profile information
        </p>
      </motion.div>

      <TabView tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
    </motion.div>
  );
}

// Main page component with Suspense boundary
export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading profile data...</p>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
