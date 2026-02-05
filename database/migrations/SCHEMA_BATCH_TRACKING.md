# Documentación del Esquema: Sistema de Rastreo de Lotes en Movimientos

## 📊 Diagrama de Relaciones

```
┌─────────────────────┐
│     products        │
│  ─────────────────  │
│  id (PK)            │
│  name               │
│  stock              │
│  ...                │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────────┐         ┌─────────────────────────┐
│   product_batches           │         │  inventory_movements    │
│  ────────────────────────   │         │  ─────────────────────  │
│  id (PK)                    │         │  id (PK)                │
│  product_id (FK)            │         │  product_id (FK)        │
│  batch_number               │         │  movement_type          │
│  stock                      │         │  quantity               │
│  initial_stock              │         │  reason                 │
│  expiration_date            │         │  ...                    │
│  ...                        │         └──────────┬──────────────┘
└──────────┬──────────────────┘                    │
           │                                       │
           │                                       │
           │         ┌─────────────────────────────┘
           │         │
           │ N       │ N
           │         │
       ┌───▼─────────▼────────────────────┐
       │  movement_batch_details          │    ⭐ NUEVA TABLA
       │  ──────────────────────────────  │
       │  id (PK)                         │
       │  movement_id (FK) ───────────────┼──> inventory_movements
       │  batch_id (FK) ──────────────────┼──> product_batches
       │  quantity                        │
       │  batch_stock_before              │
       │  batch_stock_after               │
       │  created_at                      │
       └──────────────────────────────────┘
```

---

## 🗂️ Tabla: `movement_batch_details`

### Propósito
Tabla intermedia que relaciona movimientos de inventario con los lotes específicos que fueron afectados, permitiendo rastrear exactamente qué lotes se usaron en cada operación.

### Campos

| Campo | Tipo | Null | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador único del registro |
| `movement_id` | UUID | NO | - | **FK** a `inventory_movements.id` |
| `batch_id` | UUID | NO | - | **FK** a `product_batches.id` |
| `quantity` | INTEGER | NO | - | Cantidad de unidades afectadas de este lote en este movimiento |
| `batch_stock_before` | INTEGER | NO | - | Stock del lote **antes** de aplicar el movimiento (auditoría) |
| `batch_stock_after` | INTEGER | NO | - | Stock del lote **después** de aplicar el movimiento (auditoría) |
| `created_at` | TIMESTAMP WITH TIME ZONE | NO | `NOW()` | Fecha y hora de creación del registro |

### Constraints

```sql
-- Valores positivos
CHECK (quantity > 0)
CHECK (batch_stock_before >= 0)
CHECK (batch_stock_after >= 0)

-- Integridad referencial
FOREIGN KEY (movement_id) REFERENCES inventory_movements(id) ON DELETE CASCADE
FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE
```

### Índices

```sql
-- Búsqueda por movimiento
idx_movement_batch_details_movement_id ON (movement_id)

-- Búsqueda por lote
idx_movement_batch_details_batch_id ON (batch_id)

-- Ordenamiento temporal
idx_movement_batch_details_created_at ON (created_at)

-- Búsqueda combinada
idx_movement_batch_details_movement_batch ON (movement_id, batch_id)
```

---

## 📋 Vista: `movement_details_with_batches`

### Propósito
Vista desnormalizada que combina movimientos de inventario con todos sus detalles de lotes, facilitando consultas y reportes.

### Campos Retornados

| Campo | Origen | Descripción |
|-------|--------|-------------|
| `movement_id` | `inventory_movements.id` | ID del movimiento |
| `product_id` | `inventory_movements.product_id` | ID del producto |
| `product_name` | `products.name` | Nombre del producto |
| `movement_type` | `inventory_movements.movement_type` | Tipo: entrada/salida/ajuste |
| `total_quantity` | `inventory_movements.quantity` | Cantidad total del movimiento |
| `reason` | `inventory_movements.reason` | Motivo del movimiento |
| `notes` | `inventory_movements.notes` | Notas adicionales |
| `movement_date` | `inventory_movements.created_at` | Fecha del movimiento |
| `recorded_by` | `inventory_movements.recorded_by` | Usuario que registró |
| `detail_id` | `movement_batch_details.id` | ID del detalle de lote |
| `batch_id` | `movement_batch_details.batch_id` | ID del lote |
| `batch_number` | `product_batches.batch_number` | Número de lote |
| `batch_quantity` | `movement_batch_details.quantity` | Cantidad de este lote |
| `batch_stock_before` | `movement_batch_details.batch_stock_before` | Stock antes |
| `batch_stock_after` | `movement_batch_details.batch_stock_after` | Stock después |
| `batch_expiration_date` | `product_batches.expiration_date` | Vencimiento del lote |
| `shelf` | `product_batches.shelf` | Estantería |
| `drawer` | `product_batches.drawer` | Cajón |
| `section` | `product_batches.section` | Sección |

