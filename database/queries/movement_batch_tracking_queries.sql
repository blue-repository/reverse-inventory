# Queries de Ejemplo: Sistema de Rastreo de Lotes en Movimientos

## 📋 Consultas Básicas

### 1. Ver todos los movimientos con sus lotes asociados

```sql
SELECT * FROM movement_details_with_batches
ORDER BY movement_date DESC
LIMIT 20;
```

Esta vista combina:
- Información del movimiento (tipo, cantidad, razón, fecha)
- Información del producto
- Detalles de cada lote afectado
- Stock antes y después para cada lote

---

### 2. Ver el desglose de lotes para un movimiento específico

```sql
-- Usando la función helper
SELECT * FROM get_movement_batch_breakdown('UUID_DEL_MOVIMIENTO');

-- O directamente:
SELECT 
  pb.batch_number,
  mbd.quantity AS cantidad_del_lote,
  mbd.batch_stock_before AS stock_antes,
  mbd.batch_stock_after AS stock_despues,
  pb.expiration_date,
  CONCAT_WS(' - ', pb.shelf, pb.drawer, pb.section) AS ubicacion
FROM movement_batch_details mbd
JOIN product_batches pb ON mbd.batch_id = pb.id
WHERE mbd.movement_id = 'UUID_DEL_MOVIMIENTO'
ORDER BY mbd.created_at;
```

**Ejemplo de uso:**
Para saber exactamente de qué lotes se sacó un egreso de 10 unidades.

---

### 3. Ver el historial de un lote específico

```sql
-- Usando la función helper
SELECT * FROM get_batch_movement_history('UUID_DEL_LOTE');

-- O directamente:
SELECT 
  m.movement_type AS tipo,
  m.created_at AS fecha,
  mbd.quantity AS cantidad,
  mbd.batch_stock_before AS stock_antes,
  mbd.batch_stock_after AS stock_despues,
  m.reason AS motivo,
  m.recorded_by AS registrado_por
FROM movement_batch_details mbd
JOIN inventory_movements m ON mbd.movement_id = m.id
WHERE mbd.batch_id = 'UUID_DEL_LOTE'
ORDER BY m.created_at DESC;
```

**Ejemplo de uso:**
Para auditar todos los movimientos que afectaron un lote específico.

---

## 📊 Consultas Analíticas

### 4. Productos con múltiples lotes en un solo egreso

```sql
SELECT 
  m.id AS movement_id,
  p.name AS producto,
  m.movement_type,
  m.quantity AS cantidad_total,
  m.created_at AS fecha,
  COUNT(mbd.batch_id) AS numero_de_lotes,
  STRING_AGG(pb.batch_number, ', ') AS lotes_usados
FROM inventory_movements m
JOIN products p ON m.product_id = p.id
LEFT JOIN movement_batch_details mbd ON m.id = mbd.movement_id
LEFT JOIN product_batches pb ON mbd.batch_id = pb.id
WHERE m.movement_type = 'salida'
GROUP BY m.id, p.name, m.movement_type, m.quantity, m.created_at
HAVING COUNT(mbd.batch_id) > 1
ORDER BY m.created_at DESC;
```

**Utilidad:**
Identifica salidas que usaron múltiples lotes, útil para auditorías FEFO.

---

### 5. Lotes más utilizados en salidas

```sql
SELECT 
  pb.batch_number,
  p.name AS producto,
  pb.expiration_date,
  COUNT(DISTINCT mbd.movement_id) AS veces_usado,
  SUM(mbd.quantity) AS cantidad_total_salida,
  pb.stock AS stock_actual
FROM movement_batch_details mbd
JOIN product_batches pb ON mbd.batch_id = pb.id
JOIN products p ON pb.product_id = p.id
JOIN inventory_movements m ON mbd.movement_id = m.id
WHERE m.movement_type = 'salida'
GROUP BY pb.id, pb.batch_number, p.name, pb.expiration_date, pb.stock
ORDER BY veces_usado DESC, cantidad_total_salida DESC
LIMIT 20;
```

