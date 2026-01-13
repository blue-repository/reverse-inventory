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
  description?: string | null;
  stock: number;
  stock_inicial: number;
  unit_of_measure?: UnitOfMeasure | null;
  administration_route?: string | null;
  notes?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type MovementType = "entrada" | "salida" | "ajuste";

export type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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
