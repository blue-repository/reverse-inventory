# 🎯 Guía de Estructura - Movement Groups y Valores Generales vs Específicos

**Fecha**: 20 de enero de 2026

## 📌 Concepto Principal

Cada **movimiento general** (una entrada, salida o ajuste) puede contener múltiples **items** (productos). Todos los items del mismo movimiento están agrupados por `movement_group_id`.

Los campos de **fecha** y **receta** pueden tener:
- **Valor GENERAL**: Se aplica a todos los items que no tengan valor específico
- **Valor ESPECÍFICO**: Sobrescribe el valor general para ese item

## 🔄 Estructura de Datos

### Antes de Cambios
```
Movimiento 1
├── Item A (producto 1, qty 5)
├── Item B (producto 2, qty 3)
└── Item C (producto 3, qty 2)

Problema: No se puede asociar datos de receta al grupo, ni fechas específicas
```

### Después de Cambios
```
Movimiento 1 (movement_group_id = UUID-001)
├── Item A (product 1, qty 5)
│   ├── movement_date: null → usa del grupo
│   ├── patient_name: null → usa del grupo
│   ├── recipe_date: null → usa del grupo
│   └── ...
│
├── Item B (product 2, qty 3)
│   ├── movement_date: "2026-01-19" → ESPECIFICO
│   ├── patient_name: "María García" → ESPECIFICO (sobrescribe grupo)
│   ├── recipe_date: null → usa del grupo
│   └── ...
│
└── Item C (product 3, qty 2)
    ├── movement_date: null → usa del grupo
    ├── patient_name: null → usa del grupo
    ├── recipe_date: null → usa del grupo
    └── ...

GRUPO (almacenado en el primer item u otro lugar):
├── patient_name: "Juan Pérez"
├── recipe_date: "2026-01-18"
├── prescribed_by: "Dr. García"
└── cie_code: "J06.9"
```

## 💾 Cómo se Guarda

**En la BD**: Cada item tiene sus propios campos. No hay tabla separada para datos del grupo.

```sql
-- Item 1 (datos generales del grupo)
INSERT INTO inventory_movements VALUES (
  id: 'item-1',
  movement_group_id: 'group-001',
  product_id: 'producto-1',
  quantity: 5,
  movement_date: '2026-01-20',
  patient_name: 'Juan Pérez',        -- ← GENERAL
  recipe_date: '2026-01-18',          -- ← GENERAL
  prescribed_by: 'Dr. García',        -- ← GENERAL
  cie_code: 'J06.9'                   -- ← GENERAL
);

-- Item 2 (datos específicos sobrescriben)
INSERT INTO inventory_movements VALUES (
  id: 'item-2',
  movement_group_id: 'group-001',
  product_id: 'producto-2',
  quantity: 3,
  movement_date: '2026-01-19',        -- ← DIFERENTE
  patient_name: 'María García',       -- ← DIFERENTE (sobrescribe)
  recipe_date: null,                  -- ← Usa del grupo
  prescribed_by: null,                -- ← Usa del grupo
  cie_code: null                      -- ← Usa del grupo
);

-- Item 3 (usa todo del grupo)
INSERT INTO inventory_movements VALUES (
  id: 'item-3',
  movement_group_id: 'group-001',
  product_id: 'producto-3',
  quantity: 2,
  movement_date: null,                -- ← Usa del grupo
  patient_name: null,                 -- ← Usa del grupo
  recipe_date: null,                  -- ← Usa del grupo
  prescribed_by: null,                -- ← Usa del grupo
  cie_code: null                      -- ← Usa del grupo
);
```

## 🔍 Cómo se Consulta

### Consulta 1: Obtener un Grupo Completo

```sql
-- Ver todos los items del grupo 'group-001'
SELECT *
FROM inventory_movements
WHERE movement_group_id = 'group-001'
ORDER BY id;

-- Resultado (sin resolver):
item-1: product-1, qty 5, movement_date='2026-01-20', patient_name='Juan Pérez', ...
item-2: product-2, qty 3, movement_date='2026-01-19', patient_name='María García', ...
item-3: product-3, qty 2, movement_date=null, patient_name=null, ...
```

