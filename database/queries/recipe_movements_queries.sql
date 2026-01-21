-- =====================================================
-- QUERIES ÚTILES PARA MOVIMIENTOS CON FECHAS Y RECETAS
-- Fecha: 20 de enero de 2026
-- Estructura: movement_group_id agrupa items del mismo movimiento
-- Valores generales vs específicos: resolver con COALESCE
-- =====================================================

-- =====================================================
-- 1. VALIDACIÓN POST-MIGRACIÓN
-- =====================================================

-- Verificar que todos los campos fueron agregados correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_movements'
ORDER BY ordinal_position;

-- Ver estructura completa de la tabla (PostgreSQL)
-- \d inventory_movements

-- Verificar índices creados
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'inventory_movements'
ORDER BY indexname;

-- =====================================================
-- 2. CONSULTAS DE MOVIMIENTOS AGRUPADOS
-- =====================================================

-- Ver estructura de grupos de movimientos
SELECT 
  movement_group_id,
  COUNT(*) as total_items,
  movement_type,
  movement_date,
  recorded_by
FROM inventory_movements
WHERE movement_group_id IS NOT NULL
GROUP BY movement_group_id, movement_type, movement_date, recorded_by
ORDER BY movement_date DESC;

-- Ver detalle de items dentro de un grupo
SELECT 
  id,
  movement_group_id,
  p.name as product_name,
  quantity,
  movement_date,
  recorded_by
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE movement_group_id = 'uuid-del-grupo'  -- Cambiar por el UUID real
ORDER BY created_at;

-- Ver todos los movimientos sin grupo (movimientos antiguos)
SELECT 
  id,
  p.name as product_name,
  movement_type,
  quantity,
  movement_date,
  recorded_by
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE movement_group_id IS NULL
ORDER BY created_at DESC;

-- =====================================================
-- 3. CONSULTAS DE MOVIMIENTOS POR FECHA
-- =====================================================

-- Movimientos de un día específico
SELECT 
  im.id,
  im.movement_group_id,
  p.name as product_name,
  im.movement_type,
  im.quantity,
  im.movement_date,
  im.recorded_by
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE DATE(im.movement_date) = '2026-01-20'
ORDER BY im.created_at DESC;

-- Movimientos en un rango de fechas (agrupados)
SELECT 
  im.movement_group_id,
  COUNT(*) as items,
  MIN(im.movement_date) as fecha_movimiento,
  im.movement_type,
  SUM(im.quantity) as total_cantidad
FROM inventory_movements im
WHERE im.movement_date BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY im.movement_group_id, im.movement_type
ORDER BY im.movement_date DESC;

-- Resumen de movimientos por día
SELECT 
  DATE(im.movement_date) as fecha,
  im.movement_type,
  COUNT(DISTINCT im.movement_group_id) as grupos,
  COUNT(*) as total_items,
  SUM(im.quantity) as total_cantidad
FROM inventory_movements im
GROUP BY DATE(im.movement_date), im.movement_type
ORDER BY fecha DESC;

-- =====================================================
-- 4. CONSULTAS DE RECETAS MÉDICAS
-- =====================================================

-- Ver todas las recetas registradas (con valores resueltos)
SELECT 
  im.id,
  im.movement_group_id,
  p.name as product_name,
  im.quantity,
  COALESCE(im.patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1
  )) as patient_name,
  COALESCE(im.recipe_date, (
    SELECT recipe_date FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1
  )) as recipe_date,
  COALESCE(im.prescribed_by, (
    SELECT prescribed_by FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1
  )) as prescribed_by,
  im.recorded_by,
  im.created_at
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.is_recipe_movement = TRUE
  AND im.movement_type = 'salida'
ORDER BY im.recipe_date DESC, im.created_at DESC;

