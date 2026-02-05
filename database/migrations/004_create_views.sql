-- ============================================================
-- Migration: 004_create_views.sql
-- Descripción: Crea vistas para queries comunes
-- Dependencias: 001_create_tables.sql, 003_create_triggers.sql
-- ============================================================

-- ============================================================
-- Vista: product_stock_summary
-- Descripción: Resumen de stock actual para cada producto
-- ============================================================
CREATE OR REPLACE VIEW product_stock_summary AS
SELECT 
  p.id,
  p.name,
  p.barcode,
  p.stock_inicial,
  p.stock AS stock_actual,
  p.unit_of_measure,
  p.expiration_date,
  p.created_at,
  p.updated_at,
  -- Contar movimientos
  (SELECT COUNT(*) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'entrada') AS total_entradas,
  (SELECT COUNT(*) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'salida') AS total_salidas,
  (SELECT COUNT(*) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'ajuste') AS total_ajustes,
  (SELECT COUNT(*) FROM inventory_movements 
   WHERE product_id = p.id) AS total_movimientos
FROM products p
WHERE p.deleted_at IS NULL
ORDER BY p.name;

COMMENT ON VIEW product_stock_summary IS 'Resumen de stock actual y movimientos para cada producto activo';

-- ============================================================
-- Vista: product_batches_summary
-- Descripción: Resumen de lotes activos por producto
-- ============================================================
CREATE OR REPLACE VIEW product_batches_summary AS
SELECT 
  pb.id,
  pb.product_id,
  p.name AS product_name,
  p.barcode,
  pb.batch_number,
  pb.issue_date,
  pb.expiration_date,
  pb.stock AS batch_stock,
  pb.storage_location,
  pb.storage_drawer,
  pb.storage_section,
  pb.created_at,
  pb.updated_at,
  -- Indicador de expiración
  CASE 
    WHEN pb.expiration_date IS NULL THEN 'Sin definir'
    WHEN pb.expiration_date < CURRENT_DATE THEN 'Vencido'
    WHEN pb.expiration_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Por vencer (< 30 días)'
    WHEN pb.expiration_date < CURRENT_DATE + INTERVAL '90 days' THEN 'Vencimiento próximo (< 90 días)'
    ELSE 'Vigente'
  END AS expiration_status
FROM product_batches pb
INNER JOIN products p ON pb.product_id = p.id
WHERE pb.deleted_at IS NULL AND p.deleted_at IS NULL
ORDER BY pb.expiration_date ASC;

COMMENT ON VIEW product_batches_summary IS 'Resumen de lotes activos con estado de expiración';

-- ============================================================
-- Vista: products_expiring_soon
-- Descripción: Productos proximos a vencer
-- ============================================================
CREATE OR REPLACE VIEW products_expiring_soon AS
SELECT 
  p.id,
  p.name,
  p.barcode,
  p.stock AS stock_actual,
  p.expiration_date,
  EXTRACT(DAY FROM p.expiration_date - CURRENT_DATE)::INTEGER AS dias_para_vencer,
  CASE 
    WHEN p.expiration_date < CURRENT_DATE THEN 'VENCIDO'
    WHEN EXTRACT(DAY FROM p.expiration_date - CURRENT_DATE) < 7 THEN 'CRÍTICO (< 7 días)'
    WHEN EXTRACT(DAY FROM p.expiration_date - CURRENT_DATE) < 30 THEN 'ALERTA (< 30 días)'
    WHEN EXTRACT(DAY FROM p.expiration_date - CURRENT_DATE) < 90 THEN 'ATENCIÓN (< 90 días)'
    ELSE 'OK'
  END AS urgencia
FROM products p
WHERE p.deleted_at IS NULL 
  AND p.expiration_date IS NOT NULL
  AND p.expiration_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY p.expiration_date ASC;

COMMENT ON VIEW products_expiring_soon IS 'Productos próximos a vencer (próximos 90 días)';

-- ============================================================
-- Vista: inventory_movements_with_details
-- Descripción: Movimientos con detalles del producto
-- ============================================================
CREATE OR REPLACE VIEW inventory_movements_with_details AS
SELECT 
  im.id,
  im.product_id,
  p.name AS product_name,
  p.barcode,
  p.unit_of_measure,
  im.movement_type,
  im.quantity,
  im.reason,
  im.notes,
  im.created_at,
  im.updated_at,
  -- Signo para el tipo de movimiento
  CASE 
    WHEN im.movement_type = 'entrada' THEN 1
    WHEN im.movement_type = 'salida' THEN -1
    ELSE 0
  END AS quantity_sign,
  -- Descripción legible del tipo
  CASE 
    WHEN im.movement_type = 'entrada' THEN 'Entrada 📥'
    WHEN im.movement_type = 'salida' THEN 'Salida 📤'
    WHEN im.movement_type = 'ajuste' THEN 'Ajuste ⚙️'
    ELSE 'Desconocido'
  END AS movement_type_label
