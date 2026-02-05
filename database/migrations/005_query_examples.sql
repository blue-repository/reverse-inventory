-- ============================================================
-- Script: 005_query_examples.sql
-- Descripción: Ejemplos de queries útiles para reportes y dashboards
-- Nota: Este archivo es referencia, NO ejecutar - solo leer
-- ============================================================

-- ============================================================
-- EJEMPLOS: DASHBOARD / RESUMEN GENERAL
-- ============================================================

-- 1. Resumen general de stock
SELECT 
  COUNT(*) AS total_productos,
  SUM(stock_inicial) AS stock_total_inicial,
  SUM(stock) AS stock_total_actual,
  SUM(stock - stock_inicial) AS diferencia_neta,
  AVG(stock) AS promedio_stock
FROM product_stock_summary;

-- 2. Estadísticas de movimientos del mes actual
SELECT 
  movement_type,
  COUNT(*) AS cantidad_movimientos,
  SUM(quantity) AS cantidad_total,
  AVG(quantity) AS promedio_movimiento
FROM inventory_movements
WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY movement_type
ORDER BY movement_type;

-- 3. Dashboard: Top 10 productos más movidos
SELECT 
  p.name,
  p.barcode,
  COUNT(*) AS total_movimientos,
  SUM(CASE WHEN im.movement_type = 'entrada' THEN im.quantity ELSE 0 END) AS total_entradas,
  SUM(CASE WHEN im.movement_type = 'salida' THEN im.quantity ELSE 0 END) AS total_salidas
FROM products p
LEFT JOIN inventory_movements im ON p.id = im.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.barcode
ORDER BY total_movimientos DESC
LIMIT 10;

-- ============================================================
-- EJEMPLOS: ALERTAS / MONITOREO
-- ============================================================

-- 4. Alerta: Productos vencidos
SELECT 
  name,
  expiration_date,
  stock AS stock_actual,
  CURRENT_DATE - expiration_date AS dias_vencido
FROM products_expiring_soon
WHERE expiration_date < CURRENT_DATE
ORDER BY expiration_date ASC;

-- 5. Alerta: Productos próximos a vencer (próximos 30 días)
SELECT 
  name,
  expiration_date,
  stock AS stock_actual,
  expiration_date - CURRENT_DATE AS dias_restantes
FROM products_expiring_soon
WHERE expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY expiration_date ASC;

-- 6. Alerta: Productos con stock bajo
SELECT 
  name,
  barcode,
  stock_inicial,
  current_stock,
  stock_percentage,
  stock_status
FROM low_stock_products
WHERE stock_percentage <= 10
ORDER BY stock_percentage ASC;

-- 7. Alerta: Productos sin stock
SELECT 
  name,
  barcode,
  stock_inicial,
  current_stock,
  stock_status
FROM low_stock_products
WHERE current_stock <= 0
ORDER BY name;

-- ============================================================
-- EJEMPLOS: REPORTES POR PERÍODO
-- ============================================================

-- 8. Reporte: Movimientos de la última semana
SELECT 
  DATE(created_at) AS fecha,
  movement_type,
  COUNT(*) AS cantidad_movimientos,
  SUM(quantity) AS cantidad_total
FROM inventory_movements
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), movement_type
ORDER BY fecha DESC, movement_type;

-- 9. Reporte: Comparativa entradas vs salidas por mes
SELECT 
  DATE_TRUNC('month', created_at)::DATE AS mes,
  SUM(CASE WHEN movement_type = 'entrada' THEN quantity ELSE 0 END) AS total_entradas,
  SUM(CASE WHEN movement_type = 'salida' THEN quantity ELSE 0 END) AS total_salidas,
  SUM(CASE WHEN movement_type = 'entrada' THEN quantity ELSE 0 END) - 
  SUM(CASE WHEN movement_type = 'salida' THEN quantity ELSE 0 END) AS balance