**Utilidad:**
Auditoría de rotación de lotes.

---

### 6. Movimientos sin detalles de lote (movimientos antiguos)

```sql
SELECT 
  m.id,
  p.name AS producto,
  m.movement_type,
  m.quantity,
  m.created_at,
  m.reason
FROM inventory_movements m
JOIN products p ON m.product_id = p.id
LEFT JOIN movement_batch_details mbd ON m.id = mbd.movement_id
WHERE mbd.id IS NULL
  AND m.movement_type = 'salida'
ORDER BY m.created_at DESC
LIMIT 50;
```

**Utilidad:**
Identifica movimientos registrados antes de implementar el sistema de rastreo.

---

## 🔍 Consultas de Auditoría

### 7. Verificar integridad de datos

```sql
-- Verificar que la suma de cantidades en lotes coincide con el total del movimiento
SELECT 
  m.id AS movement_id,
  p.name AS producto,
  m.quantity AS cantidad_movimiento,
  COALESCE(SUM(mbd.quantity), 0) AS suma_lotes,
  m.quantity - COALESCE(SUM(mbd.quantity), 0) AS diferencia
FROM inventory_movements m
JOIN products p ON m.product_id = p.id
LEFT JOIN movement_batch_details mbd ON m.id = mbd.movement_id
WHERE m.movement_type IN ('entrada', 'salida')
  AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY m.id, p.name, m.quantity
HAVING m.quantity != COALESCE(SUM(mbd.quantity), 0)
ORDER BY m.created_at DESC;
```

**Utilidad:**
Si hay registros, indica inconsistencias en los datos.

---

### 8. Rastrear entradas de lotes con sus movimientos

```sql
SELECT 
  pb.batch_number,
  p.name AS producto,
  pb.initial_stock,
  pb.stock AS stock_actual,
  m.created_at AS fecha_entrada,
  m.recorded_by AS registrado_por,
  pb.expiration_date
FROM product_batches pb
JOIN products p ON pb.product_id = p.id
LEFT JOIN movement_batch_details mbd ON pb.id = mbd.batch_id
LEFT JOIN inventory_movements m ON mbd.movement_id = m.id 
  AND m.movement_type = 'entrada'
WHERE pb.created_at >= NOW() - INTERVAL '30 days'
ORDER BY pb.created_at DESC;
```

**Utilidad:**
Auditar todas las entradas recientes con sus lotes.

---

### 9. Movimientos de un producto en un rango de fechas con detalles de lotes

```sql
SELECT 
  m.created_at AS fecha,
  m.movement_type AS tipo,
  m.quantity AS cantidad,
  m.reason AS motivo,
  STRING_AGG(
    CONCAT(pb.batch_number, ' (', mbd.quantity, ')'), 
    ', '
  ) AS lotes_detalle,
  m.recorded_by
FROM inventory_movements m
LEFT JOIN movement_batch_details mbd ON m.id = mbd.movement_id
LEFT JOIN product_batches pb ON mbd.batch_id = pb.id
WHERE m.product_id = 'UUID_DEL_PRODUCTO'
  AND m.created_at >= '2025-01-01'
  AND m.created_at < '2025-02-01'
GROUP BY m.id, m.created_at, m.movement_type, m.quantity, m.reason, m.recorded_by
ORDER BY m.created_at DESC;
```

**Utilidad:**
Reporte de actividad mensual de un producto con trazabilidad de lotes.

---

## 📈 Consultas Avanzadas

### 10. Análisis FEFO: Verificar que se usaron primero los lotes más próximos a vencer

