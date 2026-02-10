# 🔄 Guía de Migración: Estructura Genérica de Notificaciones

## ¿Qué Cambió?

**Antes**: Tabla específica `expiring_product_notifications`
**Ahora**: Tabla genérica `notifications` que soporta cualquier tipo de evento

---

## ✅ Opciones Según Tu Situación

### Caso 1: Aún No Has Ejecutado la Migración (RECOMENDADO)

✅ **Mejor opción**: Ejecuta directamente la versión nueva (007_create_expiring_notifications_system.sql)
- Salta todo lo siguiente
- La migración ya está actualizada con estructura genérica
- Listo en un paso

---

### Caso 2: Ya Ejecutaste la Migración Anterior

Si ya ejecutaste y tienes data, sigue estos pasos para migrar:

#### Opción A: Migración Limpia (Recomendado si NO tienes data crítica)

```sql
-- 1. Hacer backup (siempre)
-- Supabase → Backups → Create manual backup

-- 2. Eliminar tabla vieja
DROP TABLE IF EXISTS expiring_product_notifications CASCADE;

-- 3. Ejecutar nueva migración
-- [Copia TODO el contenido de 007_create_expiring_notifications_system.sql]
-- [Pega en SQL Editor]
-- [Click en RUN]

-- 4. Verificar
SELECT * FROM notifications LIMIT 1;  -- Debería estar vacío pero listo
```

#### Opción B: Migración con Preservación de Data

Si tienes notificaciones importantes que no quieres perder:

```sql
-- 1. Hacer backup
-- Supabase → Backups → Create manual backup

-- 2. Crear tabla nueva (no eliminar vieja)
-- [Ejecutar 007_create_expiring_notifications_system.sql]

-- 3. Copiar datos existentes
INSERT INTO notifications (
  notification_type,
  title,
  description,
  entity_type,
  entity_id,
  severity,
  notification_status,
  metadata,
  created_at,
  read_at,
  dismissed_at,
  notified_user_id
)
SELECT 
  'expiring_product' as notification_type,
  COALESCE(
    CASE 
      WHEN batch_id IS NOT NULL THEN 
        CONCAT(
          (SELECT p.name FROM products p WHERE p.id = product_id), 
          ' (Lote ',
          (SELECT batch_number FROM product_batches WHERE id = batch_id),
          ')'
        )
      ELSE 
        (SELECT p.name FROM products p WHERE p.id = product_id)
    END,
    'Producto sin nombre'
  ) as title,
  notification_message as description,
  'product' as entity_type,
  product_id as entity_id,
  'info' as severity,  -- Recalcular para compatibilidad
  notification_status,
  jsonb_build_object(
    'product_id', product_id,
    'batch_id', batch_id,
    'expiration_date', expiration_date::TEXT
  ) as metadata,
  created_at,
  read_at,
  dismissed_at,
  notified_user_id
FROM expiring_product_notifications;

-- 4. Verificar migración
SELECT COUNT(*) FROM notifications WHERE notification_type = 'expiring_product';

-- 5. Si todo está bien, eliminar tabla vieja
DROP TABLE expiring_product_notifications;
```

---

## 🧪 Validaciones Post-Migración

Ejecuta estas queries para validar que todo está correcto:

```sql
-- ✅ Tabla genérica existe
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'notifications' AND table_schema = 'public';

-- ✅ Vistas existen
SELECT viewname FROM pg_views 
WHERE viewname IN ('vw_expiring_products', 'vw_active_notifications', 'vw_active_expiring_notifications')
AND schemaname = 'public';

-- ✅ Funciones existen
SELECT proname FROM pg_proc 
WHERE proname IN ('fn_create_or_update_expiring_notifications', 'fn_cleanup_old_notifications')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ✅ Índices existen
SELECT indexname FROM pg_indexes 
WHERE tablename = 'notifications' 
AND schemaname = 'public';

-- ✅ Datos migraron correctamente
SELECT notification_type, COUNT(*) FROM notifications GROUP BY notification_type;
```

---

## 🔄 Cambios en el Código Frontend

**Buena noticia**: Si usaste el código frontend anterior, **casi no hay cambios**.

Las vistas y funciones mantienen compatibilidad, pero aquí están las versiones mejoradas (opcional):

### Actualizar useNotifications Hook

```typescript
// app/hooks/useNotifications.ts
// [El hook funcionará igual, pero ahora obtiene diferentes tipos]

interface UseNotificationsOptions {
  pollInterval?: number;
  autoRefresh?: boolean;
  notificationTypes?: string[];  // NUEVO: filtrar por tipo
  onNewNotification?: (notification: ExpiringProductNotification) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { 
    notificationTypes = ['expiring_product'],  // NUEVO: default solo vencimientos
    ...otherOptions 
  } = options;
  
  // Llamada actualizada
  const fetchNotifications = async () => {
    const typeFilter = notificationTypes.length > 0 
      ? `&types=${notificationTypes.join(',')}`
      : '';
      
    const response = await fetch(
      `/api/notifications?limit=50&status=all${typeFilter}`,
      { method: "GET" }
    );
    // ... resto igual
  };
}
```

