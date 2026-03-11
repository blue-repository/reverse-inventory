"use client";

import { Button } from "@/app/components/ui/button";

interface ImportActionsFooterProps {
  totalReady: number;
  unresolvedMissing: number;
  unapprovedNegative: number;
  processing: boolean;
  onCancel: () => void;
  onProcess: () => void;
}

export function ImportActionsFooter({
  totalReady,
  unresolvedMissing,
  unapprovedNegative,
  processing,
  onCancel,
  onProcess,
}: ImportActionsFooterProps) {
  const blocked = unresolvedMissing > 0 || unapprovedNegative > 0 || processing;

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-600">
          {totalReady} productos listos. {unresolvedMissing} faltantes sin resolver. {unapprovedNegative} requieren aprobacion.
        </p>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={processing}>
            Cancelar
          </Button>
          <Button type="button" onClick={onProcess} disabled={blocked}>
            {processing ? "Procesando..." : "Procesar egreso"}
          </Button>
        </div>
      </div>
    </div>
  );
}
