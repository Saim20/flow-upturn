"use client";

import React, { useEffect, useState } from "react";
import { useAttendances } from "@/hooks/useAttendance";
import { useEmployeeInfo } from "@/hooks/useEmployeeInfo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import TabView from "@/components/ui/TabView";
import { TrashSimple, PencilSimple, X } from "@phosphor-icons/react";
import InlineSpinner from "@/components/ui/InlineSpinner";
import { toast } from "sonner";
import { getEmployeeName } from "@/lib/utils/auth";
import { useAuth } from "@/lib/auth/auth-context";

export default function AttendanceLogsPage() {
  const {
    today,
    todayLoading,
    getTodaysAttendance,
    getAttendanceForDateRange,
    updateAttendance,
    deleteAttendance
  } = useAttendances();

  const {
    canWrite,
    canDelete
  } = useAuth();

  const MODULE = "Attendance";

  const { fetchEmployeeInfo } = useEmployeeInfo();

  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [search, setSearch] = useState("");

  // For edit modal
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [editData, setEditData] = useState({
    tag: "",
    check_in_time: "",
    check_out_time: "",
  });

  // Enum options — match your database values
  const attendanceStatusOptions = [
    "Present",
    "Absent",
    "Late",
    "Wrong_Location",
    "Pending",
    "On_Leave"
  ];

  useEffect(() => {
    fetchEmployeeInfo();
    fetchTodayAttendance();
    fetchAllAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    await getTodaysAttendance();
  };

  const fetchAllAttendance = async () => {
    const endDate = new Date().toLocaleDateString("sv-SE");
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE");

    const records = await getAttendanceForDateRange(startDate, endDate);
    setAllAttendance(records);
  };

  useEffect(() => {
    const fetchEmployeeNames = async () => {
      const allRecords = today ? [today, ...allAttendance] : allAttendance;
      const namesMap: Record<string, string> = {};
      await Promise.all(
        allRecords.map(async (att) => {
          if (att.employee_id && !namesMap[att.employee_id]) {
            namesMap[att.employee_id] = await getEmployeeName(att.employee_id);
          }
        })
      );
      setEmployeeNames(namesMap);
    };
    fetchEmployeeNames();
  }, [today, allAttendance]);

  const filteredToday = today ? [today].filter(att =>
    (employeeNames[att.employee_id] || "Unknown").toLowerCase().includes(search.toLowerCase())
  ) : [];

  const filteredAll = allAttendance.filter(att =>
    (employeeNames[att.employee_id] || "Unknown").toLowerCase().includes(search.toLowerCase())
  );

  // Action Handlers
  const handleEdit = (attendance: any) => {
    setSelectedAttendance(attendance);
    setEditData({
      tag: attendance.tag || "",
      check_in_time: attendance.check_in_time ? new Date(attendance.check_in_time).toISOString().slice(0, 16) : "",
      check_out_time: attendance.check_out_time ? new Date(attendance.check_out_time).toISOString().slice(0, 16) : "",
    });
  };

  const handleDelete = async (attendance: any) => {
    if (confirm(`Are you sure you want to delete attendance of ${employeeNames[attendance.employee_id] || "Unknown"}?`)) {
      await deleteAttendance(attendance);
      setAllAttendance(prev => prev.filter(att => att.id !== attendance.id));
      toast.success("Attendance deleted successfully!");
    }
  };

  const handleSave = async () => {
    try {
      // Convert back to enum format (replace spaces with underscores if needed)
      const formattedTag = editData.tag.replace(/\s+/g, "_");

      console.log(
        {
          tag: formattedTag,
          check_in_time: editData.check_in_time,
          check_out_time: editData.check_out_time
        }
      )

      await updateAttendance(selectedAttendance.id, {
        tag: formattedTag,
        check_in_time: editData.check_in_time === "" ? undefined : editData.check_in_time,
        check_out_time: editData.check_out_time === "" ? undefined : editData.check_out_time
      });

      setAllAttendance(prev =>
        prev.map(att => att.id === selectedAttendance.id ? { ...att, ...editData, tag: formattedTag } : att)
      );
      toast.success("Attendance updated successfully!");
      setSelectedAttendance(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update attendance.");
    }
  };

  const renderTable = (records: any[]) => {
    if (records.length === 0) {
      return <p className="text-foreground-tertiary text-sm mt-2">No attendance records found.</p>;
    }

    // Tag color styles
    const tagStyles: Record<string, string> = {
      Present: "bg-success/10 text-success dark:bg-success/20",
      Absent: "bg-error/10 text-error dark:bg-error/20",
      Late: "bg-warning/10 text-warning dark:bg-warning/20",
      On_Leave: "bg-info/10 text-info dark:bg-info/20",
      Wrong_Location: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      Pending: "bg-warning/10 text-warning dark:bg-warning/20",
    };


    return (
      <div className="overflow-x-auto mt-3">
        <table className="w-full table-auto border border-border-primary rounded-lg shadow-sm">
          <thead className="bg-background-secondary dark:bg-background-tertiary text-foreground-secondary uppercase text-sm">
            <tr>
              <th className="px-4 py-3 border-b border-border-primary">Employee</th>
              <th className="px-4 py-3 border-b border-border-primary">Date</th>
              <th className="px-4 py-3 border-b border-border-primary">Status</th>
              <th className="px-4 py-3 border-b border-border-primary">Check In</th>
              <th className="px-4 py-3 border-b border-border-primary">Check Out</th>
              <th className="px-4 py-3 border-b border-border-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((att, idx) => (
              <tr key={att.id} className={`transition-all hover:bg-surface-hover dark:hover:bg-surface-hover ${idx % 2 === 0 ? "bg-surface-primary" : "bg-background-secondary dark:bg-background-tertiary"}`}>
                <td className="px-4 py-3 border-b border-border-primary font-medium text-foreground-primary">{employeeNames[att.employee_id] || "Unknown"}</td>
                <td className="px-4 py-3 border-b border-border-primary text-foreground-secondary">{att.attendance_date || "N/A"}</td>
                <td className="px-4 py-3 border-b border-border-primary text-foreground-secondary">
                  {att.tag ? (
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${tagStyles[att.tag] || "bg-background-secondary dark:bg-background-tertiary text-foreground-secondary"
                        }`}
                    >
                      {att.tag.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-foreground-tertiary">N/A</span>
                  )}
                </td>

                <td className="px-4 py-3 border-b border-border-primary text-foreground-secondary">{att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString() : "N/A"}</td>
                <td className="px-4 py-3 border-b border-border-primary text-foreground-secondary">{att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : "N/A"}</td>
                <td className="px-4 py-3 border-b border-border-primary flex gap-2">
                  {canWrite(MODULE) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                      onClick={() => handleEdit(att)}
                    >
                      <PencilSimple size={16} />
                    </Button>
                  )}

                  {canDelete(MODULE) && (
                    <Button
                      size="sm"
                      variant="danger"
                      className="p-2 hover:bg-error/10 dark:hover:bg-error/20 transition-colors"
                      onClick={() => handleDelete(att)}
                    >
                      <TrashSimple size={16} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full">
      <Card className="shadow-lg rounded-xl">
        <CardHeader
          title="Company Attendance Logs"
          subtitle="View and manage employee attendance records."
        />
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <input
              placeholder="Search by employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-1/3 px-4 py-2 border border-border-secondary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <TabView
            tabs={[
              {
                key: "today",
                label: "Today's Attendance",
                icon: <></>,
                color: "text-blue-500",
                content: todayLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <InlineSpinner size="md" color="primary" />
                  </div>
                ) : (
                  renderTable(filteredToday)
                ),
              },
              {
                key: "all",
                label: "All Records",
                icon: <></>,
                color: "text-success",
                content: renderTable(filteredAll),
              },
            ]}
            activeTab={activeTab}
            setActiveTab={(v: string) => setActiveTab(v as any)}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {selectedAttendance && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-surface-primary rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              className="absolute top-4 right-4 text-foreground-secondary hover:text-foreground-primary"
              onClick={() => setSelectedAttendance(null)}
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Edit Attendance</h2>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col">
                <span>Status</span>
                <select
                  value={editData.tag.replace(/_/g, " ")}
                  onChange={(e) => setEditData({ ...editData, tag: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Select status</option>
                  {attendanceStatusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col">
                <span>Check In</span>
                <input
                  type="datetime-local"
                  value={editData.check_in_time}
                  onChange={(e) => setEditData({ ...editData, check_in_time: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
              </label>

              <label className="flex flex-col">
                <span>Check Out</span>
                <input
                  type="datetime-local"
                  value={editData.check_out_time}
                  onChange={(e) => setEditData({ ...editData, check_out_time: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
              </label>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setSelectedAttendance(null)}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