-- Recetas de un paciente específico (busca valores generales o específicos)
SELECT 
  im.id,
  im.movement_group_id,
  p.name as product_name,
  im.quantity,
  COALESCE(im.recipe_date, (
    SELECT recipe_date FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1
  )) as recipe_date,
  COALESCE(im.prescribed_by, (
    SELECT prescribed_by FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1
  )) as prescribed_by,
  im.cie_code
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.is_recipe_movement = TRUE
  AND (LOWER(im.patient_name) LIKE LOWER('%Juan%')  -- Valor específico
       OR LOWER((SELECT patient_name FROM inventory_movements 
                 WHERE movement_group_id = im.movement_group_id 
                 AND patient_name IS NOT NULL LIMIT 1)) LIKE LOWER('%Juan%'))  -- Valor general
ORDER BY im.recipe_date DESC;

-- Recetas por profesional
SELECT 
  COALESCE(im.prescribed_by, (
    SELECT prescribed_by FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1
  )) as profesional,
  COUNT(DISTINCT im.movement_group_id) as total_movimientos,
  COUNT(*) as total_items,
  SUM(im.quantity) as total_productos
FROM inventory_movements im
WHERE im.is_recipe_movement = TRUE
  AND im.movement_type = 'salida'
GROUP BY COALESCE(im.prescribed_by, (
  SELECT prescribed_by FROM inventory_movements 
  WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1
))
ORDER BY total_items DESC;

-- Recetas por CIE code (diagnóstico)
SELECT 
  COALESCE(im.cie_code, (
    SELECT cie_code FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND cie_code IS NOT NULL LIMIT 1
  )) as codigo_cie,
  COUNT(DISTINCT im.movement_group_id) as cantidad_movimientos,
  COUNT(*) as total_items,
  SUM(im.quantity) as total_productos,
  COUNT(DISTINCT COALESCE(im.patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1
  ))) as pacientes_unicos
FROM inventory_movements im
WHERE im.is_recipe_movement = TRUE
GROUP BY COALESCE(im.cie_code, (
  SELECT cie_code FROM inventory_movements 
  WHERE movement_group_id = im.movement_group_id AND cie_code IS NOT NULL LIMIT 1
))
ORDER BY total_items DESC;

-- Recetas en un período de tiempo
SELECT 
  im.id,
  im.movement_group_id,
  COALESCE(im.patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1
  )) as patient_name,
  p.name as product_name,
  im.quantity,
  COALESCE(im.recipe_date, (
    SELECT recipe_date FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1
  )) as recipe_date,
  COALESCE(im.prescribed_by, (
    SELECT prescribed_by FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1
  )) as prescribed_by
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.is_recipe_movement = TRUE
  AND im.recipe_date BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY im.recipe_date DESC;

-- =====================================================
-- 5. CONSULTAS COMBINADAS (FECHAS + RECETAS)
-- =====================================================

-- Ver la diferencia entre fecha de receta y fecha de movimiento
SELECT 
  im.id,
  im.movement_group_id,
  p.name as product_name,
  COALESCE(im.patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1
  )) as patient_name,
  COALESCE(im.recipe_date, (
    SELECT recipe_date FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1
  )) as recipe_date,
  im.movement_date,
  im.movement_date - COALESCE(im.recipe_date, (
    SELECT recipe_date FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1
  )) as dias_desde_receta
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.is_recipe_movement = TRUE
ORDER BY im.movement_date DESC;

-- Productos más prescritos (por cantidad total)
SELECT 
  p.id,
  p.name,
  COUNT(DISTINCT im.movement_group_id) as num_movimientos,
  COUNT(*) as num_items,
  SUM(im.quantity) as cantidad_total
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.is_recipe_movement = TRUE
  AND im.movement_type = 'salida'
GROUP BY p.id, p.name
ORDER BY cantidad_total DESC;

-- =====================================================
-- 6. MANTENIMIENTO Y AUDITORÍA
-- =====================================================

