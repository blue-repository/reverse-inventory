import { PdfSummary, TableProductRow } from "@/app/components/import-pdf-widget/types";

export const mockPdfSummaries: PdfSummary[] = [
  {
    id: "pdf-1",
    name: "receta_01.pdf",
    status: "error",
    totalProducts: 3,
    missingProducts: 1,
    negativeStockProducts: 1,
    isProcessing: false,
    hasError: true,
  },
  {
    id: "pdf-2",
    name: "receta_02.pdf",
    status: "success",
    totalProducts: 5,
    missingProducts: 0,
    negativeStockProducts: 0,
    isProcessing: false,
    hasError: false,
  },
];

export const mockTableRows: TableProductRow[] = [
  {
    id: "r-1",
    pdfId: "pdf-1",
    pdfName: "receta_01.pdf",
    sku: "750123456001",
    name: "Amoxicilina 500mg",
    quantity: 2,
    status: "ok",
  },
  {
    id: "r-2",
    pdfId: "pdf-1",
    pdfName: "receta_01.pdf",
    sku: "750123456002",
    name: "Paracetamol 500mg",
    quantity: 10,
    status: "negative",
    currentStock: 5,
    requestedQuantity: 10,
    negativeResult: -5,
  },
  {
    id: "r-3",
    pdfId: "pdf-1",
    pdfName: "receta_01.pdf",
    sku: "750123456003",
    name: "Diclofenaco",
    quantity: 1,
    status: "missing",
  },
];
