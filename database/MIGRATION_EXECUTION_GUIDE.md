# 📋 Guía de Ejecución - Migración de Recetas y Fechas

## ⚡ Inicio Rápido

**Archivo a ejecutar**: `migrations/002_add_movement_dates_and_recipe_fields.sql`

### Pasos Simples

1. Abre **Supabase SQL Editor** (o tu cliente SQL)
2. Copia el contenido completo de `002_add_movement_dates_and_recipe_fields.sql`
3. Pega en el editor SQL
4. Haz clic en **Run** o presiona Ctrl+Enter
5. Valida los resultados (ver sección de validación abajo)

---

## 🔍 Validación Post-Migración

Ejecuta estas queries para confirmar que la migración fue exitosa.

### ✅ Verificación 1: Campos Agregados

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inventory_movements'
ORDER BY ordinal_position;
```

**Resultado esperado**: Deberías ver los 6 nuevos campos:
- `movement_date` (date, NOT NULL, default: CURRENT_DATE)
- `item_movement_date` (date, NOT NULL, default: CURRENT_DATE)
- `is_recipe_movement` (boolean, default: false)
- `patient_name` (character varying, nullable)
- `recipe_date` (date, nullable)
- `prescribed_by` (character varying, nullable)
- `cie_code` (character varying, nullable)
- `recipe_notes` (text, nullable)

### ✅ Verificación 2: Índices Creados

```sql
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'inventory_movements'
ORDER BY indexname;
```

**Resultado esperado**: Deberías ver estos dos nuevos índices:
- `idx_movements_movement_date`
- `idx_movements_item_movement_date`

### ✅ Verificación 3: Vistas Creadas

```sql
-- Verificar vista de recetas
SELECT * FROM recipe_movements_view LIMIT 1;

-- Verificar vista de movimientos con fechas
SELECT * FROM movements_with_dates_view LIMIT 1;
```

**Resultado esperado**: Las vistas existen sin errores (pueden estar vacías si no hay datos).

### ✅ Verificación 4: Estructura Completa

```sql
-- PostgreSQL
\d inventory_movements

-- O en cualquier BD:
SELECT 
  column_name,
  ordinal_position,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_movements'
ORDER BY ordinal_position;
```

---

## 📊 Estructura Esperada Post-Migración

```
inventory_movements:
├── id (UUID, PK)
├── product_id (UUID, FK) - existente
├── movement_type (enum)
├── quantity (integer)
├── reason (text)
├── notes (text)
├── reporting_unit (text)
├── recorded_by (text)
├── created_at (timestamptz)
├── updated_at (timestamptz)
├── movement_date (date) ← NUEVO
├── item_movement_date (date) ← NUEVO
├── is_recipe_movement (boolean) ← NUEVO
├── patient_name (varchar) ← NUEVO
├── recipe_date (date) ← NUEVO
├── prescribed_by (varchar) ← NUEVO
├── cie_code (varchar) ← NUEVO
└── recipe_notes (text) ← NUEVO
```

---

## 🧪 Pruebas Funcionales

### Prueba 1: Insertar Movimiento Normal

```sql
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by)
VALUES 
((SELECT id FROM products LIMIT 1), 'entrada', 10, CURRENT_DATE, CURRENT_DATE, 'Prueba entrada', 'test@bagatela.com');

-- Verificar
SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 1;
```

**Resultado esperado**: 
- El movimiento se inserta correctamente
- `is_recipe_movement` = FALSE
- Campos de receta son NULL

### Prueba 2: Insertar Movimiento con Receta

```sql
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by,
 is_recipe_movement, patient_name, recipe_date, prescribed_by, cie_code, recipe_notes)
VALUES 
((SELECT id FROM products LIMIT 1), 'salida', 2, CURRENT_DATE, '2026-01-19'::date, 'Receta médica', 'test@bagatela.com',
 true, 'Juan Pérez', '2026-01-18'::date, 'Dr. García', 'J06.9', 'Tomar cada 8 horas');

