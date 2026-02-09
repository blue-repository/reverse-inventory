-- ============================================================
-- Migration: 001_create_tables.sql
-- Descripción: Crea las tablas principales del sistema
-- Dependencias: 000_create_helper_functions.sql (funciones)
-- ============================================================

-- ============================================================
-- Tabla: products
-- Descripción: Almacena información de todos los productos
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información básica del producto
  name TEXT NOT NULL,
  barcode TEXT,
  description TEXT,
  
  -- Stock
  stock INTEGER DEFAULT 0,                   -- Stock actual (calculado)
  stock_inicial INTEGER NOT NULL DEFAULT 0,  -- Stock inicial del producto
  
  -- Información farmacéutica
  unit_of_measure TEXT,                      -- mg, ml, g, unidades, etc.
  administration_route TEXT,                 -- oral, inyectable, tópico, etc.
  notes TEXT,
  
  -- Fechas del producto
  issue_date DATE,                           -- Fecha de expedición/fabricación
  expiration_date DATE,                      -- Fecha de vencimiento
  
  -- Multimedia
  image_url TEXT,
  
  -- Auditoría
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,       -- Soft delete
  created_by TEXT DEFAULT 'Sistema',
  updated_by TEXT DEFAULT 'Sistema',
  
  -- Ubicación física en almacén (actual)
  shelf VARCHAR(50),                         -- Estantería actual
  drawer VARCHAR(50),                        -- Cajón actual
  section VARCHAR(50),                       -- Sección actual
  location_notes TEXT,                       -- Notas de ubicación
  
  -- Ubicación física en almacén (predeterminada)
  default_shelf VARCHAR(50),                 -- Estantería por defecto
  default_drawer VARCHAR(50),                -- Cajón por defecto
  default_section VARCHAR(50),               -- Sección por defecto
  
  -- Clasificación y categorización
  category VARCHAR(50),                      -- Categoría del producto
  specialty VARCHAR(100),                    -- Especialidad médica
  
  -- Información de reportes
  reporting_unit VARCHAR(50),                -- Unidad para reportes
  average_monthly_consumption INTEGER,       -- Consumo promedio mensual
  
  -- Códigos y valores
  cudim_code TEXT,                           -- Código CUDIM
  price NUMERIC(10,2),                       -- Precio unitario
  total_value NUMERIC(10,2),                 -- Valor total (stock * precio)
  
  -- Constraints
  CONSTRAINT products_stock_check CHECK (stock >= 0),
  CONSTRAINT products_stock_inicial_check CHECK (stock_inicial >= 0)
);

-- Documentación de campos
COMMENT ON TABLE products IS 'Almacena información de todos los productos del inventario';
COMMENT ON COLUMN products.id IS 'Identificador único (UUID)';
COMMENT ON COLUMN products.name IS 'Nombre del producto (obligatorio)';
COMMENT ON COLUMN products.barcode IS 'Código de barras para escaneo';
COMMENT ON COLUMN products.stock IS 'Stock actual calculado automáticamente';
COMMENT ON COLUMN products.stock_inicial IS 'Stock inicial del producto';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete - NULL si activo, fecha si eliminado';
COMMENT ON COLUMN products.created_by IS 'Usuario que creó el registro';
COMMENT ON COLUMN products.updated_by IS 'Usuario que actualizó el registro por última vez';
COMMENT ON COLUMN products.shelf IS 'Ubicación actual - estantería';
COMMENT ON COLUMN products.default_shelf IS 'Ubicación predeterminada - estantería';
COMMENT ON COLUMN products.category IS 'Categoría del producto para agrupación';
COMMENT ON COLUMN products.specialty IS 'Especialidad médica asociada';
COMMENT ON COLUMN products.cudim_code IS 'Código CUDIM (Clasificador Único de Insumos Médicos)';
COMMENT ON COLUMN products.average_monthly_consumption IS 'Consumo promedio mensual para planificación';
COMMENT ON COLUMN products.price IS 'Precio unitario del producto';
COMMENT ON COLUMN products.total_value IS 'Valor total en inventario (stock × precio)';

-- ============================================================
-- Tabla: product_batches (CREADA ANTES para evitar dependencia circular)
-- Descripción: Información de lotes de productos (para entrada)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Información del lote
  batch_number VARCHAR(100) NOT NULL,
  
  -- Stock del lote
  stock INTEGER NOT NULL DEFAULT 0,
  initial_stock INTEGER NOT NULL DEFAULT 0,  -- Stock inicial del lote
  
  -- Fechas
  issue_date DATE,                            -- Fecha de emisión/fabricación
  expiration_date DATE NOT NULL,              -- Fecha de vencimiento (OBLIGATORIO)
  
  -- Ubicación física en almacén
  shelf VARCHAR(50),                          -- Estantería
  drawer VARCHAR(50),                         -- Cajón
  section VARCHAR(50),                        -- Sección
  location_notes TEXT,                        -- Notas de ubicación
  
  -- Estado
  is_active BOOLEAN DEFAULT true,             -- Activo/Inactivo (reemplaza deleted_at)
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) DEFAULT 'Sistema',
  updated_by VARCHAR(255) DEFAULT 'Sistema',
  
  -- Constraint único: un batch_number por producto
  CONSTRAINT unique_batch_per_product UNIQUE (product_id, batch_number)
);