### Consulta 2: Resolver Valores (COALESCE)

```sql
-- Ver items CON VALORES RESUELTOS
SELECT 
  id,
  product_id,
  quantity,
  movement_date,
  COALESCE(patient_name, (
    SELECT patient_name 
    FROM inventory_movements 
    WHERE movement_group_id = 'group-001' 
    AND patient_name IS NOT NULL 
    LIMIT 1
  )) as patient_name_resuelto,
  COALESCE(recipe_date, (
    SELECT recipe_date 
    FROM inventory_movements 
    WHERE movement_group_id = 'group-001' 
    AND recipe_date IS NOT NULL 
    LIMIT 1
  )) as recipe_date_resuelto,
  COALESCE(prescribed_by, (
    SELECT prescribed_by 
    FROM inventory_movements 
    WHERE movement_group_id = 'group-001' 
    AND prescribed_by IS NOT NULL 
    LIMIT 1
  )) as prescribed_by_resuelto,
  COALESCE(cie_code, (
    SELECT cie_code 
    FROM inventory_movements 
    WHERE movement_group_id = 'group-001' 
    AND cie_code IS NOT NULL 
    LIMIT 1
  )) as cie_code_resuelto
FROM inventory_movements
WHERE movement_group_id = 'group-001'
ORDER BY id;

-- Resultado (RESUELTO - con valores del grupo cuando falta):
item-1: product-1, qty 5, date='2026-01-20', patient_name_resuelto='Juan Pérez', recipe_date='2026-01-18', ...
item-2: product-2, qty 3, date='2026-01-19', patient_name_resuelto='María García', recipe_date='2026-01-18', ...
item-3: product-3, qty 2, date='2026-01-20', patient_name_resuelto='Juan Pérez', recipe_date='2026-01-18', ...
        └─ movement_date='2026-01-20' (del grupo)
```

## 🎨 Vista SQL para Resolver Automáticamente

```sql
CREATE OR REPLACE VIEW recipe_movements_view AS
SELECT
  im.id,
  im.movement_group_id,
  im.product_id,
  p.name as product_name,
  im.quantity,
  im.movement_date,
  -- Resuelve los valores automáticamente
  COALESCE(im.patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id 
    AND patient_name IS NOT NULL LIMIT 1
  )) as patient_name,
  COALESCE(im.recipe_date, (
    SELECT recipe_date FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id 
    AND recipe_date IS NOT NULL LIMIT 1
  )) as recipe_date,
  COALESCE(im.prescribed_by, (
    SELECT prescribed_by FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id 
    AND prescribed_by IS NOT NULL LIMIT 1
  )) as prescribed_by,
  COALESCE(im.cie_code, (
    SELECT cie_code FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id 
    AND cie_code IS NOT NULL LIMIT 1
  )) as cie_code
FROM inventory_movements im
WHERE im.is_recipe_movement = TRUE;

-- USO: SELECT * FROM recipe_movements_view;
-- Automáticamente resuelve todos los valores
```

## 🌐 Cómo Funciona en la APP

### Flujo 1: Usuario Ingresa Datos Generales

```
USUARIO
  ↓
"Quiero registrar una salida por receta"
  ↓
Modal muestra:
├── Producto 1 ↓ 2 (cantidad)
├── Producto 2 ↓ 3 (cantidad)
├── Producto 3 ↓ 2 (cantidad)
│
├── DATOS GENERALES (aplican a todos):
│  ├── Fecha: 2026-01-20
│  ├── Paciente: Juan Pérez
│  ├── Profesional: Dr. García
│  ├── CIE: J06.9
│
└── Botón: "¿Tiene datos específicos por item?"
```

### Flujo 2: APP Genera Registros

