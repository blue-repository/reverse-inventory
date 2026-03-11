"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface NegativeStockAlertProps {
  count: number;
  approvedCount: number;
  onApproveAll: () => void;
  onClearApprovals: () => void;
}

export function NegativeStockAlert({
  count,
  approvedCount,
  onApproveAll,
  onClearApprovals,
}: NegativeStockAlertProps) {
  if (count === 0) return null;

  const pendingCount = Math.max(count - approvedCount, 0);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {count} productos generaran stock negativo.
            </p>
            <p className="text-xs text-amber-800">
              {approvedCount} aprobados, {pendingCount} pendientes por aprobar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClearApprovals}>
            Limpiar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onApproveAll}>
            Aprobar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
