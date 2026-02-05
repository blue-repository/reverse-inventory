-- ============================================================
-- Migration: 002_create_indexes.sql
-- Descripción: Crea índices para optimizar queries
-- Dependencias: 001_create_tables.sql
-- ============================================================

-- ============================================================
-- Índices en tabla: products
-- ============================================================

-- Búsqueda por nombre (case-insensitive con lower())
CREATE INDEX IF NOT EXISTS idx_products_name_lower 
ON products(LOWER(name));

-- Búsqueda por código de barras (case-insensitive con lower())
CREATE INDEX IF NOT EXISTS idx_products_barcode_lower 
ON products(LOWER(barcode));

-- Para soft delete
CREATE INDEX IF NOT EXISTS idx_products_deleted_at 
ON products(deleted_at);

-- Índices de auditoría
CREATE INDEX IF NOT EXISTS idx_products_created_by 
ON products(created_by);

CREATE INDEX IF NOT EXISTS idx_products_updated_by 
ON products(updated_by);

-- Búsqueda de productos no eliminados
CREATE INDEX IF NOT EXISTS idx_products_active 
ON products(name, stock) 
WHERE deleted_at IS NULL;

-- Para ordenar por creación
CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON products(created_at DESC);

-- Para ordenar por actualización
CREATE INDEX IF NOT EXISTS idx_products_updated_at 
ON products(updated_at DESC);

-- Para alertas de expiración
CREATE INDEX IF NOT EXISTS idx_products_expiration_date 
ON products(expiration_date) 
WHERE expiration_date IS NOT NULL AND deleted_at IS NULL;

-- ============================================================
-- Índices en tabla: inventory_movements
-- ============================================================

-- Búsqueda de movimientos por producto (CRÍTICO para reportes)
CREATE INDEX IF NOT EXISTS idx_movements_product_id 
ON inventory_movements(product_id);

-- Búsqueda por fecha (para reportes)
CREATE INDEX IF NOT EXISTS idx_movements_created_at 
ON inventory_movements(created_at DESC);

-- Búsqueda por tipo de movimiento
CREATE INDEX IF NOT EXISTS idx_movements_type 
ON inventory_movements(movement_type);

-- Índice compuesto: producto + fecha (muy usado en reportes)
CREATE INDEX IF NOT EXISTS idx_movements_product_date 
ON inventory_movements(product_id, created_at DESC);

-- Índice compuesto: tipo + fecha (para reportes filtrados)
CREATE INDEX IF NOT EXISTS idx_movements_type_date 
ON inventory_movements(movement_type, created_at DESC);

-- Índices adicionales para nuevos campos
CREATE INDEX IF NOT EXISTS idx_inventory_movements_batch_id 
ON inventory_movements(batch_id);

CREATE INDEX IF NOT EXISTS idx_movements_group_id 
ON inventory_movements(movement_group_id);

CREATE INDEX IF NOT EXISTS idx_movements_movement_date 
ON inventory_movements(movement_date);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_recorded_by 
ON inventory_movements(recorded_by);

-- Índice parcial para recetas (solo where is_recipe_movement = true)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_recipe_code 
ON inventory_movements(recipe_code) 
WHERE is_recipe_movement = true;

-- ============================================================
-- Índices en tabla: product_batches
-- ============================================================

-- Búsqueda de lotes por producto (CRÍTICO)
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id 
ON product_batches(product_id);

-- Para alertas de expiración de lotes
CREATE INDEX IF NOT EXISTS idx_product_batches_expiration_date 
ON product_batches(expiration_date);

-- Filtrar lotes activos/inactivos
CREATE INDEX IF NOT EXISTS idx_product_batches_is_active 
ON product_batches(is_active);

-- Índice compuesto: producto + expiración (reportes)
CREATE INDEX IF NOT EXISTS idx_product_batches_product_expiration 
ON product_batches(product_id, expiration_date);

-- ============================================================
-- Índices en tabla: product_recipes
-- ============================================================

-- Búsqueda de recetas por producto
CREATE INDEX IF NOT EXISTS idx_recipes_product_id 
ON product_recipes(product_id);

-- Búsqueda por código de receta
CREATE INDEX IF NOT EXISTS idx_recipes_recipe_code 
ON product_recipes(recipe_code);

-- Búsqueda por nombre de paciente (para auditoría)
CREATE INDEX IF NOT EXISTS idx_recipes_patient_name 
ON product_recipes(patient_name);

-- Búsqueda por fecha de receta
CREATE INDEX IF NOT EXISTS idx_recipes_recipe_date 
ON product_recipes(recipe_date DESC);

-- ============================================================
-- Índices en tabla: users
-- ============================================================

-- Búsqueda por email (login)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Usuarios activos
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users(is_active) 
WHERE is_active = TRUE;

-- ============================================================
-- Confirmación
-- ============================================================
SELECT 'Índices creados exitosamente' AS status,
       'Total de índices creados' AS action,
       (SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename IN 
        ('products', 'inventory_movements', 'product_batches', 'product_recipes', 'users'))::TEXT AS count;
