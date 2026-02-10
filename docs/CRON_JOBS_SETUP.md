# ⏰ Sistema de Crons Automáticos

## 🎯 Objetivo

Ejecutar automáticamente la verificación de productos por vencer **2 veces al día**:
- **8:00 AM** - Verificación matutina
- **3:00 PM (15:00)** - Verificación vespertina

Sin que el usuario tenga que hacer nada manualmente.

---

## 📁 Archivos Involucrados

### 1. `vercel.json` (Configuración de Crons)
```json
{
  "crons": [
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 15 * * *"
    }
  ]
}
```

**Explicación de la sintaxis `cron`:**
- `0` = Minuto 0 (en punto)
- `8` o `15` = Hora (8 AM o 3 PM en UTC)
- `*` = Cualquier día del mes
- `*` = Cualquier mes
- `*` = Cualquier día de la semana

### 2. `/api/cron/check-expiring-products` (Endpoint)
- Usado por Vercel para ejecutar automáticamente
- También puede ser ejecutado manualmente desde el frontend

---

## 🌍 Zonas Horarias

### ⚠️ Importante: Los crons de Vercel usan UTC

| Zona | Hora UTC 8 AM | Hora UTC 3 PM |
|------|---------------|---------------|
| UTC | 8:00 AM | 3:00 PM |
| **GMT-5 (EST)** | **3:00 AM** | **10:00 AM** |
| **GMT-6 (CST)** | **2:00 AM** | **9:00 AM** |
| **GMT-3 (Argentina)** | **5:00 AM** | **12:00 PM** |
| **GMT+2 (España)** | **10:00 AM** | **5:00 PM** |

**Ajusta los horarios según tu zona horaria:**

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 13 * * *"  // Para EST: 8 AM = UTC 13 = 1 PM
    },
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 20 * * *"  // Para EST: 3 PM = UTC 20 = 8 PM
    }
  ]
}
```

---

## ✅ Verificar que los Crons están Configurados

### Opción 1: Dashboard de Vercel

1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Click en **Settings**
3. Busca **Crons** (o **Functions**)
4. Deberías ver algo como:

```
Scheduled Functions
├─ /api/cron/check-expiring-products
│  └─ Every day at 08:00 UTC
├─ /api/cron/check-expiring-products
│  └─ Every day at 15:00 UTC
```

### Opción 2: Verificar `vercel.json`

```bash
cat vercel.json
```

Debería mostrar la configuración con los 2 crons.

---

## 🔧 Cómo Funcionan Localmente

### Durante Desarrollo (npm run dev)

Los crons **NO se ejecutan automáticamente** localmente, pero puedes probarlos manualmente:

```bash
# Opción 1: Simular ejecución de cron (GET)
curl http://localhost:3000/api/cron/check-expiring-products

# Opción 2: Disparar manualmente (POST)
curl -X POST http://localhost:3000/api/cron/check-expiring-products

# Opción 3: Desde el navegador (botón en navbar)
# Haz clic en la campanita → "Actualizar"
```

---

## 🚀 Cómo Funcionan en Producción (Vercel)

### Automático

1. Vercel lee `vercel.json`
2. A las 8 AM UTC, ejecuta `/api/cron/check-expiring-products`
3. A las 3 PM UTC, ejecuta `/api/cron/check-expiring-products`
4. Cada ejecución:
   - Crea notificaciones de productos por vencer
   - Limpia notificaciones antiguas
   - Registra resultados

### Ver logs de ejecución automática

1. Ve a tu proyecto en Vercel
2. **Click en "Deployments"**
3. **Click en tu deployment activo**
4. **Click en "Functions"**
5. Busca `/api/cron/check-expiring-products`
6. Verás el log con timestamp de ejecuciones

---

## 📊 Resultado de Cada Ejecución

Cada vez que se ejecuta el cron, se realiza esto:

```javascript
{
  "success": true,
  "timestamp": "2026-02-09T08:00:05.234Z",
  "duration_ms": 342,
  "results": {
    // Notificaciones creadas/actualizadas
    "expiring_notifications": 5,
    
    // Notificaciones antiguas limpiadas (+30 días)
    "cleaned_notifications": 2,
    
    // Conteo actual
    "current_pending_count": 8,
    "critical_count": 2,      // ≤7 días
    "warning_count": 3        // 8-30 días
  }
}
```

---

## 🔄 Flujo Completo: Del Cron al Usuario

```
08:00 UTC
    ↓
