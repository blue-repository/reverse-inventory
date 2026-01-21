# 📚 Caso de Uso Completo - Registrar Receta de Múltiples Medicinas

**Escenario**: Un farmacéutico registra una receta médica de múltiples medicinas para un paciente.

---

## 📋 Datos de Entrada

### Información General (IGUAL PARA TODOS LOS ITEMS)
- **Paciente**: Juan Pérez López
- **Profesional**: Dr. Fernando García
- **Fecha de Receta**: 2026-01-18
- **CIE**: J06.9 (Infección de vías respiratorias)
- **Fecha del Movimiento**: 2026-01-20

### Items de la Receta
```
1. Amoxicilina 500mg
   - Cantidad: 20 comprimidos
   - Datos específicos: NINGUNO (usa general)

2. Ibuprofeno 400mg
   - Cantidad: 10 comprimidos
   - Datos específicos: NINGUNO (usa general)

3. Vitamina C 500mg
   - Cantidad: 30 comprimidos
   - Datos específicos: CIE DIFERENTE → L12.0 (Deficiencia de Vitamina C)
   - Notas: "Tomar 1 por día con las comidas"
```

---

## 🎯 Paso 1: Preparar Datos en el Frontend

### Form que ve el usuario:

```
═══════════════════════════════════════════════════════════
  REGISTRAR MOVIMIENTO - RECETA MÉDICA
═══════════════════════════════════════════════════════════

DATOS GENERALES:
┌─────────────────────────────────────────────────────────┐
│ Tipo: [SALIDA] ✓                                         │
│ Motivo: Receta Médica                                   │
│ Fecha del Movimiento: [20/01/2026] ✓                    │
└─────────────────────────────────────────────────────────┘

DATOS DE RECETA (aplican a TODOS los items):
┌─────────────────────────────────────────────────────────┐
│ ✓ Es una receta médica                                  │
│                                                          │
│ Nombre del Paciente: [Juan Pérez López]                │
│ Fecha Receta: [18/01/2026]                             │
│ Profesional: [Dr. Fernando García]                     │
│ CIE: [J06.9]                                            │
│ Notas: [Infección aguda vías respiratorias]            │
└─────────────────────────────────────────────────────────┘

ITEMS DEL MOVIMIENTO:
┌─────────────────────────────────────────────────────────┐
│ Item 1:                                                  │
│ Producto: [Amoxicilina 500mg] ↓                        │
│ Cantidad: [20]                                          │
│ ┌─ DATOS ESPECÍFICOS ─────────────────────────────────┐ │
│ │ ☐ Paciente diferente                                │ │
│ │ ☐ Fecha diferente                                   │ │
│ │ ☐ Profesional diferente                             │ │
│ │ ☐ CIE diferente                                     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Item 2:                                                  │
│ Producto: [Ibuprofeno 400mg] ↓                         │
│ Cantidad: [10]                                          │
│ ┌─ DATOS ESPECÍFICOS ─────────────────────────────────┐ │
│ │ ☐ Paciente diferente                                │ │
│ │ ☐ Fecha diferente                                   │ │
│ │ ☐ Profesional diferente                             │ │
│ │ ☐ CIE diferente                                     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Item 3:                                                  │
│ Producto: [Vitamina C 500mg] ↓                         │
│ Cantidad: [30]                                          │
│ ┌─ DATOS ESPECÍFICOS ─────────────────────────────────┐ │
│ │ ☐ Paciente diferente                                │ │
│ │ ☐ Fecha diferente                                   │ │
│ │ ☐ Profesional diferente                             │ │
│ │ ☑ CIE diferente: [L12.0] ← SOBRESCRIBE             │ │
│ └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

[GUARDAR MOVIMIENTO]
```

---

## 🔄 Paso 2: Procesar en el Backend

### Data que recibe el servidor:

```javascript
{
  movement_group_id: null, // Se genera aquí
  movement_type: "salida",
  is_recipe_movement: true,
  recorded_by: "farmaceut@bagatela.com",
  
  // DATOS GENERALES (para todos)
  movement_date: "2026-01-20",
  patient_name: "Juan Pérez López",
  recipe_date: "2026-01-18",
  prescribed_by: "Dr. Fernando García",
  cie_code: "J06.9",
  recipe_notes: "Infección aguda vías respiratorias",
  
  // ITEMS
  items: [
    {
      product_id: "uuid-amoxicilina",
      quantity: 20,
      specific_data: {} // Sin datos específicos
    },
    {
      product_id: "uuid-ibuprofeno",
      quantity: 10,
      specific_data: {} // Sin datos específicos
    },
    {
      product_id: "uuid-vitamina-c",
      quantity: 30,
      specific_data: {
        cie_code: "L12.0" // SOBRESCRIBE el general
      }
    }
  ]
}
```

