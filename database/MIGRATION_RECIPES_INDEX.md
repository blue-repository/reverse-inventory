# 📑 Índice - Migración de Recetas y Fechas en Movimientos

**Fecha**: 20 de enero de 2026  
**Versión**: 2.0  
**Estado**: Listo para ejecutar en Supabase

---

## 📂 Archivos Creados / Modificados

### 1. 🔄 Migración SQL

**Archivo**: [migrations/002_add_movement_dates_and_recipe_fields.sql](./migrations/002_add_movement_dates_and_recipe_fields.sql)

- **Contenido**: Script SQL completo para agregar campos y vistas
- **Tamaño**: ~400 líneas
- **Tiempo estimado de ejecución**: 2-5 segundos
- **Cambios**:
  - Agrega 8 nuevos campos a `inventory_movements`
  - Crea 2 índices
  - Crea 2 vistas de consulta
  - Incluye comentarios de documentación

**📌 IMPORTANTE**: Este es el archivo que debes ejecutar en Supabase SQL Editor

---

### 2. 📖 Documentación - Guía de Referencia

**Archivo**: [MIGRATION_RECIPES_README.md](./MIGRATION_RECIPES_README.md)

- **Propósito**: Documentación de referencia rápida
- **Secciones**:
  - Resumen de cambios
  - Tabla de nuevos campos
  - Vistas útiles creadas
  - Índices creados
  - Casos de uso
  - Backward compatibility
  - Consideraciones importantes
  - Próximos pasos

**👉 Lee esto**: Para entender QUÉ se agregó y POR QUÉ

---

### 3. 🎯 Guía Visual y Ejemplos

**Archivo**: [RECIPE_MOVEMENTS_VISUAL_GUIDE.md](./RECIPE_MOVEMENTS_VISUAL_GUIDE.md)

- **Propósito**: Visualización de estructura y ejemplos prácticos
- **Secciones**:
  - Tabla visual de campos
  - 4 ejemplos JSON de registros
  - Flujo de trabajo para registrar recetas
  - Formato de fechas y diferencias
  - Vistas disponibles
  - Índices para búsquedas
  - Casos de uso completos
  - Checklist de migración

**👉 Lee esto**: Para ver CÓMO se estructuran los datos

---

### 4. ⚡ Guía de Ejecución

**Archivo**: [MIGRATION_EXECUTION_GUIDE.md](./MIGRATION_EXECUTION_GUIDE.md)

- **Propósito**: Instrucciones paso a paso
- **Secciones**:
  - Inicio rápido (3 pasos)
  - Validaciones post-migración (4 pruebas)
  - Pruebas funcionales (4 ejemplos)
  - Troubleshooting
  - Próximos pasos en la aplicación
  - Checklist

**👉 Lee esto**: Para CÓMO EJECUTAR la migración

---

### 5. 🔍 Queries Útiles

**Archivo**: [queries/recipe_movements_queries.sql](./queries/recipe_movements_queries.sql)

- **Propósito**: Colección de queries para trabajar con los nuevos campos
- **Incluye**: Validación, consultas por fecha, recetas, grupos, reportes

### 6. 🎯 Guía de Estructura

**Archivo**: [MOVEMENT_GROUPS_EXPLANATION.md](./MOVEMENT_GROUPS_EXPLANATION.md)

- **Propósito**: Explicación detallada de cómo funcionan los grupos y valores generales/específicos
- **Incluye**: 
  - Concepto de agrupación
  - Estructura de datos
  - Lógica de resolución (general vs específico)
  - Consultas con COALESCE
  - Flujo en la APP

### 7. 📚 Caso de Uso Completo

**Archivo**: [COMPLETE_USE_CASE_EXAMPLE.md](./COMPLETE_USE_CASE_EXAMPLE.md)

- **Propósito**: Ejemplo paso a paso de registro de receta con múltiples medicinas
- **Incluye**:
  - Datos de entrada
  - Frontend form
  - Backend processing
  - Inserts SQL
  - Consultas y resultados
  - Casos especiales

---

## 🚀 Plan de Acción

### Fase 1: Base de Datos (HOY) ✅

**Estado**: Archivos listos

```
1. Lee: MIGRATION_RECIPES_README.md
   ↓
2. Lee: RECIPE_MOVEMENTS_VISUAL_GUIDE.md
   ↓
3. Copia: migrations/002_add_movement_dates_and_recipe_fields.sql
   ↓
4. Ejecuta en Supabase SQL Editor
   ↓
5. Valida usando: MIGRATION_EXECUTION_GUIDE.md (sección de validación)
   ↓
6. Guarda: queries/recipe_movements_queries.sql en tus favoritos
```

### Fase 2: Código TypeScript (DESPUÉS) ⏳

**Próximos archivos a modificar**:
- `app/types/product.ts` - Agregar campos al tipo `InventoryMovement`
- `app/actions/products.ts` - Actualizar funciones de CRUD
- `app/components/InventoryMovementModal.tsx` - Agregar UI para nuevos campos
- `app/components/ProductsTable.tsx` - Mostrar información de recetas
- Crear nuevo componente: `RecipeMovementForm.tsx`

---

## 📋 Nuevos Campos en `inventory_movements`

### Campo de Agrupación

| Campo | Tipo | Default | Nullable | Descripción |
|-------|------|---------|----------|-------------|
| `movement_group_id` | UUID | - | SÍ | Agrupa todos los items del mismo movimiento |

### Campo de Fecha (TODOS los movimientos)

| Campo | Tipo | Default | Nullable | Descripción |
|-------|------|---------|----------|-------------|
| `movement_date` | DATE | - | SÍ | Fecha general o específica del item |

### Campos de Receta (Solo si `is_recipe_movement = TRUE`)

