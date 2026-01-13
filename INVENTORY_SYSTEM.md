# Sistema de Gestión de Inventario - Documentación

## 📋 Estructura de Base de Datos

### Tabla: `products`
Almacena información de los productos con auditoría completa.

**Campos:**
- `id` (UUID) - Identificador único
- `name` (TEXT) - Nombre del producto
- `barcode` (TEXT) - Código de barras
- `description` (TEXT) - Descripción del producto
- `stock` (INTEGER) - Stock actual calculado
- `stock_inicial` (INTEGER) - Stock inicial del producto
- `unit_of_measure` (TEXT) - Unidad de medida (mg, ml, g, unidades, etc.)
- `administration_route` (TEXT) - Vía de administración
- `notes` (TEXT) - Notas adicionales
- `issue_date` (DATE) - Fecha de expedición
- `expiration_date` (DATE) - Fecha de expiración
- `image_url` (TEXT) - URL de imagen del producto
- `created_at` (TIMESTAMP) - Fecha de creación
- `updated_at` (TIMESTAMP) - Fecha de última actualización
- `deleted_at` (TIMESTAMP) - Fecha de eliminación (soft delete)

### Tabla: `inventory_movements`
Registro de todas las entradas, salidas y ajustes de inventario.

**Campos:**
- `id` (UUID) - Identificador único
- `product_id` (UUID) - Referencia al producto
- `movement_type` (TEXT) - Tipo: 'entrada', 'salida', 'ajuste'
- `quantity` (INTEGER) - Cantidad movida
- `reason` (TEXT) - Motivo del movimiento
- `notes` (TEXT) - Notas adicionales
- `created_at` (TIMESTAMP) - Fecha de registro
- `updated_at` (TIMESTAMP) - Fecha de última actualización

### Vista: `product_stock_summary`
Calcula el stock actual en tiempo real.

```sql
SELECT 
  p.id,
  p.name,
  p.stock_inicial,
  p.stock_inicial + SUM(CASE WHEN im.movement_type = 'entrada' 
    THEN im.quantity ELSE -im.quantity END) AS stock_actual,
  p.updated_at
FROM products p
LEFT JOIN inventory_movements im ON p.id = im.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.stock_inicial, p.updated_at;
```

---

## 🎯 Funcionalidades Implementadas

### 1. Crear Producto
```typescript
createProduct(formData: FormData)
```
- Recibe datos del formulario
- Automáticamente asigna `stock_inicial = stock`
- Establece `created_at` y `updated_at`

**Datos requeridos:**
- Nombre (obligatorio)
- Stock inicial (obligatorio)
- Código de barras, descripción, etc. (opcionales)

---

### 2. Registrar Movimiento de Inventario
```typescript
recordInventoryMovement(
  productId: string,
  movementType: MovementType,  // 'entrada' | 'salida' | 'ajuste'
  quantity: number,
  reason?: string,
  notes?: string
)
```

**Tipos de movimiento:**

| Tipo | Icono | Motivos |
|------|-------|---------|
| **Entrada** | 📥 | Compra, Devolución de cliente, Reposición |
| **Salida** | 📤 | Venta, Devolución a proveedor, Pérdida, Rotura, Expiración |
| **Ajuste** | ⚙️ | Corrección de inventario, Ajuste administrativo |

**Proceso:**
1. Inserta el registro en `inventory_movements`
2. Recalcula el stock actual desde la vista
3. Actualiza el campo `stock` en la tabla `products`
4. Invalida la caché para refrescar la UI

---

### 3. Ver Historial de Movimientos
```typescript
getProductMovements(productId: string, limit: number = 50)
```
- Retorna movimientos ordenados por fecha descendente
- Incluye cantidad, tipo, motivo, notas y fecha

**Respuesta:**
```typescript
{
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}[]
```

---

### 4. Obtener Resumen de Stock
```typescript
getProductStockSummary(productId: string)
```
- Retorna el resumen de un producto
- Incluye: nombre, stock_inicial, stock_actual

