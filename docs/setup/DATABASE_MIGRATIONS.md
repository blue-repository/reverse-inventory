# 📊 Database Setup Guide - Bagatela Inventory

**¿Necesitas configurar la base de datos PostgreSQL de desarrollo?** Esta guía te lleva paso a paso.

## 🚀 Start Here: 3 Pasos

### 1️⃣ Accede a tu PostgreSQL / Supabase
```bash
# Si usas Supabase:
# 1. Ve a https://supabase.com
# 2. Abre tu proyecto
# 3. SQL Editor → New Query

# Si usas PostgreSQL local:
psql -U postgres -d bagatela_inventory
```

### 2️⃣ Copia y ejecuta los scripts en orden
Los scripts están en `database/migrations/`:

```sql
-- Copia TODO el contenido de cada archivo EN ORDEN:
1. 000_create_helper_functions.sql
2. 001_create_tables.sql
3. 002_create_indexes.sql
4. 003_create_triggers.sql
5. 004_create_views.sql

-- OPCIONAL:
- 005_query_examples.sql (referencia, NO ejecutar)
```

### 3️⃣ ✅ Verifica que funciona
```sql
-- Comprueba que las tablas existan:
SELECT * FROM pg_tables WHERE schemaname = 'public';

-- Debería mostrar: products, inventory_movements, product_batches, product_recipes, users

-- Comprueba que los triggers existan:
SELECT * FROM pg_trigger WHERE tgname LIKE 'tr_%';

-- Debería mostrar 11+ triggers

-- Comprueba que las vistas existan:
SELECT * FROM information_schema.views WHERE table_schema = 'public';

-- Debería mostrar 9 vistas
```

---

## 📁 Archivos de Migración

### `000_create_helper_functions.sql`
- **Qué**: 2 funciones reutilizables
- **Para qué**: Usadas por los triggers (timestamps, validación)
- **Tiempo**: < 1 segundo
- **Ejecuta PRIMERO**

### `001_create_tables.sql`
- **Qué**: 5 tablas principales
- **Tablas**: products, inventory_movements, product_batches, product_recipes, users
- **Tiempo**: < 1 segundo
- **Ejecuta SEGUNDO**

### `002_create_indexes.sql`
- **Qué**: 21+ índices para performance
- **Optimizaciones**: Búsqueda (name/barcode), reportes, filtros
- **Tiempo**: 1-2 segundos
- **Ejecuta TERCERO**

### `003_create_triggers.sql`
- **Qué**: 11 triggers automáticos
- **Lógica**: Stock calculation, timestamps, validación, batch numbers
- **Tiempo**: 1-2 segundos
- **Ejecuta CUARTO**

### `004_create_views.sql`
- **Qué**: 9 vistas útiles
- **Vistas**: product_stock_summary, low_stock_products, products_expiring_soon, etc.
- **Tiempo**: < 1 segundo
- **Ejecuta QUINTO**

### `005_query_examples.sql`
- **Qué**: 28 ejemplos de queries
- **Para**: Referencia (NO ejecutar - solo leer)
- **Uso**: Copiar queries para reportes/dashboards

---

## 🎯 Diagrama de Tablas

```
┌─────────────────┐
│    products     │ (Maestro)
│ - name          │
│ - barcode       │
│ - stock         │ ← AUTOMÁTICO (triggers)
│ - stock_inicial │
│ - deleted_at    │
└─────────────────┘
        ↓
┌──────────────────────────┐
│ inventory_movements      │ (Historial)
│ - product_id (FK)        │
│ - movement_type          │
│ - quantity               │
│ - created_at             │
└──────────────────────────┘

┌──────────────────────────┐
│  product_batches         │ (Lotes)
│ - product_id (FK)        │
│ - batch_number           │ ← AUTO
│ - stock                  │
│ - expiration_date        │
└──────────────────────────┘

┌──────────────────────────┐
│ product_recipes          │ (Recetas)
│ - product_id (FK)        │
│ - recipe_code            │
│ - patient_name           │
│ - prescriber_name        │
└──────────────────────────┘

┌──────────────────────────┐
│      users               │ (Usuarios)
│ - email (UNIQUE)         │
│ - role                   │
│ - is_active              │
│ - last_login             │
└──────────────────────────┘

VISTAS (lectura):
- product_stock_summary
- low_stock_products
- products_expiring_soon
- inventory_movements_with_details
- product_movement_history
- daily_movement_summary
- monthly_movement_report
- product_batches_summary
- user_activity_summary
```

