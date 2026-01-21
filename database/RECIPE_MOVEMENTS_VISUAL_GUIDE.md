# Estructura Visual - Movimientos con Fechas y Recetas

## 📊 Tabla `inventory_movements` - Nuevos Campos

### Vista General

```
inventory_movements (tabla existente + nuevos campos)
├── Campos Originales (sin cambios)
│   ├── id (UUID) - PK
│   ├── product_id (UUID) - FK a products
│   ├── movement_type (enum) - 'entrada', 'salida', 'ajuste'
│   ├── quantity (integer)
│   ├── reason (text) - Motivo del movimiento
│   ├── notes (text) - Notas generales
│   ├── reporting_unit (text)
│   ├── recorded_by (text) - Quién registró
│   ├── created_at, updated_at
│   │
│   ├── 🆕 AGRUPACIÓN
│   ├── movement_group_id (UUID) - Agrupa items del mismo movimiento
│   │
│   ├── 🆕 CAMPO DE FECHA
│   ├── movement_date (DATE) - Fecha del movimiento (general o específica)
│   │
│   └── 🆕 CAMPOS DE RECETA (cuando is_recipe_movement = TRUE)
│       ├── is_recipe_movement (BOOLEAN)
│       ├── patient_name (VARCHAR 255) - Nombre del paciente (general o específico)
│       ├── recipe_date (DATE) - Fecha de la receta (general o específica)
│       ├── prescribed_by (VARCHAR 255) - Profesional (general o específico)
│       ├── cie_code (VARCHAR 10) - Código CIE (general o específico)
│       └── recipe_notes (TEXT) - Notas adicionales
```

## 📋 Ejemplos de Registros

### Ejemplo 1: Movimiento Normal (Entrada)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "movement_group_id": "550e8400-e29b-41d4-a716-446655440101",
  "product_id": "550e8400-e29b-41d4-a716-446655440011",
  "movement_type": "entrada",
  "quantity": 50,
  "movement_date": "2026-01-20",
  "reason": "Compra a proveedor",
  "notes": "Pedido #12345",
  "recorded_by": "admin@bagatela.com",
  "is_recipe_movement": false,
  "patient_name": null,
  "recipe_date": null,
  "prescribed_by": null,
  "cie_code": null,
  "recipe_notes": null,
  "created_at": "2026-01-20T10:30:00Z"
}
```

### Ejemplo 2: Grupo de Recetas - Datos Generales en Primer Item

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "movement_group_id": "550e8400-e29b-41d4-a716-446655440202",
    "product_id": "550e8400-e29b-41d4-a716-446655440022",
    "movement_type": "salida",
    "quantity": 2,
    "movement_date": "2026-01-20",
    "reason": "Receta médica",
    "is_recipe_movement": true,
    "patient_name": "Juan Pérez López",
    "recipe_date": "2026-01-18",
    "prescribed_by": "Dr. Fernando García",
    "cie_code": "J06.9",
    "recipe_notes": "Tomar 1 comprimido cada 8 horas",
    "recorded_by": "farmacéutico@bagatela.com",
    "created_at": "2026-01-20T11:45:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "movement_group_id": "550e8400-e29b-41d4-a716-446655440202",
    "product_id": "550e8400-e29b-41d4-a716-446655440033",
    "movement_type": "salida",
    "quantity": 1,
    "movement_date": "2026-01-20",
    "reason": "Receta médica",
    "is_recipe_movement": true,
    "patient_name": null,              // ← NULO → Usa del grupo
    "recipe_date": null,               // ← NULO → Usa del grupo
    "prescribed_by": null,             // ← NULO → Usa del grupo
    "cie_code": null,                  // ← NULO → Usa del grupo
    "recipe_notes": null,
    "recorded_by": "farmacéutico@bagatela.com",
    "created_at": "2026-01-20T11:46:00Z"
  }
]
```
Cuando se consulta, ambos items resuelven a:
- **patient_name**: Juan Pérez López
- **recipe_date**: 2026-01-18
- **prescribed_by**: Dr. Fernando García
- **cie_code**: J06.9

### Ejemplo 3: Grupo con Item que Sobrescribe Datos

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "movement_group_id": "550e8400-e29b-41d4-a716-446655440304",
    "product_id": "med-001",
    "movement_type": "salida",
    "quantity": 2,
    "movement_date": "2026-01-20",
    "is_recipe_movement": true,
    "patient_name": "Juan Pérez",      // ← VALOR GENERAL
    "recipe_date": "2026-01-18",       // ← VALOR GENERAL
    "prescribed_by": "Dr. García",     // ← VALOR GENERAL
    "cie_code": "J06.9"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "movement_group_id": "550e8400-e29b-41d4-a716-446655440304",
    "product_id": "med-002",
    "movement_type": "salida",
    "quantity": 1,
    "movement_date": "2026-01-19",     // ← DIFERENTE (item específica)
    "is_recipe_movement": true,
    "patient_name": "María García",    // ← SOBRESCRIBE
    "recipe_date": null,               // ← Usa del grupo (2026-01-18)
    "prescribed_by": null,             // ← Usa del grupo (Dr. García)
    "cie_code": "L89.90"               // ← SOBRESCRIBE
  }
]
```

### Ejemplo 4: Movimiento Normal (Salida de Uso Interno)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440006",
  "movement_group_id": "550e8400-e29b-41d4-a716-446655440406",
  "product_id": "550e8400-e29b-41d4-a716-446655440011",
  "movement_type": "salida",
  "quantity": 5,
  "movement_date": "2026-01-20",
  "reason": "Uso interno - Botiquín de emergencia",
  "notes": "Reemplazo de stock vencido",
  "recorded_by": "enfermera@bagatela.com",
  "is_recipe_movement": false,
  "patient_name": null,
  "recipe_date": null,
  "prescribed_by": null,
  "cie_code": null,
  "recipe_notes": null,
  "created_at": "2026-01-20T14:15:00Z"
}
```