### Actualizar API Route

```typescript
// app/api/notifications/route.ts
// Agregar soporte para filtrar por tipo

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || "all";
  const types = searchParams.get("types")?.split(',') || [];  // NUEVO

  let query = supabase
    .from("vw_active_notifications")  // Usar vista genérica
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("notification_status", status);
  }
  
  // NUEVO: Filtrar por tipos
  if (types.length > 0) {
    query = query.in("notification_type", types);
  }

  const { data, error } = await query;
  // ... resto igual
}
```

---

## 📊 Estructura de Datos de Prueba

Después de migrar, prueba creando diferentes tipos:

```sql
-- Notificación de vencimiento (la que ya existía)
SELECT fn_create_or_update_expiring_notifications();

-- Notificación de nuevo ingreso (nueva función)
SELECT fn_create_notification_new_entry(
  (SELECT id FROM products LIMIT 1),
  NULL,
  100
);

-- Notificación de movimiento (nueva función)
SELECT fn_create_notification_movement(
  (SELECT id FROM products LIMIT 1),
  'salida',
  50
);

-- Verificar que se crearon
SELECT notification_type, COUNT(*) 
FROM notifications 
GROUP BY notification_type;
```

---

## 🔍 Diferencias Clave

| Aspecto | Vieja Estructura | Nueva Estructura |
|--------|-----------------|------------------|
| **Tabla principal** | `expiring_product_notifications` | `notifications` |
| **Columnas necesarias** | 11 específicas | 14 genéricas |
| **Soporta múltiples tipos** | ❌ No | ✅ Sí |
| **Datos específicos** | Columnas fijas | JSON en `metadata` |
| **Escalabilidad** | Baja (tabla por tipo) | Alta (una tabla) |
| **Views de compatibilidad** | N/A | `vw_active_expiring_notifications` |

---

## ⚠️ Rollback (Si Algo Falla)

Si necesitas volver atrás:

```sql
-- 1. Supabase → Backups → Restaurar backup reciente
-- Esto revierte TODO a una versión anterior

-- O manualmente:

-- 2. Eliminar tabla nueva
DROP TABLE IF EXISTS notifications CASCADE;
DROP VIEW IF EXISTS vw_active_notifications;

-- 3. Restaurar tabla vieja (si la guardaste)
-- [Ejecutar el SQL de la versión anterior]
```

---

## 🎯 Próximos Pasos

Una vez migrado correctamente:

1. ✅ **Ejecuta escaneo de vencimientos**
   ```sql
   SELECT fn_create_or_update_expiring_notifications();
   ```

2. ✅ **Verifica en la app**
   ```
   Abre http://localhost:3000
   Mira la campanita en Navbar
   Deberías ver notificaciones
   ```

3. ✅ **Aprende a agregar nuevos tipos**
   Ver: [ARCHITECTURE_GENERIC_NOTIFICATIONS.md](ARCHITECTURE_GENERIC_NOTIFICATIONS.md)

4. ✅ **Implementa tus propios tipos**
   ```
   low_stock, location_change, custom, etc.
   ```

---

## 📞 Troubleshooting de Migración

### "Constraint violation" al insertar datos antiguos

```sql
-- Solución: Verificar duplicados antes de insertar
SELECT product_id, batch_id, COUNT(*) 
FROM expiring_product_notifications 
GROUP BY product_id, batch_id 
HAVING COUNT(*) > 1;

-- Eliminar duplicados
DELETE FROM expiring_product_notifications 
WHERE id NOT IN (
  SELECT MIN(id) FROM expiring_product_notifications 
  GROUP BY product_id, batch_id
);
```

### "Table does not exist" después de ejecutar migración

```sql
-- Solución: Verificar que ejecutaste TODO el SQL
SELECT * FROM information_schema.tables 
WHERE table_name = 'notifications';

-- Si está vacío, vuelve a ejecutar 007_create_expiring_notifications_system.sql
```

### Las notificaciones no aparecen en la app

```sql
-- Verificar que hay notificaciones creadas
SELECT * FROM vw_active_notifications LIMIT 5;

-- Verificar que el tipo es correcto
SELECT DISTINCT notification_type FROM notifications;

-- Verificar status
SELECT notification_status, COUNT(*) FROM notifications GROUP BY notification_status;
```

---

## ✨ Lo Que Ahora Puedes Hacer

Con la nueva estructura genérica:

```
✅ Notificaciones de vencimiento (ya existe)
✅ Notificaciones de ingreso de productos (función lista)
✅ Notificaciones de movimientos (función lista)
🔜 Fácil agregar: bajo stock, cambio de ubicación, alertas de auditoria, etc.
🔜 Extensible a roles: solo notificaciones para gerentes, farmacéuticos, etc.
🔜 Escalable: preparada para crecer con tu app
```

---

**Después de esta migración, tu sistema es profesional y listo para escalar.** 🚀
