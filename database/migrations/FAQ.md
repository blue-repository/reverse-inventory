# ❓ FAQ - PostgreSQL Migration Scripts

## Preguntas Frecuentes sobre las Migraciones

---

## 🤔 Preguntas Generales

### P: ¿Por dónde empiezo?
**A:** Lee en este orden:
1. [DATABASE_SETUP.md](DATABASE_SETUP.md) ← Empieza aquí (3 min)
2. [docs/setup/DATABASE_MIGRATIONS.md](docs/setup/DATABASE_MIGRATIONS.md) (5 min)
3. [database/migrations/README.md](database/migrations/README.md) (técnica)

### P: ¿Cuánto toma configurar la BD?
**A:** 5-10 segundos para ejecutar todos los scripts (están optimizados).

### P: ¿Necesito hacer algo especial?
**A:** No, es copy-paste. Abre PostgreSQL/Supabase → SQL Editor → Copia scripts → Pega y ejecuta.

### P: ¿Puedo personalizar los scripts?
**A:** Sí, son SQL estándar. Edita libremente los `.sql` files según necesites.

---

## 🗄️ Sobre la Base de Datos

### P: ¿Qué tablas se crean?
**A:** 5 tablas:
- `products` - Catálogo de productos
- `inventory_movements` - Historial de movimientos (entrada/salida/ajuste)
- `product_batches` - Lotes/partidas de productos
- `product_recipes` - Recetas/prescripciones
- `users` - Usuarios del sistema

### P: ¿Cómo funciona el stock?
**A:** Automático. No lo insertes manualmente. Se calcula así:
```
stock = stock_inicial + (entradas) - (salidas) + (ajustes)
```

### P: ¿Puedo "borrar" datos?
**A:** Sí, con soft delete. No se borra realmente, se marca como eliminado:
```sql
UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1;
-- Recuperar:
UPDATE products SET deleted_at = NULL WHERE id = 1;
```
Las vistas automáticamente excluyen eliminados (deleted_at IS NULL).

### P: ¿Qué son los triggers?
**A:** Automatismos de la BD que se ejecutan automáticamente:
- Actualizan `updated_at` cuando cambias algo
- Validan datos (ej: cantidad > 0)
- Calculan stock cuando registras movimientos
- Auto-generan batch numbers

### P: ¿Y los índices para qué sirven?
**A:** Para velocidad. Hay 21+ índices en:
- Búsqueda: nombre, barcode (búsqueda rápida)
- Reportes: combinaciones product_id + fecha
- Filtros: estado, tipo de movimiento

---

## 🚀 Instalación / Ejecución

### P: ¿Tengo que ejecutar los 5 scripts?
**A:** Sí, TODOS y EN ORDEN:
1. 000_create_helper_functions.sql ← PRIMERO
2. 001_create_tables.sql ← SEGUNDO
3. 002_create_indexes.sql ← TERCERO
4. 003_create_triggers.sql ← CUARTO
5. 004_create_views.sql ← QUINTO

NO ejecutes 005_query_examples.sql (es solo referencia).

### P: ¿Puedo ejecutar en diferente orden?
**A:** ⚠️ NO. Cada uno depende del anterior:
- 001 necesita funciones de 000
- 002 necesita tablas de 001
- 003 necesita tablas de 001 y 002
- 004 necesita tablas de 001 y triggers de 003

### P: ¿Dónde copio los scripts?
**A:** Están en: `database/migrations/000_create_helper_functions.sql`, etc.

### P: ¿Cómo los ejecuto?

**Opción 1: Supabase**
```
1. Ve a https://supabase.com
2. Abre tu proyecto
3. SQL Editor → New Query
4. Copia TODO el contenido del script
5. Pega y clic "Run"
6. Repite para cada script
```

**Opción 2: PostgreSQL Local**
```bash
psql -U postgres -d tu_base_de_datos < 000_create_helper_functions.sql
psql -U postgres -d tu_base_de_datos < 001_create_tables.sql
# etc...
```

**Opción 3: PgAdmin**
```
1. Abre PgAdmin
2. Tu servidor → Databases → Tu BD → Query Tool
3. Copia script
4. Pega y ejecuta (F5)
5. Repite para cada script
```

