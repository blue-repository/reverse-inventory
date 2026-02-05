# 🗄️ DATABASE SETUP - Start Here

## ¿Necesitas configurar la base de datos PostgreSQL para desarrollo?

👉 **Lee primero**: [docs/setup/DATABASE_MIGRATIONS.md](docs/setup/DATABASE_MIGRATIONS.md)

---

## 📋 Archivos de Migración

Todos los scripts SQL están en: **`database/migrations/`**

| Archivo | Descripción | Ejecutar |
|---------|-------------|---------|
| `000_create_helper_functions.sql` | Funciones helper para triggers | 1️⃣ PRIMERO |
| `001_create_tables.sql` | 5 tablas principales | 2️⃣ SEGUNDO |
| `002_create_indexes.sql` | 21+ índices optimizados | 3️⃣ TERCERO |
| `003_create_triggers.sql` | 11 triggers automáticos | 4️⃣ CUARTO |
| `004_create_views.sql` | 9 vistas útiles | 5️⃣ QUINTO |
| `README.md` | Documentación completa | 📖 LEER |

---

## 🚀 Quick Start (3 pasos)

### 1. Abre PostgreSQL / Supabase
```
Tu base de datos PostgreSQL (local o Supabase)
```

### 2. Copia y ejecuta scripts EN ORDEN
```sql
-- Abre cada archivo y copia TODO el contenido
-- Pega en: PostgreSQL / Supabase SQL Editor
-- En orden: 000 → 001 → 002 → 003 → 004
```

### 3. Verifica que funcionó
```sql
SELECT * FROM pg_tables WHERE schemaname = 'public';
-- Debería mostrar: products, inventory_movements, product_batches, product_recipes, users
```

---

## ✨ Lo que se crea

- ✅ **5 Tablas**: products, inventory_movements, product_batches, product_recipes, users
- ✅ **21+ Índices**: Optimizados para búsqueda y reportes
- ✅ **11 Triggers**: Auto-actualizar stock, timestamps, validación
- ✅ **9 Vistas**: product_stock_summary, low_stock_products, products_expiring_soon, etc.

---

## 📚 Documentación

- **[docs/setup/DATABASE_MIGRATIONS.md](docs/setup/DATABASE_MIGRATIONS.md)** ← Lee primero (guía rápida)
- **[database/migrations/README.md](database/migrations/README.md)** ← Documentación técnica completa
- **[database/migrations/SUMMARY.md](database/migrations/SUMMARY.md)** ← Resumen de lo que se crea
- **[database/migrations/005_query_examples.sql](database/migrations/005_query_examples.sql)** ← 28 ejemplos de queries

---

## 💡 Conceptos Clave

**Stock Automático**
```sql
-- NO insertes stock manualmente
-- Se calcula automáticamente: stock = stock_inicial + entradas - salidas
INSERT INTO products (name, barcode, stock_inicial) VALUES ('Producto', 'BAR-001', 100);
-- stock se calcula como 100
```

**Movimientos Automáticos**
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES (1, 'entrada', 50, 'Compra');
-- El trigger actualiza automáticamente: product.stock += 50
```

**Batch Numbers Auto-generados**
```sql
INSERT INTO product_batches (product_id, issue_date, expiration_date, storage_location)
VALUES (1, CURRENT_DATE, CURRENT_DATE + '1 year'::interval, 'Estantería A');
-- batch_number se genera automáticamente: LOTE-20250115-00001
```

---

## ⚠️ Importante

1. **Ejecuta EN ORDEN**: 000 → 001 → 002 → 003 → 004
2. **No insertes stock manualmente** - Se calcula automáticamente
3. **No ejecutes 005_query_examples.sql** - Es referencia, no migración
4. **Solo primera vez** - Ejecuta scripts UNA SOLA VEZ por base de datos

---

## ❓ Preguntas

**P: ¿Puedo usar estos scripts con Supabase?**
A: Sí, copia y pega en SQL Editor de Supabase

**P: ¿Cuánto tiempo toma?**
A: 5-10 segundos para ejecutar todos

**P: ¿Qué pasa si ejecuto dos veces?**
A: Error "relation already exists". Usa DROP DATABASE y recrea.

**P: ¿Cómo conecto desde Next.js?**
A: Ver `docs/setup/DATABASE_CONNECTION.md` (próximamente)

---

✅ **Status**: Listo para usar
🔒 **Seguridad**: Soft delete, audit trail, constraints, FK
⚡ **Performance**: 21+ índices optimizados
🤖 **Automático**: Stock, timestamps, batch numbers

**Próximo paso**: Lee [docs/setup/DATABASE_MIGRATIONS.md](docs/setup/DATABASE_MIGRATIONS.md)
