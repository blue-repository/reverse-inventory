"use client";

import { AlertTriangle } from "lucide-react";
import { TableCell, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { TableProductRow } from "@/app/components/import-pdf-widget/types";

interface MissingProductRowProps {
  row: TableProductRow;
  resolved: boolean;
  busy?: boolean;
  onQuickCreate: () => void;
  onOpenFullForm: () => void;
}

export function MissingProductRow({
  row,
  resolved,
  busy,
  onQuickCreate,
  onOpenFullForm,
}: MissingProductRowProps) {
  return (
    <TableRow className="bg-amber-50 hover:bg-amber-100/50">
      <TableCell className="w-[68px]" />
      <TableCell className="font-mono text-xs">-</TableCell>
      <TableCell>{row.name || row.sku}</TableCell>
      <TableCell className="text-right font-semibold">{row.quantity}</TableCell>
      <TableCell>
        {resolved ? (
          <Badge variant="success">Resuelto</Badge>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Producto faltante
            </Badge>
            <Button type="button" size="sm" variant="outline" onClick={onQuickCreate} disabled={busy}>
              {busy ? "Creando..." : "Creacion rapida"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onOpenFullForm}>
              Abrir formulario de producto
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
