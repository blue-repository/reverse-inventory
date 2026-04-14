"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { TableCell, TableRow } from "@/app/components/ui/table";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { TableProductRow } from "@/app/components/import-pdf-widget/types";

interface ProductRowProps {
  row: TableProductRow;
  negativeApproved: boolean;
  onToggleNegative: (checked: boolean) => void;
}

export function ProductRow({ row, negativeApproved, onToggleNegative }: ProductRowProps) {
  const isNegative = row.status === "negative";
  const isProcessed = row.status === "processed";

  return (
    <TableRow
      className={
        isNegative
          ? "bg-red-50 hover:bg-red-100/50"
          : isProcessed
            ? "bg-amber-50 hover:bg-amber-100/50"
            : ""
      }
    >
      <TableCell className="w-[68px]">
        {isNegative ? (
          <Checkbox
            checked={negativeApproved}
            onCheckedChange={onToggleNegative}
            ariaLabel={`Aprobar stock negativo para ${row.sku}`}
          />
        ) : null}
      </TableCell>
      <TableCell className="font-mono text-xs">{row.sku || "-"}</TableCell>
      <TableCell>{row.name || "-"}</TableCell>
      <TableCell className="text-right font-semibold">{row.quantity}</TableCell>
      <TableCell>
        {row.status === "ok" ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Listo para procesar
          </Badge>
        ) : row.status === "processed" ? (
          <Badge variant="warning" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Ya procesado
          </Badge>
        ) : (
          <Badge variant="danger" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Stock negativo ({row.negativeResult})
          </Badge>
        )}
      </TableCell>
      <TableCell />
    </TableRow>
  );
}
