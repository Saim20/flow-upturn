"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Bell, User, Search, LogOut, Settings, UserCircle, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function TopBar() {
  const { employeeInfo, isApproved } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close the user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  // Check if current path is authorized based on approval status
  const basePath = `/${pathname.split('/')[1]}`;
  const isAuthorized = isApproved || basePath === "/account";

  // If the user isn't approved, show a special header for account pages only
  if (!isApproved && basePath !== "/account") {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-5 h-16">
      <div className="px-4 md:px-6 h-full flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center">
          {!isAuthorized && (
            <div className="flex items-center text-amber-600">
              <ShieldAlert className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium hidden md:inline">Restricted access</span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-1 md:space-x-3">
          {isApproved && (
            <>
              <div className="relative">
                <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                  <Search className="h-5 w-5" />
                </button>
              </div>
              
              <Link 
                href="/notifications"
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  3
                </span>
              </Link>
            </>
          )}

          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700 hidden md:inline-block">
                {employeeInfo?.name || 'Profile'}
              </span>
            </button>
            
            {/* User dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{employeeInfo?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{employeeInfo?.role || 'Role'}</p>
                  {!isApproved && (
                    <p className="text-xs mt-1 text-amber-500">Pending approval</p>
                  )}
                </div>
                
                <Link 
                  href="/account" 
                  className=" px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  My Account
                </Link>
                
                <Link 
                  href="/account/settings" 
                  className=" px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                
                <div className="border-t border-gray-100 mt-1">
                  <button 
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className=" w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 