```
APP (Backend) recibe:
{
  movement_group_id: gen_uuid(), // Generar UUID para el grupo
  items: [
    { product_id: 1, quantity: 2 },
    { product_id: 2, quantity: 3 },
    { product_id: 3, quantity: 2 }
  ],
  general_data: {
    movement_date: '2026-01-20',
    patient_name: 'Juan Pérez',
    recipe_date: '2026-01-18',
    prescribed_by: 'Dr. García',
    cie_code: 'J06.9'
  }
}

APP convierte en 3 inserts:
INSERT INTO inventory_movements VALUES (
  movement_group_id, product_id=1, quantity=2,
  movement_date='2026-01-20',
  patient_name='Juan Pérez',
  recipe_date='2026-01-18',
  prescribed_by='Dr. García',
  cie_code='J06.9'
);

INSERT INTO inventory_movements VALUES (
  movement_group_id, product_id=2, quantity=3,
  movement_date='2026-01-20',
  patient_name='Juan Pérez',    -- Mismo del grupo
  recipe_date='2026-01-18',     -- Mismo del grupo
  prescribed_by='Dr. García',   -- Mismo del grupo
  cie_code='J06.9'              -- Mismo del grupo
);

INSERT INTO inventory_movements VALUES (
  movement_group_id, product_id=3, quantity=2,
  movement_date='2026-01-20',
  patient_name='Juan Pérez',
  recipe_date='2026-01-18',
  prescribed_by='Dr. García',
  cie_code='J06.9'
);
```

### Flujo 3: Usuario Modifica para Específico

```
USUARIO en el modal:
"Quiero que el Producto 2 sea para otro paciente"

Modal muestra:
├── Producto 1 ↓ 2 (usa datos generales)
├── Producto 2 ↓ 3 (✓ Override)
│   └── Paciente: [María García] (sobrescribe "Juan Pérez")
└── Producto 3 ↓ 2 (usa datos generales)

APP convierte en 3 inserts:
INSERT 1: patient_name='Juan Pérez' (general)
INSERT 2: patient_name='María García' (ESPECIFICO - sobrescribe)
INSERT 3: patient_name='Juan Pérez' (general)
```

## ✅ Checklist de Implementación

### En Backend (Server Actions)

- [ ] Generar `movement_group_id` como UUID para cada movimiento
- [ ] Aceptar datos generales en el form
- [ ] Aceptar array de items con posibles datos específicos
- [ ] Para cada item: llenar campos generales, sobrescribir si existe específico
- [ ] Insertar todos los registros con el mismo `movement_group_id`

### En Frontend (Components)

- [ ] Modal: agregar campos de datos generales
- [ ] Modal: agregar toggle "¿Datos específicos por item?"
- [ ] Si toggle=true: mostrar campo editable para cada item
- [ ] Validar que al menos los datos generales estén completos
- [ ] Mostrar preview de qué se guardará

### En Vistas (Views)

- [ ] Vista `recipe_movements_view` resuelve valores automáticamente
- [ ] Vista `movements_with_dates_view` también resuelve
- [ ] Las queries usan COALESCE para resolver en tiempo de consulta

## 🚀 Ejemplos de Queries en la APP

### Obtener Receta Completa

```sql
-- Frontend hace: SELECT * FROM recipe_movements_view WHERE movement_group_id = ?
-- Retorna items con valores resueltos automáticamente
SELECT * FROM recipe_movements_view 
WHERE movement_group_id = '550e8400-e29b-41d4-a716-446655440202';

-- Resultado: Items con patient_name, recipe_date, etc. resueltos
```

### Agrupar por Paciente (Resolviiendo)

```sql
SELECT 
  COALESCE(patient_name, (
    SELECT patient_name FROM inventory_movements im2
    WHERE im2.movement_group_id = im.movement_group_id
    AND patient_name IS NOT NULL LIMIT 1
  )) as paciente,
  COUNT(*) as items,
  SUM(quantity) as total
FROM inventory_movements im
GROUP BY movement_group_id;
```

## 📝 Nota Importante

En la **base de datos**, los valores específicos pueden ser NULL. La **vista SQL** se encarga de resolverlos con COALESCE. Si la **APP** necesita los valores resueltos, debe:

1. Usar la **vista** (automático)
2. O hacer **COALESCE** en la query
3. O resolver en el código de la APP

---

*Este documento explica cómo funciona la lógica de agrupación y valores generales/específicos.*