-- Verificar
SELECT * FROM inventory_movements WHERE is_recipe_movement = TRUE ORDER BY created_at DESC LIMIT 1;
```

**Resultado esperado**:
- El movimiento se inserta correctamente
- `is_recipe_movement` = TRUE
- Todos los campos de receta se guardan

### Prueba 3: Consultar Vista de Recetas

```sql
SELECT * FROM recipe_movements_view;
```

**Resultado esperado**:
- Retorna solo los movimientos donde `is_recipe_movement = TRUE`
- Muestra todos los campos relevantes de receta

### Prueba 4: Consultar Vista de Movimientos con Fechas

```sql
SELECT * FROM movements_with_dates_view LIMIT 5;
```

**Resultado esperado**:
- Retorna todos los movimientos con sus fechas
- La columna `movement_reason` muestra "Receta: [nombre paciente]" para recetas

---

## 🔧 Si Algo Sale Mal

### Error: "table inventory_movements already has field..."

**Causa**: Los campos ya existen (migración fue ejecutada antes)

**Solución**: 
```sql
-- Verifica si los campos existen
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'inventory_movements' AND column_name = 'movement_date';

-- Si existen, la migración ya fue aplicada. Procede con los cambios en la app.
```

### Error: "type inventory_movements already exists"

**Causa**: Las vistas ya existen

**Solución**:
```sql
-- Reemplaza las vistas
DROP VIEW IF EXISTS recipe_movements_view CASCADE;
DROP VIEW IF EXISTS movements_with_dates_view CASCADE;

-- Luego ejecuta nuevamente la sección de vistas del SQL
```

### Error: "relation recipe_movements_view does not exist"

**Causa**: Las vistas no se crearon correctamente

**Solución**:
```sql
-- Ejecuta solo la sección de VISTAS de la migración
-- Ver en 002_add_movement_dates_and_recipe_fields.sql - Sección 4 y 5
```

---

## 📈 Próximos Pasos

Una vez que la migración esté completa:

### 1️⃣ Actualizar Types TypeScript

```typescript
// types/product.ts
export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  movement_date: string; // ISO date
  item_movement_date: string; // ISO date
  reason: string;
  notes?: string;
  reporting_unit?: string;
  recorded_by: string;
  is_recipe_movement: boolean;
  patient_name?: string;
  recipe_date?: string; // ISO date
  prescribed_by?: string;
  cie_code?: string;
  recipe_notes?: string;
  created_at: string;
  updated_at: string;
}
```

### 2️⃣ Actualizar Server Actions

```typescript
// app/actions/products.ts
export async function createInventoryMovement(movement: InventoryMovement) {
  // Incluir los nuevos campos
  return supabase
    .from('inventory_movements')
    .insert({
      product_id: movement.product_id,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      movement_date: movement.movement_date,
      item_movement_date: movement.item_movement_date,
      reason: movement.reason,
      notes: movement.notes,
      recorded_by: movement.recorded_by,
      is_recipe_movement: movement.is_recipe_movement,
      patient_name: movement.patient_name,
      recipe_date: movement.recipe_date,
      prescribed_by: movement.prescribed_by,
      cie_code: movement.cie_code,
      recipe_notes: movement.recipe_notes,
    });
}
```

### 3️⃣ Actualizar Componentes UI

Ver archivo: `RECIPE_MOVEMENTS_VISUAL_GUIDE.md` → Sección "Flujo de Trabajo"

---

## ✅ Checklist de Validación

- [ ] Migración ejecutada sin errores
- [ ] Campos existen en la tabla
- [ ] Índices creados
- [ ] Vistas funcionales
- [ ] Pruebas de inserción exitosas
- [ ] Datos de prueba visible en vistas
- [ ] No hay errores en Supabase dashboard
- [ ] Backups realizados (si aplica)

---

## 📚 Documentación Relacionada

- [MIGRATION_RECIPES_README.md](./MIGRATION_RECIPES_README.md) - Descripción detallada
- [RECIPE_MOVEMENTS_VISUAL_GUIDE.md](./RECIPE_MOVEMENTS_VISUAL_GUIDE.md) - Guía visual
- [recipe_movements_queries.sql](./queries/recipe_movements_queries.sql) - Queries útiles
- [002_add_movement_dates_and_recipe_fields.sql](./migrations/002_add_movement_dates_and_recipe_fields.sql) - Migración completa

---

## 🆘 Soporte

Si encuentras errores:

1. **Verifica los logs de Supabase**: Dashboard → Logs
2. **Valida la sintaxis SQL**: Copia la query a un editor SQL validador
3. **Asegúrate de usar las extensiones correctas**: `uuid-ossp`, `pgcrypto`
4. **Consulta las queries de validación**: Sección "Validación Post-Migración" arriba

