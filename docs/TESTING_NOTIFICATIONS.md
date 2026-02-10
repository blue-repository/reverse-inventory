# 🧪 Cómo Probar el Sistema de Notificaciones

## 📋 Requisitos Previos

✅ Migración 007 ejecutada en Supabase
✅ Código actualizado en tu proyecto
✅ Servidor Next.js corriendo localmente

---

## 🚀 Paso 1: Iniciar el Servidor

```bash
npm run dev
```

La aplicación debe estar disponible en `http://localhost:3000`

---

## 🔧 Paso 2: Crear Datos de Prueba (Batch por Vencer)

Para probar las notificaciones, necesitas crear un lote de producto que esté próximo a vencer.

### Desde Supabase SQL Editor:

```sql
-- 1. Obtener un producto existente
SELECT id, name FROM products LIMIT 1;
-- Copia el ID del producto (ej: 'abc-123-def')

-- 2. Crear un batch que vence en 3 días
INSERT INTO product_batches (
  id,
  product_id,
  batch_number,
  quantity,
  unit_of_measure,
  expiration_date,
  location,
  created_at
) VALUES (
  gen_random_uuid(),
  'AQUI_VA_EL_ID_DEL_PRODUCTO',  -- ← Reemplaza con ID del paso 1
  'TEST-BATCH-001',
  100,
  'cápsulas',
  NOW() + interval '3 days',  -- Vence en 3 días (severity: CRITICAL)
  'Estante A1',
  NOW()
);
```

### O si quieres crear productos de prueba primero:

```sql
-- Crear medicamento de prueba
INSERT INTO products (
  id,
  name,
  description,
  generic_name,
  pharmaceutical_form,
  strength,
  category,
  minimum_stock_quantity,
  created_at
) VALUES (
  gen_random_uuid(),
  'Paracetamol TEST',
  'Medicamento de prueba',
  'Paracetamol',
  'cápsula',
  '500mg',
  'Analgésico',
  50,
  NOW()
) RETURNING id;
-- Copia el ID retornado

-- Luego crear el batch con el ID
INSERT INTO product_batches (
  id,
  product_id,
  batch_number,
  quantity,
  unit_of_measure,
  expiration_date,
  location,
  created_at
) VALUES (
  gen_random_uuid(),
  'AQUI_VA_EL_ID',  -- ← Del INSERT anterior
  'LOTE-TEST-0001',
  100,
  'cápsulas',
  NOW() + interval '3 days',
  'Prueba',
  NOW()
);
```

---

## 🔔 Paso 3: Hacer Clic en el Botón "Actualizar" en la Campanita

1. **Abre la aplicación** en `http://localhost:3000`
2. **Mira la esquina superior derecha** - verás una campanita (🔔)
3. **Haz clic en la campanita** para abrir el dropdown
4. **Haz clic en el botón "Actualizar"** (con icono de sincronización)
5. **Espera 2-3 segundos** mientras se procesa

### Resultado esperado:

✅ El botón mostrará "Actualizando..." con un spinner
✅ Después ejecutarse, mostrará "Actualizar" de nuevo
✅ El dropdown mostrará las notificaciones encontradas
✅ El badge de la campanita mostrará el conteo (ej: "1", "2", etc.)
✅ Si hay notificaciones críticas, el badge será **ROJO**
✅ Si son warnings/info, el badge será **AZUL**

---

## 📊 Paso 4: Ver el Resultado en la Base de Datos

```sql
-- Ver las notificaciones creadas
SELECT 
  notification_type,
  title,
  description,
  severity,
  notification_status,
  metadata,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

Deberías ver algo como:

```
notification_type    | expiring_product
title                | Paracetamol TEST (Lote LOTE-TEST-001)
description          | Vence en 3 días
severity             | critical
notification_status  | pending
metadata             | {"batch_number": "LOTE-TEST-001", "days_until_expiration": 3, ...}
```

---

## 🔄 Paso 5: Probar la Ejecución Automática (Cron)

### Local (Simulación):

Para simular que Vercel ejecute los crons, puedes hacer una solicitud HTTP directa:

```bash
# Terminal - Ejecutar GET para ver estadísticas
curl http://localhost:3000/api/cron/check-expiring-products

