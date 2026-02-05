# PostgreSQL Migration Scripts - Bagatela Inventory

Migraciones SQL para configurar la base de datos de desarrollo de **Bagatela Inventory** en PostgreSQL/Supabase.

## 📋 Descripción

Estos scripts configuran la base de datos completa con:
- ✅ **5 Tablas principales** (products, inventory_movements, product_batches, product_recipes, users)
- ✅ **21+ Índices optimizados** (búsqueda, reportes, filtros)
- ✅ **11 Triggers automáticos** (timestamps, validación, cálculo de stock)
- ✅ **9 Vistas útiles** (reportes, histórico, alertas)
- ✅ **2 Funciones helper** (para triggers)
- ✅ **1 Secuencia** (para auto-generar batch numbers)

## 🚀 Orden de Ejecución

Ejecuta los scripts en este orden (todos son copy-paste en PostgreSQL):

```sql
-- 1. Funciones helper
psql < 000_create_helper_functions.sql

-- 2. Tablas principales
psql < 001_create_tables.sql

-- 3. Índices para performance
psql < 002_create_indexes.sql

-- 4. Triggers automáticos
psql < 003_create_triggers.sql

-- 5. Vistas para queries comunes
psql < 004_create_views.sql
```

## 📁 Scripts Incluidos

### `000_create_helper_functions.sql`
**Propósito**: Crear funciones reutilizables para triggers

**Contenido**:
- `update_timestamp()` - Auto-actualiza `updated_at` en cualquier tabla
- `validate_movement_quantity()` - Valida que cantidad sea > 0

**Líneas**: ~40
**Tiempo**: < 1 segundo

---

### `001_create_tables.sql`
**Propósito**: Crear todas las tablas con constraints y relaciones

**Tablas creadas**:

1. **products**
   - Campos: name, barcode, description, stock, stock_inicial, unit_of_measure, administration_route, notes, issue_date, expiration_date, image_url
   - Soft delete: `deleted_at` NULL = activo
   - Audit: `created_at`, `updated_at`

2. **inventory_movements**
   - Tipos: `entrada`, `salida`, `ajuste`
   - FK: `product_id` (CASCADE)
   - Validación: `quantity > 0`
   - Audit: `created_at`, `updated_at`

3. **product_batches**
   - Batch number auto-generado: `LOTE-YYYYMMDD-XXX`
   - Stock por lote (separado del stock del producto)
   - Ubicación: `storage_location`, `storage_drawer`, `storage_section`
   - Soft delete: `deleted_at`
   - Audit: `created_at`, `updated_at`

4. **product_recipes**
   - Información de recetas/prescripciones
   - Paciente, prescriptor, código CIE
   - FK: `product_id` (CASCADE)
   - Soft delete: `deleted_at`
   - Audit: `created_at`, `updated_at`

5. **users**
   - Roles: `admin`, `supervisor`, `operario`
   - Email único
   - `is_active` para desactivar sin borrar
   - `last_login` para auditar actividad
   - Audit: `created_at`, `updated_at`

**Líneas**: ~200
**Tiempo**: < 1 segundo
**Validaciones incluidas**:
- Check: `stock >= 0`
- Check: `stock_inicial >= 0`
- Check: `quantity > 0` en movements
- Check: `expiration_date >= issue_date`
- Enum: `movement_type IN ('entrada', 'salida', 'ajuste')`
- Enum: `user_role IN ('admin', 'supervisor', 'operario')`

---

### `002_create_indexes.sql`
**Propósito**: Crear índices para optimizar queries (especialmente reportes y búsquedas)

**Índices por tabla**:

| Tabla | Índices | Propósito |
|-------|---------|----------|
| **products** | name, barcode, active (WHERE deleted_at IS NULL), expiration_date, created_at, updated_at | Búsqueda por nombre/barcode, filtros |
| **inventory_movements** | product_id, created_at DESC, movement_type, (product_id, created_at), (movement_type, created_at) | Reportes, historial por producto |
| **product_batches** | product_id, batch_number, expiration_date, active (WHERE deleted_at IS NULL) | Búsqueda de lotes, alertas vencimiento |
| **product_recipes** | product_id, recipe_code, patient_name, recipe_date | Búsqueda recetas/prescripciones |
| **users** | email, active (is_active = true) | Autenticación, búsqueda activos |

