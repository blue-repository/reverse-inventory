# Migración de Campos de Fechas y Recetas en Movimientos

**Fecha**: 20 de enero de 2026  
**Versión de Migración**: 002_add_movement_dates_and_recipe_fields.sql

## 📋 Resumen de Cambios

Se agregaron campos a la tabla `inventory_movements` para:
1. **Gestionar fechas** de movimientos (general e individual por item)
2. **Registrar datos de recetas médicas** en movimientos de salida

## 🆕 Nuevos Campos Agregados

### Campos de Fecha (aplican a TODOS los movimientos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `movement_date` | DATE | Fecha general del movimiento (cuándo se registró la entrada/salida). Default: CURRENT_DATE |
| `item_movement_date` | DATE | Fecha específica de este item particular. Permite que items del mismo movimiento tengan diferentes fechas si es necesario. Default: CURRENT_DATE |

### Campos de Receta Médica (aplican a movimientos de salida tipo receta)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `is_recipe_movement` | BOOLEAN | Flag para indicar si es una receta (TRUE) o movimiento normal (FALSE). Default: FALSE |
| `patient_name` | VARCHAR(255) | Nombre del paciente a quien se entrega el medicamento. Nullable |
| `recipe_date` | DATE | Fecha de la receta médica. Nullable |
| `prescribed_by` | VARCHAR(255) | Nombre del profesional que recetó (médico, odontólogo, etc.). Nullable |
| `cie_code` | VARCHAR(10) | Código CIE-10 del diagnóstico. Ej: J06.9 (Infección aguda de vías respiratorias). Nullable |
| `recipe_notes` | TEXT | Notas adicionales o indicaciones especiales. Nullable |

## 📊 Vistas Útiles Creadas

### 1. `recipe_movements_view`
Filtra automáticamente solo los movimientos de receta (salidas).

```sql
SELECT * FROM recipe_movements_view;
```

**Columnas incluidas**: product_id, product_name, quantity, movement_date, patient_name, recipe_date, prescribed_by, cie_code, etc.

### 2. `movements_with_dates_view`
Muestra todos los movimientos con sus fechas, formateando automáticamente el motivo del movimiento.

```sql
SELECT * FROM movements_with_dates_view;
```

## 🔍 Índices Creados

```
idx_movements_movement_date       - Para búsquedas rápidas por fecha de movimiento
idx_movements_item_movement_date  - Para búsquedas rápidas por fecha de item
```

## 💡 Casos de Uso

### Caso 1: Movimiento Normal (Entrada/Salida)
```sql
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by, is_recipe_movement)
VALUES 
('uuid-producto', 'entrada', 10, '2026-01-20', '2026-01-20', 'Compra a proveedor', 'usuario@bagatela.com', FALSE);
```

### Caso 2: Movimiento de Salida por Receta
```sql
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by, 
 is_recipe_movement, patient_name, recipe_date, prescribed_by, cie_code, recipe_notes)
VALUES 
('uuid-producto', 'salida', 2, '2026-01-20', '2026-01-19', 'Receta médica', 'usuario@bagatela.com',
 TRUE, 'Juan Pérez', '2026-01-18', 'Dr. García', 'J06.9', 'Tomar 1 comprimido cada 8 horas');
```

### Caso 3: Items en un Movimiento con Diferentes Fechas
```sql
-- Movimiento 1
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by)
VALUES 
('uuid-producto-1', 'salida', 5, '2026-01-20', '2026-01-18', 'Uso interno', 'usuario@bagatela.com');

-- Movimiento 2 (mismo producto, pero fecha diferente)
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by)
VALUES 
('uuid-producto-1', 'salida', 3, '2026-01-20', '2026-01-19', 'Uso interno', 'usuario@bagatela.com');
```

## 🔄 Backward Compatibility

- Los campos antiguos se mantienen: `reason`, `notes`, `reporting_unit`, `recorded_by`
- Los nuevos campos son opcionales (nullable, excepto las fechas que tienen defaults)
- Las vistas antiguas siguen funcionando
- No hay cambios en las restricciones existentes

## ⚠️ Consideraciones Importantes

1. **Defaults de Fecha**: `movement_date` e `item_movement_date` usan `CURRENT_DATE` como default. Si necesitas usar fechas diferentes, debes especificarlas explícitamente.

2. **is_recipe_movement**: Usa este campo para filtrar recetas. Los campos de receta (patient_name, recipe_date, etc.) solo son relevantes cuando `is_recipe_movement = TRUE`.

3. **CIE Codes**: Considera validar estos códigos según la clasificación CIE-10 vigente.

4. **Nombres Largos**: Los campos `patient_name` y `prescribed_by` soportan hasta 255 caracteres.

## 🎯 Próximos Pasos en la Aplicación

1. Actualizar el tipo TypeScript `Product` con los nuevos campos
2. Crear un formulario extendido para seleccionar fechas en movimientos
3. Crear un modal o formulario específico para recetas médicas
4. Actualizar el componente `InventoryMovementModal` para incluir:
   - Datepickers para las fechas
   - Toggle para `is_recipe_movement`
   - Campos condicionales para datos de receta
5. Actualizar las acciones del servidor para manejar los nuevos campos
6. Crear vistas/reportes de recetas médicas

## 📚 Documentos Relacionados

- [Base Schema](../app/database/migrations/000_base_schema.sql) - Estructura original
- [Categorías y Especialidades](./001_add_categories_and_specialties.sql) - Migración anterior
- [Useful Queries](../queries/useful_queries.sql) - Ejemplos de consultas