┌─────────────────────────────────┐
│ Vercel dispara cron automático  │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│ /api/cron/check-expiring        │
│ /products recibe solicitud      │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│ BD: fn_create_or_update         │
│ _expiring_notifications(90)     │
│ Escanea batches que vencen      │
│ en ≤90 días                     │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│ BD: fn_cleanup_old              │
│ _notifications(30)              │
│ Limpia notificaciones           │
│ de +30 días                     │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│ Cron completa                   │
│ ✅ 5 notificaciones nuevas      │
│ ✅ 2 notificaciones limpiadas   │
└─────────────────┬───────────────┘
                  ↓
          (Espera hasta 3 PM)
                  ↓
         (Usuario abre su app)
                  ↓
┌─────────────────────────────────┐
│ Hook: useNotifications()        │
│ Polling cada 5 minutos          │
│ GET /api/notifications          │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│ UI Actualizada                  │
│ Campanita: 5 notificaciones     │
│ Badge rojo (si críticas)        │
│ Usuario ve alertas              │
└─────────────────────────────────┘
```

---

## 🆚 Manual vs Automático

| Aspecto | Manual | Automático |
|---------|--------|-----------|
| **Disparo** | Usuario hace clic | Vercel cada día |
| **Horario** | Cuando quiera | 8 AM y 3 PM UTC |
| **Ambiente** | Local + Prod | Solo Prod |
| **Requiere acción** | Sí | No |
| **Visible en UI** | "Actualizando..." | Sin feedback |

### Entonces, ¿para qué sirve el botón manual?

1. **Desarrollo**: Probar sin esperar el cron
2. **Urgencias**: Si necesitas notificaciones YA
3. **Testing**: Verificar que todo funciona
4. **Confianza**: Validar que el sistema está vivo

---

## 🐛 Debuggear Crons

### Los crons no se ejecutan

**Checklist:**

- [ ] ¿Está el archivo `vercel.json` en la raíz?
- [ ] ¿Tiene el formato JSON correcto?
- [ ] ¿El endpoint `/api/cron/check-expiring-products` existe?
- [ ] ¿Está el endpoint respondiendo con 200?
- [ ] ¿Las variables de entorno están configuradas en Vercel?

```bash
# Verifica que vercel.json existe
ls -la vercel.json

# Verifica que el format é válido
cat vercel.json | jq .
```

### Ver qué pasó en Vercel

1. **Dashboard → Deployments → Current → Functions**
2. **Click en `/api/cron/check-expiring-products`**
3. **Ve el histórico de ejecuciones con timestamps**

---

## ⚙️ Configuración Avanzada

### Cambiar horarios

Edita `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 9 * * *"  // 9 AM UTC
    },
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 17 * * *"  // 5 PM UTC
    }
  ]
}
```

### Ejecutar cada hora

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 * * * *"  // Cada hora
    }
  ]
}
```

### Ejecutar cada 30 minutos

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "*/30 * * * *"  // Cada 30 min
    }
  ]
}
```

**⚠️ Cuidado**: Vercel tiene límites en la cantidad de ejecuciones. Si ejecutas muy frecuentemente, puede incrementar costos.

---

## 📈 Monitoreo en Producción

### Opción 1: Dashboard de Vercel

Vercel te muestra:
- Última ejecución
- Próxima ejecución
- Logs de ejecución
- Errores (si aplica)

### Opción 2: Logs en la BD

Si quisieras almacenar logs de cron (opcional):

```sql
-- Crear tabla de auditoría
CREATE TABLE cron_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name TEXT,
  status TEXT,  -- 'success', 'error'
  duration_ms INT,
  result JSONB,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guardar cada ejecución
INSERT INTO cron_execution_logs (cron_name, status, duration_ms, result)
VALUES ('check_expiring', 'success', 342, '{"notifications": 5}'::jsonb);
```

---

## 🚀 Resumen

✅ **2 crons ejecutándose automáticamente** a las 8 AM y 3 PM UTC
✅ **Botón manual** para probar en desarrollo o urgencias
✅ **Flexible**: Puedes cambiar horarios editando `vercel.json`
✅ **Seguro**: Solo ejecuta en Vercel, no requiere autenticación especial
✅ **Observable**: Ver logs en Vercel Dashboard

**¡Tu sistema está listo para producción!** 🎉