```typescript
getProductsStockSummary()
```
- Retorna el resumen de todos los productos no eliminados

---

## 📱 Componentes de UI

### `InventoryMovementModal`
Modal para registrar movimientos de entrada, salida o ajuste.

**Features:**
- Selector de tipo de movimiento con colores
- Dropdown de motivos predefinidos por tipo
- Campo de cantidad con validación
- Campo de notas opcional
- Mostrador de stock inicial y actual
- Responsive (mobile-first)

### `InventoryHistoryModal`
Modal para visualizar el historial de movimientos de un producto.

**Features:**
- Lista de movimientos ordenados por fecha descendente
- Colores por tipo de movimiento
- Información de cantidad, motivo, fecha y notas
- Estado de carga
- Mensaje cuando no hay movimientos
- Responsive

### `ProductDetailsModal` (Actualizado)
Ahora incluye tres botones de acción:

1. **Editar** (gris) - Editar información del producto
2. **Movimiento** (azul) - Registrar entrada/salida/ajuste
3. **Historial** (gris oscuro) - Ver historial de movimientos

---

## 🔄 Flujo de Datos

```
Crear Producto
    ↓
stock_inicial = stock
    ↓
Registrar Movimiento
    ↓
Validar cantidad > 0
    ↓
Insertar en inventory_movements
    ↓
Recalcular desde product_stock_summary
    ↓
Actualizar stock en products
    ↓
Refrescar UI
```

---

## 📊 Cálculo de Stock

**Stock Actual = Stock Inicial + Entradas - Salidas**

Ejemplo:
```
Stock Inicial: 100 unidades
+ Entrada (Compra): 50 unidades
+ Entrada (Devolución): 10 unidades
- Salida (Venta): 30 unidades
- Salida (Rotura): 5 unidades
= Stock Actual: 125 unidades
```

---

## 🗑️ Soft Delete

Los productos no se eliminan físicamente, solo se marca su `deleted_at`.

```typescript
// Eliminación
UPDATE products SET deleted_at = NOW() WHERE id = ?

// Recuperación
UPDATE products SET deleted_at = NULL WHERE id = ?

// Mostrar solo no eliminados
WHERE deleted_at IS NULL
```

---

## 🔧 Triggers Automáticos

### `update_products_updated_at`
Actualiza automáticamente `updated_at` cuando se modifica un producto.

### `update_inventory_movements_updated_at`
Actualiza automáticamente `updated_at` cuando se modifica un movimiento.

---

## 📈 Casos de Uso

### 1. Compra de productos
```typescript
await recordInventoryMovement(
  productId,
  'entrada',
  50,
  'Compra',
  'Factura #12345 - Proveedor XYZ'
);
```

### 2. Venta de productos
```typescript
await recordInventoryMovement(
  productId,
  'salida',
  5,
  'Venta',
  'Número de venta #789'
);
```

### 3. Corrección de inventario
```typescript
await recordInventoryMovement(
  productId,
  'ajuste',
  10,
  'Corrección de inventario',
  'Diferencia encontrada en conteo físico'
);
```

---

## 🎨 Colores y Estados

| Estado | Color | Descripción |
|--------|-------|-------------|
| Stock > 0 | 🟢 Verde | Stock disponible |
| Stock = 0 | 🟡 Ámbar | Sin stock |
| Entrada | 🟢 Verde | Movimiento de entrada |
| Salida | 🔴 Rojo | Movimiento de salida |
| Ajuste | 🔵 Azul | Ajuste de inventario |

---

## 🚀 Próximas Mejoras (Opcionales)

- [ ] Reportes de inventario por período
- [ ] Alertas de stock bajo
- [ ] Auditoría de cambios
- [ ] Exportar historial a Excel
- [ ] Proyección de stock
- [ ] Análisis de rotación de productos
- [ ] Búsqueda avanzada en historial