FROM inventory_movements im
INNER JOIN products p ON im.product_id = p.id
WHERE p.deleted_at IS NULL
ORDER BY im.created_at DESC;

COMMENT ON VIEW inventory_movements_with_details IS 'Movimientos de inventario con información del producto';

-- ============================================================
-- Vista: product_movement_history
-- Descripción: Historial de movimientos por producto
-- ============================================================
CREATE OR REPLACE VIEW product_movement_history AS
SELECT 
  p.id AS product_id,
  p.name,
  p.stock_inicial,
  p.stock AS current_stock,
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'entrada') AS total_entrada,
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'salida') AS total_salida,
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'ajuste') AS total_ajuste,
  -- Cálculo manual para verificación
  p.stock_inicial + 
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'entrada') -
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'salida') +
  (SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements 
   WHERE product_id = p.id AND movement_type = 'ajuste')
  AS calculated_stock,
  p.updated_at
FROM products p
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW product_movement_history IS 'Historial de movimientos con cálculo de stock por producto';

-- ============================================================
-- Vista: daily_movement_summary
-- Descripción: Resumen de movimientos por día
-- ============================================================
CREATE OR REPLACE VIEW daily_movement_summary AS
SELECT 
  DATE(im.created_at) AS movement_date,
  im.movement_type,
  COUNT(*) AS movement_count,
  SUM(im.quantity) AS total_quantity,
  COUNT(DISTINCT im.product_id) AS unique_products
FROM inventory_movements im
GROUP BY DATE(im.created_at), im.movement_type
ORDER BY movement_date DESC;

COMMENT ON VIEW daily_movement_summary IS 'Resumen agregado de movimientos por día';

-- ============================================================
-- Vista: monthly_movement_report
-- Descripción: Reporte mensual de movimientos
-- ============================================================
CREATE OR REPLACE VIEW monthly_movement_report AS
SELECT 
  DATE_TRUNC('month', im.created_at)::DATE AS month,
  im.movement_type,
  COUNT(*) AS movement_count,
  SUM(im.quantity) AS total_quantity,
  COUNT(DISTINCT im.product_id) AS unique_products,
  COUNT(DISTINCT DATE(im.created_at)) AS active_days
FROM inventory_movements im
GROUP BY DATE_TRUNC('month', im.created_at), im.movement_type
ORDER BY month DESC;

COMMENT ON VIEW monthly_movement_report IS 'Reporte agregado de movimientos por mes';

-- ============================================================
-- Vista: low_stock_products
-- Descripción: Productos con stock bajo (menos del 20% del inicial)
-- ============================================================
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.id,
  p.name,
  p.barcode,
  p.stock_inicial,
  p.stock AS current_stock,
  ROUND((p.stock::NUMERIC / NULLIF(p.stock_inicial, 0)) * 100)::INTEGER AS stock_percentage,
  CASE 
    WHEN p.stock <= 0 THEN 'SIN STOCK'
    WHEN (p.stock::NUMERIC / NULLIF(p.stock_inicial, 1)) < 0.1 THEN 'CRÍTICO (< 10%)'
    WHEN (p.stock::NUMERIC / NULLIF(p.stock_inicial, 1)) < 0.2 THEN 'BAJO (< 20%)'
    ELSE 'OK'
  END AS stock_status
FROM products p
WHERE p.deleted_at IS NULL 
  AND p.stock_inicial > 0
  AND (p.stock::NUMERIC / p.stock_inicial) <= 0.2
ORDER BY p.stock_percentage ASC;

COMMENT ON VIEW low_stock_products IS 'Productos con stock bajo (< 20% del stock inicial)';

-- ============================================================
-- Vista: user_activity_summary
-- Descripción: Resumen de actividad por usuario
-- ============================================================
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.is_active,
  u.last_login,
  u.created_at
FROM users u
ORDER BY u.last_login DESC NULLS LAST;

COMMENT ON VIEW user_activity_summary IS 'Resumen de usuarios y su última actividad';

-- ============================================================
-- Confirmación
-- ============================================================
SELECT 'Vistas creadas exitosamente' AS status,
       'Vistas disponibles:' AS item,
       ARRAY[
         'product_stock_summary',
         'product_batches_summary',
         'products_expiring_soon',
         'inventory_movements_with_details',
         'product_movement_history',
         'daily_movement_summary',
         'monthly_movement_report',
         'low_stock_products',
         'user_activity_summary'
       ] AS views_list;
