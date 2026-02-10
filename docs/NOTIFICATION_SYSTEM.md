# Sistema de Notificaciones para Medicamentos por Vencer

## Resumen

Se ha implementado un sistema completo de notificaciones asincrónico que alerta a los usuarios sobre medicamentos y lotes que están próximos a vencer (menos de 3 meses = 90 días).

## Componentes Implementados

### 1. **Base de Datos** (PostgreSQL/Supabase)

#### Archivo: `database/migrations/007_create_expiring_notifications_system.sql`

**Tablas creadas:**
- `expiring_product_notifications`: Almacena las notificaciones de vencimiento

**Vistas creadas:**
- `vw_expiring_products`: Identifica productos/lotes por vencer (< 90 días)
- `vw_active_expiring_notifications`: Muestra notificaciones activas filtradas y con metadata

**Funciones PL/pgSQL:**
- `fn_create_or_update_expiring_notifications()`: Crea y actualiza notificaciones
- `fn_cleanup_old_notifications()`: Limpia notificaciones descartadas > 30 días

### 2. **Backend - API Routes**

#### `/app/api/notifications/route.ts`
```
GET  /api/notifications
- Obtiene notificaciones activas del usuario
- Query params: limit (default 10), status (all|pending|read)
- Retorna: ExpiringProductNotification[], unreadCount, criticalCount

PUT  /api/notifications
- Actualiza el estado de una notificación
- Body: { notificationId, action: 'read' | 'dismiss' }
```

#### `/app/api/check-expiring-products/route.ts`
```
POST /api/check-expiring-products
- Ejecuta el escaneo de productos por vencer y crea notificaciones
- Headers: x-api-key (para seguridad en producción)
- Retorna: createdCount, updatedCount, cleanedCount, totalActiveNotifications

GET  /api/check-expiring-products
- Retorna estadísticas del sistema de notificaciones (para debugging)
```

### 3. **Frontend**

#### Hook: `app/hooks/useNotifications.ts`
```typescript
const {
  notifications,      // ExpiringProductNotification[]
  unreadCount,        // número de no leídas
  criticalCount,      // número críticas (vencen ≤7 días)
  isLoading,          // boolean
  error,              // string | null
  markAsRead,         // (id: string) => Promise<void>
  dismiss,            // (id: string) => Promise<void>
  refresh,            // () => Promise<void>
  triggerExpiringProductsCheck, // () => Promise<void>
} = useNotifications({
  pollInterval: 5 * 60 * 1000,  // cada 5 minutos
  autoRefresh: true,             // actualización automática
});
```

#### Componentes:
- `app/components/NotificationItem.tsx`: Componente individual de notificación con:
  - Badge de severidad (Crítico/Atención/Info)
  - Días hasta vencimiento
  - Información del lote
  - Botones para marcar como leído/descartado

- `app/components/Navbar.tsx`: Actualizado para:
  - Mostrar badge con número de notificaciones sin leer
  - Cambiar color del badge si hay críticas (rojo) vs normal (azul)
  - Integrar hook de notificaciones

#### Tipos: `app/types/notification.ts`
```typescript
ExpiringProductNotification {
  id: string;
  product_id: string;
  batch_id?: string | null;
  product_name: string;
  expiration_date: string;
  days_until_expiration: number;
  type: 'producto' | 'lote';
  notification_status: 'pending' | 'read' | 'dismissed';
  severity: 'critical' | 'warning' | 'info';
  notification_message: string;
  ...
}
```

## Configuración e Instalación

### Paso 1: Ejecutar la Migración en Supabase

1. Ve a Supabase Dashboard → Tu proyecto
2. SQL Editor → New Query
3. Copia el contenido de `database/migrations/007_create_expiring_notifications_system.sql`
4. Ejecuta la query

O usando Supabase CLI:
```bash
supabase db push
```

### Paso 2: Variables de Entorno (Opcional)

Para mayor seguridad en producción, agrega a tu `.env.local`:

```bash
# Clave secreta para el endpoint de cron jobs (opcional)
NEXT_PUBLIC_CRON_JOB_SECRET_KEY=tu_clave_secreta_aqui
CRON_JOB_SECRET_KEY=tu_clave_secreta_aqui
```

### Paso 3: Configurar el Polling Automático

El hook `useNotifications` ya está configurado en el Navbar con:
- Polling cada 5 minutos
- Auto-actualización de notificaciones
- Escaneo de productos por vencer cada 5 minutos

Si deseas cambiar el intervalo, modifica en `Navbar.tsx`:
```typescript
const { ... } = useNotifications({
  pollInterval: 5 * 60 * 1000, // cambiar este valor (en ms)
  autoRefresh: true,
});
```

