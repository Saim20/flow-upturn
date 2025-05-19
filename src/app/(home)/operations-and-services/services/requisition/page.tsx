"use client";
import RequisitionHistoryPage from "@/components/operations-and-services/requisition/RequisitionHistoryPage";
import RequisitionRequestsPage from "@/components/operations-and-services/requisition/RequisitionRequestsPage";
import UpcomingPage from "@/components/operations-and-services/requisition/UpcomingPage";
import { useState } from "react";
const tabs = [
  { key: "upcoming", label: "Upcoming" },
  { key: "requests", label: "Requests" },
  { key: "history", label: "History" },
  { key: "policy", label: "Policy" },
];

export default function RequisitionPage() {
  const [activeTab, setActiveTab] = useState("upcoming");

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Desktop/Laptop Tab Layout */}
      <div className="hidden sm:flex flex-wrap justify-center gap-2 bg-white/80 rounded-xl shadow-sm mb-10 p-1 border border-gray-100 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
              ${
                activeTab === tab.key
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
              }
            `}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute left-2 right-2 -bottom-1 h-1 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Mobile/Tablet Dropdown Layout */}
      <div className="sm:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "upcoming" && <UpcomingPage />}
        {activeTab === "requests" && <RequisitionRequestsPage />}
        {activeTab === "history" && <RequisitionHistoryPage />}
        {activeTab === "policy" && (
          <div className="flex items-center justify-center h-screen">
            Policy Tab Content
          </div>
        )}
      </div>
    </div>
  );
}
