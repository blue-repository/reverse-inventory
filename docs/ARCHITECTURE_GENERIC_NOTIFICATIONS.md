# 📐 Arquitectura Mejorada: Sistema de Notificaciones Genérico

## Cambio de Diseño

**Antes**: Una tabla específica `expiring_product_notifications` (solo para vencimientos)
**Ahora**: Una tabla genérica `notifications` que soporta CUALQUIER tipo de evento

---

## 📊 Nueva Estructura

```
┌─────────────────────────────────────────────────────────────┐
│               TABLA GENÉRICA: notifications                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  notification_type  │  title           │  entity_type       │
│  ───────────────────┼──────────────────┼───────────────────│
│  expiring_product   │  "Amoxicilina..." │  product          │
│  new_product_entry  │  "Nuevo ingreso..." │  product        │
│  inventory_movement │  "Salida de..." │  product            │
│  low_stock          │  "Stock bajo..." │  product            │
│  location_change    │  "Reubicación..." │  product          │
│  custom             │  (cualquiera)  │  (personalizado)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Columnas Principales

```sql
-- Tipo y descripción
notification_type    TEXT     -- 'expiring_product', 'new_entry', 'movement', etc.
title               TEXT     -- Título mostrable: "Amoxicilina por vencer"
description         TEXT     -- Descripción: "...vence en 15 días"

-- Relación flexible
entity_type         TEXT     -- 'product', 'batch', 'movement', 'user', etc.
entity_id          UUID     -- UUID del producto/lote/movimiento/usuario referido

-- Datos específicos del tipo
metadata           JSONB    -- JSON con datos específicos de cada tipo
                           -- Ej para vencimiento: {days: 15, batch_id: "...", quantity: 50}
                           -- Ej para movimiento: {type: 'salida', quantity: 5}

-- Estados
notification_status TEXT     -- 'pending', 'read', 'dismissed', 'archived'
severity           TEXT     -- 'critical', 'warning', 'info'
notified_user_id   TEXT     -- NULL = todos, o usuario específico

-- Auditoría
created_at         TIMESTAMP
read_at            TIMESTAMP
dismissed_at       TIMESTAMP
archived_at        TIMESTAMP
```

---

## 🔄 Flujos de Uso

### 1️⃣ Notificación de Producto por Vencer

```javascript
// Automático cada 5 minutos
SELECT fn_create_or_update_expiring_notifications();

// Resultado en BD:
{
  "notification_type": "expiring_product",
  "title": "Amoxicilina 500mg (Lote LOTE-001)",
  "severity": "critical",  // ≤7 días
  "metadata": {
    "product_name": "Amoxicilina 500mg",
    "batch_number": "LOTE-001",
    "days_until_expiration": 5,
    "expiration_date": "2026-02-14",
    "quantity": 100
  }
}
```

### 2️⃣ Notificación de Nuevo Ingreso

```javascript
// Cuando se registra una entrada de inventario
SELECT fn_create_notification_new_entry(product_id, batch_id, quantity);

// Resultado en BD:
{
  "notification_type": "new_product_entry",
  "title": "Nuevo ingreso: Ibuprofeno 200mg",
  "severity": "info",
  "metadata": {
    "product_name": "Ibuprofeno 200mg",
    "quantity": 500,
    "event_type": "new_entry"
  }
}
```

### 3️⃣ Notificación de Movimiento

```javascript
// Cuando hay salida/entrada/ajuste de inventario
SELECT fn_create_notification_movement(product_id, 'salida', quantity);

// Resultado en BD:
{
  "notification_type": "inventory_movement",
  "title": "Salida de inventario: Paracetamol 1000mg",
  "severity": "info",
  "metadata": {
    "product_name": "Paracetamol 1000mg",
    "movement_type": "salida",
    "quantity": 50,
    "event_type": "movement"
  }
}
```

---

## 🧩 Cómo Agregar Nuevos Tipos de Notificaciones

### Paso 1: Definir el Tipo

Agrega a la constraint de `notification_type`:

```sql
ALTER TABLE notifications 
DROP CONSTRAINT notification_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notification_type_check CHECK (
  notification_type IN (
    'expiring_product',
    'new_product_entry',
    'inventory_movement',
    'low_stock',
    'location_change',
    'custom',
    'TU_NUEVO_TIPO'  -- ← Agregar aquí
  )
);
```

### Paso 2: Crear Función de Creación (Opcional)

```sql
-- Función para tu nuevo tipo de notificación
CREATE OR REPLACE FUNCTION fn_create_notification_tu_tipo(
  p_entity_id UUID,
  p_datos JSONB
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
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
    'TU_NUEVO_TIPO',
    p_datos->>'title',
    p_datos->>'description',
    'product',  -- o el tipo que uses
    p_entity_id,
    COALESCE(p_datos->>'severity', 'info'),
    'pending',
    p_datos
  )
  RETURNING notifications.id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;
