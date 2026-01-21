-- =====================================================
-- MIGRACIÓN: Agregar Fechas y Datos de Recetas a Movimientos
-- Fecha: 20 de enero de 2026
-- Objetivo: Permitir seleccionar fechas por movimiento/item y registrar datos de recetas médicas
-- Estructura: Cada item es un registro, agrupados por movement_group_id
-- =====================================================

-- =====================================================
-- 1. Campo de AGRUPACIÓN
-- =====================================================

-- Agregar campo para agrupar items del mismo movimiento general
ALTER TABLE inventory_movements 
ADD COLUMN movement_group_id UUID;

-- Crear índice para búsquedas por grupo
CREATE INDEX IF NOT EXISTS idx_movements_group_id ON inventory_movements(movement_group_id);

-- =====================================================
-- 2. Campos de FECHA (pueden ser generales o específicos por item)
-- =====================================================

-- Fecha de movimiento (general o específica del item)
-- Si es NULL en el item, usar la del grupo. Si ambas son NULL, usar CURRENT_DATE
ALTER TABLE inventory_movements 
ADD COLUMN movement_date DATE;

-- Crear índice para mejorar búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_movements_movement_date ON inventory_movements(movement_date);

-- =====================================================
-- 3. Campos de RECETA MÉDICA (para movimientos de salida tipo receta)
-- =====================================================

-- Estos campos pueden contener valores generales o específicos por item

-- Flag para indicar si es una salida por receta médica
ALTER TABLE inventory_movements 
ADD COLUMN is_recipe_movement BOOLEAN DEFAULT FALSE;

-- Nombre del paciente (general o específico)
ALTER TABLE inventory_movements 
ADD COLUMN patient_name VARCHAR(255);

-- Fecha de la receta (año, mes, día) - general o específica
ALTER TABLE inventory_movements 
ADD COLUMN recipe_date DATE;

-- Nombre del profesional que recetó (general o específico)
ALTER TABLE inventory_movements 
ADD COLUMN prescribed_by VARCHAR(255);

-- CIE (Clasificación Internacional de Enfermedades) - general o específico
ALTER TABLE inventory_movements 
ADD COLUMN cie_code VARCHAR(10);

-- Descripción adicional o notas sobre la receta
ALTER TABLE inventory_movements 
ADD COLUMN recipe_notes TEXT;

-- =====================================================
-- 4. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN inventory_movements.movement_group_id IS 'UUID que agrupa todos los items de un mismo movimiento general. Permite identificar qué items pertenecen a la misma entrada/salida.';

COMMENT ON COLUMN inventory_movements.movement_date IS 'Fecha del movimiento. Puede ser general (para todos los items del grupo) o específica por item. Si es NULL en el item, usar la del grupo.';

COMMENT ON COLUMN inventory_movements.is_recipe_movement IS 'Indica si este es un movimiento de salida por receta médica (TRUE) o un movimiento normal (FALSE). Puede ser general o específica por item.';

COMMENT ON COLUMN inventory_movements.patient_name IS 'Nombre del paciente a quien se le entrega el medicamento. Valor general o específico por item. Solo aplica si is_recipe_movement = TRUE.';

COMMENT ON COLUMN inventory_movements.recipe_date IS 'Fecha en que se escribió/registró la receta médica. Valor general o específico por item. Solo aplica si is_recipe_movement = TRUE.';

COMMENT ON COLUMN inventory_movements.prescribed_by IS 'Nombre del profesional de salud que escribió la receta (médico, odontólogo, etc.). Valor general o específico por item. Solo aplica si is_recipe_movement = TRUE.';

COMMENT ON COLUMN inventory_movements.cie_code IS 'Código CIE-10 del diagnóstico/condición asociada a la receta. Ej: J06.9 (Infección aguda de vías respiratorias). Valor general o específico por item. Solo aplica si is_recipe_movement = TRUE.';

COMMENT ON COLUMN inventory_movements.recipe_notes IS 'Notas adicionales sobre la receta, indicaciones especiales, etc. Valor general o específico por item.';

-- =====================================================
-- 5. VISTA PARA CONSULTAS DE RECETAS
-- =====================================================

-- Vista para filtrar y consultar movimientos de receta
-- Resuelve los valores finales considerando grupos y items específicos
CREATE OR REPLACE VIEW recipe_movements_view AS
SELECT
  im.id,
  im.movement_group_id,
  im.product_id,
  p.name as product_name,
  im.movement_type,
  im.quantity,
  im.movement_date,
  -- Valores finales resueltos (item específico o grupo)
  COALESCE(im.patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1
  )) as patient_name_resolved,
  COALESCE(im.recipe_date, (
    SELECT recipe_date FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND recipe_date IS NOT NULL LIMIT 1
  )) as recipe_date_resolved,
  COALESCE(im.prescribed_by, (
    SELECT prescribed_by FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND prescribed_by IS NOT NULL LIMIT 1
  )) as prescribed_by_resolved,
  COALESCE(im.cie_code, (
    SELECT cie_code FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id AND cie_code IS NOT NULL LIMIT 1
  )) as cie_code_resolved,
  im.recipe_notes,
  im.recorded_by,
  im.created_at
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.is_recipe_movement = TRUE
  AND im.movement_type = 'salida'
ORDER BY im.recipe_date DESC, im.created_at DESC;

-- =====================================================
-- 6. VISTA PARA RESUMEN DE MOVIMIENTOS CON FECHAS
-- =====================================================

CREATE OR REPLACE VIEW movements_with_dates_view AS
SELECT
  im.id,
  im.movement_group_id,
  im.product_id,
  p.name as product_name,
  im.movement_type,
  im.quantity,
  im.movement_date,
  im.reason,
  im.recorded_by,
  CASE 
    WHEN im.is_recipe_movement = TRUE THEN 'Receta: ' || COALESCE(
      COALESCE(im.patient_name, (
        SELECT patient_name FROM inventory_movements 
        WHERE movement_group_id = im.movement_group_id AND patient_name IS NOT NULL LIMIT 1
      )), 'Sin paciente')
    ELSE im.reason
  END as movement_reason,
  im.created_at
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
ORDER BY im.movement_date DESC, im.created_at DESC;

-- =====================================================
-- 7. ACTUALIZAR TRIGGER PARA UPDATED_AT
-- =====================================================

-- El trigger existente ya cubre los nuevos campos
-- No es necesario hacer cambios aquí

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

-- =====================================================
-- QUERIES DE VALIDACIÓN (no ejecutar, solo referencia)
-- =====================================================

/*
-- Validar que los campos fueron agregados correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inventory_movements'
ORDER BY ordinal_position;

-- Ver estructura completa de la tabla
\d inventory_movements

-- Ver movimientos de receta registrados
SELECT * FROM recipe_movements_view;

-- Ver todos los movimientos con sus fechas
SELECT * FROM movements_with_dates_view;

-- Ver movimientos agrupados
SELECT 
  movement_group_id,
  COUNT(*) as items_en_grupo,
  array_agg(product_id) as productos,
  movement_type,
  movement_date
FROM inventory_movements
WHERE movement_group_id IS NOT NULL
GROUP BY movement_group_id, movement_type, movement_date;

-- Verificar que los índices fueron creados
SELECT indexname FROM pg_indexes WHERE tablename = 'inventory_movements';
*/