### P: Ejecuté dos veces por error, ¿qué hago?
**A:** Error "relation 'X' already exists". Soluciones:
```sql
-- Opción 1: Borrar y recrear la BD (recomendado para dev)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Luego ejecuta todos los scripts de nuevo

-- Opción 2: Solo si sabes lo que haces
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
-- ... etc
-- Luego ejecuta de nuevo
```

---

## 💾 Datos / Stock

### P: ¿Cómo inserto un producto?
**A:** 
```sql
INSERT INTO products (name, barcode, stock_inicial, unit_of_measure)
VALUES ('Paracetamol 500mg', 'BAR-001', 100, 'cápsulas');
-- stock se calcula automáticamente = 100
```

### P: ¿Y ahora cómo registro una entrada de stock?
**A:**
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES (1, 'entrada', 50, 'Compra a proveedor X');
-- Stock se actualiza AUTOMÁTICAMENTE a 150
```

### P: ¿Cómo registro una salida (dispensación)?
**A:**
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES (1, 'salida', 10, 'Dispensación paciente');
-- Stock se reduce AUTOMÁTICAMENTE a 140
```

### P: ¿Cómo hago un ajuste de stock?
**A:**
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, notes)
VALUES (1, 'ajuste', -5, 'Pérdida', 'Rotura durante manipulación');
-- Stock se ajusta AUTOMÁTICAMENTE a 135
-- (negativo = reduce, positivo = suma)
```

### P: ¿Cómo veo el stock actual?
**A:**
```sql
SELECT name, stock FROM product_stock_summary WHERE id = 1;
-- O directamente:
SELECT name, stock FROM products WHERE id = 1;
```

### P: ¿Cómo verifico que el stock es correcto?
**A:**
```sql
SELECT * FROM product_movement_history WHERE product_id = 1;
-- Compara: calculated_stock vs current_stock
-- Si son iguales = correcto
```

---

## 📊 Vistas / Reportes

### P: ¿Qué vistas hay?
**A:** 9 vistas útiles:
1. `product_stock_summary` - Stock actual + conteos
2. `product_batches_summary` - Lotes con estado
3. `products_expiring_soon` - Próximos a vencer
4. `inventory_movements_with_details` - Movimientos detallados
5. `product_movement_history` - Historial de stock
6. `daily_movement_summary` - Resumen por día
7. `monthly_movement_report` - Reporte mensual
8. `low_stock_products` - Stock bajo (< 20%)
9. `user_activity_summary` - Actividad usuarios

### P: ¿Cómo uso una vista?
**A:** Son como tablas normales, solo lectura:
```sql
SELECT * FROM product_stock_summary;
-- O con filtros:
SELECT * FROM low_stock_products WHERE stock_percentage < 10;
```

### P: ¿Puedo modificar una vista?
**A:** No, son read-only. Para reportes personalizados, escribe tu propia query (ver 005_query_examples.sql).

---

## 🔐 Seguridad / Auditoría

### P: ¿Cómo sé quién cambió qué?
**A:** Con audit trail automático:
```sql
SELECT * FROM products WHERE id = 1;
-- Ver: created_at (creación), updated_at (último cambio), deleted_at (si fue eliminado)
```

### P: ¿Se borran realmente los datos?
**A:** No, tienen soft delete. Los datos nunca desaparecen:
```sql
SELECT * FROM products WHERE deleted_at IS NULL;  -- Activos
SELECT * FROM products WHERE deleted_at IS NOT NULL;  -- Eliminados (recuperables)
```

### P: ¿Qué sucede si borro un producto?
**A:** En cascada (auto-borra relacionados):
- Se eliminan todos sus movimientos (inventory_movements)
- Se eliminan todos sus lotes (product_batches)
- Se eliminan todas sus recetas (product_recipes)
⚠️ Usa soft delete en lugar de borrar directamente.

---

## 🆘 Errores Comunes

### Error: "Relation 'products' already exists"
**Causa:** Ejecutaste los scripts dos veces
**Solución:** 
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Luego ejecuta todos los scripts de nuevo
```

### Error: "FK constraint violation - insert or update on table 'inventory_movements' violates FK constraint"
**Causa:** El product_id no existe en products
**Solución:**
```sql
-- Primero inserta el producto:
INSERT INTO products (name, barcode, stock_inicial) VALUES ('Prod', 'BAR', 100);

-- Luego el movimiento:
INSERT INTO inventory_movements (product_id, movement_type, quantity)
VALUES (1, 'entrada', 50);
```