-- Recetas incompletas (sin datos importantes en el grupo)
SELECT 
  im.movement_group_id,
  COUNT(*) as items,
  CASE 
    WHEN COALESCE(im.patient_name, (SELECT patient_name FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin paciente'
    WHEN COALESCE(im.prescribed_by, (SELECT prescribed_by FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin profesional'
    WHEN COALESCE(im.cie_code, (SELECT cie_code FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND cie_code IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin CIE'
    WHEN COALESCE(im.recipe_date, (SELECT recipe_date FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin fecha'
    ELSE 'Completa'
  END as completitud,
  im.movement_type
FROM inventory_movements im
WHERE im.is_recipe_movement = TRUE
GROUP BY im.movement_group_id, CASE 
    WHEN COALESCE(im.patient_name, (SELECT patient_name FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin paciente'
    WHEN COALESCE(im.prescribed_by, (SELECT prescribed_by FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin profesional'
    WHEN COALESCE(im.cie_code, (SELECT cie_code FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND cie_code IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin CIE'
    WHEN COALESCE(im.recipe_date, (SELECT recipe_date FROM inventory_movements 
         WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1)) IS NULL THEN 'Sin fecha'
    ELSE 'Completa'
  END, im.movement_type
ORDER BY movement_group_id DESC;

-- Auditoría: Quién registró qué
SELECT 
  recorded_by,
  COUNT(*) as total_items,
  COUNT(DISTINCT movement_group_id) as grupos_creados,
  COUNT(CASE WHEN is_recipe_movement = TRUE THEN 1 END) as items_receta,
  MAX(created_at) as ultimo_movimiento
FROM inventory_movements
GROUP BY recorded_by
ORDER BY total_items DESC;

-- Encontrar grupos incompletos (items sin valores resueltos de receta)
SELECT 
  movement_group_id,
  COUNT(*) as items,
  movement_type,
  movement_date
FROM inventory_movements
WHERE is_recipe_movement = TRUE
  AND movement_group_id IS NOT NULL
  AND patient_name IS NULL
  AND (SELECT patient_name FROM inventory_movements im2 
       WHERE im2.movement_group_id = inventory_movements.movement_group_id 
       AND patient_name IS NOT NULL LIMIT 1) IS NULL
GROUP BY movement_group_id, movement_type, movement_date;

-- =====================================================
-- 7. REPORTES
-- =====================================================

-- Reporte de recetas por rango de fechas y producto
SELECT 
  p.name as producto,
  COUNT(DISTINCT movement_group_id) as movimientos_totales,
  COUNT(*) as items_totales,
  SUM(im.quantity) as total_unidades,
  STRING_AGG(DISTINCT COALESCE(im.cie_code, (
    SELECT cie_code FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND cie_code IS NOT NULL LIMIT 1
  )), ', ') as codigos_cie,
  COUNT(DISTINCT COALESCE(im.patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1
  ))) as pacientes_unicos
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.is_recipe_movement = TRUE
  AND im.recipe_date BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY p.id, p.name
ORDER BY total_unidades DESC;

-- Reporte diario de movimientos (por grupos)
SELECT 
  DATE(im.movement_date) as fecha,
  im.movement_type,
  COUNT(DISTINCT im.movement_group_id) as grupos,
  COUNT(*) as items,
  SUM(im.quantity) as total_unidades,
  COUNT(CASE WHEN im.is_recipe_movement = TRUE THEN 1 END) as items_receta
FROM inventory_movements im
WHERE im.movement_date >= (CURRENT_DATE - INTERVAL '7 days')
GROUP BY DATE(im.movement_date), im.movement_type
ORDER BY fecha DESC, movement_type;

-- =====================================================
-- 8. ACTUALIZAR DATOS EXISTENTES (ejemplos)
-- =====================================================

-- Crear grupo para movimientos existentes sin agrupar
/*
UPDATE inventory_movements
SET movement_group_id = gen_random_uuid()
WHERE movement_group_id IS NULL
  AND created_at > '2026-01-15';

-- Establecer valor general de receta para un grupo (solo primera fila)
UPDATE inventory_movements
SET patient_name = 'Juan Pérez'
WHERE movement_group_id = 'uuid-del-grupo'
  AND patient_name IS NULL
LIMIT 1;

-- O para un solo item
UPDATE inventory_movements
SET 
  patient_name = 'Juan Pérez',
  recipe_date = '2026-01-18',
  prescribed_by = 'Dr. García',
  cie_code = 'J06.9'
WHERE id = 'uuid-del-movimiento';
*/
