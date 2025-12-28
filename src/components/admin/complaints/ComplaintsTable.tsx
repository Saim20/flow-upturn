"use client";

import React from "react";

interface ComplaintsTableProps {
  complaints: any[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ComplaintsTable({
  complaints,
  onEdit,
  onDelete,
}: ComplaintsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-background-secondary">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-surface-primary divide-y divide-gray-200">
          {complaints.map((complaint) => (
            <tr key={complaint.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground-tertiary">
                {complaint.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground-tertiary space-x-2">
                <button
                  onClick={() => onEdit(complaint.id)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(complaint.id)}
                  className="text-error hover:text-error/80"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 