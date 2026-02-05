# 📊 Estructura de Base de Datos

## Descripción General

La base de datos utiliza PostgreSQL (a través de Supabase) y contiene tablas para gestionar productos, movimientos de inventario y lotes.

---

## 📋 Tabla: `products`

Almacena información de todos los productos en el inventario.

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | ✅ | Identificador único, generado automáticamente |
| `name` | TEXT | ✅ | Nombre del producto |
| `barcode` | TEXT | ❌ | Código de barras |
| `description` | TEXT | ❌ | Descripción detallada |
| `stock` | INTEGER | ✅ | Stock actual (calculado automáticamente) |
| `stock_inicial` | INTEGER | ✅ | Stock inicial del producto |
| `unit_of_measure` | TEXT | ❌ | Unidad de medida (mg, ml, g, unidades, etc.) |
| `administration_route` | TEXT | ❌ | Vía de administración (oral, inyectable, etc.) |
| `notes` | TEXT | ❌ | Notas adicionales |
| `issue_date` | DATE | ❌ | Fecha de expedición |
| `expiration_date` | DATE | ❌ | Fecha de expiración |
| `image_url` | TEXT | ❌ | URL de imagen del producto |
| `created_at` | TIMESTAMP | ✅ | Fecha de creación (auto) |
| `updated_at` | TIMESTAMP | ✅ | Última actualización (auto) |
| `deleted_at` | TIMESTAMP | ❌ | Soft delete (NULL si activo) |

### Índices

- Índice en `name` para búsqueda rápida
- Índice en `barcode` para escaneo
- Índice en `deleted_at` para soft delete

### Ejemplo de Dato

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Paracetamol 500mg",
  "barcode": "7501234567890",
  "description": "Analgésico y antipirético",
  "stock": 75,
  "stock_inicial": 50,
  "unit_of_measure": "comprimido",
  "administration_route": "oral",
  "notes": "Almacenar a temperatura ambiente",
  "issue_date": "2025-01-01",
  "expiration_date": "2027-12-31",
  "image_url": "https://...",
  "created_at": "2025-01-10T14:30:00Z",
  "updated_at": "2025-01-15T10:00:00Z",
  "deleted_at": null
}
```

---

## 📊 Tabla: `inventory_movements`

Registro de todas las entradas, salidas y ajustes de inventario.

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | ✅ | Identificador único |
| `product_id` | UUID | ✅ | Referencia a `products.id` (FK) |
| `movement_type` | TEXT | ✅ | Tipo: 'entrada', 'salida', 'ajuste' |
| `quantity` | INTEGER | ✅ | Cantidad movida (siempre positivo) |
| `reason` | TEXT | ❌ | Motivo del movimiento |
| `notes` | TEXT | ❌ | Notas adicionales |
| `created_at` | TIMESTAMP | ✅ | Fecha del movimiento (auto) |
| `updated_at` | TIMESTAMP | ✅ | Última actualización (auto) |

### Índices

- Índice en `product_id` para búsqueda por producto
- Índice en `created_at` para reportes por fecha
- Índice compuesto en `(product_id, created_at)` para optimizar queries

### Ejemplo de Dato

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440111",
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "movement_type": "entrada",
  "quantity": 25,
  "reason": "Compra",
  "notes": "Factura #12345 - Proveedor XYZ",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

## 📈 Vista: `product_stock_summary`

Calcula el stock actual en tiempo real para cada producto.

### Query

```sql
SELECT 
  p.id,
  p.name,
  p.stock_inicial,
  p.stock_inicial + COALESCE(SUM(CASE 
    WHEN im.movement_type = 'entrada' THEN im.quantity 
    ELSE -im.quantity 
  END), 0) AS stock_actual,
  p.updated_at
FROM products p
LEFT JOIN inventory_movements im ON p.id = im.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.stock_inicial, p.updated_at;
```

### Cálculo

```
stock_actual = stock_inicial + SUM(entradas) - SUM(salidas)
```

### Ejemplo

```
Stock Inicial: 100
+ Entrada (Compra): 50
+ Entrada (Devolución): 10
- Salida (Venta): 30
- Salida (Rotura): 5
= Stock Actual: 125
```

---

## 🔗 Relaciones

```
products (1) ──── (N) inventory_movements
   ↑
   └─ FK: product_id
```

---

## 🔐 Soft Delete

Los productos nunca se eliminan físicamente, solo se marcan como eliminados:

```sql
-- Eliminación (marca como eliminado)
UPDATE products SET deleted_at = NOW() WHERE id = ?;

-- Recuperación (deshace la eliminación)
UPDATE products SET deleted_at = NULL WHERE id = ?;

-- Mostrar solo activos
WHERE deleted_at IS NULL;
```

---

## ⏰ Triggers Automáticos

### `update_products_updated_at`
Actualiza automáticamente `updated_at` cada vez que se modifica un producto:

```sql
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

### `update_inventory_movements_updated_at`
Similar para movimientos de inventario.

---

## 📊 Migraciones Realizadas

### Paso 1: Crear Tabla `inventory_movements`
```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Paso 2: Agregar Campos a `products`
```sql
ALTER TABLE products
ADD COLUMN stock_inicial INTEGER DEFAULT 0,
ADD COLUMN created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
```

### Paso 3: Crear Vista
```sql
CREATE VIEW product_stock_summary AS
SELECT ... (ver query arriba)
```

---

## 🎯 Casos de Uso

### Crear Producto
```sql
INSERT INTO products (name, barcode, stock, stock_inicial)
VALUES ('Paracetamol 500mg', '7501234567890', 50, 50);
```

### Registrar Entrada (Compra)
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, notes)
VALUES ('550e...', 'entrada', 25, 'Compra', 'Factura #123');
```

### Registrar Salida (Venta)
```sql
INSERT INTO inventory_movements (product_id, movement_type, quantity, reason)
VALUES ('550e...', 'salida', 5, 'Venta');
```

### Obtener Stock Actual
```sql
SELECT stock_actual FROM product_stock_summary WHERE id = '550e...';
```

### Eliminar (Soft Delete)
```sql
UPDATE products SET deleted_at = NOW() WHERE id = '550e...';
```

---

## 📈 Estadísticas Típicas

Para un farmacia:
- **Productos:** 500 - 2000
- **Movimientos mensuales:** 5000 - 50000
- **Tamaño de tabla de movimientos:** Crece 2-10 GB/año

---

## 🔒 Seguridad

- Todas las modificaciones requieren autenticación
- RLS (Row Level Security) debe estar configurado en Supabase
- El soft delete permite auditoría y recuperación
- Las timestamps automáticas registran auditoría

---

## 🚀 Optimización

### Índices Recomendados

```sql
-- Búsqueda de productos
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Soft delete
CREATE INDEX idx_products_deleted_at ON products(deleted_at)
WHERE deleted_at IS NOT NULL;

-- Movimientos
CREATE INDEX idx_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX idx_movements_composite ON inventory_movements(product_id, created_at DESC);
```

### Queries Optimizadas

```sql
-- Stock de productos activos
SELECT id, name, stock FROM products WHERE deleted_at IS NULL;

-- Últimos movimientos de un producto
SELECT * FROM inventory_movements 
WHERE product_id = ? 
ORDER BY created_at DESC 
LIMIT 50;

-- Movimientos en un rango de fechas
SELECT * FROM inventory_movements 
WHERE created_at BETWEEN ? AND ? 
ORDER BY created_at DESC;
```

---

**Última actualización:** 5 de febrero de 2026
