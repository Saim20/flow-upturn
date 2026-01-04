"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, StatusBadge, InfoRow } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Calendar, CurrencyDollar, User, FileText, PencilSimple, TrashSimple, ArrowSquareOut, WarningCircle } from "@phosphor-icons/react";
import { Employee } from "@/lib/types/schemas";

interface Settlement {
  id: number;
  settlement_type_id: number;
  amount: number;
  event_date: string;
  requested_to: string;
  description: string;
  status: string;
  in_advance: boolean;
  claimant_id: string;
}

interface SettlementType {
  id: number;
  name: string;
  allowance?: number;
}

interface SettlementCardProps {
  settlement: Settlement;
  settlementTypes: SettlementType[];
  employees: Employee[];
  onEdit?: () => void;
  onDelete?: () => void;
  onDetails?: () => void;
  isDeleting?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showDetails?: boolean;
}

export default React.memo(function SettlementCard({
  settlement,
  settlementTypes,
  employees,
  onEdit,
  onDelete,
  onDetails,
  isDeleting = false,
  showEdit = false,
  showDelete = false,
  showDetails = false,
}: SettlementCardProps) {
  const settlementType = settlementTypes.find(type => type.id === settlement.settlement_type_id);
  const claimant = employees.find(emp => emp.id === settlement.claimant_id);
  const requestedTo = employees.find(emp => emp.id === settlement.requested_to);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'draft':
        return 'info';
      default:
        return 'info';
    }
  };

  const actions = (
    <div className="flex items-center gap-2">
      {showEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="p-2 h-8 w-8 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <PencilSimple size={14} />
        </Button>
      )}
      {showDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          isLoading={isDeleting}
          className="p-2 h-8 w-8 hover:bg-error/10 dark:hover:bg-error/20 hover:text-error"
        >
          <TrashSimple size={14} />
        </Button>
      )}
      {showDetails && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDetails}
          className="p-2 h-8 w-8 hover:bg-background-secondary dark:hover:bg-background-tertiary hover:text-foreground-primary"
        >
          <ArrowSquareOut size={14} />
        </Button>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader
        title={settlementType?.name || "Settlement Request"}
        subtitle={settlement.description}
        icon={settlement.in_advance ? <WarningCircle size={20} className="text-warning" /> : <CurrencyDollar size={20} className="text-success" />}
        action={actions}
      />
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <InfoRow
            icon={<CurrencyDollar size={16} />}
            label="Amount"
            value={`$${settlement.amount.toLocaleString()}`}
          />
          <InfoRow
            icon={<Calendar size={16} />}
            label="Event Date"
            value={settlement.event_date}
          />
          <InfoRow
            icon={<User size={16} />}
            label="Claimant"
            value={claimant?.name || "Unknown"}
          />
          <InfoRow
            icon={<User size={16} />}
            label="Requested To"
            value={requestedTo?.name || "Unknown"}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <StatusBadge 
            status={settlement.status} 
            variant={getStatusVariant(settlement.status)}
          />
          {settlement.in_advance && (
            <span className="text-xs bg-warning/10 text-warning dark:bg-warning/20 px-2 py-1 rounded-full font-medium">
              Advance Payment
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
