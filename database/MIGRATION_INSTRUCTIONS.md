# Instrucciones para Migración de Base de Datos

## Cambios a Realizar

Esta migración agrega soporte para categorías, especialidades y unidades de medida configurables en el sistema de inventario.

### Tablas Nuevas

1. **product_categories**
   - `id` (UUID, Primary Key)
   - `name` (VARCHAR(100), Unique) - "Medicamentos", "Dispositivos Médicos"
   - `description` (TEXT)
   - `created_at`, `updated_at`

2. **medical_specialties**
   - `id` (UUID, Primary Key)
   - `name` (VARCHAR(150), Unique) - 11 especialidades disponibles
   - `created_at`, `updated_at`

3. **units_of_measure**
   - `id` (UUID, Primary Key)
   - `name` (VARCHAR(50), Unique)
   - `category` (VARCHAR(50)) - "medicamentos" o "dispositivos_medicos"
   - `created_at`, `updated_at`

### Cambios en Tabla Existente (products)

Se agregaron 3 nuevas columnas:

1. **category_id** (UUID)
   - Foreign Key a `product_categories`
   - Referencia obligatoria (será requerida en la aplicación)
   - Índice creado para performance

2. **specialty_id** (UUID)
   - Foreign Key a `medical_specialties`
   - Nullable (solo para dispositivos médicos)
   - Índice creado para performance

3. **reporting_unit** (VARCHAR(50))
   - Unidad utilizada para reportes
   - Puede ser diferente a `unit_of_measure`
   - Nullable

## Pasos para Ejecutar

### 1. Conectarse a Supabase

- Ve a https://app.supabase.com
- Selecciona tu proyecto
- Ve a SQL Editor

### 2. Ejecutar la Migración

1. Copia el contenido del archivo `001_add_categories_and_specialties.sql`
2. Pégalo en el SQL Editor de Supabase
3. Haz clic en "Ejecutar" (RUN)
4. Verifica que no haya errores

### 3. Validar Cambios

Ejecuta estas queries para verificar:

```sql
-- Ver categorías creadas
SELECT * FROM product_categories;

-- Ver especialidades creadas
SELECT * FROM medical_specialties;

-- Ver unidades de medida
SELECT * FROM units_of_measure ORDER BY category;

-- Ver estructura de la tabla products
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
```

### 4. Asignar Categorías a Productos Existentes (Importante)

Tendrás que decidir qué productos son medicamentos y cuáles son dispositivos médicos.

```sql
-- Para medicamentos:
UPDATE products 
SET category_id = (SELECT id FROM product_categories WHERE name = 'Medicamentos')
WHERE id IN ('id1', 'id2', 'id3'); -- Reemplaza con los IDs reales

-- Para dispositivos médicos:
UPDATE products 
SET category_id = (SELECT id FROM product_categories WHERE name = 'Dispositivos Médicos')
WHERE id IN ('id1', 'id2', 'id3'); -- Reemplaza con los IDs reales
```

### 5. Asignar Especialidades (Opcional, solo para Dispositivos Médicos)

```sql
-- Ejemplo: Asignar especialidad "Cirugía" a un producto
UPDATE products 
SET specialty_id = (SELECT id FROM medical_specialties WHERE name = 'Cirugía')
WHERE id = 'product_id';
```

## Estructura de Datos

### Relaciones

```
products
  ├── category_id (FK → product_categories.id)
  ├── specialty_id (FK → medical_specialties.id)
  └── reporting_unit

product_categories
  ├── Medicamentos
  └── Dispositivos Médicos

medical_specialties (11 tipos)
  ├── Enfermería
  ├── Cirugía
  ├── Traumatología
  └── ... (8 más)

units_of_measure
  ├── medicamentos
  │   ├── Comprimidos
  │   ├── Cápsulas
  │   └── ... (8 más)
  └── dispositivos_medicos
      ├── Rollo
      ├── Paquete
      ├── Caja
      └── ... (17 más)
```

## Próximos Pasos en el Código

Una vez la base de datos esté actualizada, necesitaremos:

1. **Actualizar tipos TypeScript**
   - Agregar tipos para categorías, especialidades y unidades de medida

2. **Actualizar componentes de formulario**
   - Modificar ProductForm para mostrar selectors de categoría
   - Agregar selector condicional de especialidad
   - Agregar selector de unidad de reporte

3. **Actualizar acciones del servidor**
   - Modificar funciones de creación/edición de productos

4. **Actualizar vistas y tablas**
   - Mostrar categoría en tabla de productos
   - Mostrar especialidad cuando corresponda

## Consideraciones Importantes

1. **Integridad de datos**: Las especialidades solo deben asignarse a "Dispositivos Médicos"
2. **Unidades de medida**: Mostrar solo las pertinentes según la categoría
3. **Retrocompatibilidad**: Los productos existentes sin categoría deben ser actualizados antes de implementar restricciones
4. **Índices**: Se crean automáticamente para optimizar búsquedas por categoría

## Rollback (si es necesario)

Si necesitas revertir los cambios:

```sql
-- Eliminar columnas
ALTER TABLE products DROP COLUMN IF EXISTS category_id;
ALTER TABLE products DROP COLUMN IF EXISTS specialty_id;
ALTER TABLE products DROP COLUMN IF EXISTS reporting_unit;

-- Eliminar tablas
DROP TABLE IF EXISTS units_of_measure;
DROP TABLE IF EXISTS medical_specialties;
DROP TABLE IF EXISTS product_categories;
```

---

**Fecha de creación**: 15 de enero de 2026  
**Versión de migración**: 001