| Campo | Tipo | Default | Nullable | Descripción |
|-------|------|---------|----------|-------------|
| `is_recipe_movement` | BOOLEAN | FALSE | NO | Flag para indicar receta |
| `patient_name` | VARCHAR(255) | - | SÍ | Nombre del paciente (general o específico) |
| `recipe_date` | DATE | - | SÍ | Fecha de la receta (general o específica) |
| `prescribed_by` | VARCHAR(255) | - | SÍ | Profesional que recetó (general o específico) |
| `cie_code` | VARCHAR(10) | - | SÍ | Código diagnóstico (general o específico) |
| `recipe_notes` | TEXT | - | SÍ | Indicaciones especiales |

**⭐ Nota**: Los campos de receta pueden ser **GENERAL** (aplica a todos los items del grupo) o **ESPECÍFICO** (sobrescribe el general para ese item)

---

## 🔍 Índices Creados

```
idx_movements_group_id        → Para búsquedas por grupo de movimientos
idx_movements_movement_date   → Para búsquedas por fecha de movimiento
```

**Beneficio**: Las queries agrupadas y filtradas por fecha serán más rápidas.

**Beneficio**: Queries de filtrado por fecha serán mucho más rápidas.

---

## 📊 Vistas SQL Creadas

### Vista 1: `recipe_movements_view`

```sql
SELECT * FROM recipe_movements_view;
```

Retorna: Solo movimientos de receta (donde `is_recipe_movement = TRUE`)

**Columnas**: product_id, product_name, movement_type, quantity, movement_date, patient_name, recipe_date, prescribed_by, cie_code, etc.

### Vista 2: `movements_with_dates_view`

```sql
SELECT * FROM movements_with_dates_view;
```

Retorna: Todos los movimientos con sus fechas

**Columnas**: id, product_id, product_name, movement_type, quantity, movement_date, item_movement_date, movement_reason (formateado), etc.

---

## ✅ Checklist de Validación

- [ ] Leer [MIGRATION_RECIPES_README.md](./MIGRATION_RECIPES_README.md)
- [ ] Leer [RECIPE_MOVEMENTS_VISUAL_GUIDE.md](./RECIPE_MOVEMENTS_VISUAL_GUIDE.md)
- [ ] Leer [MIGRATION_EXECUTION_GUIDE.md](./MIGRATION_EXECUTION_GUIDE.md)
- [ ] Ejecutar migración en Supabase
- [ ] Validar campos existen
- [ ] Validar índices creados
- [ ] Validar vistas funcionan
- [ ] Probar inserción de movimiento normal
- [ ] Probar inserción de movimiento de receta
- [ ] Confirmar con usuario que proceder con cambios en app

---

## 🎓 Ejemplos Rápidos

### Insertar Movimiento Normal

```sql
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by)
VALUES 
('550e8400-e29b-41d4-a716-446655440011', 'entrada', 50, '2026-01-20', '2026-01-20', 'Compra', 'admin@bagatela.com');
```

### Insertar Movimiento de Receta

```sql
INSERT INTO inventory_movements 
(product_id, movement_type, quantity, movement_date, item_movement_date, reason, recorded_by,
 is_recipe_movement, patient_name, recipe_date, prescribed_by, cie_code, recipe_notes)
VALUES 
('550e8400-e29b-41d4-a716-446655440022', 'salida', 2, '2026-01-20', '2026-01-19', 'Receta médica', 'staff@bagatela.com',
 true, 'Juan Pérez', '2026-01-18', 'Dr. García', 'J06.9', 'Cada 8 horas');
```

### Ver Recetas

```sql
SELECT * FROM recipe_movements_view ORDER BY recipe_date DESC;
```

### Ver Movimientos por Rango de Fechas

```sql
SELECT * FROM movements_with_dates_view 
WHERE movement_date BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY movement_date DESC;
```

---

## 📞 Próximos Pasos

1. **Ejecutar la migración** en Supabase
2. **Validar** que todo esté correcto
3. **Informar al usuario** que la BD está lista
4. **Esperar indicación** para proceder con cambios en la aplicación

---

## 📚 Otros Archivos de Referencia

- [app/database/migrations/000_base_schema.sql](../app/database/migrations/000_base_schema.sql) - Schema original
- [migrations/001_add_categories_and_specialties.sql](./migrations/001_add_categories_and_specialties.sql) - Migración anterior
- [queries/useful_queries.sql](./queries/useful_queries.sql) - Queries generales

---

## 🔗 Estructura de Carpetas Actualizada

```
database/
├── migrations/
│   ├── 001_add_categories_and_specialties.sql (existente)
│   └── 002_add_movement_dates_and_recipe_fields.sql (NUEVO) ✅
├── queries/
│   ├── useful_queries.sql (existente)
│   └── recipe_movements_queries.sql (NUEVO) ✅
├── examples/
│   └── data_assignment_examples.sql
├── MIGRATION_RECIPES_README.md (NUEVO) ✅
├── RECIPE_MOVEMENTS_VISUAL_GUIDE.md (NUEVO) ✅
├── MIGRATION_EXECUTION_GUIDE.md (NUEVO) ✅
├── INDEX.md (este archivo - ACTUALIZADO)
├── MIGRATION_INSTRUCTIONS.md
├── CHANGES_SUMMARY.md
├── QUICK_REFERENCE.md
├── SYSTEM_DIAGRAM.md
└── README.md
```

---

## 🎯 Estado Actual

**Migración SQL**: ✅ LISTA  
**Documentación**: ✅ LISTA  
**Queries de prueba**: ✅ LISTA  
**Cambios en app**: ⏳ PENDIENTE (esperando confirmación)

---

*Última actualización: 20 de enero de 2026*