### Ejemplo de Uso

```sql
-- Movimientos recientes con sus lotes
SELECT * FROM movement_details_with_batches
WHERE movement_date >= NOW() - INTERVAL '7 days'
ORDER BY movement_date DESC;

-- Movimientos de un producto específico
SELECT * FROM movement_details_with_batches
WHERE product_id = 'UUID_DEL_PRODUCTO'
ORDER BY movement_date DESC;
```

---

## 🔧 Función: `get_movement_batch_breakdown`

### Propósito
Obtiene el desglose detallado de todos los lotes afectados por un movimiento específico.

### Firma
```sql
get_movement_batch_breakdown(p_movement_id UUID)
RETURNS TABLE (
  batch_id UUID,
  batch_number VARCHAR(100),
  quantity INTEGER,
  stock_before INTEGER,
  stock_after INTEGER,
  expiration_date DATE,
  location TEXT
)
```

### Parámetros
- `p_movement_id`: UUID del movimiento a consultar

### Retorna
Tabla con el desglose de lotes, ordenados por orden de uso (created_at).

### Ejemplo de Uso

```sql
-- Ver de qué lotes se tomó un egreso
SELECT * FROM get_movement_batch_breakdown('a1b2c3d4-...');

-- Resultado:
-- batch_id    | batch_number | quantity | stock_before | stock_after | expiration_date | location
-- ------------|--------------|----------|--------------|-------------|-----------------|------------------
-- uuid-1      | LOTE-001     | 3        | 10           | 7           | 2025-06-01      | E1 - C2 - S3
-- uuid-2      | LOTE-002     | 2        | 5            | 3           | 2025-08-15      | E2 - C1 - S1
```

---

## 🔧 Función: `get_batch_movement_history`

### Propósito
Obtiene el historial completo de movimientos que han afectado un lote específico.

### Firma
```sql
get_batch_movement_history(p_batch_id UUID)
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
```

### Parámetros
- `p_batch_id`: UUID del lote a consultar

### Retorna
Tabla con el historial de movimientos, ordenados por fecha descendente (más reciente primero).

### Ejemplo de Uso

```sql
-- Ver todos los movimientos de un lote
SELECT * FROM get_batch_movement_history('batch-uuid-...');

-- Resultado:
-- movement_id | movement_type | movement_date       | quantity | stock_before | stock_after | product_name | recorded_by | reason
-- ------------|---------------|---------------------|----------|--------------|-------------|--------------|-------------|-------------
-- mov-1       | salida        | 2025-02-05 10:30:00 | 3        | 10           | 7           | Ibuprofeno   | Juan        | Venta
-- mov-2       | entrada       | 2025-02-01 09:00:00 | 10       | 0            | 10          | Ibuprofeno   | Sistema     | Compra
```

---

## 🔄 Flujos de Datos

### Flujo 1: Registro de Entrada con Lote

```
1. Usuario registra entrada de producto con lote
   ↓
2. Se crea registro en inventory_movements
   ↓
3. Se crea registro en product_batches
   ↓
4. Se crea registro en movement_batch_details vinculando ambos
   ↓
5. Se actualiza stock en products
```

**Código (simplificado):**
```typescript
// 1. Registrar movimiento
const movement = await supabase.from('inventory_movements').insert({...}).select().single();

// 2. Crear lote
const batch = await supabase.from('product_batches').insert({...}).select().single();

// 3. Vincular movimiento con lote
await supabase.from('movement_batch_details').insert({
  movement_id: movement.id,
  batch_id: batch.id,
  quantity: quantity,
  batch_stock_before: 0,
  batch_stock_after: quantity
});
```