```

### Paso 3: Llamar desde tu Código

```typescript
// app/api/tu-evento/route.ts
import { supabase } from "@/app/lib/conections/supabase";

export async function POST(req: NextRequest) {
  const { productId, datos } = await req.json();

  // Crear notificación
  const { data, error } = await supabase.rpc(
    "fn_create_notification_tu_tipo",
    {
      p_entity_id: productId,
      p_datos: {
        title: "Tu título",
        description: "Tu descripción",
        severity: "warning",
        custom_field: "valor"
      }
    }
  );

  return NextResponse.json({ success: true, id: data });
}
```

---

## 📋 Ejemplos de Tipos Posibles

```
Actualmente soportados:
├─ expiring_product    ✅ Implementado
├─ new_product_entry   ✅ Función lista
├─ inventory_movement  ✅ Función lista
├─ low_stock           🔜 Fácil de agregar
├─ location_change     🔜 Fácil de agregar
└─ custom              🔜 Para casos especiales

Otros ejemplos que podrías agregar:
├─ recipe_ingredient_missing     (Ingrediente faltante en receta)
├─ stock_alert_critical          (Stock crítico)
├─ temperature_anomaly           (Anomalía de temperatura)
├─ batch_quality_issue           (Problema de calidad)
├─ audit_required                (Auditoría requerida)
├─ staff_task_assigned           (Tarea asignada a staff)
├─ user_login_alert              (Alerta de login sospechoso)
├─ data_export_ready             (Exportación lista)
└─ system_maintenance            (Mantenimiento del sistema)
```

---

## 🎯 Estructura de metadata por Tipo

### expiring_product
```json
{
  "product_id": "uuid",
  "batch_id": "uuid or null",
  "product_name": "string",
  "batch_number": "string or null",
  "barcode": "string",
  "expiration_date": "YYYY-MM-DD",
  "days_until_expiration": number,
  "type": "producto|lote",
  "quantity": number,
  "unit_of_measure": "mg|ml|unidades|..."
}
```

### new_product_entry
```json
{
  "product_name": "string",
  "batch_id": "uuid or null",
  "quantity": number,
  "event_type": "new_entry",
  "timestamp": "YYYY-MM-DD HH:mm:ss"
}
```

### inventory_movement
```json
{
  "product_name": "string",
  "movement_type": "entrada|salida|ajuste",
  "quantity": number,
  "reason": "string or null",
  "event_type": "movement",
  "timestamp": "YYYY-MM-DD HH:mm:ss"
}
```

### low_stock (Ejemplo)
```json
{
  "product_name": "string",
  "current_stock": number,
  "minimum_threshold": number,
  "alert_level": "warning|critical",
  "unit_of_measure": "string"
}
```

---

## 🔍 Vistas Disponibles

### vw_active_notifications (GENÉRICA)
```sql
-- Obtiene TODAS las notificaciones activas de cualquier tipo
SELECT * FROM vw_active_notifications 
WHERE notification_status IN ('pending', 'read');
```

Retorna todas las notificaciones con datos procesados.

### vw_active_expiring_notifications (ESPECÍFICA)
```sql
-- Solo notificaciones de vencimiento (para compatibilidad)
SELECT * FROM vw_active_expiring_notifications;
```

Compatible con código anterior que espera campos específicos.

---

## 📊 Consultas Útiles

### Ver todas las notificaciones activas
```sql
SELECT 
  notification_type,
  COUNT(*) as cantidad,
  severity
FROM notifications
WHERE notification_status IN ('pending', 'read')
GROUP BY notification_type, severity;
```

### Ver por tipo de notificación
```sql
SELECT * FROM notifications 
WHERE notification_type = 'expiring_product'
  AND notification_status = 'pending'
ORDER BY severity DESC, created_at DESC;
```

### Estadísticas generales
```sql
SELECT 
  notification_type,
  'pending' as status,
  COUNT(*) as count
FROM notifications 
WHERE notification_status = 'pending'
GROUP BY notification_type

UNION ALL

SELECT 
  notification_type,
  'read' as status,
  COUNT(*) 
