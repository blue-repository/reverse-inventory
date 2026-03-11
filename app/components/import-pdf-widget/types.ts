import { MissingRecipeMedicament } from "@/app/types/recipe";
import { UploadQueueItem } from "@/app/types/recipe";

export type ProductRowState = "ok" | "negative" | "missing" | "processed";

export interface PdfSummary {
  id: string;
  name: string;
  previewUrl?: string;
  pdfUrl?: string;
  status: UploadQueueItem["status"];
  didExecuteEgress?: boolean;
  totalProducts: number;
  missingProducts: number;
  negativeStockProducts: number;
  isProcessing: boolean;
  hasError: boolean;
}

export interface TableProductRow {
  id: string;
  pdfId: string;
  pdfName: string;
  sku: string;
  name: string;
  quantity: number;
  status: ProductRowState;
  currentStock?: number;
  requestedQuantity?: number;
  negativeResult?: number;
  missingMedicament?: MissingRecipeMedicament;
  isNewlyCreated?: boolean;
}

export interface MissingProductDraft {
  sku: string;
  batch_number?: string;
  name: string;
  stock: string;
  description: string;
  unit_of_measure: string;
  administration_route: string;
  notes: string;
  issue_date: string;
  expiration_date: string;
  shelf: string;
  drawer: string;
  section: string;
  location_notes: string;
  category: string;
  specialty: string;
  reporting_unit: string;
}