### Error: "Stock no se actualiza después de insertar movimiento"
**Causa:** Los triggers no se ejecutaron
**Solución:**
```sql
-- Verifica que los triggers existan:
SELECT * FROM pg_trigger WHERE tgname LIKE 'tr_%';

-- Si no están, re-ejecuta:
-- 003_create_triggers.sql
```

### Error: "Division by zero" en vista de stock
**Causa:** stock_inicial = 0
**Solución:**
```sql
-- Inserta con stock_inicial > 0:
INSERT INTO products (name, barcode, stock_inicial) VALUES ('Prod', 'BAR', 100);
-- NO:
INSERT INTO products (name, barcode, stock_inicial) VALUES ('Prod', 'BAR', 0);
```

### Error: "Syntax error near ..."
**Causa:** Parte del script no se copió bien
**Solución:**
- Copia TODO el contenido del archivo .sql
- Pega completo en SQL Editor
- Ejecuta sin interrupciones

---

## ⚙️ Mantenimiento

### P: ¿Cómo verifico que todo está bien?
**A:** Chequeos rápidos:
```sql
-- 1. ¿Existen todas las tablas?
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- Debería mostrar: 5+

-- 2. ¿Existen todos los triggers?
SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'tr_%';
-- Debería mostrar: 11+

-- 3. ¿Existen todas las vistas?
SELECT COUNT(*) FROM information_schema.views 
WHERE table_schema = 'public' AND table_name NOT LIKE 'pg%';
-- Debería mostrar: 9

-- 4. ¿Stock está correcto?
SELECT * FROM product_movement_history 
WHERE calculated_stock != current_stock;
-- Si está vacío = ✅ OK. Si hay filas = ⚠️ Inconsistencia
```

### P: ¿Cada cuánto debo hacer mantenimiento?
**A:** No necesita. Los triggers mantienen todo automático. Solo:
- Respalda regular (backup diario)
- Monitorea vencimientos (alertas de view)
- Revisa stock bajo (low_stock_products)

### P: ¿Puedo cambiar la estructura después?
**A:** Sí, pero con cuidado:
```sql
-- Agregar columna:
ALTER TABLE products ADD COLUMN nueva_columna VARCHAR(255);

-- Eliminar columna (⚠️ cuidado, puede afectar triggers):
ALTER TABLE products DROP COLUMN nombre_columna;

-- Ver estructura:
\d products  -- psql
DESCRIBE products;  -- Algunos sistemas
```

---

## 🔄 Migraciones Futuras

### P: ¿Cómo agrego nuevas columnas?
**A:** En producción, crea un nuevo archivo de migración:
```sql
-- 006_add_new_columns.sql
ALTER TABLE products ADD COLUMN categoria VARCHAR(255);
ALTER TABLE products ADD COLUMN proveedor VARCHAR(255);
```

### P: ¿Cómo cambio un tipo de dato?
**A:** Con conversión:
```sql
-- De VARCHAR a INTEGER:
ALTER TABLE products 
ALTER COLUMN stock_inicial TYPE INTEGER USING stock_inicial::INTEGER;
```

### P: ¿Cómo agrego una nueva vista?
**A:**
```sql
CREATE OR REPLACE VIEW mi_vista AS
SELECT id, name, stock FROM products WHERE deleted_at IS NULL;
```

---

## 📞 Soporte

**Si encuentras errores:**
1. Copia el error completo
2. Verifica qué script fallaba
3. Lee comentarios en ese script (explicación de cada sección)
4. Busca en este FAQ
5. Revisa PostgreSQL docs: https://www.postgresql.org/docs/

---

## 🎓 Siguientes Pasos

1. ✅ **BD configurada** - Scripts ejecutados
2. 🔌 **Conectar desde Next.js** - Ver docs/setup/ (próximamente)
3. 🎯 **Crear APIs** - Ver docs/features/
4. 📊 **Reportes** - Ver docs/reports/

---

**Última actualización**: 2025
**Versión**: PostgreSQL 15+
**Compatible**: Supabase, AWS RDS, Azure Database