# O POST para disparar manualmente
curl -X POST http://localhost:3000/api/cron/check-expiring-products
```

### En Producción (Vercel):

Una vez desplegues a Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Abre **Settings → Crons**
3. Deberías ver 2 entradas:
   - `1. /api/cron/check-expiring-products` - 8:00 AM UTC
   - `2. /api/cron/check-expiring-products` - 3:00 PM UTC (15:00 UTC)

---

## 🧪 Paso 6: Casos de Prueba Adicionales

### Caso 1: Notificación CRÍTICA (≤7 días)
```sql
INSERT INTO product_batches (
  id, product_id, batch_number, quantity, unit_of_measure,
  expiration_date, location, created_at
) VALUES (
  gen_random_uuid(),
  'TU_PRODUCT_ID',
  'CRITICAL-BATCH',
  50,
  'unidades',
  NOW() + interval '2 days',  -- 2 días = CRÍTICA
  'Zona',
  NOW()
);
```
**Resultado**: Badge ROJO con número

---

### Caso 2: Notificación WARNING (8-30 días)
```sql
INSERT INTO product_batches (
  id, product_id, batch_number, quantity, unit_of_measure,
  expiration_date, location, created_at
) VALUES (
  gen_random_uuid(),
  'TU_PRODUCT_ID',
  'WARNING-BATCH',
  75,
  'unidades',
  NOW() + interval '15 days',  -- 15 días = WARNING
  'Zona',
  NOW()
);
```
**Resultado**: Badge AZUL con número

---

### Caso 3: Notificación INFO (31-90 días)
```sql
INSERT INTO product_batches (
  id, product_id, batch_number, quantity, unit_of_measure,
  expiration_date, location, created_at
) VALUES (
  gen_random_uuid(),
  'TU_PRODUCT_ID',
  'INFO-BATCH',
  200,
  'unidades',
  NOW() + interval '60 days',  -- 60 días = INFO
  'Zona',
  NOW()
);
```
**Resultado**: Badge AZUL con número

---

## 🐛 Solución de Problemas

### ❌ El botón de actualizar no hace nada

**Problema**: El endpoint no está respondiendo
**Solución**:
```bash
# En terminal, verifica que el servidor está corriendo
npm run dev

# Abre las DevTools del navegador (F12)
# Ve a Console y busca errores

# O prueba directamente:
curl -X POST http://localhost:3000/api/cron/check-expiring-products
```

---

### ❌ El badge no muestra notificaciones

**Problema**: La función SQL no está creando notificaciones
**Solución**:
```sql
-- Verifica que la tabla notifications existe
SELECT COUNT(*) FROM notifications;

-- Verifica que existen batches por vencer
SELECT id, batch_number, expiration_date 
FROM product_batches 
WHERE expiration_date > NOW() AND expiration_date <= NOW() + interval '90 days';

-- Ejecuta manualmente la función
SELECT fn_create_or_update_expiring_notifications(90);
```

---

### ❌ Error: "Failed to create expiring notifications"

**Problema**: La función SQL no existe o tiene errores
**Solución**:
1. Verifica que la migración 007 se ejecutó correctamente:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'fn_%notification%';
```

2. Si no ves las funciones, ejecuta nuevamente todo el SQL de la migración 007

---

## 📈 Monitoreo

### Ver el log de ejecuciones (local):

Verás en la consola del servidor:

```
Expiring products check completed: {
  success: true,
  timestamp: "2026-02-09T10:30:00.000Z",
  duration_ms: 245,
  results: {
    expiring_notifications: 3,
    cleaned_notifications: 0,
    current_pending_count: 3,
    critical_count: 1,
    warning_count: 2
  }
}
```

---

## 🎯 Resumen de Flujo

```
┌──────────────────────────────────┐
│  Usuario hace clic en "Actualizar" │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Solicitud POST a                 │
│  /api/cron/check-expiring-products│
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Servidor ejecuta:                │
│  - fn_create_or_update_expiring_notifications │
│  - fn_cleanup_old_notifications   │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Hook refrescarNotificaciones()   │
│  GET /api/notifications           │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│  Actualiza el dropdown            │
│  - Muestra el conteo              │
│  - Colorea el badge               │
│  - Recibe confirmación            │
└──────────────────────────────────┘
```

---

## ✅ Checklist de Prueba

- [ ] Creaste datos de prueba (batch por vencer)
- [ ] Abriste el dropdown de notificaciones
- [ ] Hiciste clic en "Actualizar"
- [ ] El botón mostró "Actualizando..."
- [ ] Después de 2-3 segundos, el badge mostró un número
- [ ] El color del badge es correcto (rojo=crítica, azul=otro)
- [ ] Verificaste en la BD que las notificaciones se crearon
- [ ] Viste el log en la consola del servidor

Si completaste todos los pasos, **¡tu sistema de notificaciones funciona perfectamente!** 🎉

---

## 📝 Próximos Pasos

1. **Desplegar en Vercel** para que los crons automáticos funcionen
2. **Agregar más tipos de notificaciones** (stock bajo, movimientos, etc.)
3. **Enviar notificaciones por email** (opcional)
4. **Dashboard de estadísticas** de notificaciones (opcional)

¡Cualquier duda, consulta la documentación en `docs/ARCHITECTURE_GENERIC_NOTIFICATIONS.md`!