**Índices totales**: 21+
**Líneas**: ~150
**Tiempo**: 1-2 segundos

---

### `003_create_triggers.sql`
**Propósito**: Automatizar lógica de negocio en la base de datos

**Triggers implementados**:

1. **Auto-update timestamps** (5 triggers)
   - Actualiza `updated_at` automáticamente en INSERT/UPDATE para cada tabla
   - Aplica en: products, inventory_movements, product_batches, product_recipes, users

2. **Validaciones** (2 triggers)
   - `tr_products_validate_name` - Garantiza que name no sea vacío
   - `tr_movements_validate_quantity` - Garantiza que quantity > 0

3. **Cálculo de stock** (3 triggers)
   - `tr_movements_insert_update_stock` - INSERT/UPDATE: actualiza stock del producto
   - `tr_movements_delete_stock` - DELETE: revierte el movimiento
   - **Lógica**:
     - `entrada` → stock += quantity
     - `salida` → stock -= quantity
     - `ajuste` → stock ±= quantity (según signo)

4. **Batch number auto-generado** (1 trigger)
   - Genera `LOTE-YYYYMMDD-XXXXX` si no se proporciona
   - Usa secuencia `seq_batch_number`

**Líneas**: ~300
**Tiempo**: 1-2 segundos
**Nota importante**: El stock se calcula automáticamente en triggers. No hay que hacer INSERT en columna stock en el INSERT - se actualiza automáticamente.

---

### `004_create_views.sql`
**Propósito**: Crear vistas para queries comunes (reportes, alertas, etc.)

**Vistas creadas**:

1. **product_stock_summary** - Stock actual + conteos de movimientos
2. **product_batches_summary** - Lotes activos con estado de expiración
3. **products_expiring_soon** - Productos próximos a vencer (90 días)
4. **inventory_movements_with_details** - Movimientos con info del producto
5. **product_movement_history** - Historial y cálculo de stock por producto
6. **daily_movement_summary** - Resumen agregado por día
7. **monthly_movement_report** - Reporte mensual de movimientos
8. **low_stock_products** - Productos con stock < 20%
9. **user_activity_summary** - Actividad de usuarios

**Líneas**: ~200
**Tiempo**: < 1 segundo

---

## 📊 Schema Resultante

```
┌─────────────────────────────────────────────┐
│            BAGATELA INVENTORY               │
│            PostgreSQL Schema                │
└─────────────────────────────────────────────┘

┌──────────────────────┐
│      products        │ (Tabla maestro)
├──────────────────────┤
│ id (PK)              │
│ name                 │
│ barcode              │
│ stock (calculado)    │
│ stock_inicial        │
│ unit_of_measure      │
│ issue_date           │
│ expiration_date      │
│ deleted_at (soft)    │
│ created_at           │
│ updated_at           │
└──────────────────────┘
        ↑ ↓
┌──────────────────────────────┐
│   inventory_movements        │ (Historial)
├──────────────────────────────┤
│ id (PK)                      │
│ product_id (FK)              │ ──→ products
│ movement_type (entrada...)   │
│ quantity                     │
│ reason                       │
│ created_at                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│     product_batches          │ (Lotes)
├──────────────────────────────┤
│ id (PK)                      │
│ product_id (FK)              │ ──→ products
│ batch_number (auto)          │
│ stock                        │
│ expiration_date              │
│ storage_location             │
│ deleted_at (soft)            │
└──────────────────────────────┘

┌──────────────────────────────┐
│    product_recipes           │ (Recetas)
├──────────────────────────────┤
│ id (PK)                      │
│ product_id (FK)              │ ──→ products
│ recipe_code                  │
│ patient_name                 │
│ prescriber_name              │
│ cie_code                     │
│ deleted_at (soft)            │
└──────────────────────────────┘

┌──────────────────────────────┐
│        users                 │ (Usuarios)
├──────────────────────────────┤
│ id (PK)                      │
│ email (UNIQUE)               │
│ display_name                 │
│ role (enum)                  │
│ is_active                    │
│ last_login                   │
│ created_at                   │
│ updated_at                   │
└──────────────────────────────┘
```

## 💡 Ejemplos de Uso

