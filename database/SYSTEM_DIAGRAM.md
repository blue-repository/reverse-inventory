# Diagrama del Sistema de Categorías y Especialidades

## 🎯 Flujo de Uso

```
┌──────────────────────────────────────────────────────────────┐
│                     CREAR NUEVO PRODUCTO                     │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Seleccionar Categoría │
              └───────┬───────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
  ┌──────────────┐          ┌──────────────────┐
  │ Medicamentos │          │ Dispositivos      │
  │              │          │ Médicos           │
  └──────┬───────┘          └─────────┬────────┘
         │                            │
         ▼                            ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│ Unidades de Medida      │  │ Especialidad (Opcional)  │
│ • Comprimidos           │  │ • Enfermería             │
│ • Cápsulas              │  │ • Cirugía                │
│ • Inyectable            │  │ • Traumatología          │
│ • Jarabe                │  │ • ... (8 más)            │
│ • Crema                 │  │                          │
│ • ... (5 más)           │  │ ▼                        │
└─────────┬───────────────┘  ├──────────────────────────┤
          │                  │ Unidades de Medida       │
          │                  │ • Rollo                  │
          │                  │ • Paquete                │
          │                  │ • Caja                   │
          │                  │ • Par                    │
          │                  │ • Galón                  │
          │                  │ • Litro                  │
          │                  │ • ... (14 más)           │
          │                  └──────────┬───────────────┘
          │                             │
          └──────────────┬──────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │ Unidad de Reporte (Igual  │
         │ o diferente a unidad de   │
         │ medida)                   │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Guardar Producto ✓    │
         └───────────────────────┘
```

---

## 📊 Base de Datos - Estructura Relacional

```
                    ┌──────────────────────────────┐
                    │   product_categories         │
                    ├──────────────────────────────┤
                    │ id (PK)                      │
                    │ name (UNIQUE)                │
                    │ description                  │
                    │ created_at, updated_at       │
                    └────────────┬─────────────────┘
                                 │
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           │                     │                     │
    (FK)   │                     │            (FK)     │
           │                     │                     │
           ▼                     ▼                     ▼
    ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐
    │  products   │  │medical_specialties│  │units_of_measure │
    ├─────────────┤  ├──────────────────┤  ├─────────────────┤
    │ id (PK)     │  │ id (PK)          │  │ id (PK)         │
    │ name        │  │ name (UNIQUE)    │  │ name (UNIQUE)   │
    │ barcode     │  │ created_at,      │  │ category        │
    │ stock       │  │ updated_at       │  │ created_at,     │
    │ unit_of...  │  │                  │  │ updated_at      │
    │ reporting..◄├──┤                  │  │                 │
    │ category_id ◄──┼──────────────────┼──►                 │
    │ specialty_id├──►                  │                     │
    │ ...         │  └──────────────────┘  └─────────────────┘
    └─────────────┘
```

---

## 💾 Datos Predefinidos - Tabla Ejemplo

### product_categories
```
┌────────────────────────────────────────────────┐
│ id                   │ name                    │
├──────────────────────┼────────────────────────┤
│ cat-001              │ Medicamentos            │
│ cat-002              │ Dispositivos Médicos    │
└────────────────────────────────────────────────┘
```

### medical_specialties (11 registros)
```
┌──────────────────────────────────────────────────────────────┐
│ id              │ name                                       │
├─────────────────┼────────────────────────────────────────────┤
│ spec-001        │ Enfermería                                 │
│ spec-002        │ Cirugía                                    │
│ spec-003        │ Traumatología                              │
│ spec-004        │ Enfermería/Laboratorio clínico y ...      │
│ ...             │ ...                                        │
│ spec-011        │ Especialidades quirúrgicas                 │
└──────────────────────────────────────────────────────────────┘
```

### units_of_measure (30 registros)
```
Medicamentos (10):
┌────────────────────────────────────────────────┐
│ id        │ name            │ category         │
├───────────┼─────────────────┼──────────────────┤
│ um-001    │ Comprimidos     │ medicamentos     │
│ um-002    │ Cápsulas        │ medicamentos     │
│ ...       │ ...             │ medicamentos     │
└────────────────────────────────────────────────┘

Dispositivos Médicos (20):
┌────────────────────────────────────────────────┐
│ id        │ name            │ category         │
├───────────┼─────────────────┼──────────────────┤
│ um-011    │ Rollo           │ dispositivos_... │
│ um-012    │ Paquete         │ dispositivos_... │
│ ...       │ ...             │ dispositivos_... │
└────────────────────────────────────────────────┘
```

---

## 🔗 Relaciones en Acción - Ejemplos

