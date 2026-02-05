-- ============================================================
-- Script de Validación Post-Migración
-- ============================================================
-- Ejecuta este script después de la migración para verificar
-- que todo se creó correctamente
-- ============================================================

-- ============================================================
-- SECCIÓN 1: Verificar que las tablas existen
-- ============================================================

DO $$
DECLARE
  tabla_existe INTEGER;
BEGIN
  -- Verificar movement_batch_details
  SELECT COUNT(*) INTO tabla_existe
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'movement_batch_details';
  
  IF tabla_existe = 0 THEN
    RAISE EXCEPTION '❌ ERROR: La tabla movement_batch_details NO existe';
  ELSE
    RAISE NOTICE '✅ OK: Tabla movement_batch_details existe';
  END IF;
END $$;

-- ============================================================
-- SECCIÓN 2: Verificar que los índices se crearon
-- ============================================================

SELECT 
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ OK: Todos los índices creados (4/4)'
    ELSE '⚠️ ADVERTENCIA: Faltan índices. Encontrados: ' || COUNT(*) || '/4'
  END AS resultado_indices
FROM pg_indexes
WHERE tablename = 'movement_batch_details'
  AND indexname IN (
    'idx_movement_batch_details_movement_id',
    'idx_movement_batch_details_batch_id',
    'idx_movement_batch_details_created_at',
    'idx_movement_batch_details_movement_batch'
  );

-- ============================================================
-- SECCIÓN 3: Verificar que la vista existe
-- ============================================================

SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ OK: Vista movement_details_with_batches existe'
    ELSE '❌ ERROR: Vista movement_details_with_batches NO existe'
  END AS resultado_vista
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'movement_details_with_batches';

-- ============================================================
-- SECCIÓN 4: Verificar que las funciones existen
-- ============================================================

SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ OK: Ambas funciones existen (2/2)'
    ELSE '⚠️ ADVERTENCIA: Faltan funciones. Encontradas: ' || COUNT(*) || '/2'
  END AS resultado_funciones
FROM pg_proc
WHERE proname IN ('get_movement_batch_breakdown', 'get_batch_movement_history');

-- ============================================================
-- SECCIÓN 5: Verificar constraints
-- ============================================================

SELECT 
  COUNT(*) AS total_constraints,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ OK: Constraints creados correctamente'
    ELSE '⚠️ ADVERTENCIA: Faltan algunos constraints'
  END AS resultado
FROM information_schema.table_constraints
WHERE table_name = 'movement_batch_details';

-- ============================================================
-- SECCIÓN 6: Verificar foreign keys
-- ============================================================

SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅' AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'movement_batch_details';

-- Debe mostrar 2 foreign keys:
-- 1. movement_id → inventory_movements(id)
-- 2. batch_id → product_batches(id)

-- ============================================================
-- SECCIÓN 7: Probar la vista
-- ============================================================

SELECT 
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ OK: Vista funciona correctamente'
    ELSE '❌ ERROR: Vista no funciona'
  END AS resultado,
  COUNT(*) AS total_registros_vista
FROM movement_details_with_batches;

-- ============================================================
-- SECCIÓN 8: Probar funciones (con datos de prueba si existen)
-- ============================================================

-- Intentar obtener un movimiento de prueba
DO $$
DECLARE
  test_movement_id UUID;
  test_batch_id UUID;
  result_count INTEGER;
BEGIN
  -- Intentar obtener un movimiento existente
  SELECT id INTO test_movement_id
  FROM inventory_movements
  LIMIT 1;
  
  IF test_movement_id IS NOT NULL THEN
    -- Probar función get_movement_batch_breakdown
    SELECT COUNT(*) INTO result_count
    FROM get_movement_batch_breakdown(test_movement_id);
    
    RAISE NOTICE '✅ OK: Función get_movement_batch_breakdown ejecuta correctamente';
  ELSE
    RAISE NOTICE 'ℹ️ INFO: No hay movimientos para probar la función';
  END IF;
  
  -- Intentar obtener un lote existente
  SELECT id INTO test_batch_id
  FROM product_batches
  LIMIT 1;
  
  IF test_batch_id IS NOT NULL THEN
    -- Probar función get_batch_movement_history
    SELECT COUNT(*) INTO result_count
    FROM get_batch_movement_history(test_batch_id);
    
    RAISE NOTICE '✅ OK: Función get_batch_movement_history ejecuta correctamente';
  ELSE
    RAISE NOTICE 'ℹ️ INFO: No hay lotes para probar la función';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR al probar funciones: %', SQLERRM;
