"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useUserData } from "@/hooks/useUserData";
import { User, Envelope, Phone, Building, Calendar, SignOut, Shield, Briefcase, ArrowsClockwise, CheckCircle, WarningCircle, Clock, Gear, LinkSimple } from "@phosphor-icons/react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Link from "next/link";

export default function AccountPage() {
  const { userData, loading, error, logout, refreshUserData } = useUserData();
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error',
    message: string
  } | null>(null);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshUserData();
      setNotification({
        type: 'success',
        message: 'User information refreshed successfully'
      });
      
      // Auto dismiss notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to refresh user information'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await logout();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <LoadingSpinner 
          text="Loading your account information..."
          icon={User}
        />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-4">
        <div className="bg-error/10 text-error dark:bg-error/20 p-4 rounded-lg mb-4 max-w-md">
          <p className="font-medium">Failed to load account information</p>
          <p className="text-sm mt-1">{error || "User data not available"}</p>
        </div>
        <button 
          onClick={refreshUserData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <ArrowsClockwise className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground-primary">My Account</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-background-primary border border-border-secondary text-foreground-secondary rounded-lg hover:bg-surface-hover transition-colors"
          >
            {refreshing ? (
              <>
                <LoadingSpinner className="w-4 h-4" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <ArrowsClockwise className="w-4 h-4" />
                <span>Refresh</span>
              </>
            )}
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
          >
            <SignOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {notification && (
        <div className={`mb-6 p-4 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-success/10 border-success/30 text-success dark:bg-success/20' 
            : 'bg-error/10 border-error/30 text-error dark:bg-error/20'
        }`}>
          <div className="flex items-start">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mt-0.5 mr-3 shrink-0" />
            ) : (
              <WarningCircle className="h-5 w-5 mt-0.5 mr-3 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}
      
      <div className="bg-background-primary rounded-xl shadow-sm overflow-hidden border border-border-primary mb-8">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 sm:p-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center">
            <div className="w-20 h-20 bg-surface-primary rounded-full flex items-center justify-center text-indigo-600 mr-6 mb-4 md:mb-0">
              <User size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">{userData.first_name} {userData.last_name}</h2>
              <p className="text-indigo-100 mb-2">{userData.designation}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {userData.job_status && (
                  <span className={`py-1 px-3 rounded-full ${
                    userData.job_status === "Active" 
                      ? "bg-success/30" 
                      : userData.job_status === "Pending" 
                        ? "bg-warning/30" 
                        : "bg-error/30"
                  }`}>
                    {userData.job_status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground-primary mb-4 flex items-center">
                <User className="w-5 h-5 text-indigo-500 mr-2" />
                Contact Information
              </h3>
              <div className="space-y-4">
                <div className="flex">
                  <Envelope className="w-5 h-5 text-foreground-tertiary mr-3 shrink-0" />
                  <div>
                    <p className="text-foreground-secondary">{userData.email}</p>
                    <p className="text-xs text-foreground-tertiary">Email</p>
                  </div>
                </div>
                
                <div className="flex">
                  <Phone className="w-5 h-5 text-foreground-tertiary mr-3 shrink-0" />
                  <div>
                    <p className="text-foreground-secondary">{userData.phone_number || "Not provided"}</p>
                    <p className="text-xs text-foreground-tertiary">Phone</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground-primary mb-4 flex items-center">
                <Briefcase className="w-5 h-5 text-indigo-500 mr-2" />
                Work Information
              </h3>
              <div className="space-y-4">
                <div className="flex">
                  <Building className="w-5 h-5 text-foreground-tertiary mr-3 shrink-0" />
                  <div>
                    <p className="text-foreground-secondary">{userData.department_name || "Not assigned"}</p>
                    <p className="text-xs text-foreground-tertiary">Department</p>
                  </div>
                </div>
                
                <div className="flex">
                  <Calendar className="w-5 h-5 text-foreground-tertiary mr-3 shrink-0" />
                  <div>
                    <p className="text-foreground-secondary">
                      {userData.hire_date 
                        ? new Date(userData.hire_date).toLocaleDateString() 
                        : "Not specified"}
                    </p>
                    <p className="text-xs text-foreground-tertiary">Hire Date</p>
                  </div>
                </div>
                
                <div className="flex">
                  <Clock className="w-5 h-5 text-foreground-tertiary mr-3 shrink-0" />
                  <div>
                    <p className="text-foreground-secondary">{userData.job_status || "Not specified"}</p>
                    <p className="text-xs text-foreground-tertiary">Status</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          href="/home/profile" 
          className="bg-background-primary p-6 rounded-xl shadow-sm border border-border-primary hover:border-primary-300 hover:shadow transition-all"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground-primary mb-1">My Profile</h3>
            <p className="text-sm text-foreground-tertiary">View and edit your personal information</p>
          </div>
        </Link>
        
        <Link 
          href="/hris" 
          className="bg-background-primary p-6 rounded-xl shadow-sm border border-border-primary hover:border-primary-300 hover:shadow transition-all"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground-primary mb-1">My Profile</h3>
            <p className="text-sm text-foreground-tertiary">View and edit your personal information</p>
          </div>
        </Link>
        
        <div className="bg-background-primary p-6 rounded-xl shadow-sm border border-border-primary hover:border-primary-300 hover:shadow transition-all">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
              <Gear className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground-primary mb-1">Account Settings</h3>
            <p className="text-sm text-foreground-tertiary">Manage your account preferences</p>
          </div>
        </div>
      </div>
    </div>
  );
}
