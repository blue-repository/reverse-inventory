# 🎯 Resumen Simple - Lo que Cambió

## El Problema que Señalaste

**Dijiste:**
> "Los datos se piden en la app por **item o en general**, pero en base de datos no se distinguen. Es un solo campo. Si colocas valores generales, se asignan a TODOS los items que NO posean específicos. Si un item posee valores especificados, se le asignarán esos."

✅ **CORRECTO. Ahora está así.**

---

## Lo que Ahora Tenemos

### Campo de Agrupación (NUEVO)
```
movement_group_id = UUID único para cada "movimiento general"

Ejemplo:
Movimiento 1 (group-001)
├── Item A (amoxicilina)
├── Item B (ibuprofeno)
└── Item C (vitamina c)

Todos los items comparten movement_group_id = 'group-001'
```

### Lógica de Resolución
```
Para cada campo (patient_name, recipe_date, cie_code, etc.):

Si el ITEM tiene valor
  → Usar ese valor
Sino (es NULL)
  → Buscar en otros items del GRUPO
  → Usar el primer valor encontrado
Sino (todos NULL en el grupo)
  → NULL
```

---

## Ejemplo Práctico

### En la App (lo que ve el usuario)

```
INGRESO UNA RECETA PARA JUAN PÉREZ:
├─ Paciente: Juan Pérez ← GENERAL (aplica a todos)
├─ Profesional: Dr. García ← GENERAL
├─ CIE: J06.9 ← GENERAL
│
└─ Items:
    ├─ Amoxicilina: 20 (SIN datos específicos)
    ├─ Ibuprofeno: 10 (SIN datos específicos)
    └─ Vitamina C: 30 (CIE ESPECÍFICO: L12.0 ← DISTINTO)
```

### En la BD (lo que se guarda)

```
Item 1:
├─ product: amoxicilina
├─ patient_name: 'Juan Pérez' (GENERAL)
├─ cie: 'J06.9' (GENERAL)
└─ movement_group_id: 'group-001'

Item 2:
├─ product: ibuprofeno
├─ patient_name: 'Juan Pérez' (GENERAL)
├─ cie: 'J06.9' (GENERAL)
└─ movement_group_id: 'group-001'

Item 3:
├─ product: vitamina-c
├─ patient_name: 'Juan Pérez' (GENERAL)
├─ cie: 'L12.0' (ESPECÍFICO ← DIFERENTE)
└─ movement_group_id: 'group-001'
```

### Al Consultar (lo que la app obtiene)

```
SELECT * FROM recipe_movements_view
WHERE movement_group_id = 'group-001'

Resultado (RESUELTO automáticamente):
├─ Item 1: patient='Juan Pérez', cie='J06.9'
├─ Item 2: patient='Juan Pérez', cie='J06.9'
└─ Item 3: patient='Juan Pérez', cie='L12.0' ← DIFERENTE
```

---

## Estructura Nueva vs Vieja

### ANTES (INCORRECTO ❌)
```sql
inventory_movements:
├── movement_date (cuándo se registró)
├── item_movement_date (cuándo se movió el item)
├── patient_name (NULL o valor)
├── recipe_date (NULL o valor)
└── ... sin forma de agrupar o diferenciar general/específico
```

### AHORA (CORRECTO ✅)
```sql
inventory_movements:
├── movement_group_id (NEW) agrupa items
├── movement_date (puede ser general o específico)
├── patient_name (general o específico)
├── recipe_date (general o específico)
├── prescribed_by (general o específico)
├── cie_code (general o específico)
└── ... con vistas que resuelven valores automáticamente
```

---

## Cómo Funciona la Resolución

### Query en BD

```sql
SELECT 
  im.id,
  im.cie_code,  -- ← Valor del item (puede ser NULL)
  COALESCE(im.cie_code, (
    SELECT cie_code FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id 
    AND cie_code IS NOT NULL LIMIT 1
  )) as cie_resuelto  -- ← Valor final
FROM inventory_movements im
WHERE movement_group_id = 'group-001';
```

### Cómo Funciona

```
Item 1: cie_code = 'J06.9'
  → cie_resuelto = 'J06.9' (es el valor del item)

Item 2: cie_code = NULL
  → COALESCE busca en otros items del grupo
  → Encuentra 'J06.9' en Item 1
  → cie_resuelto = 'J06.9' (del grupo)

Item 3: cie_code = 'L12.0'
  → cie_resuelto = 'L12.0' (es el valor del item, específico)
```

---

## Cambios en el SQL

### Agregado
```sql
ALTER TABLE inventory_movements 
ADD COLUMN movement_group_id UUID;  -- ← NUEVO

ALTER TABLE inventory_movements 
ADD COLUMN movement_date DATE;  -- ← UN solo campo (no dos)

-- Crear vista con COALESCE
CREATE OR REPLACE VIEW recipe_movements_view AS
SELECT
  ...
  COALESCE(patient_name, (
    SELECT patient_name FROM inventory_movements 
    WHERE movement_group_id = im.movement_group_id 
    AND patient_name IS NOT NULL LIMIT 1
  )) as patient_name,
  ...
```

### Índices
```sql
CREATE INDEX idx_movements_group_id ON inventory_movements(movement_group_id);
CREATE INDEX idx_movements_movement_date ON inventory_movements(movement_date);
```

---

## Flujo End-to-End

```
USUARIO INGRESA EN APP
│
├─ Datos GENERALES
│  └─ Paciente, profesional, CIE, etc.
│
├─ Items (múltiples productos)
│  └─ Cada item: cantidad, y posible dato específico
│
↓

APP (BACKEND)
│
├─ Genera movement_group_id = UUID
│
├─ Para cada item:
│  ├─ Si tiene valor específico → guarda ese
│  └─ Si no → guarda el valor general
│
├─ Inserta TODOS con mismo group_id
│
↓

BD ALMACENA
│
├─ Item 1: general o específico
├─ Item 2: general o específico
├─ Item 3: general o específico
│
├─ Todos con movement_group_id = UUID
│
↓

APP CONSULTA
│
├─ SELECT * FROM recipe_movements_view
│
├─ La vista resuelve valores
│
├─ App obtiene valores COMPLETOS
│
↓

USUARIO VE EN TABLA
│
├─ Item 1: datos generales
├─ Item 2: datos generales
└─ Item 3: datos específicos
```

---

## ¿Por qué Está Bien Ahora?

✅ **Agrupación clara**: `movement_group_id` identifica qué items van juntos  
✅ **Un campo de fecha**: `movement_date` (no dos)  
✅ **Lógica de resolución**: COALESCE en vista  
✅ **Flexible**: Valores generales O específicos  
✅ **Escalable**: Funciona para N items  
✅ **Auditable**: Queda claro quién es general y quién específico  

---

## Archivos Listos

📁 `002_add_movement_dates_and_recipe_fields.sql` - Migración correcta  
📁 `recipe_movements_queries.sql` - Queries de ejemplo  
📁 `MOVEMENT_GROUPS_EXPLANATION.md` - Explicación completa  
📁 `COMPLETE_USE_CASE_EXAMPLE.md` - Caso paso a paso  
📁 Y 4 documentos más...

---

## ¿Qué Espera?

✅ Tu confirmación para ejecutar en Supabase  
✅ Luego: Cambios en la aplicación (Frontend + Backend)

---

**¿Listo para ejecutar la migración?**