### Insertar Producto
```sql
INSERT INTO products (name, barcode, stock_inicial, unit_of_measure)
VALUES ('Paracetamol 500mg', 'BAR-001', 100, 'cápsulas')
-- Stock se actualiza automáticamente via trigger
```

### Registrar Movimiento (Entrada)
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES (1, 'entrada', 50, 'Compra a proveedor X')
-- Stock se incrementa automáticamente en producto
```

### Registrar Movimiento (Salida)
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES (1, 'salida', 10, 'Dispensación paciente')
-- Stock se decrementa automáticamente en producto
```

### Crear Lote
```sql
INSERT INTO product_batches (product_id, issue_date, expiration_date, storage_location)
VALUES (1, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Estantería A')
-- batch_number se genera automáticamente (ej: LOTE-20250115-00001)
```

### Consultas Útiles

#### Stock Actual de Producto
```sql
SELECT name, stock FROM product_stock_summary WHERE id = 1;
```

#### Movimientos de Hoy
```sql
SELECT * FROM inventory_movements_with_details 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

#### Productos Próximos a Vencer
```sql
SELECT * FROM products_expiring_soon LIMIT 10;
```

#### Reporte Mensual
```sql
SELECT * FROM monthly_movement_report WHERE EXTRACT(YEAR FROM month) = 2025;
```

#### Productos con Stock Bajo
```sql
SELECT * FROM low_stock_products;
```

## ⚠️ Consideraciones Importantes

### 1. Orden de Ejecución
**DEBES ejecutar en orden 000 → 001 → 002 → 003 → 004**. Cada script depende del anterior.

### 2. Stock Automático
**NO inserts el stock manualmente** en `products`. Se calcula automáticamente con:
```sql
stock = stock_inicial + (entradas - salidas + ajustes)
```

### 3. Soft Delete
Productos, batches y recetas usan `deleted_at` para soft delete:
```sql
-- Borrar (soft)
UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1;

-- Recuperar
UPDATE products SET deleted_at = NULL WHERE id = 1;

-- Vistas ignoran deleted_at = TRUE automáticamente
SELECT * FROM product_stock_summary; -- Solo productos activos
```

### 4. Batch Number
Se genera automáticamente en formato `LOTE-YYYYMMDD-XXXXX`. Ejemplo:
```sql
-- 15 de enero 2025, lote #23
LOTE-20250115-00023
```

### 5. Constraints de FK
Todos los producto_id usan `ON DELETE CASCADE`. Si borras un producto, se borran automáticamente:
- Movimientos de inventario
- Lotes del producto
- Recetas del producto

### 6. Índices
Están optimizados para:
- **Búsquedas**: name, barcode (LIKE queries)
- **Reportes**: product_id + created_at (agregaciones)
- **Filtros**: movement_type, expiration_date, active status

### 7. Vistas
Son solo lectura. Úsalas para reportes, pero inserta/actualiza en tablas base directamente.

## 🛠️ Troubleshooting

### Error: "relation already exists"
Las tablas/índices/vistas ya existen. Ejecuta:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Luego re-ejecuta todos los scripts en orden.

### Error: "FK constraint violation"
El product_id no existe. Asegúrate de que `product_id` existe en tabla `products` antes de insertar movimiento.

### Stock no se actualiza
Verifica que los triggers estén habilitados:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE 'tr_%';
```

Si no ves triggers, re-ejecuta `003_create_triggers.sql`.

## 📈 Próximos Pasos

1. **Ejecuta los 5 scripts** en orden
2. **Verifica estructura**: `\dt` (psql) o usa Supabase dashboard
3. **Crea usuarios**: `INSERT INTO users (...) VALUES (...)`
4. **Carga datos iniciales**: Usa aplicación o scripts de seed (próximamente)
5. **Ejecuta queries de prueba**: Usa ejemplos de arriba

## 📞 Soporte

Si encuentras errores:
1. Verifica orden de ejecución
2. Busca línea de error en script
3. Consulta comentarios en scripts (explicación detallada)
4. Revisa estructura esperada en schema diagram arriba

---

**Última actualización**: 2025
**Base de datos**: PostgreSQL 15+
**Compatible con**: Supabase, AWS RDS, Azure Database for PostgreSQL
