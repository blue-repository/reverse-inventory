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
  unit_of_measure?: UnitOfMeasure | null;
  administration_route?: string | null;
  notes?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  image_url?: string | null;
  created_at: string;
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
