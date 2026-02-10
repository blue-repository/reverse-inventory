# 🔧 Solución de Problemas: Error 500 en el Botón de Actualizar

## Error Recibido
```
Check failed with status 500
```

---

## 🎯 Causas Probables (en orden de probabilidad)

### 1. ✋ Error más probable: Variables de entorno no configuradas

**Síntomas:**
- Error 500 al hacer clic en Actualizar
- Console muestra "Missing Supabase environment variables"

**Solución:**

#### Opción A: Local (Desarrollo)

Verifica que tu `.env.local` tiene:

```bash
# .env.local (en la raíz del proyecto)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Cómo obtener las claves:**
1. Ve a [supabase.com](https://supabase.com)
2. Abre tu proyecto
3. Click en **Settings** (esquina inferior izquierda)
4. Click en **API**
5. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

#### Opción B: Producción (Vercel)

1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Click en **Settings**
3. Click en **Environment Variables**
4. Agrega las 3 variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. **Re-deploy tu aplicación** (git push)

---

### 2. 🐛 Error: Función SQL no existe

**Síntomas:**
- Las variables de entorno están bien
- Error menciona `fn_create_or_update_expiring_notifications`

**Solución:**

Verifica que la migración 007 se ejecutó correctamente:

```bash
# En Supabase SQL Editor:
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'fn_%notification%';
```

**Resultado esperado:**
```
fn_create_or_update_expiring_notifications
fn_cleanup_old_notifications
fn_create_notification_new_entry
fn_create_notification_movement
```

Si NO ves estas funciones:
1. Abre Supabase SQL Editor
2. Copia TODO el contenido de `database/migrations/007_create_expiring_notifications_system.sql`
3. Pega en SQL Editor
4. Click en **Run** (o Ctrl+Enter)
5. Espera que termine
6. Reinicia tu servidor local (`npm run dev`)
7. Intenta de nuevo

---

### 3. 🔐 Error: Clave de servicio incorrecta

**Síntomas:**
- Variables están configuradas
- Error de autenticación o permisos

**Solución:**

Verifica que usas la clave **service_role**, no la clave **anon**:

```bash
# ✅ CORRECTO - Usar SIEMPRE para endpoints de servidor
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc... (la más larga)

# ❌ INCORRECTO - Nunca para endpoints de servidor
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc... (anon key)
```

---

## 🔍 Pasos de Debugging

### Paso 1: Ver los logs en la consola

Abre las DevTools del navegador:
- **Windows/Linux**: `F12`
- **Mac**: `Cmd + Option + I`

Ve a la pestaña **Console**. Busca mensajes como:

```
Triggering expiring products check...
Response status: 500
Check failed with error: {
  success: false,
  error: "Configuration error",
  details: "Missing Supabase environment variables"
}
```

El mensaje `details` te dirá exactamente cuál es el problema.

### Paso 2: Ver los logs del servidor

En la terminal donde corre `npm run dev`:

```
Cron trigger: {
  isVercelCron: false,
  isManual: true,
  timestamp: '2026-02-09T10:30:00.000Z'
}
Calling fn_create_or_update_expiring_notifications...
Error executing fn_create_or_update_expiring_notifications: {
  code: '42883',  ← Error PostgreSQL
  message: 'function fn_create_or_update_expiring_notifications(integer) does not exist'
}
```

Si ves este error, necesitas ejecutar la migración 007.

### Paso 3: Probar el endpoint directamente

```bash
# En terminal, prueba el endpoint manualmente
curl -X POST http://localhost:3000/api/cron/check-expiring-products \
  -H "Content-Type: application/json"
```

Respuesta esperada (✅ éxito):
```json
{
  "success": true,
  "timestamp": "2026-02-09T10:30:00.000Z",
  "duration_ms": 245,
  "results": {
    "expiring_notifications": 3,
    "current_pending_count": 3
  }
}
```

Respuesta esperada (❌ fallo):
```json
{
  "success": false,
  "error": "Configuration error",
  "details": "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"
}
```

### Paso 4: Ver el GET endpoint

```bash
# Ver estadísticas
curl http://localhost:3000/api/cron/check-expiring-products
```

Debería mostrar algo como:
```json
{
  "success": true,
  "statistics": {
    "pending": 5,
    "read": 2,
    "dismissed": 0,
    "total": 7
  }
}
```

---

## ✅ Checklist de Verificación

- [ ] ¿Verificaste que `.env.local` tiene las 3 variables?
- [ ] ¿Reiniciaste el servidor después de agregar variables? (`npm run dev`)
- [ ] ¿Ejecutaste la migración 007 en Supabase?
- [ ] ¿Verificaste que las funciones SQL existen?
- [ ] ¿Probaste el endpoint con `curl`?
- [ ] ¿Abriste la consola del navegador y leíste el error completo?
- [ ] ¿Leíste los logs del servidor en la terminal?

---

## 📝 Para Verificar Cada Cosa

### 1. Verificar variables de entorno

```bash
# Imprime las variables (solo en desarrollo)
npm run dev  # En los logs verás si las variables existen
```

O crea un archivo de prueba temporal:

```typescript
// app/api/debug/env/route.ts
export async function GET() {
  return Response.json({
    has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...",
  });
}
```

Luego ve a `http://localhost:3000/api/debug/env` para ver el estado.

### 2. Verificar que la migración se ejecutó

```sql
-- En Supabase SQL Editor
-- Verificar tabla
SELECT COUNT(*) FROM notifications;

-- Verificar funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'fn_%';

-- Verificar vistas
SELECT table_name 
FROM information_schema.views 
WHERE table_name LIKE 'vw_%';
```

### 3. Verificar que el endpoint responde

```bash
# Opción 1: curl
curl -X POST http://localhost:3000/api/cron/check-expiring-products

# Opción 2: PowerShell (Windows)
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/check-expiring-products" -Method POST
```

---

## 🚨 Si Nada de Esto Funciona

### Opción 1: Reconstruir desde cero

```bash
# 1. Detén el servidor (Ctrl+C)
# 2. Limpia cache de Next.js
rm -rf .next

# 3. Borra node_modules (si cambiaste paquetes)
rm -rf node_modules

# 4. Reinstala
npm install

# 5. Reinicia
npm run dev
```

### Opción 2: Verifica la conexión a Supabase

```typescript
// Crea un archivo de prueba temporal
// app/api/debug/supabase/route.ts

import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { data, error } = await supabase
      .from("notifications")
      .select("COUNT(*)", { count: "exact" });

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Connected to Supabase",
      data,
    });
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

Luego ve a `http://localhost:3000/api/debug/supabase` para probar la conexión.

---

## 📞 Resumen Rápido

| Error | Causa | Solución |
|-------|-------|----------|
| "Missing env vars" | `.env.local` no tiene las variables | Agregar `SUPABASE_SERVICE_ROLE_KEY` |
| "Function does not exist" | Migración 007 no ejecutada | Ejecutar migración en Supabase |
| "Permission denied" | Clave incorrecta | Usar `service_role`, no `anon` |
| "Connection timeout" | Supabase no responde | Verificar URL correcta |

---

## 🔗 Enlaces Útiles

- [Supabase Dashboard](https://supabase.com)
- [Vercel Dashboard](https://vercel.com)
- [Documentación de .env en Next.js](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase SQL Editor](https://supabase.com/dashboard)

¡Si aún tienes problemas, comparte el error completo de la consola!
