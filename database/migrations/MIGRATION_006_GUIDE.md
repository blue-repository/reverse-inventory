# Guía de Migración: Sistema de Rastreo de Lotes en Movimientos

## 📋 Resumen

Esta migración soluciona un problema crítico: **ahora podemos rastrear exactamente qué lotes fueron afectados por cada movimiento de inventario**.

### Problema Anterior
- ❌ Un egreso de 5 unidades que tomaba 3 de un lote y 2 de otro **no registraba esta información**
- ❌ No había forma de saber el historial completo de un lote
- ❌ No se podía auditar qué lotes específicos se usaron en cada salida

### Solución Implementada
- ✅ Nueva tabla `movement_batch_details` que registra cada lote afectado por un movimiento
- ✅ Auditoría completa: stock antes y después para cada lote
- ✅ Vistas y funciones para consultar fácilmente estas relaciones
- ✅ Compatibilidad total con código existente

---

## 🚀 Pasos de Ejecución

### **Paso 1: Backup de la Base de Datos** ⚠️
Aunque esta migración NO modifica datos existentes, es buena práctica hacer un backup:

1. Ve a tu proyecto en Supabase
2. Settings → Database → Backups
3. Crea un backup manual

---

### **Paso 2: Ejecutar la Migración**

1. **Abre Supabase SQL Editor**
   - Ve a tu proyecto en Supabase
   - Navega a: **SQL Editor** (en el menú lateral)

2. **Copia el contenido del archivo**
   ```
   database/migrations/006_create_movement_batch_details.sql
   ```

3. **Pega en el editor SQL y ejecuta**
   - Clic en el botón **RUN** o presiona `Ctrl + Enter`
   - Espera a que aparezca "Success"

4. **Tiempo estimado:** ~5-10 segundos

---

### **Paso 3: Verificar la Migración**

Ejecuta estas consultas en el SQL Editor para validar:

```sql
-- 1. Verificar que la tabla existe
SELECT COUNT(*) FROM movement_batch_details;
-- Resultado esperado: 0 (la tabla está vacía porque es nueva)

-- 2. Verificar índices creados
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'movement_batch_details';
-- Resultado esperado: 5 índices

-- 3. Probar la vista
SELECT * FROM movement_details_with_batches LIMIT 5;
-- Resultado esperado: Lista de movimientos (puede estar vacía si no hay datos)

-- 4. Verificar funciones
SELECT proname 
FROM pg_proc 
WHERE proname IN ('get_movement_batch_breakdown', 'get_batch_movement_history');
-- Resultado esperado: 2 funciones
```

---

### **Paso 4: Verificar Permisos (Importante para RLS)**

Si tienes Row Level Security (RLS) habilitado, ejecuta:

```sql
-- Otorgar permisos básicos a usuarios autenticados
GRANT SELECT, INSERT ON movement_batch_details TO authenticated;
GRANT SELECT ON movement_details_with_batches TO authenticated;
```

⚠️ **Nota:** Ajusta los permisos según tus políticas de seguridad.

---

## 📊 Estructura Creada

### Tabla: `movement_batch_details`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| movement_id | UUID | Referencia al movimiento |
| batch_id | UUID | Referencia al lote |
| quantity | INTEGER | Cantidad afectada de este lote |
| batch_stock_before | INTEGER | Stock del lote antes del movimiento |
| batch_stock_after | INTEGER | Stock del lote después del movimiento |
| created_at | TIMESTAMP | Fecha de creación |

### Vista: `movement_details_with_batches`
Vista que combina movimientos con sus lotes asociados para consultas fáciles.

### Funciones:
1. **`get_movement_batch_breakdown(movement_id)`**
   - Obtiene todos los lotes afectados por un movimiento

2. **`get_batch_movement_history(batch_id)`**
   - Obtiene todos los movimientos que afectaron un lote

---

## 🔄 Compatibilidad

### ✅ No Rompe Código Existente
- Los movimientos antiguos siguen funcionando
- No se modifican tablas existentes
- El flujo actual de la aplicación no se ve afectado

### 📝 Movimientos Antiguos
- Los movimientos registrados **antes** de esta migración NO tendrán detalles de lotes
- Solo los movimientos **nuevos** (después del código actualizado) tendrán esta información
- Esto es **normal y esperado**

---

## 🧪 Pruebas Después de la Migración

### Prueba Manual en Supabase

```sql
-- Simular un movimiento con detalles de lotes
-- (Solo para prueba, NO ejecutar en producción)

-- 1. Obtener un producto y un lote existente
SELECT p.id as product_id, pb.id as batch_id, pb.batch_number, pb.stock
FROM products p
JOIN product_batches pb ON p.id = pb.product_id
WHERE pb.stock > 0
LIMIT 1;

-- 2. Crear un movimiento de prueba (usa los IDs obtenidos arriba)
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, recorded_by)
VALUES ('TU_PRODUCT_ID', 'salida', 2, 'Prueba de migración', 'Sistema')
RETURNING id;

-- 3. Registrar detalle de lote (usa movement_id del paso anterior)
INSERT INTO movement_batch_details (movement_id, batch_id, quantity, batch_stock_before, batch_stock_after)
VALUES ('MOVEMENT_ID', 'BATCH_ID', 2, 10, 8);

-- 4. Consultar el resultado
SELECT * FROM movement_details_with_batches 
WHERE movement_id = 'MOVEMENT_ID';

-- 5. Limpiar datos de prueba (IMPORTANTE)
DELETE FROM movement_batch_details WHERE movement_id = 'MOVEMENT_ID';
DELETE FROM inventory_movements WHERE id = 'MOVEMENT_ID';
```

---

## 📱 Siguiente Paso: Actualizar el Código

Después de ejecutar esta migración, necesitas actualizar el código de la aplicación para que registre estos detalles. Ver archivo:

```
database/migrations/CODE_UPDATE_GUIDE.md
```

---

## ❓ Solución de Problemas

### Error: "relation already exists"
✅ **Solución:** La tabla ya fue creada anteriormente, puedes continuar.

### Error: "permission denied"
⚠️ **Solución:** Asegúrate de estar conectado como usuario administrador en Supabase.

### Error en funciones
⚠️ **Solución:** Ejecuta primero las funciones de ayuda en `000_create_helper_functions.sql` si existen.

### La vista no devuelve datos
✅ **Esto es normal:** Si no hay movimientos nuevos, la vista estará vacía.

---

## 📞 Soporte

Si encuentras algún problema:
1. Verifica que ejecutaste el SQL completo
2. Revisa los permisos RLS si aplica
3. Consulta los logs en Supabase Dashboard → Logs

---

## ✅ Checklist de Migración

- [ ] Backup realizado
- [ ] Script ejecutado sin errores
- [ ] Tabla `movement_batch_details` existe
- [ ] 5 índices creados
- [ ] Vista `movement_details_with_batches` funciona
- [ ] 2 funciones creadas
- [ ] Permisos configurados (si aplica RLS)
- [ ] Pruebas manuales completadas (opcional)
- [ ] Código de aplicación actualizado (siguiente paso)

---

**Fecha de creación:** 5 de febrero de 2025  
**Versión de migración:** 006  
**Compatibilidad:** Todas las versiones anteriores