```sql
WITH ranked_batches AS (
  SELECT 
    mbd.movement_id,
    pb.id AS batch_id,
    pb.batch_number,
    pb.expiration_date,
    mbd.quantity,
    ROW_NUMBER() OVER (
      PARTITION BY mbd.movement_id 
      ORDER BY pb.expiration_date ASC
    ) AS uso_orden,
    ROW_NUMBER() OVER (
      PARTITION BY m.product_id 
      ORDER BY pb.expiration_date ASC
    ) AS esperado_orden
  FROM movement_batch_details mbd
  JOIN product_batches pb ON mbd.batch_id = pb.id
  JOIN inventory_movements m ON mbd.movement_id = m.id
  WHERE m.movement_type = 'salida'
)
SELECT 
  movement_id,
  batch_number,
  expiration_date,
  quantity,
  uso_orden,
  esperado_orden,
  CASE 
    WHEN uso_orden = esperado_orden THEN 'CORRECTO ✓'
    ELSE 'REVISAR ⚠'
  END AS cumple_fefo
FROM ranked_batches
ORDER BY movement_id, uso_orden;
```

**Utilidad:**
Audita si el sistema FEFO está funcionando correctamente.

---

### 11. Reporte de trazabilidad completa de un lote

```sql
-- TODO: Ver de dónde vino (entrada) y a dónde fue (salidas)
WITH batch_info AS (
  SELECT 
    pb.id,
    pb.batch_number,
    p.name AS producto,
    pb.initial_stock,
    pb.stock AS stock_actual,
    pb.expiration_date,
    pb.created_at AS fecha_creacion
  FROM product_batches pb
  JOIN products p ON pb.product_id = p.id
  WHERE pb.id = 'UUID_DEL_LOTE'
)
SELECT 
  bi.batch_number,
  bi.producto,
  bi.initial_stock,
  bi.stock_actual,
  bi.expiration_date,
  m.movement_type AS tipo_movimiento,
  m.created_at AS fecha_movimiento,
  mbd.quantity AS cantidad,
  mbd.batch_stock_before AS stock_antes,
  mbd.batch_stock_after AS stock_despues,
  m.reason AS motivo,
  m.recorded_by AS usuario,
  m.patient_name AS paciente
FROM batch_info bi
LEFT JOIN movement_batch_details mbd ON bi.id = mbd.batch_id
LEFT JOIN inventory_movements m ON mbd.movement_id = m.id
ORDER BY m.created_at;
```

**Utilidad:**
Trazabilidad completa de un lote desde su entrada hasta sus salidas.

---

### 12. Resumen diario de movimientos con lotes

```sql
SELECT 
  DATE(m.created_at) AS fecha,
  m.movement_type AS tipo,
  COUNT(DISTINCT m.id) AS total_movimientos,
  SUM(m.quantity) AS cantidad_total,
  COUNT(DISTINCT mbd.batch_id) AS lotes_afectados,
  STRING_AGG(DISTINCT p.name, ', ') AS productos
FROM inventory_movements m
JOIN products p ON m.product_id = p.id
LEFT JOIN movement_batch_details mbd ON m.id = mbd.movement_id
WHERE m.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(m.created_at), m.movement_type
ORDER BY fecha DESC, tipo;
```

**Utilidad:**
Reporte semanal de actividad con métricas de lotes.

---

## 💡 Tips de Uso

### Para Desarrolladores
- Usa las vistas (`movement_details_with_batches`) para consultas rápidas en el UI
- Usa las funciones (`get_movement_batch_breakdown`) para endpoints de API
- Indexa apropiadamente si las consultas se vuelven lentas

### Para Reportes
- Las consultas 4-6 son ideales para dashboards de auditoría
- La consulta 11 es perfecta para trazabilidad individual
- La consulta 12 funciona bien para reportes gerenciales

### Para Auditoría
- Ejecuta la consulta 7 regularmente para verificar integridad
- Usa la consulta 10 para verificar cumplimiento de FEFO
- La consulta 6 te muestra movimientos que no tienen trazabilidad completa

---

## 🔗 Relacionados

- Ver [database/migrations/006_create_movement_batch_details.sql](./006_create_movement_batch_details.sql) para el esquema
- Ver [database/migrations/MIGRATION_006_GUIDE.md](./MIGRATION_006_GUIDE.md) para la guía de migración
- Ver [database/SCHEMA_DIAGRAM.md](../SCHEMA_DIAGRAM.md) para el diagrama actualizado del esquema
