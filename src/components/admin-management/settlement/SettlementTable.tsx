"use client";

import React from "react";

interface ClaimSettlementTableProps {
  claimSettlements: any[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ClaimSettlementTable({
  claimSettlements,
  onEdit,
  onDelete,
}: ClaimSettlementTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {claimSettlements.map((claim) => (
            <tr key={claim.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {claim.settlement_item}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {claim.type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                <button
                  onClick={() => onEdit(claim.id)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(claim.id)}
                  className="text-red-600 hover:text-red-900"
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