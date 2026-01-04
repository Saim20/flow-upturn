"use client";

import React, { useState, memo } from "react";
import { Flag, Checks, XCircle, Clock, User, ChatCircle, FileText, X, Check } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { ComplaintRecord, ComplaintsType } from "@/lib/types";
import { Employee } from "@/lib/types/schemas";

interface ComplaintCardProps {
  complaint: ComplaintRecord;
  employees: Employee[];
  complaintTypes: ComplaintsType[];
  extractFileNameFromStoragePath: (path: string) => string;
  mode?: "history" | "request";
  onAccept?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
  canApprove?: boolean;
  canComment?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = memo(({
  complaint,
  employees,
  complaintTypes,
  extractFileNameFromStoragePath,
  mode = "history",
  onAccept,
  onReject,
  isProcessing = false,
  canApprove = true,
  canComment = true
}) => {
  const [comment, setComment] = useState("");

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Accepted":
        return "bg-success/10 text-success";
      case "Rejected":
        return "bg-error/10 text-error";
      default:
        return "bg-warning/10 text-warning";
    }
  };

  const complainer = employees.find(e => e.id === complaint.complainer_id);
  const against = employees.find(e => e.id === complaint.against_whom);
  const type = complaintTypes.find(t => t.id === complaint.complaint_type_id);

  return (
    <motion.div
      key={complaint.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="bg-surface-primary border border-border-primary rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-2">
          <Flag className="text-blue-600 mt-1" size={18} />
          <div>
            <h3 className="font-medium text-foreground-primary">
              {type?.name || "Unknown Complaint Type"}
            </h3>
            <p className="text-sm text-foreground-secondary">
              {complaint.anonymous ? "Anonymous Complaint" : "Named Complaint"}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusStyle(
            complaint.status
          )}`}
        >
          {complaint.status === "Accepted" ? (
            <Checks size={12} />
          ) : complaint.status === "Rejected" ? (
            <XCircle size={12} />
          ) : (
            <Clock size={12} />
          )}
          <span>{complaint.status}</span>
        </div>
      </div>

      {/* Complaint Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <User size={14} />
          <span>
            Requested by:{" "}
            <span className="font-medium">
              {complaint.anonymous ? "Anonymous" : complainer?.name || "Unknown"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <User size={14} />
          <span>
            Against: <span className="font-medium">{against?.name || "Unknown"}</span>
          </span>
        </div>
      </div>

      {/* Description */}
      {complaint.description && (
        <div className="mt-3 text-sm text-foreground-secondary bg-background-secondary dark:bg-background-tertiary p-3 rounded-md">
          <p className="font-medium mb-1">Description:</p>
          <p>{complaint.description}</p>
        </div>
      )}

      {/* Feedback/Comment (history only) */}
      {mode === "history" && complaint.comment && (
        <div className="mt-3 text-sm text-foreground-secondary bg-primary-50 dark:bg-primary-900/30 p-3 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <ChatCircle size={14} />
            <p className="font-medium">Feedback:</p>
          </div>
          <p>{complaint.comment}</p>
        </div>
      )}

      {/* Attachments */}
      {complaint.attachments && complaint.attachments.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-foreground-tertiary mb-1">Attachments:</p>
          <div className="flex flex-wrap gap-2">
            {complaint.attachments.map((attachment, idx) => (
              <a
                key={idx}
                href={complaint.attachment_download_urls?.[idx]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-background-secondary dark:bg-background-tertiary hover:bg-background-tertiary dark:hover:bg-surface-secondary transition-colors text-foreground-secondary text-xs px-2 py-1 rounded"
              >
                <FileText size={12} />
                <span>{extractFileNameFromStoragePath(attachment)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Request Mode: Comment input + buttons */}
      {mode === "request" && (
        <>
          <div className="mt-4 space-y-4">
            {canComment && (
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  <ChatCircle size={16} className="inline mr-2" />
                  Add Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add your feedback here..."
                  rows={3}
                  className="w-full border border-border-secondary bg-surface-primary rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            )}


            <div className="flex items-center gap-2">
              {canApprove && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject?.()}
                    disabled={isProcessing}
                    className="flex items-center gap-2 text-error border-error/30 hover:bg-error/10"
                  >
                    <X size={14} /> Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onAccept?.()}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                    isLoading={isProcessing}
                  >
                    <Check size={14} /> Accept
                  </Button>
                </>
              )}

            </div>
          </div>
        </>
      )}
    </motion.div>
  );
});