-- Documentación de campos
COMMENT ON TABLE product_batches IS 'Información de lotes de productos (para seguimiento de entrada)';
COMMENT ON COLUMN product_batches.batch_number IS 'Número de lote (ej: LOTE-20250205-001)';
COMMENT ON COLUMN product_batches.stock IS 'Stock actual del lote';
COMMENT ON COLUMN product_batches.initial_stock IS 'Stock inicial cuando se registró el lote';
COMMENT ON COLUMN product_batches.expiration_date IS 'Fecha de vencimiento del lote (obligatorio)';
COMMENT ON COLUMN product_batches.shelf IS 'Ubicación - estantería';
COMMENT ON COLUMN product_batches.drawer IS 'Ubicación - cajón';
COMMENT ON COLUMN product_batches.section IS 'Ubicación - sección';
COMMENT ON COLUMN product_batches.is_active IS 'Indica si el lote está activo (true) o inactivo (false)';
COMMENT ON COLUMN product_batches.created_by IS 'Usuario que creó el lote';
COMMENT ON COLUMN product_batches.updated_by IS 'Usuario que actualizó el lote por última vez';

-- ============================================================
-- Tabla: inventory_movements
-- Descripción: Registro de todos los movimientos de inventario
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento
  movement_type TEXT NOT NULL,
  CONSTRAINT movement_type_check CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
  
  -- Cantidad
  quantity INTEGER NOT NULL,
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  
  -- Información del movimiento
  reason TEXT,         -- Motivo: Compra, Venta, Devolución, etc.
  notes TEXT,          -- Notas adicionales
  
  -- Auditoría y trazabilidad
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by TEXT DEFAULT 'Sistema',  -- Usuario que registró el movimiento
  
  -- Relación con lotes
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
  
  -- Agrupación de movimientos
  movement_group_id UUID,              -- Para agrupar movimientos relacionados
  movement_date DATE,                  -- Fecha del movimiento (puede diferir de created_at)
  
  -- Campos para recetas/prescripciones
  is_recipe_movement BOOLEAN DEFAULT false,
  patient_identification VARCHAR(255),
  patient_name VARCHAR(255),
  recipe_date DATE,
  prescribed_by VARCHAR(255),
  cie_code VARCHAR(10),
  recipe_notes TEXT,
  prescription_group_id UUID,
  recipe_code VARCHAR(50)
);

-- Documentación de campos
COMMENT ON TABLE inventory_movements IS 'Registro de entrada, salida y ajustes de inventario';
COMMENT ON COLUMN inventory_movements.product_id IS 'Referencia al producto (FK)';
COMMENT ON COLUMN inventory_movements.movement_type IS 'Tipo: entrada, salida, ajuste';
COMMENT ON COLUMN inventory_movements.quantity IS 'Cantidad movida (siempre positivo)';
COMMENT ON COLUMN inventory_movements.reason IS 'Motivo del movimiento';
COMMENT ON COLUMN inventory_movements.recorded_by IS 'Usuario que registró el movimiento';
COMMENT ON COLUMN inventory_movements.batch_id IS 'Lote asociado al movimiento (opcional)';
COMMENT ON COLUMN inventory_movements.movement_group_id IS 'ID para agrupar múltiples movimientos relacionados';
COMMENT ON COLUMN inventory_movements.movement_date IS 'Fecha del movimiento (puede diferir de created_at)';
COMMENT ON COLUMN inventory_movements.is_recipe_movement IS 'Indica si el movimiento está asociado a una receta médica';
COMMENT ON COLUMN inventory_movements.patient_name IS 'Nombre del paciente (si es movimiento de receta)';
COMMENT ON COLUMN inventory_movements.patient_identification IS 'Identificación del paciente (si es movimiento de receta)';
COMMENT ON COLUMN inventory_movements.recipe_code IS 'Código de la receta médica';
COMMENT ON COLUMN inventory_movements.prescription_group_id IS 'Agrupa prescripciones relacionadas';
COMMENT ON COLUMN inventory_movements.cie_code IS 'Código CIE-10 de diagnóstico';

-- ============================================================
-- Tabla: product_recipes (Para control de medicamentos recetados)
-- Descripción: Información de recetas médicas para salidas
-- ============================================================
CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  inventory_movement_id UUID REFERENCES inventory_movements(id) ON DELETE CASCADE,
  
  -- Información de la receta
  recipe_code TEXT,
  recipe_date DATE,
  
  -- Información del paciente
  patient_name TEXT,
  patient_id TEXT,
  
  -- Información del prescriptor
  prescriber_name TEXT,
  prescriber_profession TEXT,
  
  -- Diagnóstico
  cie_code TEXT,     -- Código CIE-10
  diagnosis TEXT,    -- Descripción del diagnóstico
  
  -- Notas
  notes TEXT,
  
  -- Auditoría
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Documentación de campos
COMMENT ON TABLE product_recipes IS 'Información de recetas médicas para seguimiento de medicamentos recetados';
COMMENT ON COLUMN product_recipes.recipe_code IS 'Número de receta';
COMMENT ON COLUMN product_recipes.cie_code IS 'Código CIE-10 del diagnóstico';

-- ============================================================
-- Tabla: users (Para auditoría de quién registró cada operación)
-- Descripción: Información de usuarios del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información del usuario
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  
  -- Rol (para futuro)
  role TEXT DEFAULT 'operario',
  CONSTRAINT role_check CHECK (role IN ('admin', 'supervisor', 'operario')),
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Auditoría
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Documentación de campos
COMMENT ON TABLE users IS 'Información de usuarios del sistema (para auditoría)';
COMMENT ON COLUMN users.role IS 'Rol del usuario: admin, supervisor, operario';

-- ============================================================
-- Confirmación
-- ============================================================
SELECT 'Tablas principales creadas exitosamente' AS status,
       'Tablas:' AS item,
       ARRAY['products', 'inventory_movements', 'product_batches', 'product_recipes', 'users'] AS tables_created;