---

### Flujo 2: Registro de Salida con Múltiples Lotes (FEFO)

```
1. Usuario registra salida de 10 unidades
   ↓
2. Sistema obtiene lotes ordenados por vencimiento (FEFO)
   ↓
3. Se toman 6 unidades del LOTE-A (vence primero)
   ↓
4. Se toman 4 unidades del LOTE-B (vence después)
   ↓
5. Se crea UN movimiento en inventory_movements (cantidad: 10)
   ↓
6. Se crean DOS registros en movement_batch_details:
   - Registro 1: movement_id → LOTE-A, quantity: 6
   - Registro 2: movement_id → LOTE-B, quantity: 4
   ↓
7. Se actualiza stock en ambos lotes
   ↓
8. Se actualiza stock total en products
```

---

## 📊 Casos de Uso

### Caso 1: Auditoría de un Egreso
**Pregunta:** "¿De qué lotes se tomaron las 10 unidades de Ibuprofeno que se entregaron ayer?"

**Query:**
```sql
SELECT * FROM movement_details_with_batches
WHERE product_name = 'Ibuprofeno'
  AND movement_type = 'salida'
  AND movement_date::date = '2025-02-04'
ORDER BY batch_expiration_date;
```

---

### Caso 2: Trazabilidad de un Lote
**Pregunta:** "¿Qué movimientos afectaron al lote LOTE-12345?"

**Query:**
```sql
SELECT * FROM get_batch_movement_history(
  (SELECT id FROM product_batches WHERE batch_number = 'LOTE-12345')
);
```

---

### Caso 3: Verificación FEFO
**Pregunta:** "¿Se están usando primero los lotes que vencen más pronto?"

**Query:**
```sql
-- Ver si en cada movimiento se usaron los lotes en orden de vencimiento
SELECT 
  m.id,
  p.name,
  ARRAY_AGG(pb.batch_number ORDER BY mbd.created_at) AS lotes_usados,
  ARRAY_AGG(pb.expiration_date ORDER BY mbd.created_at) AS fechas_vencimiento
FROM inventory_movements m
JOIN products p ON m.product_id = p.id
JOIN movement_batch_details mbd ON m.id = mbd.movement_id
JOIN product_batches pb ON mbd.batch_id = pb.id
WHERE m.movement_type = 'salida'
  AND m.created_at >= NOW() - INTERVAL '7 days'
GROUP BY m.id, p.name
ORDER BY m.created_at DESC;
```

---

## 🔐 Consideraciones de Seguridad

### Row Level Security (RLS)

Si tienes RLS habilitado en Supabase, asegúrate de configurar políticas para `movement_batch_details`:

```sql
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Allow read for authenticated users"
ON movement_batch_details
FOR SELECT
TO authenticated
USING (true);

-- Permitir inserción a usuarios autenticados
CREATE POLICY "Allow insert for authenticated users"
ON movement_batch_details
FOR INSERT
TO authenticated
WITH CHECK (true);
```

---

## 📈 Rendimiento

### Estimaciones de Tamaño

- **Movimientos sin lotes:** 0 registros en `movement_batch_details`
- **Entrada con 1 lote:** 1 registro
- **Salida con FEFO (promedio 2-3 lotes):** 2-3 registros por movimiento

**Ejemplo:** 
- 1000 movimientos/mes
- 70% salidas con promedio de 2.5 lotes
- ~1750 registros/mes en `movement_batch_details`

### Optimizaciones

1. **Índices ya creados** en la migración
2. **Vista materializada** (opcional para reportes pesados):
   ```sql
   CREATE MATERIALIZED VIEW mv_movement_batch_summary AS
   SELECT * FROM movement_details_with_batches;
   
   -- Refrescar periódicamente
   REFRESH MATERIALIZED VIEW mv_movement_batch_summary;
   ```

---

## 🔗 Referencias

- [Migración 006](./migrations/006_create_movement_batch_details.sql)
- [Guía de Migración](./migrations/MIGRATION_006_GUIDE.md)
- [Queries de Ejemplo](./queries/movement_batch_tracking_queries.sql)
