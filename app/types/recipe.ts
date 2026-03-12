/**
 * Tipos para el procesamiento de notas de egreso desde PDFs.
 * Soporta múltiples subtipos: "Dispensación A Pacientes", "Abastecimiento Entre Entidades De Msp", etc.
 */

export interface RecipeMedicament {
  sku: string;
  name: string;
  unit: string;
  batch: string;
  expirationDate: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface MissingRecipeMedicament extends RecipeMedicament {
  reason?: string;
}

export interface AlreadyProcessedRecipeMedicament extends RecipeMedicament {
  productId?: string;
}

export interface InsufficientStockItem {
  sku: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  currentStock: number;
}

export interface RecipeData {
  // Información general del egreso
  entityOrigin: string;
  warehouseOrigin: string;
  egressDate: string;
  egressNumber: string;
  /** Subtipo del documento, ej: "Dispensación A Pacientes", "Abastecimiento Entre Entidades De Msp" */
  egressSubtype?: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  additionalDocument?: string;

  // Información del receptor (paciente)
  recipientName: string;
  recipientId: string;
  patientIdentifier: string;
  patientName?: string;

  // Medicamentos
  medicaments: RecipeMedicament[];

  // Información adicional
  observations?: string;
  total: number;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  didExecuteEgress?: boolean;
  egressNumber?: string;
  medicamentCount?: number;
  total?: number;
  error?: string;
  missingMedicaments?: MissingRecipeMedicament[];
  insufficientStockItems?: InsufficientStockItem[];
  alreadyProcessedMedicaments?: AlreadyProcessedRecipeMedicament[];
}

export interface UploadQueueItem {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "success" | "error";
  progress: number;
  error?: string;
  result?: ProcessingResult;
}