FROM inventory_movements
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- 10. Reporte: Productos más dispensados (salidas)
SELECT 
  p.name,
  p.barcode,
  COUNT(*) AS cantidad_operaciones,
  SUM(im.quantity) AS cantidad_total_dispensada,
  ROUND(AVG(im.quantity), 2) AS promedio_dispensacion
FROM products p
INNER JOIN inventory_movements im ON p.id = im.product_id
WHERE im.movement_type = 'salida'
  AND im.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.name, p.barcode
ORDER BY cantidad_total_dispensada DESC
LIMIT 20;

-- ============================================================
-- EJEMPLOS: GESTIÓN DE LOTES
-- ============================================================

-- 11. Lotes próximos a vencer en los próximos 60 días
SELECT 
  pb.batch_number,
  p.name,
  pb.expiration_date,
  pb.stock AS batch_stock,
  pb.storage_location,
  expiration_date - CURRENT_DATE AS dias_restantes
FROM product_batches_summary pb
WHERE expiration_status IN ('Vencido', 'Por vencer (< 30 días)', 'Vencimiento próximo (< 90 días)')
ORDER BY pb.expiration_date ASC;

-- 12. Distribución de stock por lote
SELECT 
  p.name,
  COUNT(pb.id) AS cantidad_lotes,
  SUM(pb.stock) AS stock_total_lotes,
  SUM(p.stock) AS stock_general_producto
FROM product_batches pb
INNER JOIN products p ON pb.product_id = p.id
WHERE pb.deleted_at IS NULL AND p.deleted_at IS NULL
GROUP BY p.id, p.name
ORDER BY stock_total_lotes DESC;

-- ============================================================
-- EJEMPLOS: AUDITORÍA / HISTORIAL
-- ============================================================

-- 13. Historial completo de movimientos de un producto (últimos 30 días)
SELECT 
  DATE(created_at) AS fecha,
  movement_type,
  quantity,
  reason,
  notes
FROM inventory_movements_with_details
WHERE product_id = 1 -- Cambiar por ID del producto
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC;

-- 14. Auditoría: Quién y cuándo se movió cada lote
SELECT 
  DATE(pb.created_at) AS fecha_creacion,
  DATE(pb.updated_at) AS ultima_modificacion,
  p.name,
  pb.batch_number,
  pb.stock
FROM product_batches pb
INNER JOIN products p ON pb.product_id = p.id
WHERE pb.updated_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY pb.updated_at DESC;

-- 15. Diferencia entre stock calculado vs stock real (validación de integridad)
SELECT 
  product_id,
  name,
  stock_inicial,
  total_entrada,
  total_salida,
  total_ajuste,
  calculated_stock,
  current_stock,
  calculated_stock - current_stock AS diferencia_auditoria
FROM product_movement_history
WHERE calculated_stock != current_stock -- Detecta inconsistencias
ORDER BY ABS(calculated_stock - current_stock) DESC;

-- ============================================================
-- EJEMPLOS: BÚSQUEDA Y FILTROS
-- ============================================================

-- 16. Buscar producto por nombre (LIKE)
SELECT *
FROM product_stock_summary
WHERE name ILIKE '%paracet%'  -- Case-insensitive
ORDER BY name;

-- 17. Buscar producto por barcode
SELECT *
FROM product_stock_summary
WHERE barcode = 'BAR-001';

-- 18. Filtrar productos por estado de vencimiento
SELECT 
  id,
  name,
  barcode,
  stock_actual,
  expiration_date,
  dias_para_vencer,
  urgencia
FROM products_expiring_soon
WHERE urgencia IN ('CRÍTICO (< 7 días)', 'ALERTA (< 30 días)')
ORDER BY dias_para_vencer ASC;

-- ============================================================
-- EJEMPLOS: QUERIES PARA API / NEXTJS
-- ============================================================

-- 19. Para endpoint GET /api/products (con stock)
SELECT 
  id,
  name,
  barcode,
  stock_actual,
  unit_of_measure,
  expiration_date