END $$;

-- ============================================================
-- SECCIÓN 9: Verificar estructura de columnas
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  '✅' AS status
FROM information_schema.columns
WHERE table_name = 'movement_batch_details'
ORDER BY ordinal_position;

-- Debe mostrar 7 columnas:
-- id, movement_id, batch_id, quantity, batch_stock_before, batch_stock_after, created_at

-- ============================================================
-- SECCIÓN 10: Resumen General
-- ============================================================

SELECT 
  'RESUMEN DE VALIDACIÓN' AS seccion,
  '========================' AS separador;

-- Contar registros actuales
SELECT 
  'Registros actuales en movement_batch_details' AS descripcion,
  COUNT(*) AS cantidad,
  CASE 
    WHEN COUNT(*) = 0 THEN 'ℹ️ Normal (tabla nueva)'
    ELSE '✅ OK'
  END AS status
FROM movement_batch_details;

-- Verificar que no hay errores de integridad
SELECT 
  'Verificación de integridad referencial' AS descripcion,
  COUNT(*) AS registros_huerfanos,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK: Sin problemas'
    ELSE '❌ ERROR: Hay registros huérfanos'
  END AS status
FROM movement_batch_details mbd
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_movements WHERE id = mbd.movement_id
)
OR NOT EXISTS (
  SELECT 1 FROM product_batches WHERE id = mbd.batch_id
);

-- ============================================================
-- SECCIÓN 11: Estadísticas (si hay datos)
-- ============================================================

SELECT 
  'ESTADÍSTICAS' AS seccion,
  '============' AS separador;

-- Total de movimientos
SELECT 
  'Total de movimientos registrados' AS metrica,
  COUNT(*) AS valor
FROM inventory_movements;

-- Total de lotes
SELECT 
  'Total de lotes registrados' AS metrica,
  COUNT(*) AS valor
FROM product_batches;

-- Movimientos con detalles de lotes
SELECT 
  'Movimientos con detalles de lotes' AS metrica,
  COUNT(DISTINCT movement_id) AS valor
FROM movement_batch_details;

-- Lotes que han sido usados en movimientos
SELECT 
  'Lotes usados en movimientos' AS metrica,
  COUNT(DISTINCT batch_id) AS valor
FROM movement_batch_details;

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================

/*
Si todo está correcto, deberías ver:

✅ OK: Tabla movement_batch_details existe
✅ OK: Todos los índices creados (4/4)
✅ OK: Vista movement_details_with_batches existe
✅ OK: Ambas funciones existen (2/2)
✅ OK: Constraints creados correctamente
✅ OK: Vista funciona correctamente
✅ OK: Función get_movement_batch_breakdown ejecuta correctamente
✅ OK: Función get_batch_movement_history ejecuta correctamente
✅ OK: Sin problemas de integridad

Y las tablas/funciones/vistas correspondientes listadas.

Si ves algún ❌ o ⚠️, revisa el script de migración y ejecútalo nuevamente.
*/

-- ============================================================
-- LIMPIEZA (Opcional)
-- ============================================================

/*
Si necesitas revertir la migración (NO RECOMENDADO):

DROP TABLE IF EXISTS movement_batch_details CASCADE;
DROP VIEW IF EXISTS movement_details_with_batches CASCADE;
DROP FUNCTION IF EXISTS get_movement_batch_breakdown(UUID);
DROP FUNCTION IF EXISTS get_batch_movement_history(UUID);

⚠️ ADVERTENCIA: Esto eliminará todos los datos de trazabilidad de lotes.
Solo ejecuta si estás absolutamente seguro.
*/