## Cómo Funciona

### Flujo de Notificaciones

1. **Escaneo Automático**: Cada 5 minutos (configurable), el cliente:
   - Llama POST `/api/check-expiring-products`
   - La BD ejecuta `fn_create_or_update_expiring_notifications()`
   - Se crean/actualizan notificaciones para productos por vencer

2. **Recuperación**: El cliente llama GET `/api/notifications`
   - Obtiene las notificaciones activas (pending, read)
   - Las muestra en el dropdown del Navbar

3. **Interacción del Usuario**:
   - Click en ✓ → marca como "read" (PUT con action='read')
   - Click en ✕ → marca como "dismissed" (PUT con action='dismiss')

4. **Limpieza**: Las notificaciones descartadas > 30 días se eliminan automáticamente

### Cálculo de Severidad

- **Critical (Rojo)**: ≤ 7 días para vencer
- **Warning (Amarillo)**: 8-30 días para vencer
- **Info (Azul)**: 31-90 días para vencer

## Configuración Avanzada: Cron Jobs (Vercel)

Si deseas ejecutar escaneos exactamente a las 9 AM y 3 PM (más confiable que polling), puedes usar Vercel Cron:

### 1. Crea un endpoint con cron:

```typescript
// app/api/cron/check-expiring-products/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Vercel Cron signature
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verificar header de Vercel
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Llamar API interna
  const baseUrl = req.nextUrl.origin;
  const response = await fetch(`${baseUrl}/api/check-expiring-products`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CRON_JOB_SECRET_KEY || '',
    },
  });

  return response;
}
```

### 2. Configura en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/check-expiring-products",
      "schedule": "0 15 * * *"
    }
  ]
}
```

## API Reference Completa

### Obtener Notificaciones
```bash
curl -X GET "http://localhost:3000/api/notifications?limit=20&status=pending"
```

Response:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Amoxicilina",
      "batch_number": "LOTE-001",
      "expiration_date": "2026-04-15",
      "days_until_expiration": 45,
      "type": "lote",
      "severity": "warning",
      "notification_status": "pending",
      ...
    }
  ],
  "unreadCount": 3,
  "criticalCount": 1
}
```

### Marcar como Leído
```bash
curl -X PUT "http://localhost:3000/api/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "uuid",
    "action": "read"
  }'
```

### Ejecutar Escaneo Manual
```bash
curl -X POST "http://localhost:3000/api/check-expiring-products" \
  -H "x-api-key: development"
```

## Base de Datos - Queries Útiles

### Ver todas las notificaciones activas
```sql
SELECT * FROM vw_active_expiring_notifications 
ORDER BY days_until_expiration ASC;
```

### Ver productos/lotes por vencer
```sql
SELECT * FROM vw_expiring_products 
WHERE days_until_expiration <= 30
ORDER BY days_until_expiration ASC;
```

### Crear notificación manualmente
```sql
SELECT fn_create_or_update_expiring_notifications();
```

### Limpiar notificaciones antiguas
```sql
SELECT fn_cleanup_old_notifications();
```

### Ver notificaciones de un usuario
```sql
SELECT * FROM expiring_product_notifications 
WHERE notified_user_id IS NULL OR notified_user_id = 'username'
AND notification_status IN ('pending', 'read');
```

## Troubleshooting

### No aparecen notificaciones
1. Verifica que la migración se ejecutó bien: `SELECT * FROM vw_expiring_products;`
2. Revisa la consola: ¿hay errores en `/api/notifications`?
3. Abre DevTools → Network y verifica las llamadas a `/api/notifications` y `/api/check-expiring-products`

### Notificaciones desaparecen
- Si has marcado como "dismissed", se limpian después de 30 días
- Si necesitas recuperarlas: `UPDATE expiring_product_notifications SET notification_status = 'pending' WHERE id = 'uuid';`

### El hook no se actualiza
- Verifica que `useNotifications` esté siendo usado en un componente `"use client"`
- Aumenta el `pollInterval` si es muy corto

## Próximas Mejoras Sugeridas

1. **Notificaciones por Email**: Integrar envío de emails para usuarios específicos
2. **Preferencias de Usuario**: Tabla para guardar qué tipo de notificaciones recibir
3. **Alertas Sonoras**: Reproducir sonido cuando hay notificaciones críticas
4. **Filtros Avanzados**: Filtrar por categoría, especialidad, ubicación
5. **Historial de Notificaciones**: Página para ver todas las notificaciones históricas
6. **Acciones Rápidas**: Botones para salida rápida de medicamentos próximos a vencer
