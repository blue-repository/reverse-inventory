# Quick Reference - Guía Rápida

## 🚀 Los 3 Pasos Principales

### PASO 1: Leer
📖 Lee `00_START_HERE.md` (este directorio)

### PASO 2: Ejecutar
```sql
-- Copia el contenido de:
database/migrations/001_add_categories_and_specialties.sql
-- Y ejecútalo en Supabase SQL Editor
```

### PASO 3: Validar
```sql
-- Ejecuta estas queries para confirmar:
SELECT * FROM product_categories;
SELECT * FROM medical_specialties;
SELECT * FROM units_of_measure ORDER BY category;
```

---

## 📁 Archivos Clave

```
database/
├── 00_START_HERE.md ............ 👈 EMPIEZA AQUÍ
├── MIGRATION_INSTRUCTIONS.md ... Instrucciones detalladas
├── CHANGES_SUMMARY.md ......... Resumen visual
├── SYSTEM_DIAGRAM.md .......... Diagramas completos
├── README.md .................. Índice general
│
├── migrations/
│   └── 001_add_categories_and_specialties.sql ... EL SCRIPT A EJECUTAR
│
├── queries/
│   └── useful_queries.sql ..... Para validar
│
└── examples/
    └── data_assignment_examples.sql ... Ejemplos de UPDATE
```

---

## 🎯 Lo Que Se Crea

### Tablas Nuevas
- `product_categories` - 2 categorías
- `medical_specialties` - 11 especialidades
- `units_of_measure` - 30 unidades

### Columnas Nuevas en `products`
- `category_id` - Referencia a categoría
- `specialty_id` - Referencia a especialidad
- `reporting_unit` - Unidad de reporte

---

## 💡 Ejemplos Rápidos

### Medicamento
```
Nombre: Paracetamol 500mg
Categoría: Medicamentos
Unidad: Comprimidos
Reporte: Comprimidos
```

### Dispositivo Médico (Cirugía)
```
Nombre: Gasa estéril
Categoría: Dispositivos Médicos
Especialidad: Cirugía
Unidad: Paquete
Reporte: Caja
```

---

## 📊 Datos Predefinidos

| Categorías | Medicamentos | Dispositivos Médicos |
|-----------|--------------|-------------------|
| | | |

| Especialidades | Medicamentos | Dispositivos |
|---|---|---|
| NO APLICA | SÍ (11 tipos) |

| Unidades | Medicamentos (10) | Dispositivos (20) |
|---|---|---|
| Medicamentos | Comprimidos, Cápsulas, etc | NO |
| Dispositivos | NO | Rollo, Paquete, Caja, etc |

---

## ✅ Checklist Rápido

```
ANTES:
☐ Haz backup de BD
☐ Lee MIGRATION_INSTRUCTIONS.md
☐ Acceso a Supabase

DURANTE:
☐ Copia contenido de 001_add_categories_and_specialties.sql
☐ Pégalo en SQL Editor
☐ Ejecuta (RUN)
☐ Espera a que termine

DESPUÉS:
☐ Ejecuta validación (ver abajo)
☐ Asigna categorías a productos
☐ Valida integridad
☐ Procede con código
```

---

## 🔍 Validación Rápida

Ejecuta esto en SQL Editor después de correr la migración:

```sql
-- Ver que todo se creó
SELECT COUNT(*) as categorias FROM product_categories;
SELECT COUNT(*) as especialidades FROM medical_specialties;
SELECT COUNT(*) as unidades FROM units_of_measure;

-- Verificar columnas en products
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('category_id', 'specialty_id', 'reporting_unit');
```

Resultado esperado:
- 2 categorías
- 11 especialidades
- 30 unidades
- 3 columnas nuevas en products

---

## 🆘 Si Algo Sale Mal

### "Table does not exist"
→ La migración no se ejecutó correctamente
→ Verifica que no haya errores en el SQL Editor

### "Foreign key violation"
→ Intentas asignar un ID que no existe
→ Verifica que el ID esté en las tablas de referencia

### "Duplicate key"
→ Ya existe ese valor (nombre único violado)
→ Verifica valores en la tabla antes de insertar

---

## 📞 Archivos por Necesidad

| Necesito... | Archivo |
|-----------|---------|
| Empezar | 00_START_HERE.md |
| Instrucciones | MIGRATION_INSTRUCTIONS.md |
| Resumen rápido | CHANGES_SUMMARY.md |
| Diagramas | SYSTEM_DIAGRAM.md |
| El SQL a ejecutar | migrations/001_add_categories_and_specialties.sql |
| Queries de validación | queries/useful_queries.sql |
| Ejemplos de UPDATE | examples/data_assignment_examples.sql |
| Índice completo | README.md |

---

## ⏱️ Tiempo Estimado

| Actividad | Tiempo |
|-----------|--------|
| Leer instrucciones | 10 min |
| Ejecutar migración | 1 min |
| Validar cambios | 5 min |
| Asignar categorías | 30 min* |
| **TOTAL** | **~46 min** |

*Depende de cuántos productos tengas

---

## 🎯 Próximo Paso Después de BD

Una vez la BD está lista, hay que:
1. Actualizar tipos TypeScript
2. Modificar ProductForm (agregar selectores)
3. Actualizar funciones de servidor
4. Adaptar tabla de productos en UI

Pero eso es **DESPUÉS** de que la BD esté lista.

---

**Versión**: 1.0  
**Última actualización**: 15 de enero de 2026  
**Estado**: LISTO PARA IMPLEMENTAR ✅

---

## 🎓 Aprende Más

Para entender mejor:
- Lee SYSTEM_DIAGRAM.md (tiene diagramas visuales)
- Lee MIGRATION_INSTRUCTIONS.md (tiene toda la info)
- Lee CHANGES_SUMMARY.md (versión comprimida)

¡TODO ESTÁ DOCUMENTADO! Solo sigue los pasos. 🚀