---

## 💾 Paso 3: Insertar en la BD

### Server genera un UUID para el grupo:

```
movement_group_id = "550e8400-e29b-41d4-a716-446655440500"
```

### Se crean 3 registros INSERT:

```sql
-- ITEM 1: Amoxicilina (usa TODOS los datos generales)
INSERT INTO inventory_movements VALUES (
  id: gen_random_uuid(),
  movement_group_id: '550e8400-e29b-41d4-a716-446655440500',
  product_id: 'uuid-amoxicilina',
  movement_type: 'salida',
  quantity: 20,
  movement_date: '2026-01-20',
  reason: 'Receta médica',
  is_recipe_movement: TRUE,
  patient_name: 'Juan Pérez López',
  recipe_date: '2026-01-18',
  prescribed_by: 'Dr. Fernando García',
  cie_code: 'J06.9',
  recipe_notes: 'Infección aguda vías respiratorias',
  recorded_by: 'farmaceut@bagatela.com'
);

-- ITEM 2: Ibuprofeno (usa TODOS los datos generales)
INSERT INTO inventory_movements VALUES (
  id: gen_random_uuid(),
  movement_group_id: '550e8400-e29b-41d4-a716-446655440500',
  product_id: 'uuid-ibuprofeno',
  movement_type: 'salida',
  quantity: 10,
  movement_date: '2026-01-20',
  reason: 'Receta médica',
  is_recipe_movement: TRUE,
  patient_name: 'Juan Pérez López',
  recipe_date: '2026-01-18',
  prescribed_by: 'Dr. Fernando García',
  cie_code: 'J06.9',
  recipe_notes: 'Infección aguda vías respiratorias',
  recorded_by: 'farmaceut@bagatela.com'
);

-- ITEM 3: Vitamina C (SOBRESCRIBE CIE)
INSERT INTO inventory_movements VALUES (
  id: gen_random_uuid(),
  movement_group_id: '550e8400-e29b-41d4-a716-446655440500',
  product_id: 'uuid-vitamina-c',
  movement_type: 'salida',
  quantity: 30,
  movement_date: '2026-01-20',
  reason: 'Receta médica',
  is_recipe_movement: TRUE,
  patient_name: 'Juan Pérez López',
  recipe_date: '2026-01-18',
  prescribed_by: 'Dr. Fernando García',
  cie_code: 'L12.0',  -- ← DIFERENTE (sobrescribe J06.9)
  recipe_notes: 'Infección aguda vías respiratorias',
  recorded_by: 'farmaceut@bagatela.com'
);
```

### Registro en BD (SIN resolver):

```
┌─────────────────┬──────────────────┬──────────┬──────────────┬──────────────┐
│ id              │ product_id       │ quantity │ patient_name │ cie_code     │
├─────────────────┼──────────────────┼──────────┼──────────────┼──────────────┤
│ item-1234       │ uuid-amoxicilina │ 20       │ Juan Pérez   │ J06.9        │
│ item-5678       │ uuid-ibuprofeno  │ 10       │ Juan Pérez   │ J06.9        │
│ item-9012       │ uuid-vitamina-c  │ 30       │ Juan Pérez   │ L12.0 ← DIFF │
└─────────────────┴──────────────────┴──────────┴──────────────┴──────────────┘
```

---

## 🔍 Paso 4: Consultar Resultados

### Query 1: Ver grupo completo (SIN resolver)

```sql
SELECT id, product_id, quantity, patient_name, recipe_date, cie_code
FROM inventory_movements
WHERE movement_group_id = '550e8400-e29b-41d4-a716-446655440500'
ORDER BY id;
```

**Resultado**:
```
item-1234 | uuid-amoxicilina | 20 | Juan Pérez │ 2026-01-18 │ J06.9
item-5678 | uuid-ibuprofeno  | 10 │ Juan Pérez │ 2026-01-18 │ J06.9
item-9012 | uuid-vitamina-c  | 30 │ Juan Pérez │ 2026-01-18 │ L12.0 ← DIFERENTE
```