## 🔄 Flujo de Trabajo - Registro de Receta

```
┌─────────────────────────────────────────────────────────────┐
│ USUARIO ABRE MODAL DE MOVIMIENTO DE SALIDA                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Completa campos básicos:                                     │
│ ✓ Producto                                                  │
│ ✓ Cantidad                                                  │
│ ✓ Fecha de movimiento (movement_date)                      │
│ ✓ Fecha del item (item_movement_date)                      │
│ ✓ Motivo (reason)                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ¿Es una RECETA MÉDICA?                                      │
│ [Sí] / [No]                                                  │
└─────────────────────────────────────────────────────────────┘
                    ↙                ↘
                   SÍ                 NO
                   ↓                  ↓
      ┌────────────────────┐  ┌──────────────────┐
      │ Mostrar campos     │  │ Guardar como     │
      │ de receta:         │  │ movimiento normal│
      │                    │  └──────────────────┘
      │ • Nombre paciente  │
      │ • Fecha receta     │
      │ • Profesional      │
      │ • CIE code         │
      │ • Notas/indicac.   │
      └────────────────────┘
               ↓
      ┌────────────────────┐
      │ Guardar con:       │
      │ is_recipe_mov=true │
      │ + datos de receta  │
      └────────────────────┘
```

## 📅 Formato de Fechas

### Campos de Fecha

| Campo | Formato | Ejemplo | Descripción |
|-------|---------|---------|-------------|
| `movement_date` | DATE (YYYY-MM-DD) | 2026-01-20 | Fecha del movimiento (general o específica por item) |

### Diferencia entre Fechas

```
Receta → Médico la escribió
   |
   v (1-2 días)
   
Movimiento → Farmacéutico la procesa/entrega
   |
   v
   
Registro → Se ingresa en el sistema
```

**Ejemplo Real:**
- **recipe_date**: 2026-01-18 (Médico emite receta)
- **movement_date (item)**: 2026-01-19 (Paciente retira medicamento)
- **movement_date (sistema)**: 2026-01-20 (Se registra entrada en sistema)

## 🔍 Vistas Disponibles

### Vista 1: `recipe_movements_view`
Muestra SOLO los movimientos que son recetas.

```sql
SELECT * FROM recipe_movements_view;
```

**Resultado:**
```
id | product_name | patient_name | recipe_date | prescribed_by | cie_code
---|--------------|--------------|-------------|---------------|----------
...
```

### Vista 2: `movements_with_dates_view`
Muestra TODOS los movimientos con sus fechas.

```sql
SELECT * FROM movements_with_dates_view;
```

## 🗂️ Índices para Búsquedas Rápidas

```
idx_movements_movement_date       → Búsqueda por movement_date
idx_movements_item_movement_date  → Búsqueda por item_movement_date
```

**Beneficio**: Las queries con filtros de fecha son mucho más rápidas.

## 📝 Casos de Uso

### Caso 1: Auditoría
*"¿Cuántas recetas procesó Dr. García en enero?"*

```sql
SELECT COUNT(*) as recetas
FROM inventory_movements
WHERE prescribed_by = 'Dr. García'
  AND recipe_date BETWEEN '2026-01-01' AND '2026-01-31'
  AND is_recipe_movement = TRUE;
```

### Caso 2: Reportes por Paciente
*"¿Qué medicinas le entregamos a Juan Pérez?"*

```sql
SELECT product_name, quantity, recipe_date, prescribed_by
FROM recipe_movements_view
WHERE LOWER(patient_name) LIKE '%juan%';
```

### Caso 3: Control por Diagnóstico
*"¿Cuántos medicamentos entregamos para infecciones respiratorias (J06.9)?"*

```sql
SELECT SUM(quantity) as total
FROM inventory_movements
WHERE cie_code = 'J06.9'
  AND is_recipe_movement = TRUE;
```

### Caso 4: Discrepancias de Fecha
*"¿Hay movimientos registrados con mucho retraso?"*

```sql
SELECT 
  id, product_name,
  (movement_date - recipe_date) as dias_retraso
FROM recipe_movements_view
WHERE (movement_date - recipe_date) > 7;
```

## ✅ Checklist de Migración

- [ ] Ejecutar migración SQL en Supabase
- [ ] Validar que los campos existen
- [ ] Verificar que los índices se crearon
- [ ] Probar vistas
- [ ] Actualizar tipos TypeScript
- [ ] Actualizar componentes frontend
- [ ] Actualizar API routes
- [ ] Actualizar server actions
- [ ] Pruebas de integración
