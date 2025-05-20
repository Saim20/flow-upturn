"use client";

import { Attendance } from "@/hooks/useAttendance";
import { getUserInfo } from "@/lib/auth/getUser";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { FaChevronDown, FaCalendarAlt, FaSearch } from "react-icons/fa";
import { formatTimeFromISO, formatDateToDayMonth } from "@/lib/utils";
import { useSites } from "@/hooks/useAttendanceManagement";

export default function AttendanceAbsentPage() {
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const { sites, fetchSites } = useSites();

  async function fetchAttendanceData() {
    setLoading(true);
    
    const user = await getUserInfo();
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, check_in_time, check_out_time, site_id, attendance_date, tag, employee_id")
        .eq("employee_id", user.id)
        .eq("company_id", user.company_id)
        .eq("tag", "Absent")
        .order("attendance_date", { ascending: false });

      if (error) throw error;

      setAttendanceData(data ?? []);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 sm:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaCalendarAlt className="text-gray-400" />
            </div>
            <input
              type="date"
              placeholder="From Date"
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto min-w-[160px] text-sm"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaCalendarAlt className="text-gray-400" />
            </div>
            <input
              type="date"
              placeholder="To Date"
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto min-w-[160px] text-sm"
            />
          </div>
          
          <div className="relative w-full sm:w-auto min-w-[160px]">
            <select className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full text-sm">
              <option value="">Select Site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <FaChevronDown className="text-gray-400 text-xs" />
            </div>
          </div>
          
          <button className="bg-[#192D46] text-white rounded-lg px-4 py-2.5 font-medium hover:bg-[#0f1c2d] transition-colors duration-200 flex items-center justify-center gap-2 text-sm">
            <FaSearch />
            <span>Search</span>
          </button>
        </div>
        
        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700 mb-4"></div>
              <p className="text-gray-500 text-sm">Loading attendance records...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Out</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.length > 0 ? (
                  attendanceData.map((entry, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {formatDateToDayMonth(entry.attendance_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {sites.length > 0 && sites.filter((site) => site.id === entry.site_id)[0]?.name || "Unknown Site"}
                        {sites.length === 0 && (
                          <span className="inline-flex items-center animate-pulse text-gray-400">
                            Loading...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {entry.check_in_time && formatTimeFromISO(entry.check_in_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {entry.check_out_time ? formatTimeFromISO(entry.check_out_time) : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Absent
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-sm text-gray-500 text-center">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