### Query 2: Ver con nombres de productos

```sql
SELECT 
  im.id,
  p.name as product,
  im.quantity,
  im.patient_name,
  im.recipe_date,
  im.cie_code
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
WHERE im.movement_group_id = '550e8400-e29b-41d4-a716-446655440500'
ORDER BY im.id;
```

**Resultado**:
```
item-1234 | Amoxicilina 500mg    │ 20 │ Juan Pérez │ 2026-01-18 │ J06.9
item-5678 | Ibuprofeno 400mg     │ 10 │ Juan Pérez │ 2026-01-18 │ J06.9
item-9012 | Vitamina C 500mg     │ 30 │ Juan Pérez │ 2026-01-18 │ L12.0 ← DIFERENTE
```

### Query 3: Usar la vista (valores resueltos automáticamente)

```sql
SELECT *
FROM recipe_movements_view
WHERE movement_group_id = '550e8400-e29b-41d4-a716-446655440500';
```

**Resultado**: Igual al anterior (ya que todos tienen valores)

---

## 📊 Casos Especiales

### Caso 1: Item SIN datos específicos (NULL)

Si tuviéramos un Item 4 sin CIE específico:

```sql
-- Insert
INSERT INTO inventory_movements VALUES (
  ...
  cie_code: NULL  -- ← NULL
);

-- Query con COALESCE
SELECT 
  COALESCE(cie_code, (
    SELECT cie_code FROM inventory_movements im2
    WHERE im2.movement_group_id = '550e8400-e29b-41d4-a716-446655440500'
    AND cie_code IS NOT NULL LIMIT 1
  )) as cie_resuelto
FROM inventory_movements
WHERE id = 'item-4';

-- Resultado: J06.9 (del grupo, item 1)
```

### Caso 2: Todos los items SIN un dato (ej: sin CIE específico)

```sql
-- Todos insertados con cie_code = NULL
-- La vista retorna NULL
-- No hay dato del grupo para resolver

SELECT 
  COALESCE(cie_code, (
    SELECT cie_code FROM inventory_movements im2
    WHERE im2.movement_group_id = X
    AND cie_code IS NOT NULL LIMIT 1
  )) as cie_resuelto;

-- Resultado: NULL (porque TODOS son NULL)
```

### Caso 3: Diferentes datos por item (MÁS COMPLEJO)

```sql
-- Item 1: paciente = "Juan", cie = "J06.9"
-- Item 2: paciente = NULL, cie = "L12.0"
-- Item 3: paciente = "María", cie = NULL

-- Resolver paciente:
COALESCE(patient_name, (
  SELECT patient_name FROM inventory_movements
  WHERE movement_group_id = X AND patient_name IS NOT NULL LIMIT 1
))

-- Item 1: "Juan" (específico)
-- Item 2: "Juan" (del grupo - item 1)
-- Item 3: "María" (específico)

-- Resolver CIE:
COALESCE(cie_code, (
  SELECT cie_code FROM inventory_movements
  WHERE movement_group_id = X AND cie_code IS NOT NULL LIMIT 1
))

-- Item 1: "J06.9" (específico)
-- Item 2: "L12.0" (específico, pero es su valor - no es del grupo)
-- Item 3: "J06.9" (del grupo - item 1)
```

---

## 🎬 Resumen Visual

```
USUARIO REGISTRA
    ↓
Frontend arma JSON con datos generales + items
    ↓
Backend recibe JSON
    ↓
Backend genera movement_group_id = UUID
    ↓
Para cada item:
├─ Si tiene data específica → merge con general (sobrescribe)
└─ Si NO tiene → copia del general
    ↓
Backend inserta 3 registros en BD con mismo group_id
    ↓
BD almacena valores (generales o específicos)
    ↓
Query con COALESCE resuelve valores automáticamente
    ↓
Frontend/Reportes obtienen datos resueltos
```

---

## ✅ Validaciones Importantes

1. **Mismo movement_group_id**: Todos los items del mismo movimiento
2. **Datos completos en grupo**: Al menos uno debe tener patient_name, recipe_date, etc.
3. **Coherencia de datos**: Si se sobrescribe CIE, debe ser CIE válido
4. **Auditoría**: Quién creó, cuándo, de qué movimiento

---

*Fin del caso de uso completo.*
