"use client";

import { AlertTriangle, CheckCircle2, Expand, FileText, X } from "lucide-react";
import { PdfSummary } from "@/app/components/import-pdf-widget/types";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/lib/utils";

interface PdfCardProps {
  pdf: PdfSummary;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  onOpen: () => void;
}

export function PdfCard({ pdf, isActive, onClick, onRemove, onOpen }: PdfCardProps) {
  const hasMissing = pdf.missingProducts > 0;
  const hasNegative = pdf.negativeStockProducts > 0;
  const isSuccessfullyProcessed = pdf.status === "success";
  const didExecuteEgress = !!pdf.didExecuteEgress;
  const previewSrc = pdf.previewUrl;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative min-w-[170px] max-w-[170px] rounded-xl border bg-slate-50 p-2 text-left shadow-sm transition-all hover:shadow-md",
        hasNegative && "border-red-300",
        !hasNegative && hasMissing && "border-amber-300",
        !hasMissing && !hasNegative && "border-emerald-200",
        isActive && "border-blue-500 bg-blue-50/70 ring-2 ring-blue-300 shadow-[0_0_0_2px_rgba(59,130,246,0.12)]"
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="absolute left-1.5 top-1.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800/90 text-white opacity-0 shadow transition-opacity hover:bg-slate-700 focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`Abrir ${pdf.name}`}
        title="Abrir PDF"
      >
        <Expand className="h-3 w-3" />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute right-1.5 top-1.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
        aria-label={`Eliminar ${pdf.name}`}
        title="Descartar PDF"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="aspect-[3/4] w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {previewSrc ? (
            <img
              title={`Vista previa ${pdf.name}`}
              src={previewSrc}
              alt={`Vista previa de ${pdf.name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileText className="h-7 w-7 text-slate-400" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 px-1">
        <p className="truncate text-xs text-slate-800" title={pdf.name}>
          {pdf.name}
        </p>

        <div className="mt-1 space-y-0.5 text-[11px] text-slate-700">
          <p>{pdf.totalProducts} productos</p>
          {pdf.negativeStockProducts > 0 ? <p>{pdf.negativeStockProducts} con stock negativo</p> : null}
          {pdf.missingProducts > 0 ? <p>{pdf.missingProducts} productos faltantes</p> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1 px-1">
        {pdf.isProcessing ? <Badge variant="info">Procesando</Badge> : null}
        {isSuccessfullyProcessed && !hasMissing && !hasNegative ? (
          didExecuteEgress ? (
            <Badge variant="warning" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Ya procesado
            </Badge>
          ) : (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Listo para procesar
            </Badge>
          )
        ) : null}
        {hasMissing ? (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Faltantes
          </Badge>
        ) : null}
        {hasNegative ? (
          <Badge variant="danger" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Negativo
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
