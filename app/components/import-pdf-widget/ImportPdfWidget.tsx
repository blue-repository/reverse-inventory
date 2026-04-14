"use client";

import { useCallback, useRef, useState } from "react";
import { PdfCarousel } from "@/app/components/import-pdf-widget/PdfCarousel";
import { NegativeStockAlert } from "@/app/components/import-pdf-widget/NegativeStockAlert";
import { ProductTable } from "@/app/components/import-pdf-widget/ProductTable";
import { ImportActionsFooter } from "@/app/components/import-pdf-widget/ImportActionsFooter";
import { Card } from "@/app/components/ui/card";
import { PdfSummary, TableProductRow } from "@/app/components/import-pdf-widget/types";

interface ImportPdfWidgetProps {
  pdfs: PdfSummary[];
  rows: TableProductRow[];
  activePdfId: string | null;
  collapsedGroups: Record<string, boolean>;
  search: string;
  missingSelections: Record<string, Record<string, boolean>>;
  negativeSelections: Record<string, Record<string, boolean>>;
  manualResolvedMissing: Record<string, Record<string, boolean>>;
  itemBusy: Record<string, boolean>;
  isProcessing: boolean;
  unresolvedMissingCount: number;
  unapprovedNegativeCount: number;
  approvedNegativeCount: number;
  isExpanded: boolean;
  onSelectPdf: (pdfId: string | null) => void;
  onRemovePdf: (pdfId: string) => void;
  onOpenPdf: (pdfId: string) => void;
  onToggleExpanded: () => void;
  onMinimize: () => void;
  onSearchChange: (value: string) => void;
  onToggleGroup: (pdfId: string) => void;
  onToggleNegative: (pdfId: string, sku: string, checked: boolean) => void;
  onQuickCreateMissing: (row: TableProductRow) => void;
  onBulkCreateMissing: (pdfId: string) => void;
  onOpenMissingForm: (row: TableProductRow) => void;
  onApproveAllNegative: () => void;
  onClearNegativeApprovals: () => void;
  onCancel: () => void;
  onProcessAll: () => void;
  onAddMore: () => void;
  onFilesDropped: (files: File[]) => void;
}

export function ImportPdfWidget({
  pdfs,
  rows,
  activePdfId,
  collapsedGroups,
  search,
  missingSelections,
  negativeSelections,
  manualResolvedMissing,
  itemBusy,
  isProcessing,
  unresolvedMissingCount,
  unapprovedNegativeCount,
  approvedNegativeCount,
  isExpanded,
  onSelectPdf,
  onRemovePdf,
  onOpenPdf,
  onToggleExpanded,
  onMinimize,
  onSearchChange,
  onToggleGroup,
  onToggleNegative,
  onQuickCreateMissing,
  onBulkCreateMissing,
  onOpenMissingForm,
  onApproveAllNegative,
  onClearNegativeApprovals,
  onCancel,
  onProcessAll,
  onAddMore,
  onFilesDropped,
}: ImportPdfWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Filter PDF files only
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfFiles.length > 0) {
      onFilesDropped(pdfFiles);
    }
  }, [onFilesDropped]);

  return (
    <Card
      className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-50/95 shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 ${
        isExpanded
          ? "inset-4"
          : "bottom-6 right-6 h-[600px] w-[900px] max-w-[calc(100vw-2rem)]"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-semibold">Suelta los archivos PDF aquí</span>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <PdfCarousel
            items={pdfs}
            activePdfId={activePdfId}
            onSelectPdf={onSelectPdf}
            onRemovePdf={onRemovePdf}
            onOpenPdf={onOpenPdf}
            onToggleExpanded={onToggleExpanded}
            onMinimize={onMinimize}
            isExpanded={isExpanded}
            onAddMore={onAddMore}
          />

          <div className="px-4 pt-3">
            <NegativeStockAlert
              count={approvedNegativeCount + unapprovedNegativeCount}
              approvedCount={approvedNegativeCount}
              onApproveAll={onApproveAllNegative}
              onClearApprovals={onClearNegativeApprovals}
            />
          </div>

          <ProductTable
            rows={rows}
            activePdfId={activePdfId}
            collapsedGroups={collapsedGroups}
            search={search}
            missingSelections={missingSelections}
            negativeSelections={negativeSelections}
            manualResolvedMissing={manualResolvedMissing}
            itemBusy={itemBusy}
            onSearchChange={onSearchChange}
            onToggleGroup={onToggleGroup}
            onToggleNegative={onToggleNegative}
            onQuickCreateMissing={onQuickCreateMissing}
            onBulkCreateMissing={onBulkCreateMissing}
            onOpenMissingForm={onOpenMissingForm}
          />
        </div>

        <ImportActionsFooter
          totalReady={rows.length}
          unresolvedMissing={unresolvedMissingCount}
          unapprovedNegative={unapprovedNegativeCount}
          processing={isProcessing}
          onCancel={onCancel}
          onProcess={onProcessAll}
        />
      </div>
    </Card>
  );
}
