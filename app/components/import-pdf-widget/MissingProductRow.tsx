"use client";

import { AlertTriangle, CheckCircle2, Plus, FileEdit, Minus } from "lucide-react";
import { TableCell, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { TableProductRow } from "@/app/components/import-pdf-widget/types";

interface MissingProductRowProps {
  row: TableProductRow;
  resolved: boolean;
  confirmed: boolean;
  busy?: boolean;
  onQuickCreate: () => void;
  onOpenFullForm: () => void;
}

export function MissingProductRow({
  row,
  resolved,
  confirmed,
  busy,
  onQuickCreate,
  onOpenFullForm,
}: MissingProductRowProps) {
  return (
    <TableRow className="bg-amber-50 hover:bg-amber-100/50">
      <TableCell className="w-[68px]" />
      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
      <TableCell>{row.name || row.sku}</TableCell>
      <TableCell className="text-right font-semibold">{row.quantity}</TableCell>
      <TableCell>
        {resolved ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Resuelto
          </Badge>
        ) : confirmed ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Confirmado
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Faltante
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {!resolved && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={confirmed ? "secondary" : "outline"}
              onClick={onQuickCreate}
              disabled={busy}
              className="h-7 gap-1 px-2 text-xs"
              title={confirmed ? "Quitar confirmación" : "Confirmar creación rápida"}
            >
              {confirmed ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" /> }
              {confirmed ? "Quitar" : "Crear"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onOpenFullForm}
              className="h-7 gap-1 px-2 text-xs"
              title="Abrir formulario completo"
            >
              <FileEdit className="h-3 w-3" />
              Formulario
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
