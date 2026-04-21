export type UnitOfMeasure = 
  | "mg" 
  | "ml" 
  | "g" 
  | "mcg" 
  | "unidades" 
  | "tabletas" 
  | "cápsulas" 
  | "gotas" 
  | "inhalaciones" 
  | "otros";

export type Product = {
  id: string;
  name: string;
  barcode?: string | null;
  batch_number?: string | null;
  description?: string | null;
  stock: number;
  stock_inicial: number;
  unit_of_measure?: UnitOfMeasure | null;
  administration_route?: string | null;
  notes?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  image_url?: string | null;
  shelf?: string | null;
  drawer?: string | null;
  section?: string | null;
  location_notes?: string | null;
  category?: string | null;
  specialty?: string | null;
  reporting_unit?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ProductBatch = {
  id: string;
  product_id: string;
  batch_number: string;
  stock: number;
  initial_stock: number;
  issue_date?: string | null;
  expiration_date: string;
  shelf?: string | null;
  drawer?: string | null;
  section?: string | null;
  location_notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ProductWithBatches = Product & {
  batches?: ProductBatch[];
};

export type MovementType = "entrada" | "salida" | "ajuste";

export type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  reporting_unit?: string | null;
  recipe_code?: string | null;
  patient_name?: string | null;
  recipe_date?: string | null;
  movement_batch_details?: {
    quantity?: number | null;
    product_batches?: {
      batch_number?: string | null;
    } | null;
  }[];
  from_pdf_movement?: boolean | null;
  created_at: string;
  updated_at: string;
};

// ⭐ NUEVO: Detalle de lotes afectados por un movimiento
export type MovementBatchDetail = {
  id: string;
  movement_id: string;
  batch_id: string;
  quantity: number;
  batch_stock_before: number;
  batch_stock_after: number;
  created_at: string;
};

// ⭐ NUEVO: Movimiento con información de lotes (de la vista)
export type MovementWithBatchDetails = {
  movement_id: string;
  product_id: string;
  product_name: string;
  movement_type: MovementType;
  total_quantity: number;
  reason?: string | null;
  notes?: string | null;
  movement_date: string;
  recorded_by?: string | null;
  // Detalles del lote (puede ser null si no hay lotes asociados)
  detail_id?: string | null;
  batch_id?: string | null;
  batch_number?: string | null;
  batch_quantity?: number | null;
  batch_stock_before?: number | null;
  batch_stock_after?: number | null;
  batch_expiration_date?: string | null;
  shelf?: string | null;
  drawer?: string | null;
  section?: string | null;
};

// ⭐ NUEVO: Resultado de la función get_movement_batch_breakdown
export type MovementBatchBreakdown = {
  batch_id: string;
  batch_number: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  expiration_date: string;
  location: string;
};

// ⭐ NUEVO: Resultado de la función get_batch_movement_history
export type BatchMovementHistory = {
  movement_id: string;
  movement_type: MovementType;
  movement_date: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  product_name: string;
  recorded_by: string;
  reason?: string | null;
};

export type ProductStockSummary = {
  id: string;
  name: string;
  stock_inicial: number;
  stock_actual: number;
  updated_at: string;
};

export const UNITS_OF_MEASURE: UnitOfMeasure[] = [
  "mg",
  "ml",
  "g",
  "mcg",
  "unidades",
  "tabletas",
  "cápsulas",
  "gotas",
  "inhalaciones",
  "otros",
];
