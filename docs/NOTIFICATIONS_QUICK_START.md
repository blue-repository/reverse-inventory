# ⚡ Guía Rápida: Sistema de Notificaciones

## 1️⃣ Instalación

### A. Ejecutar la Migración

Copia y ejecuta en **Supabase Dashboard → SQL Editor**:

```sql
-- Archivo: database/migrations/007_create_expiring_notifications_system.sql
-- [Copia TODO el contenido del archivo]
```

### B. ✅ Listo

El código frontend ya está integrado en el proyecto:
- ✓ Hook en `app/hooks/useNotifications.ts`
- ✓ API Routes automáticas
- ✓ Navbar actualizado con campanita

## 2️⃣ Cómo Funciona

```
Tu App (Navbar)
    ↓
[Campanita de notificaciones]
    ↓
Hook useNotifications (polling cada 5 min)
    ↓
GET /api/notifications
    ↓
Supabase (vw_active_expiring_notifications)
    ↓
Mostra productos/lotes por vencer en <90 días
```

## 3️⃣ Información de Vencimiento

**Umbrales de Severidad:**
- 🔴 **Crítico**: Vence en ≤ 7 días
- 🟡 **Advertencia**: Vence en 8-30 días
- 🔵 **Información**: Vence en 31-90 días

## 4️⃣ Qué Verá el Usuario

### Navbar - Campanita
```
[🔔] ← Sin notificaciones
[🔔9] ← 9 sin leer, badge azul
[🔔2] ← 2 críticas, badge rojo
```

### Dropdown de Notificaciones
Muestra:
- Nombre del producto/lote
- Días exactos hasta vencer
- Fecha de vencimiento
- Cantidad disponible
- Botones: ✓ (marcar leído), ✕ (descartar)

## 5️⃣ Acciones del Usuario

| Acción | Resultado |
|--------|-----------|
| Click ✓ | Marca como "leída" (icon desaparece) |
| Click ✕ | Descarta (se elimina del dropdown) |
| Cerrar dropdown | Notificaciones se mantienen |

## 6️⃣ Configuración

### Cambiar Frecuencia de Polling

En `app/components/Navbar.tsx`:
```typescript
// De 5 minutos a otro valor
const { ... } = useNotifications({
  pollInterval: 10 * 60 * 1000, // ← Cambiar aquí (en ms)
});
```

### Desactivar Polling Automático

```typescript
const { ... } = useNotifications({
  autoRefresh: false, // ← Cambiar aquí
});

// Luego actualizar manualmente:
// refresh() para notificaciones
// triggerExpiringProductsCheck() para escaneo
```

## 7️⃣ Testing Manual

### Crear una Notificación de Prueba

1. Ve a SQL Editor en Supabase
2. Ejecuta:
```sql
-- Crear producto de prueba que vence pronto
INSERT INTO products (
  name, stock, stock_inicial, expiration_date, created_at, updated_at
) VALUES (
  'Aspirina Test', 10, 10, 
  CURRENT_DATE + INTERVAL '15 days',
  NOW(), NOW()
) RETURNING id;

-- Copiar el UUID del producto retornado y ejecutar:
SELECT fn_create_or_update_expiring_notifications();

-- Verificar que se creó la notificación:
SELECT * FROM vw_active_expiring_notifications;
```

3. Abre tu app en el navegador
4. ¡Deberías ver la notificación en la campanita! 🔔

## 8️⃣ Limpieza

Las notificaciones descartadas se limpian automáticamente después de 30 días. No necesitas hacer nada.

Si deseas limpiar manualmente:
```sql
DELETE FROM expiring_product_notifications 
WHERE notification_status = 'dismissed' 
AND dismissed_at < NOW() - INTERVAL '30 days';
```

## 🚀 Próximos Pasos Opcionales

1. **Cron Jobs (Vercel)**: Ver `NOTIFICATION_SYSTEM.md` sección "Configuración Avanzada"
2. **Email Notifications**: Agregar integración con servicio de email
3. **Dashboard de Reportes**: Crear página que muestre tendencias de vencimientos

## ❓ Preguntas Frecuentes

**P: ¿Por qué no veo notificaciones?**
A: 
1. Verificar que hay productos con fecha de vencimiento < 90 días
2. Ejecutar `SELECT fn_create_or_update_expiring_notifications();` en Supabase
3. Actualizar la página (F5)

**P: ¿Cada cuánto se actualizan las notificaciones?**
A: Cada 5 minutos automáticamente. Puedes cambiar esto en el código.

**P: ¿Se pueden agregar notificaciones por email?**
A: Sí, hay ejemplos en `NOTIFICATION_SYSTEM.md` - próximas mejoras sugeridas.

**P: ¿Qué pasa con products sin fecha de vencimiento?**
A: Se ignoran (no generan notificaciones).
