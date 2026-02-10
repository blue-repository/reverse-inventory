-- ============================================================
-- Migration: 007_create_notifications_system.sql
-- Descripción: Sistema genérico y escalable de notificaciones
-- ============================================================

-- Tabla: notifications (GENÉRICA - para cualquier tipo de evento)
-- Descripción: Almacena TODAS las notificaciones del sistema
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de notificación (determina qué datos se usan)
  notification_type TEXT NOT NULL,  -- expiring_product, new_entry, movement, low_stock, etc.
  CONSTRAINT notification_type_check CHECK (notification_type IN (
    'expiring_product',
    'new_product_entry',
    'inventory_movement',
    'low_stock',
    'location_change',
    'custom'
  )),
  
  -- Título y descripción
  title TEXT NOT NULL,              -- Ej: "Amoxicilina por vencer"
  description TEXT,                 -- Detalles adicionales
  
  -- Entidad relacionada (flexible - permite referencias a diferentes tablas)
  entity_type TEXT,                 -- 'product' | 'batch' | 'movement' | 'user' | etc.
  entity_id UUID,                   -- UUID del producto, lote, movimiento, etc.
  
  -- Metadatos específicos del tipo de notificación (JSON flexible)
  metadata JSONB DEFAULT '{}'::jsonb,  -- Información adicional (días hasta vencer, cantidad, etc.)
  
  -- Severidad/Prioridad
  severity TEXT DEFAULT 'info',     -- critical | warning | info
  CONSTRAINT severity_check CHECK (severity IN ('critical', 'warning', 'info')),
  
  -- Estado de la notificación
  notification_status TEXT NOT NULL DEFAULT 'pending',  -- pending, read, dismissed, archived
  CONSTRAINT status_check CHECK (notification_status IN ('pending', 'read', 'dismissed', 'archived')),
  
  -- Usuario destinatario
  notified_user_id TEXT,            -- NULL = todos, específico = usuario particular
  
  -- Auditoría y timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Para tracking de eventos que generaron la notificación
  related_event_id UUID            -- UUID del evento relacionado (movimiento, entrada, etc.)
);