FROM product_stock_summary
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
ORDER BY name
LIMIT 100;

-- 20. Para endpoint GET /api/movements?product_id=X (historial)
SELECT 
  id,
  movement_type,
  quantity,
  reason,
  notes,
  created_at
FROM inventory_movements_with_details
WHERE product_id = ? -- Parámetro
ORDER BY created_at DESC
LIMIT 50;

-- 21. Para dashboard GET /api/dashboard/summary
SELECT 
  (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) AS total_productos,
  (SELECT SUM(stock) FROM products WHERE deleted_at IS NULL) AS stock_total,
  (SELECT COUNT(*) FROM inventory_movements WHERE DATE(created_at) = CURRENT_DATE) AS movimientos_hoy,
  (SELECT COUNT(*) FROM low_stock_products) AS productos_stock_bajo,
  (SELECT COUNT(*) FROM products_expiring_soon WHERE urgencia LIKE 'CRÍTICO%') AS productos_vencidos,
  (SELECT COUNT(*) FROM users WHERE is_active = true) AS usuarios_activos;

-- 22. Para GET /api/reports/movements?start_date=X&end_date=Y
SELECT 
  DATE(created_at) AS fecha,
  movement_type,
  COUNT(*) AS cantidad_movimientos,
  SUM(quantity) AS cantidad_total
FROM inventory_movements
WHERE created_at BETWEEN ? AND ?  -- Parámetros
GROUP BY DATE(created_at), movement_type
ORDER BY fecha DESC;

-- ============================================================
-- EJEMPLOS: OPERACIONES COMUNES EN APP
-- ============================================================

-- 23. Registrar entrada de stock
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, notes)
VALUES (
  1, -- product_id
  'entrada', -- movement_type
  50, -- quantity
  'Compra', -- reason
  'Compra a proveedor X' -- notes
);
-- Stock se actualiza automáticamente en triggers

-- 24. Registrar salida de stock
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, notes)
VALUES (
  1, -- product_id
  'salida', -- movement_type
  10, -- quantity
  'Dispensación', -- reason
  'Paciente Maria' -- notes
);
-- Stock se decrementa automáticamente en triggers

-- 25. Hacer ajuste de stock
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, notes)
VALUES (
  1, -- product_id
  'ajuste', -- movement_type
  -5, -- quantity (negativo para reducir)
  'Pérdida', -- reason
  'Rotura durante manipulación' -- notes
);

-- 26. Crear nuevo usuario
INSERT INTO users (email, display_name, role, is_active)
VALUES ('operator@example.com', 'Juan Pérez', 'operario', true);

-- 27. Registrar acceso de usuario
UPDATE users 
SET last_login = CURRENT_TIMESTAMP 
WHERE email = 'operator@example.com';

-- 28. Listar usuarios activos
SELECT id, email, display_name, role, last_login
FROM user_activity_summary
WHERE is_active = true
ORDER BY last_login DESC;

-- ============================================================
-- TIPS DE PERFORMANCE
-- ============================================================

/*
1. Usa índices:
   - Búsquedas por name/barcode: índices ya existen
   - Filtros por fecha: usa INDEX on created_at
   - Reportes agregados: usa compound INDEX (product_id, created_at)

2. Limita resultados:
   - Usa LIMIT para paginación
   - Usa WHERE para filtros
   - Usa DATE_TRUNC para agrupar por período

3. Vistas vs queries:
   - Vistas son rápidas (precalculadas en triggers)
   - Úsalas para reportes comunes
   - Escribe queries custom solo si necesitas datos específicos

4. Soft delete:
   - Siempre filtra: WHERE deleted_at IS NULL
   - Las vistas ya incluyen este filtro

5. Agregaciones:
   - Úsalas con GROUP BY para reportes
   - Aprox. < 100K registros = rápido
   - Si es más lento, verifica índices

*/

-- ============================================================
-- FIN DE EJEMPLOS
-- ============================================================