### Ejemplo 1: Medicamento
```
Producto: "Paracetamol 500mg"
├── category_id: cat-001 (Medicamentos)
├── specialty_id: NULL
├── unit_of_measure: "Comprimidos"
├── reporting_unit: "Comprimidos"
└── stock: 500
```

### Ejemplo 2: Dispositivo Médico
```
Producto: "Gasa estéril para Cirugía"
├── category_id: cat-002 (Dispositivos Médicos)
├── specialty_id: spec-002 (Cirugía)
├── unit_of_measure: "Paquete"
├── reporting_unit: "Caja"
└── stock: 25
```

### Ejemplo 3: Dispositivo Médico (Uso General)
```
Producto: "Guantes de nitrilo"
├── category_id: cat-002 (Dispositivos Médicos)
├── specialty_id: spec-009 (Uso General)
├── unit_of_measure: "Par"
├── reporting_unit: "Docena"
└── stock: 100
```

---

## 🎨 Interfaz de Usuario - Flujo de Creación

```
PASO 1: Información Básica
┌─────────────────────────────────────────┐
│ Nombre: [Paracetamol            ]       │
│ Código: [1234567890            ]       │
│ Descripción: [...]               │       │
└─────────────────────────────────────────┘

PASO 2: Categoría (REQUERIDO)
┌─────────────────────────────────────────┐
│ Categoría: [Medicamentos ▼]             │
│            ├─ Medicamentos              │
│            └─ Dispositivos Médicos      │
└─────────────────────────────────────────┘

PASO 3: Especialidad (Condicional)
SI categoría = "Dispositivos Médicos":
┌─────────────────────────────────────────┐
│ Especialidad: [Uso General ▼]           │
│              ├─ Enfermería              │
│              ├─ Cirugía                 │
│              ├─ Traumatología           │
│              └─ ... (8 más)             │
└─────────────────────────────────────────┘
ELSE: Campo NO mostrado

PASO 4: Unidades de Medida (Dinámicas)
SI categoría = "Medicamentos":
┌─────────────────────────────────────────┐
│ Unidad: [Comprimidos ▼]                 │
│         ├─ Comprimidos                  │
│         ├─ Cápsulas                     │
│         ├─ Inyectable                   │
│         └─ ... (7 más)                  │
└─────────────────────────────────────────┘

SI categoría = "Dispositivos Médicos":
┌─────────────────────────────────────────┐
│ Unidad: [Caja ▼]                        │
│         ├─ Rollo                        │
│         ├─ Paquete                      │
│         ├─ Caja                         │
│         └─ ... (17 más)                 │
└─────────────────────────────────────────┘

PASO 5: Unidad de Reporte (Opcional)
┌─────────────────────────────────────────┐
│ Unidad de Reporte: [Caja ▼]             │
│ (puede ser diferente a unidad regular)  │
└─────────────────────────────────────────┘
```

---

## 📈 Ventajas de Esta Estructura

✅ **Categorización clara** - Fácil separación de medicamentos y dispositivos
✅ **Especialidades flexibles** - Mejor organización dentro de dispositivos
✅ **Unidades dinámicas** - Mostrar solo lo relevante según categoría
✅ **Reportes precisos** - Unidad de reporte puede diferir de unidad de medida
✅ **Escalabilidad** - Fácil agregar más categorías o especialidades
✅ **Integridad referencial** - Foreign keys garantizan consistencia
✅ **Performance** - Índices en columnas frecuentemente consultadas
✅ **Mantenibilidad** - Estructura clara y documentada

---

## 🔄 Validaciones Importantes

```
Regla 1: Si categoría = "Medicamentos"
  → specialty_id DEBE ser NULL
  ✓ Permitido: Paracetamol sin especialidad
  ✗ No permitido: Paracetamol con especialidad "Cirugía"

Regla 2: Si categoría = "Dispositivos Médicos"
  → specialty_id PUEDE ser NULL o tener valor
  ✓ Permitido: Gasa sin especialidad (Uso General)
  ✓ Permitido: Gasa con especialidad "Cirugía"

Regla 3: unit_of_measure y reporting_unit
  → Ambos deben pertenecer a las unidades de su categoría
  ✓ Permitido: Medicamento con "Comprimidos" en ambas
  ✓ Permitido: Dispositivo con "Rollo" en medida y "Caja" en reporte
  ✗ No permitido: Medicamento con "Rollo" (es de dispositivos)
```

---

**Versión**: 1.0  
**Fecha**: 15 de enero de 2026  
**Estado**: 📋 Documentación completa - Esperando implementación en BD
