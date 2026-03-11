"use client";

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
  onSearchChange: (value: string) => void;
  onToggleGroup: (pdfId: string) => void;
  onToggleNegative: (pdfId: string, sku: string, checked: boolean) => void;
  onQuickCreateMissing: (row: TableProductRow) => void;
  onOpenMissingForm: (row: TableProductRow) => void;
  onApproveAllNegative: () => void;
  onClearNegativeApprovals: () => void;
  onCancel: () => void;
  onProcessAll: () => void;
}

export function ImportPdfWidget({
  pdfs,
  rows,
  activePdfId,
  collapsedGroups,
  search,
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
  onSearchChange,
  onToggleGroup,
  onToggleNegative,
  onQuickCreateMissing,
  onOpenMissingForm,
  onApproveAllNegative,
  onClearNegativeApprovals,
  onCancel,
  onProcessAll,
}: ImportPdfWidgetProps) {
  return (
    <Card
      className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-50/95 shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 ${
        isExpanded
          ? "inset-4"
          : "bottom-6 right-6 h-[600px] w-[900px] max-w-[calc(100vw-2rem)]"
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <PdfCarousel
            items={pdfs}
            activePdfId={activePdfId}
            onSelectPdf={onSelectPdf}
            onRemovePdf={onRemovePdf}
            onOpenPdf={onOpenPdf}
            onToggleExpanded={onToggleExpanded}
            isExpanded={isExpanded}
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
            negativeSelections={negativeSelections}
            manualResolvedMissing={manualResolvedMissing}
            itemBusy={itemBusy}
            onSearchChange={onSearchChange}
            onToggleGroup={onToggleGroup}
            onToggleNegative={onToggleNegative}
            onQuickCreateMissing={onQuickCreateMissing}
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