FROM notifications 
WHERE notification_status = 'read'
GROUP BY notification_type;
```

### Notificaciones de hoy
```sql
SELECT 
  notification_type,
  title,
  severity,
  notification_status
FROM notifications
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 🚀 Ventajas de la Nueva Arquitectura

```
✅ UNA sola tabla para TODO tipo de notificación
✅ Adicionar nuevos tipos sin modificar estructura
✅ JSON flexible para datos específicos
✅ Estados bien definidos: pending, read, dismissed, archived
✅ Severidad configurable por tipo
✅ Mejor indexación y performance
✅ Auditoría completa (cuándo se leyó, descartó, archivó)
✅ Compatible con vistas específicas si lo necesitas
✅ Extensible a múltiples usuarios/roles
```

---

## 🔄 Migración del Código Frontend

**Buena noticia**: No necesitas cambiar nada en el frontend. Las vistas y funciones mantienen compatibilidad.

Pero si quieres mostrar otros tipos de notificaciones:

```typescript
// En app/hooks/useNotifications.ts
const fetchNotifications = async () => {
  // Obtener notificaciones filtradas por tipo
  const response = await fetch(
    "/api/notifications?limit=50&type=expiring_product,inventory_movement",
    { method: "GET" }
  );
  
  const data = await response.json();
  // Ahora tendrías múltiples tipos
};
```

---

## ⚠️ Consideraciones Importantes

```
1. METADATA SCHEMA
   ├─ Define un esquema por tipo de notificación
   └─ Documenta qué campos va cada metadata

2. CLEANUP
   ├─ La función limpia automáticamente archivos>30d
   ├─ Considera que tienes 90 días de historial
   └─ Puedes querear por rango de fechas

3. PERFORMANCE
   ├─ Los índices están optimizados
   ├─ JSONB permite búsquedas indexadas
   └─ La vista vw_active_notifications es rápida

4. SEGURIDAD
   ├─ Valida notification_type en API
   ├─ Usa preparadas statements (supabase lo hace)
   └─ Sanitiza metadata en el frontend
```

---

## 📝 Ejemplo Completo: Agregar "Low Stock"

### 1. Crear función
```sql
CREATE OR REPLACE FUNCTION fn_create_notification_low_stock(
  p_product_id UUID,
  p_current_stock INTEGER,
  p_minimum_threshold INTEGER
)
RETURNS UUID AS $$
BEGIN
  INSERT INTO notifications (
    notification_type, title, description, entity_type, entity_id,
    severity, notification_status, metadata
  )
  VALUES (
    'low_stock',
    CONCAT('Stock bajo: ', (SELECT name FROM products WHERE id = p_product_id)),
    CONCAT('Stock actual: ', p_current_stock, ', Mínimo: ', p_minimum_threshold),
    'product', p_product_id,
    CASE WHEN p_current_stock <= p_minimum_threshold/2 THEN 'critical' ELSE 'warning' END,
    'pending',
    jsonb_build_object(
      'product_name', (SELECT name FROM products WHERE id = p_product_id),
      'current_stock', p_current_stock,
      'minimum_threshold', p_minimum_threshold,
      'percentage', ROUND(100.0 * p_current_stock / p_minimum_threshold, 2)
    )
  )
  RETURNING id;
END;
$$ LANGUAGE plpgsql;
```

### 2. Llamar desde trigger (automático)
```sql
CREATE TRIGGER trg_check_low_stock
AFTER UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION fn_check_and_notify_low_stock();
```

### 3. Mostrar en UI
```typescript
// Si tienes otros tipos, actualiza el componente:
{notifications.map(n => {
  if (n.notification_type === 'expiring_product') {
    return <ExpiringProductNotification {...n} />;
  }
  if (n.notification_type === 'low_stock') {
    return <LowStockNotification {...n} />;
  }
  return <GenericNotification {...n} />;
})}
```

---

## 🎓 Resumen

| Aspecto | Antes | Ahora |
|--------|-------|-------|
| **Tabla** | `expiring_product_notifications` | `notifications` (genérica) |
| **Tipos soportados** | 1 (vencimientos) | ∞ (escalable) |
| **Agregar tipo nuevo** | Crear tabla nueva | Solo agregar constraint |
| **Estructura** | Columnas fijas | Columnas genéricas + JSON |
| **Datos específicos** | Columnas específicas | Flexible en `metadata` |
| **Mantenimiento** | Más complejo | Más simple |

---

**Ahora tu sistema es profesional, escalable y preparado para crecer.** 🚀
