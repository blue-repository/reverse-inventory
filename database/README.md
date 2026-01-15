# Gestión de Base de Datos - Bagatela Inventory

Este directorio contiene todas las migraciones, queries y documentación relacionadas con la base de datos.

## 📁 Estructura de Carpetas

```
database/
├── migrations/                 # Migraciones SQL
│   └── 001_add_categories_and_specialties.sql
├── queries/                   # Queries útiles
│   └── useful_queries.sql
├── examples/                  # Ejemplos y datos de prueba
│   └── data_assignment_examples.sql
├── MIGRATION_INSTRUCTIONS.md  # Instrucciones paso a paso
├── CHANGES_SUMMARY.md         # Resumen visual de cambios
└── README.md                  # Este archivo
```

## 🚀 Inicio Rápido

### 1. Primera Ejecución (Nueva Estructura)

1. Abre Supabase SQL Editor
2. Copia el contenido de `migrations/001_add_categories_and_specialties.sql`
3. Ejecuta el script
4. Verifica con: `SELECT * FROM product_categories;`

### 2. Asignar Datos Existentes

1. Lee `MIGRATION_INSTRUCTIONS.md` - sección "Asignar Categorías a Productos Existentes"
2. Usa ejemplos de `examples/data_assignment_examples.sql`
3. Valida con `queries/useful_queries.sql`

### 3. Desarrollar el Código

Después de que la BD esté lista:
- Frontend: Actualizar componentes (próxima fase)
- Backend: Actualizar acciones y tipos (próxima fase)

## 📝 Archivos Principales

### `001_add_categories_and_specialties.sql`
**Descripción**: Migración principal que crea todas las tablas y datos iniciales.

**Contenido**:
- Crea tabla `product_categories`
- Crea tabla `medical_specialties`
- Crea tabla `units_of_measure`
- Agrega 3 columnas a `products`
- Inserta datos predefinidos
- Crea índices

**Cuándo ejecutar**: Primera vez que se inicializa la base de datos

---

### `useful_queries.sql`
**Descripción**: Colección de queries para consultas y validaciones comunes.

**Incluye**:
- Ver categorías, especialidades y unidades
- Ver productos con sus relaciones
- Validar integridad de datos
- Contar productos por categoría
- Detectar problemas de datos

**Cuándo usar**: Después de asignar datos para validación

---

### `data_assignment_examples.sql`
**Descripción**: Ejemplos prácticos para asignar categorías, especialidades y unidades a productos.

**Incluye**:
- Ejemplos de UPDATE comentados
- Queries de verificación
- Queries para el backend
- Operaciones de mantenimiento

**Cuándo usar**: Durante la asignación de datos a productos existentes

---

### `MIGRATION_INSTRUCTIONS.md`
**Descripción**: Guía detallada paso a paso para ejecutar la migración.

**Cubre**:
- Explicación de tablas y columnas
- Pasos para ejecutar
- Validación de cambios
- Asignación de datos
- Próximos pasos

**Cuándo leer**: Antes de ejecutar la migración

---

### `CHANGES_SUMMARY.md`
**Descripción**: Resumen visual y checklist de los cambios.

**Incluye**:
- Diagrama de estructura
- Datos predefinidos listados
- Relaciones visualizadas
- Checklist de ejecución
- Próximas fases

**Cuándo usar**: Para obtener una visión general rápida

---

## 📊 Datos Predefinidos

### Categorías (2)
- **Medicamentos**: Productos farmacéuticos
- **Dispositivos Médicos**: Implementos y dispositivos

### Especialidades (11)
Disponibles solo para Dispositivos Médicos:
- Enfermería
- Cirugía
- Traumatología
- Enfermería/Laboratorio clínico y microbiología
- Anestesiología / Cuidados intensivos
- Ginecología / Obstetricia
- Central de esterilización
- Atención Pre-hospitalaria
- Uso General
- Enfermería/Terapia respiratoria
- Especialidades quirúrgicas

### Unidades de Medida
**Medicamentos (10)**: Comprimidos, Cápsulas, Inyectable, Jarabe, Crema, Pomada, Gotas, Polvo, Solución, Supositorio

**Dispositivos Médicos (20)**: Rollo, Paquete, Caja, Par, Galón, Litro, Mililitro, Gramo, Kilogramo, Metro, Centímetro, Unidad, Docena, Tubo, Frasco, Botella, Jeringa, Catéter, Implante, Kit

## 🔄 Workflow Recomendado

```
1. Revisar CHANGES_SUMMARY.md (5 min)
   ↓
2. Leer MIGRATION_INSTRUCTIONS.md (10 min)
   ↓
3. Ejecutar 001_add_categories_and_specialties.sql
   ↓
4. Validar con queries de useful_queries.sql
   ↓
5. Usar data_assignment_examples.sql para asignar datos
   ↓
6. Validar integridad
   ↓
7. Proceder con cambios de código (próxima fase)
```

## ✅ Checklist Pre-Ejecución

- [ ] Hacer backup de la base de datos
- [ ] Revisar MIGRATION_INSTRUCTIONS.md
- [ ] Tener acceso a Supabase SQL Editor
- [ ] Verificar que no hay cambios pendientes en la BD
- [ ] Coordinar con el equipo antes de ejecutar

## ⚠️ Notas Importantes

1. **Integridad**: Las especialidades deben asignarse solo a "Dispositivos Médicos"
2. **Nullable**: `specialty_id` y `reporting_unit` son opcionales
3. **Categoría Obligatoria**: Todos los productos deben tener categoría asignada
4. **Índices**: Creados automáticamente para `category_id` y `specialty_id`
5. **Rollback**: Ver instrucciones de reversión en MIGRATION_INSTRUCTIONS.md

## 🆘 Solución de Problemas

### Error: "No existe la tabla product_categories"
**Solución**: Ejecuta primero `001_add_categories_and_specialties.sql`

### Error: "Foreign key constraint violated"
**Solución**: Valida que los IDs de categoría/especialidad existan antes de asignar

### Error: "Duplicate key value violates unique constraint"
**Solución**: Verifica que no existan nombres duplicados en las tablas de referencia

## 📞 Soporte

Para consultas o problemas:
1. Revisa los archivos de este directorio
2. Consulta la documentación de Supabase
3. Contacta al administrador de BD

## 📅 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 15-01-2026 | Creación inicial de estructura |

---

**Última actualización**: 15 de enero de 2026  
**Estado**: 🟡 Esperando implementación
