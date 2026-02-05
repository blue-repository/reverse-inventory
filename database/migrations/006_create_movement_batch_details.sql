-- ============================================================
-- Migration: 006_create_movement_batch_details.sql
-- Descripción: Crea tabla intermedia para rastrear relaciones entre movimientos y lotes
-- Fecha: 2025-02-05
-- ============================================================

-- ============================================================
-- PROBLEMA RESUELTO:
-- Anteriormente, no se podía rastrear qué lotes específicos fueron
-- afectados por un movimiento de inventario. Si un egreso de 5 unidades
-- tomaba 3 unidades de un lote y 2 de otro, esta información se perdía.
-- ============================================================

-- ============================================================
-- Tabla: movement_batch_details
-- Descripción: Tabla intermedia para relacionar movimientos con múltiples lotes
-- Relación: Muchos a Muchos entre inventory_movements y product_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS movement_batch_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  movement_id UUID NOT NULL REFERENCES inventory_movements(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
  
  -- Cantidad afectada de este lote específico en este movimiento
  quantity INTEGER NOT NULL,
  
  -- Stock del lote antes y después del movimiento (para auditoría)
  batch_stock_before INTEGER NOT NULL,
  batch_stock_after INTEGER NOT NULL,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT movement_batch_details_quantity_positive CHECK (quantity > 0),
  CONSTRAINT movement_batch_details_batch_stock_before_check CHECK (batch_stock_before >= 0),
  CONSTRAINT movement_batch_details_batch_stock_after_check CHECK (batch_stock_after >= 0)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_movement_batch_details_movement_id 
  ON movement_batch_details(movement_id);

CREATE INDEX IF NOT EXISTS idx_movement_batch_details_batch_id 
  ON movement_batch_details(batch_id);

CREATE INDEX IF NOT EXISTS idx_movement_batch_details_created_at 
  ON movement_batch_details(created_at);

-- Índice compuesto para consultas comunes
CREATE INDEX IF NOT EXISTS idx_movement_batch_details_movement_batch 
  ON movement_batch_details(movement_id, batch_id);

-- Comentarios de documentación
COMMENT ON TABLE movement_batch_details IS 'Tabla intermedia que almacena el detalle de qué lotes fueron afectados por cada movimiento de inventario y en qué cantidades';
COMMENT ON COLUMN movement_batch_details.id IS 'Identificador único del registro';
COMMENT ON COLUMN movement_batch_details.movement_id IS 'Referencia al movimiento de inventario';
COMMENT ON COLUMN movement_batch_details.batch_id IS 'Referencia al lote afectado';
COMMENT ON COLUMN movement_batch_details.quantity IS 'Cantidad de unidades afectadas de este lote específico en este movimiento';
COMMENT ON COLUMN movement_batch_details.batch_stock_before IS 'Stock del lote antes de aplicar este movimiento (para auditoría)';
COMMENT ON COLUMN movement_batch_details.batch_stock_after IS 'Stock del lote después de aplicar este movimiento (para auditoría)';
COMMENT ON COLUMN movement_batch_details.created_at IS 'Fecha y hora de creación del registro';

-- ============================================================
-- Vista auxiliar: movement_details_with_batches
-- Descripción: Facilita la consulta de movimientos con sus lotes asociados
-- ============================================================
CREATE OR REPLACE VIEW movement_details_with_batches AS
SELECT 
  m.id AS movement_id,
  m.product_id,
  p.name AS product_name,
  m.movement_type,
  m.quantity AS total_quantity,
  m.reason,
  m.notes,
  m.created_at AS movement_date,
  m.recorded_by,
  -- Detalles de lotes
  mbd.id AS detail_id,
  mbd.batch_id,
  pb.batch_number,
  mbd.quantity AS batch_quantity,
  mbd.batch_stock_before,
  mbd.batch_stock_after,
  pb.expiration_date AS batch_expiration_date,
  pb.shelf,
  pb.drawer,
  pb.section
FROM 
  inventory_movements m
  INNER JOIN products p ON m.product_id = p.id
  LEFT JOIN movement_batch_details mbd ON m.id = mbd.movement_id
  LEFT JOIN product_batches pb ON mbd.batch_id = pb.id
ORDER BY 
  m.created_at DESC, mbd.created_at ASC;

COMMENT ON VIEW movement_details_with_batches IS 'Vista que combina movimientos de inventario con sus detalles de lotes asociados';

-- ============================================================
-- Función: get_movement_batch_breakdown
-- Descripción: Obtiene el desglose completo de lotes para un movimiento
-- ============================================================
CREATE OR REPLACE FUNCTION get_movement_batch_breakdown(p_movement_id UUID)
RETURNS TABLE (
  batch_id UUID,
  batch_number VARCHAR(100),
  quantity INTEGER,
  stock_before INTEGER,
  stock_after INTEGER,
  expiration_date DATE,
  location TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pb.id,
    pb.batch_number,
    mbd.quantity,
    mbd.batch_stock_before,
    mbd.batch_stock_after,
    pb.expiration_date,
    CONCAT_WS(' - ', pb.shelf, pb.drawer, pb.section) AS location
  FROM 
    movement_batch_details mbd
    INNER JOIN product_batches pb ON mbd.batch_id = pb.id
  WHERE 
    mbd.movement_id = p_movement_id
  ORDER BY 
    mbd.created_at ASC;
END;
$$;

COMMENT ON FUNCTION get_movement_batch_breakdown(UUID) IS 'Obtiene el desglose detallado de todos los lotes afectados por un movimiento específico';

-- ============================================================
-- Función: get_batch_movement_history
-- Descripción: Obtiene el historial de movimientos que afectaron un lote
-- ============================================================
CREATE OR REPLACE FUNCTION get_batch_movement_history(p_batch_id UUID)
RETURNS TABLE (
  movement_id UUID,
  movement_type TEXT,
  movement_date TIMESTAMP WITH TIME ZONE,
  quantity INTEGER,
  stock_before INTEGER,
  stock_after INTEGER,
  product_name TEXT,
  recorded_by TEXT,
  reason TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.movement_type,
    m.created_at,
    mbd.quantity,
    mbd.batch_stock_before,
    mbd.batch_stock_after,
    p.name,
    m.recorded_by,
    m.reason
  FROM 
    movement_batch_details mbd
    INNER JOIN inventory_movements m ON mbd.movement_id = m.id
    INNER JOIN products p ON m.product_id = p.id
  WHERE 
    mbd.batch_id = p_batch_id
  ORDER BY 
    m.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_batch_movement_history(UUID) IS 'Obtiene el historial completo de movimientos que han afectado un lote específico';

-- ============================================================
-- NOTAS DE MIGRACIÓN:
-- ============================================================
-- 1. Esta tabla NO afecta datos existentes
-- 2. Los movimientos antiguos no tendrán registros en esta tabla
-- 3. Solo los movimientos NUEVOS registrarán detalles de lotes
-- 4. Para movimientos sin lotes específicos, esta tabla estará vacía
-- 5. El campo 'batch_id' en inventory_movements se mantiene por compatibilidad
-- ============================================================

-- ============================================================
-- VALIDACIÓN POST-MIGRACIÓN:
-- Ejecutar estas consultas para verificar que todo está correcto
-- ============================================================

-- Verificar que la tabla se creó correctamente
-- SELECT * FROM movement_batch_details LIMIT 1;

-- Verificar que los índices se crearon
-- SELECT indexname FROM pg_indexes WHERE tablename = 'movement_batch_details';

-- Verificar que la vista funciona
-- SELECT * FROM movement_details_with_batches LIMIT 5;

-- Probar la función de desglose
-- SELECT * FROM get_movement_batch_breakdown('UUID_DE_ALGUN_MOVIMIENTO');

-- Probar la función de historial de lote
-- SELECT * FROM get_batch_movement_history('UUID_DE_ALGUN_LOTE');
