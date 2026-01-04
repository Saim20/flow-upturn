"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Receipt,
  CalendarBlank,
  CurrencyDollar,
  Package,
  PaperPlaneTilt,
  CheckCircle,
  Clock,
  Warning,
  XCircle,
  FilePdf,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Buildings,
  MapPin,
  User,
  Percent,
  Info,
  Copy,
  Printer,
  X,
  Eye,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/auth-context";
import { useServiceInvoices } from "@/hooks/useServiceInvoices";
import {
  StakeholderServiceInvoice,
  ServiceInvoiceStatus,
} from "@/lib/types/stakeholder-services";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fadeInUp } from "@/components/ui/animations";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import BaseModal from "@/components/ui/modals/BaseModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RecordPaymentModal from "./RecordPaymentModal";
import { toast } from "sonner";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  onPaymentRecorded?: () => void;
  onStatusChanged?: () => void;
}

export default function InvoiceDetailModal({
  isOpen,
  onClose,
  invoiceId,
  onPaymentRecorded,
  onStatusChanged,
}: InvoiceDetailModalProps) {
  const { canWrite } = useAuth();
  const {
    loading,
    fetchInvoiceById,
    sendInvoice,
    updateInvoiceStatus,
  } = useServiceInvoices();

  const [invoice, setInvoice] = useState<StakeholderServiceInvoice | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load invoice details
  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    const data = await fetchInvoiceById(Number(invoiceId));
    if (data) {
      setInvoice(data as StakeholderServiceInvoice);
    }
  }, [invoiceId, fetchInvoiceById]);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoice();
    }
  }, [isOpen, invoiceId, loadInvoice]);

  // Get status badge config
  const getStatusBadge = (status: ServiceInvoiceStatus) => {
    const configs: Record<ServiceInvoiceStatus, { variant: "default" | "info" | "success" | "warning" | "error"; icon: typeof Receipt }> = {
      draft: { variant: "default", icon: Receipt },
      sent: { variant: "info", icon: PaperPlaneTilt },
      viewed: { variant: "info", icon: Eye },
      paid: { variant: "success", icon: CheckCircle },
      partially_paid: { variant: "warning", icon: Clock },
      overdue: { variant: "error", icon: Warning },
      cancelled: { variant: "error", icon: XCircle },
      void: { variant: "error", icon: XCircle },
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} icon={<Icon size={14} />}>
        {status.replace("_", " ").replace(/^\w/, (c: string) => c.toUpperCase())}
      </Badge>
    );
  };

  // Check if overdue
  const isOverdue = () => {
    if (!invoice) return false;
    if (invoice.status === "paid" || invoice.status === "cancelled") return false;
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  // Handle send invoice
  const handleSend = async () => {
    if (!invoice) return;
    setLoadingAction(true);
    try {
      const success = await sendInvoice(Number(invoice.id));
      if (success) {
        toast.success("Invoice sent successfully");
        loadInvoice();
        onStatusChanged?.();
      } else {
        toast.error("Failed to send invoice");
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle void invoice
  const handleVoid = async () => {
    if (!invoice) return;
    if (!confirm("Are you sure you want to void this invoice? This action cannot be undone.")) {
      return;
    }
    setLoadingAction(true);
    try {
      const success = await updateInvoiceStatus(Number(invoice.id), "cancelled");
      if (success) {
        toast.success("Invoice voided");
        loadInvoice();
        onStatusChanged?.();
      } else {
        toast.error("Failed to void invoice");
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Copy invoice number
  const handleCopyInvoiceNumber = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice.invoice_number);
      toast.success("Invoice number copied");
    }
  };

  // Handle payment recorded
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    loadInvoice();
    onPaymentRecorded?.();
  };

  if (loading && !invoice) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Invoice Details" size="lg">
        <LoadingSpinner icon={Receipt} text="Loading invoice..." color="blue" height="min-h-100" />
      </BaseModal>
    );
  }

  if (!invoice) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Invoice Details" size="lg">
        <div className="p-8 text-center text-foreground-tertiary">
          Invoice not found
        </div>
      </BaseModal>
    );
  }

  const stakeholder = invoice.stakeholder as any;
  const service = invoice.service as any;
  const balance = invoice.total_amount - invoice.paid_amount;

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} title="Invoice Details" size="lg" showCloseButton={false}>
        <div className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-primary">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Receipt size={24} className="text-primary-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground-primary">
                    {invoice.invoice_number}
                  </h2>
                  <button
                    onClick={handleCopyInvoiceNumber}
                    className="p-1 rounded hover:bg-surface-secondary"
                    title="Copy invoice number"
                  >
                    <Copy size={14} className="text-foreground-tertiary" />
                  </button>
                </div>
                <p className="text-sm text-foreground-secondary">
                  Issued: {formatDate(invoice.invoice_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(invoice.status)}
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-secondary">
                <X size={20} className="text-foreground-secondary" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Overdue Warning */}
            {isOverdue() && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-2 p-3 bg-error/10 text-error rounded-lg"
              >
                <Warning size={18} />
                <span className="text-sm font-medium">
                  This invoice is overdue. Due date was {formatDate(invoice.due_date!)}.
                </span>
              </motion.div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Service & Customer Info */}
              <div className="space-y-4">
                {/* Service Info */}
                <div className="p-4 bg-surface-secondary rounded-lg">
                  <h3 className="text-sm font-medium text-foreground-tertiary mb-3 flex items-center gap-2">
                    <Package size={16} />
                    Service
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {service?.direction === "outgoing" ? (
                      <ArrowRight size={16} className="text-primary-500" />
                    ) : (
                      <ArrowLeft size={16} className="text-info" />
                    )}
                    <span className="font-medium text-foreground-primary">
                      {service?.service_name || "Unknown Service"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-tertiary">
                    {service?.direction === "outgoing" ? "Outgoing Service" : "Incoming Service"}
                  </p>
                </div>

                {/* Stakeholder Info */}
                <div className="p-4 bg-surface-secondary rounded-lg">
                  <h3 className="text-sm font-medium text-foreground-tertiary mb-3 flex items-center gap-2">
                    <Buildings size={16} />
                    Bill To
                  </h3>
                  <p className="font-medium text-foreground-primary">
                    {stakeholder?.name || invoice.customer_snapshot?.name || "Unknown"}
                  </p>
                  {(stakeholder?.address || invoice.customer_snapshot?.address) && (
                    <p className="text-sm text-foreground-secondary mt-1 flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      {stakeholder?.address || invoice.customer_snapshot?.address}
                    </p>
                  )}
                </div>

                {/* Billing Period */}
                <div className="p-4 bg-surface-secondary rounded-lg">
                  <h3 className="text-sm font-medium text-foreground-tertiary mb-3 flex items-center gap-2">
                    <CalendarBlank size={16} />
                    Billing Period
                  </h3>
                  <p className="text-foreground-primary">
                    {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                  </p>
                  {invoice.due_date && (
                    <p className="text-sm text-foreground-secondary mt-2">
                      <span className="font-medium">Due:</span>{" "}
                      <span className={isOverdue() ? "text-error" : ""}>
                        {formatDate(invoice.due_date)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Amounts */}
              <div className="space-y-4">
                {/* Amount Summary */}
                <div className="p-4 bg-surface-secondary rounded-lg">
                  <h3 className="text-sm font-medium text-foreground-tertiary mb-3 flex items-center gap-2">
                    <CurrencyDollar size={16} />
                    Amount Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-secondary">Subtotal</span>
                      <span className="text-foreground-primary">
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>
                    {invoice.tax_rate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-secondary flex items-center gap-1">
                          <Percent size={12} />
                          Tax ({invoice.tax_rate}%)
                        </span>
                        <span className="text-foreground-primary">
                          {formatCurrency(invoice.tax_amount, invoice.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-border-primary pt-2 mt-2">
                      <span className="text-foreground-primary">Total</span>
                      <span className="text-primary-600">
                        {formatCurrency(invoice.total_amount, invoice.currency)}
                      </span>
                    </div>
                    {invoice.paid_amount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground-secondary">Paid</span>
                          <span className="text-success">
                            -{formatCurrency(invoice.paid_amount, invoice.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground-primary">Balance Due</span>
                          <span className={balance > 0 ? "text-error" : "text-success"}>
                            {formatCurrency(balance, invoice.currency)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pro-rata Notice */}
                {invoice.pro_rata_details && (
                  <div className="flex items-start gap-2 p-3 bg-warning/10 text-warning rounded-lg">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Pro-rata billing applied</p>
                      <p className="text-foreground-secondary mt-1">
                        Adjustments made for mid-period service changes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="text-sm font-medium text-foreground-tertiary mb-3">Line Items</h3>
              <div className="border border-border-primary rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className="text-left px-4 py-2 text-foreground-secondary font-medium">
                        Description
                      </th>
                      <th className="text-right px-4 py-2 text-foreground-secondary font-medium">
                        Qty
                      </th>
                      <th className="text-right px-4 py-2 text-foreground-secondary font-medium">
                        Unit Price
                      </th>
                      <th className="text-right px-4 py-2 text-foreground-secondary font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items?.map((item, index) => (
                      <tr key={index} className="border-t border-border-primary">
                        <td className="px-4 py-3">
                          <span className="text-foreground-primary">{item.description}</span>
                          {item.pro_rata_days && (
                            <span className="block text-xs text-foreground-tertiary">
                              ({item.pro_rata_days}/{item.pro_rata_total_days} days)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground-secondary">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground-secondary">
                          {formatCurrency(item.unit_price, invoice.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground-primary">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="p-4 bg-surface-secondary rounded-lg">
                <h3 className="text-sm font-medium text-foreground-tertiary mb-2">Notes</h3>
                <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}

            {/* Internal Notes (Admin only) */}
            {invoice.internal_notes && canWrite("stakeholders") && (
              <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
                <h3 className="text-sm font-medium text-warning mb-2 flex items-center gap-2">
                  <Info size={14} />
                  Internal Notes
                </h3>
                <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                  {invoice.internal_notes}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-border-primary bg-surface-secondary">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info("PDF generation coming soon");
                }}
              >
                <FilePdf size={16} className="mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info("Print functionality coming soon");
                }}
              >
                <Printer size={16} className="mr-2" />
                Print
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {invoice.status === "draft" && canWrite("stakeholders") && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSend}
                  disabled={loadingAction}
                >
                  <PaperPlaneTilt size={16} className="mr-2" />
                  Send Invoice
                </Button>
              )}

              {["sent", "partially_paid", "overdue"].includes(invoice.status) &&
                canWrite("stakeholders") && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <CreditCard size={16} className="mr-2" />
                    Record Payment
                  </Button>
                )}

              {invoice.status !== "paid" &&
                invoice.status !== "cancelled" &&
                canWrite("stakeholders") && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleVoid}
                    disabled={loadingAction}
                  >
                    <XCircle size={16} className="mr-2" />
                    Void
                  </Button>
                )}
            </div>
          </div>
        </div>
      </BaseModal>

      {/* Record Payment Modal */}
      {showPaymentModal && invoice && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={invoice}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