-- Documentación
COMMENT ON TABLE notifications IS 'Tabla genérica para TODAS las notificaciones del sistema';
COMMENT ON COLUMN notifications.notification_type IS 'Tipo: expiring_product, new_entry, movement, low_stock, location_change, custom';
COMMENT ON COLUMN notifications.entity_type IS 'Tipo de entidad relacionada: product, batch, movement, user, etc.';
COMMENT ON COLUMN notifications.metadata IS 'JSON con datos específicos del tipo (ej: {days_until_expiration: 15, quantity: 50})';
COMMENT ON COLUMN notifications.severity IS 'critical=acción inmediata, warning=revisar pronto, info=informativo';
COMMENT ON COLUMN notifications.related_event_id IS 'UUID del evento que causó la notificación (para tracking)';

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(notification_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(notified_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(notification_status) WHERE notification_status = 'pending';
-- Índice parcial para notificaciones de vencimiento (sin función de fecha en el índice)
CREATE INDEX IF NOT EXISTS idx_notifications_expiring_active
ON notifications (
  notification_type,
  entity_id,
  created_at DESC
)
WHERE notification_type = 'expiring_product'
  AND notification_status IN ('pending', 'read');

-- ============================================================
-- VISTAS
-- ============================================================

-- Vista: vw_expiring_products
-- Descripción: Identifica todos los productos y lotes a punto de vencer
-- Considera: "por vencer" = menos de 3 meses (90 días) de la fecha actual
CREATE OR REPLACE VIEW vw_expiring_products AS
-- Productos sin lotes que están por vencer
SELECT 
  p.id AS product_id,
  NULL::UUID AS batch_id,
  p.name AS product_name,
  p.barcode,
  p.expiration_date,
  (p.expiration_date - CURRENT_DATE) AS days_until_expiration,
  'producto' AS type,
  p.stock AS quantity,
  p.unit_of_measure,
  NULL::VARCHAR AS batch_number
FROM products p
WHERE 
  p.expiration_date IS NOT NULL
  AND p.deleted_at IS NULL
  AND p.expiration_date <= (CURRENT_DATE + INTERVAL '3 months')::DATE
  AND p.expiration_date > CURRENT_DATE          -- No incluir ya vencidos
  AND p.stock > 0

UNION ALL

-- Lotes que están por vencer
SELECT 
  pb.product_id,
  pb.id AS batch_id,
  p.name AS product_name,
  p.barcode,
  pb.expiration_date,
  (pb.expiration_date - CURRENT_DATE) AS days_until_expiration,
  'lote' AS type,
  pb.stock AS quantity,
  p.unit_of_measure,
  pb.batch_number
FROM product_batches pb
INNER JOIN products p ON pb.product_id = p.id
WHERE 
  pb.expiration_date IS NOT NULL
  AND pb.is_active = true
  AND pb.expiration_date <= (CURRENT_DATE + INTERVAL '3 months')::DATE
  AND pb.expiration_date > CURRENT_DATE         -- No incluir ya vencidos
  AND pb.stock > 0

ORDER BY days_until_expiration ASC;

COMMENT ON VIEW vw_expiring_products IS 'Vista que identifica productos y lotes próximos a vencer (menos de 90 días)';

-- Vista: vw_active_notifications (GENÉRICA - para todo tipo de notificación)
-- Descripción: Notificaciones activas (no descartadas/archivadas) con información procesada
CREATE OR REPLACE VIEW vw_active_notifications AS
SELECT 
  n.id,
  n.notification_type,
  n.title,
  n.description,
  n.entity_type,
  n.entity_id,
  n.notification_status,
  n.severity,
  n.created_at,
  n.read_at,
  n.dismissed_at,
  n.notified_user_id,
  n.metadata,
  
  -- Para notificaciones de vencimiento, obtener datos adicionales
  CASE 
    WHEN n.notification_type = 'expiring_product' THEN
      COALESCE(
        (n.metadata->>'product_name'),
        (SELECT p.name FROM products p WHERE p.id = n.entity_id LIMIT 1)
      )
    ELSE 
      n.title
  END AS display_title,
  
  -- Para notificaciones de vencimiento, incluir días hasta vencimiento
  CASE 
    WHEN n.notification_type = 'expiring_product' THEN
      (n.metadata->>'days_until_expiration')::INTEGER
    ELSE 
      NULL::INTEGER
  END AS days_until_expiration
  
FROM notifications n
WHERE n.notification_status IN ('pending', 'read');

COMMENT ON VIEW vw_active_notifications IS 'Notificaciones activas de cualquier tipo con información procesada';

-- Vista: vw_active_expiring_notifications (ESPECÍFICA - para compatibilidad con código anterior)
-- Descripción: Notificaciones de vencimiento solamente (para mantener compatibilidad)
CREATE OR REPLACE VIEW vw_active_expiring_notifications AS
SELECT 
  n.id,
  n.entity_id AS product_id,
  (n.metadata->>'batch_id')::UUID AS batch_id,
  n.title AS product_name,
  (n.metadata->>'batch_number') AS batch_number,
  (n.metadata->>'barcode') AS barcode,
  (n.metadata->>'expiration_date')::DATE AS expiration_date,
  (n.metadata->>'days_until_expiration')::INTEGER AS days_until_expiration,
  (n.metadata->>'type') AS type,
  (n.metadata->>'quantity')::INTEGER AS quantity,
  (n.metadata->>'unit_of_measure') AS unit_of_measure,
  n.notification_status,
  n.severity,
  n.created_at,
  n.read_at,
  n.dismissed_at,
  n.description AS notification_message
FROM notifications n
WHERE 
  n.notification_type = 'expiring_product'
  AND n.notification_status IN ('pending', 'read');

COMMENT ON VIEW vw_active_expiring_notifications IS 'Notificaciones de productos por vencer (para compatibilidad)';

-- ============================================================
-- FUNCIONES
-- ============================================================

CREATE OR REPLACE FUNCTION fn_create_or_update_expiring_notifications(
  p_days_threshold INTEGER DEFAULT 90
)
RETURNS TABLE(created_count INT, updated_count INT) AS $$
DECLARE
  v_created_count INT := 0;
  v_updated_count INT := 0;
BEGIN
  -- Crear notificaciones para productos/lotes por vencer que no tienen notificación
  WITH new_notifications AS (
    INSERT INTO notifications (
      notification_type,
      title,
      description,
      entity_type,
      entity_id,
      severity,
      notification_status,
      metadata
    )
    SELECT 
      'expiring_product',
      CASE 
        WHEN ep.type = 'lote' THEN 
          CONCAT(ep.product_name, ' (Lote ', ep.batch_number, ')')
        ELSE 
          ep.product_name
      END,
      CASE 
        WHEN ep.type = 'lote' THEN 
             CONCAT(ep.product_name, ' (Lote ', ep.batch_number, ') vence en ', 
               (ep.expiration_date - CURRENT_DATE), ' días')
        ELSE 
             CONCAT(ep.product_name, ' vence en ', 
               (ep.expiration_date - CURRENT_DATE), ' días')
      END,
      'product',
      ep.product_id,
      CASE 
        WHEN (ep.expiration_date - CURRENT_DATE) <= 7 THEN 'critical'
        WHEN (ep.expiration_date - CURRENT_DATE) <= 30 THEN 'warning'
        ELSE 'info'
      END,
      'pending',
      jsonb_build_object(
        'product_id', ep.product_id,
        'batch_id', ep.batch_id,
        'product_name', ep.product_name,
        'batch_number', ep.batch_number,
        'barcode', ep.barcode,
        'expiration_date', ep.expiration_date::TEXT,
        'days_until_expiration', (ep.expiration_date - CURRENT_DATE),
        'type', ep.type,
        'quantity', ep.quantity,
        'unit_of_measure', ep.unit_of_measure
      )
    FROM vw_expiring_products ep
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.notification_type = 'expiring_product'
        AND n.entity_id = ep.product_id
        AND n.created_at::DATE = CURRENT_DATE
        AND n.notification_status IN ('pending', 'read')
        AND CASE 
          -- Para productos sin lote: verificar que no exista notificación de producto sin lote
          WHEN ep.type = 'producto' AND ep.batch_id IS NULL THEN 
            (n.metadata->>'type') = 'producto' 
            AND (n.metadata->>'batch_id' IS NULL OR n.metadata->>'batch_id' = 'null')
          -- Para lotes: verificar que no exista notificación del mismo lote
          WHEN ep.type = 'lote' AND ep.batch_id IS NOT NULL THEN 
            (n.metadata->>'type') = 'lote' 
            AND (n.metadata->>'batch_id')::TEXT = ep.batch_id::TEXT
          ELSE FALSE
        END
    )
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_created_count FROM new_notifications;

  -- Actualizar severity y metadata para notificaciones existentes de vencimiento
  UPDATE notifications n
  SET 
    severity = CASE 
      WHEN (COALESCE(n.metadata->>'expiration_date', '')::DATE - CURRENT_DATE) <= 7 THEN 'critical'
      WHEN (COALESCE(n.metadata->>'expiration_date', '')::DATE - CURRENT_DATE) <= 30 THEN 'warning'
      ELSE 'info'
    END,
    metadata = jsonb_set(
      n.metadata, 
      '{days_until_expiration}', 
      to_jsonb((COALESCE(n.metadata->>'expiration_date', '')::DATE - CURRENT_DATE))
    )
  WHERE 
    n.notification_type = 'expiring_product'
    AND n.notification_status IN ('pending', 'read')
    AND EXISTS (
      SELECT 1 FROM vw_expiring_products ep
      WHERE ep.product_id = n.entity_id
        AND CASE 
          WHEN ep.type = 'producto' AND ep.batch_id IS NULL THEN 
            (n.metadata->>'type') = 'producto' 
            AND (n.metadata->>'batch_id' IS NULL OR n.metadata->>'batch_id' = 'null')
          WHEN ep.type = 'lote' AND ep.batch_id IS NOT NULL THEN 
            (n.metadata->>'type') = 'lote' 
            AND (n.metadata->>'batch_id')::TEXT = ep.batch_id::TEXT
          ELSE FALSE
        END
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN QUERY SELECT v_created_count, v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_create_or_update_expiring_notifications() IS 'Crea y actualiza notificaciones para productos por vencer en tabla genérica';

-- Función: fn_create_notification_new_entry()
-- Descripción: Crea notificación cuando se ingresa un nuevo producto
-- Uso: SELECT fn_create_notification_new_entry(product_id, batch_id, quantity);
CREATE OR REPLACE FUNCTION fn_create_notification_new_entry(
  p_product_id UUID,
  p_batch_id UUID DEFAULT NULL,
  p_quantity INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_product_name TEXT;
  v_title TEXT;
BEGIN
  -- Obtener nombre del producto
  SELECT p.name INTO v_product_name FROM products p WHERE p.id = p_product_id;
  
  IF v_product_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- Construir título
  v_title := CONCAT(
    'Nuevo ingreso: ', v_product_name,
    CASE WHEN p_batch_id IS NOT NULL THEN CONCAT(' (Lote ', (SELECT batch_number FROM product_batches WHERE id = p_batch_id), ')') ELSE '' END
  );

  -- Crear notificación
  INSERT INTO notifications (
    notification_type,
    title,
    description,
    entity_type,
    entity_id,
    severity,
    notification_status,
    metadata
  )
  VALUES (
    'new_product_entry',
    v_title,
    CONCAT('Se ingresaron ', p_quantity, ' unidades'),
    'product',
    p_product_id,
    'info',
    'pending',
    jsonb_build_object(
      'product_name', v_product_name,
      'batch_id', p_batch_id,
      'quantity', p_quantity,
      'event_type', 'new_entry'
    )
  )
  RETURNING notifications.id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_create_notification_new_entry(UUID, UUID, INTEGER) IS 'Crea notificación de nuevo ingreso de productos';

-- Función: fn_create_notification_movement()
-- Descripción: Crea notificación para movimientos de inventario
-- Uso: SELECT fn_create_notification_movement(product_id, movement_type, quantity);
CREATE OR REPLACE FUNCTION fn_create_notification_movement(
  p_product_id UUID,
  p_movement_type TEXT,
  p_quantity INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_product_name TEXT;
  v_title TEXT;
  v_movement_label TEXT;
BEGIN
  -- Obtener nombre del producto
  SELECT p.name INTO v_product_name FROM products p WHERE p.id = p_product_id;
  
  IF v_product_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- Mapear tipo de movimiento
  v_movement_label := CASE 
    WHEN p_movement_type = 'entrada' THEN 'Entrada'
    WHEN p_movement_type = 'salida' THEN 'Salida'
    WHEN p_movement_type = 'ajuste' THEN 'Ajuste'
    ELSE p_movement_type
  END;

  v_title := CONCAT(v_movement_label, ' de inventario: ', v_product_name);

  -- Crear notificación
  INSERT INTO notifications (
    notification_type,
    title,
    description,
    entity_type,
    entity_id,
    severity,
    notification_status,
    metadata
  )
  VALUES (
    'inventory_movement',
    v_title,
    CONCAT(v_movement_label, ' de ', p_quantity, ' unidades'),
    'product',
    p_product_id,
    'info',
    'pending',
    jsonb_build_object(
      'product_name', v_product_name,
      'movement_type', p_movement_type,
      'quantity', p_quantity,
      'event_type', 'movement'
    )
  )
  RETURNING notifications.id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_create_notification_movement(UUID, TEXT, INTEGER) IS 'Crea notificación de movimiento de inventario';

-- Función: fn_cleanup_old_notifications()
-- Descripción: Limpia notificaciones descartadas hace más de 30 días, archivadas hace más de 90 días
CREATE OR REPLACE FUNCTION fn_cleanup_old_notifications()
RETURNS TABLE(deleted_count INT, archived_count INT) AS $$
DECLARE
  v_deleted_count INT := 0;
  v_archived_count INT := 0;
BEGIN
  -- Eliminar notificaciones descartadas hace más de 30 días
  DELETE FROM notifications
  WHERE notification_status = 'dismissed'
    AND dismissed_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Archivar notificaciones leídas hace más de 90 días
  UPDATE notifications
  SET 
    notification_status = 'archived',
    archived_at = NOW()
  WHERE 
    notification_status = 'read'
    AND read_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, v_archived_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_cleanup_old_notifications() IS 'Limpia notificaciones descartadas (>30d) y archiva leídas (>90d)';

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(notification_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(notified_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(notification_status) WHERE notification_status = 'pending';
