"use client";

import { Fragment, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, FileText, PlusCircle } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { TableProductRow } from "@/app/components/import-pdf-widget/types";
import { ProductRow } from "@/app/components/import-pdf-widget/ProductRow";
import { MissingProductRow } from "@/app/components/import-pdf-widget/MissingProductRow";

interface ProductTableProps {
  rows: TableProductRow[];
  activePdfId: string | null;
  collapsedGroups: Record<string, boolean>;
  search: string;
  missingSelections: Record<string, Record<string, boolean>>;
  negativeSelections: Record<string, Record<string, boolean>>;
  manualResolvedMissing: Record<string, Record<string, boolean>>;
  itemBusy: Record<string, boolean>;
  onSearchChange: (value: string) => void;
  onToggleGroup: (pdfId: string) => void;
  onToggleNegative: (pdfId: string, sku: string, checked: boolean) => void;
  onQuickCreateMissing: (row: TableProductRow) => void;
  onBulkCreateMissing: (pdfId: string) => void;
  onOpenMissingForm: (row: TableProductRow) => void;
}

export function ProductTable({
  rows,
  activePdfId,
  collapsedGroups,
  search,
  missingSelections,
  negativeSelections,
  manualResolvedMissing,
  itemBusy,
  onSearchChange,
  onToggleGroup,
  onToggleNegative,
  onQuickCreateMissing,
  onBulkCreateMissing,
  onOpenMissingForm,
}: ProductTableProps) {
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (activePdfId && row.pdfId !== activePdfId) return false;
      if (!normalizedSearch) return true;

      const haystack = `${row.sku} ${row.name} ${row.pdfName}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [activePdfId, rows, search]);

  const columns = useMemo<ColumnDef<TableProductRow>[]>(
    () => [
      {
        id: "select",
        header: "Seleccionar",
        cell: () => null,
      },
      {
        accessorKey: "sku",
        header: "Codigo",
      },
      {
        accessorKey: "name",
        header: "Nombre del medicamento",
      },
      {
        accessorKey: "quantity",
        header: "Cantidad",
      },
      {
        id: "status",
        header: "Estado",
        cell: () => null,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: () => null,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const groups = useMemo(() => {
    const map = new Map<string, { pdfName: string; rows: TableProductRow[] }>();

    for (const row of filteredRows) {
      const existing = map.get(row.pdfId);
      if (existing) {
        existing.rows.push(row);
        continue;
      }
      map.set(row.pdfId, { pdfName: row.pdfName, rows: [row] });
    }

    return Array.from(map.entries()).map(([pdfId, group]) => ({
      pdfId,
      pdfName: group.pdfName,
      rows: group.rows,
    }));
  }, [filteredRows]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por codigo, nombre o PDF..."
          className="max-w-md"
        />
        <Badge variant="default">{filteredRows.length} productos</Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-slate-50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.id === "quantity" ? "text-right" : ""}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-600">
                  No hay productos para mostrar.
                </TableCell>
              </TableRow>
            ) : null}

            {groups.map((group) => {
              const isCollapsed = !!collapsedGroups[group.pdfId];
              const unresolvedMissingInGroup = group.rows.filter(
                (r) =>
                  r.status === "missing" &&
                  !manualResolvedMissing[r.pdfId]?.[r.sku] &&
                  !missingSelections[r.pdfId]?.[r.sku]
              ).length;

              return (
                <Fragment key={`group-${group.pdfId}`}>
                  <TableRow key={`header-${group.pdfId}`} className="bg-slate-100 hover:bg-slate-100">
                    <TableCell colSpan={6}>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => onToggleGroup(group.pdfId)}
                          className="flex items-center gap-2 text-left"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-slate-700" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-700" />
                          )}
                          <FileText className="h-4 w-4 text-slate-700" />
                          <span className="font-semibold text-slate-900">{group.pdfName}</span>
                          <span className="text-xs text-slate-600">({group.rows.length})</span>
                        </button>
                        {unresolvedMissingInGroup > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBulkCreateMissing(group.pdfId);
                            }}
                            className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Crear todos ({unresolvedMissingInGroup})
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {!isCollapsed
                    ? group.rows.map((row) => {
                        if (row.status === "missing") {
                          return (
                            <MissingProductRow
                              key={row.id}
                              row={row}
                              resolved={!!manualResolvedMissing[row.pdfId]?.[row.sku]}
                              confirmed={!!missingSelections[row.pdfId]?.[row.sku]}
                              busy={!!itemBusy[row.pdfId]}
                              onQuickCreate={() => onQuickCreateMissing(row)}
                              onOpenFullForm={() => onOpenMissingForm(row)}
                            />
                          );
                        }

                        return (
                          <ProductRow
                            key={row.id}
                            row={row}
                            negativeApproved={!!negativeSelections[row.pdfId]?.[row.sku]}
                            onToggleNegative={(checked) => onToggleNegative(row.pdfId, row.sku, checked)}
                          />
                        );
                      })
                    : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