---

## ⚡ Quick Start: Ejemplos

### Insertar un Producto
```sql
INSERT INTO products (name, barcode, stock_inicial, unit_of_measure)
VALUES ('Paracetamol 500mg', 'BAR-001', 100, 'cápsulas');
-- stock se calcula automáticamente (= 100)
```

### Registrar Entrada de Stock
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES (1, 'entrada', 50, 'Compra proveedor');
-- stock de product 1 se actualiza a 150 automáticamente
```

### Registrar Salida de Stock
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES (1, 'salida', 10, 'Dispensación');
-- stock de product 1 se reduce a 140 automáticamente
```

### Ver Stock Actual
```sql
SELECT name, stock FROM product_stock_summary WHERE id = 1;
```

### Ver Productos con Stock Bajo
```sql
SELECT * FROM low_stock_products;
```

### Ver Productos Próximos a Vencer
```sql
SELECT * FROM products_expiring_soon WHERE urgencia != 'OK';
```

---

## 📋 Checklist de Configuración

- [ ] Accediste a PostgreSQL / Supabase
- [ ] Ejecutaste 000_create_helper_functions.sql
- [ ] Ejecutaste 001_create_tables.sql
- [ ] Ejecutaste 002_create_indexes.sql
- [ ] Ejecutaste 003_create_triggers.sql
- [ ] Ejecutaste 004_create_views.sql
- [ ] Verificaste que todas las tablas existan
- [ ] Verificaste que todos los triggers existan
- [ ] Probaste insertar un producto de prueba
- [ ] Probaste registrar un movimiento de stock
- [ ] Verificaste que el stock se actualiza automáticamente

---

## 🔑 Conceptos Clave

### Stock Automático
El stock NO se inserta manualmente. Se calcula con triggers:
```
stock = stock_inicial + (entradas - salidas + ajustes)
```

### Soft Delete
Productos/lotes/recetas NO se borran (se guardan para auditoría):
```sql
-- "Borrar"
UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1;

-- "Recuperar"
UPDATE products SET deleted_at = NULL WHERE id = 1;

-- Las vistas ignoran automáticamente deleted_at ≠ NULL
```

### Batch Number Automático
Se genera en formato `LOTE-YYYYMMDD-XXXXX`:
```sql
INSERT INTO product_batches (product_id, issue_date, expiration_date, storage_location)
VALUES (1, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Estantería A');
-- batch_number se genera automáticamente (ej: LOTE-20250115-00001)
```

### Audit Trail
Todas las tablas tienen timestamps automáticos:
- `created_at` - Cuándo se creó
- `updated_at` - Última modificación (auto-actualizado)
- `deleted_at` - Cuándo se "borró" (NULL = activo)

---

## ⚠️ Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Relation already exists" | Scripts ejecutados 2x | Ejecuta SOLO 1 vez por BD |
| "FK constraint violation" | product_id no existe | Crea primero el producto |
| "Stock no se actualiza" | Triggers no habilitados | Reejecutar 003_create_triggers.sql |
| "Division by zero" | stock_inicial = 0 | No insertes con stock_inicial = 0 |

---

## 📚 Documentación Completa

Para más detalles, lee:
- **migrations/README.md** - Documentación técnica completa
- **migrations/005_query_examples.sql** - 28+ ejemplos de queries
- **setup/DATABASE_STRUCTURE.md** - Diseño de esquema

---

## 🎓 Próximos Pasos

1. ✅ **Setup completado** - Base de datos lista
2. 🔄 **Conectar desde Next.js** - Ver docs/setup/DATABASE_CONNECTION.md
3. 📊 **Crear APIs** - Ver docs/features/INVENTORY_SYSTEM.md
4. 📈 **Reportes** - Ver docs/reports/REPORTS_GUIDE.md

---

**¿Necesitas ayuda?** Lee:
- PostgreSQL docs: https://www.postgresql.org/docs/
- Supabase docs: https://supabase.com/docs
- SQL queries: Ver 005_query_examples.sql

**¿Quieres ver todas las vistas disponibles?**
```sql
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';
```

**¿Quieres ver todos los triggers?**
```sql
SELECT tgname, tgrelname FROM pg_trigger WHERE tgname LIKE 'tr_%';
```

---

✅ **Status**: Listo para usar
🔒 **Seguridad**: Soft delete, audit trail, constraints
⚡ **Performance**: 21+ índices optimizados
🤖 **Automatización**: 11 triggers para lógica de negocio
