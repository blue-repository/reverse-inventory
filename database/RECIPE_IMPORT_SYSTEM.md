# Sistema de Importación de Recetas (NOTA DE EGRESO)

**Fecha:** 6 de febrero de 2026  
**Estado:** ✅ Completamente implementado y compilando sin errores  
**Próxima fase:** Pruebas con PDFs reales

---

## ✅ Qué se implementó exactamente

Una solución **end-to-end** para procesar archivos PDF de recetas médicas (NOTA DE EGRESO "Egresos - Dispensación A Pacientes") y automatizar la creación de registros de egreso en la base de datos.

### Funcionalidad principal:
1. **Validación de PDF** - Verifica que el PDF contenga el texto exacto: `'NOTA DE EGRESO "Egresos - Dispensación A Pacientes"'`
2. **Extracción de datos** - Extrae números de egreso, fechas, datos del paciente y medicamentos
3. **Cola de procesamiento** - Procesa archivos secuencialmente sin bloquear la UI
4. **Visualización de progreso** - Muestra lista expandible Con barras de progreso, se minimiza a círculo animado
5. **Guardado automático** - Inserta registros en `inventory_movements` y `movement_details` con mapeos correctos
6. **Generación de IDs** - Crea `prescription_group_id` único por receta para agrupar medicamentos

### Características:
- ✅ Soporte drag-drop de múltiples PDFs
- ✅ Procesamiento secuencial (un archivo a la vez)
- ✅ Error handling por archivo
- ✅ Persistencia de archivos durante procesamiento
- ✅ Circuito animado minimizable mostrando % progreso total
- ✅ Validación de PDF antes de extraer datos

---

## 📁 Archivos creados/modificados

### **CREADOS:**

#### 1. `app/types/recipe.ts`
```typescript
Interfaces TypeScript para type-safety:
- RecipeData: Estructura completa de receta extraída
- RecipeMedicament: Datos de cada medicamento
- ProcessingResult: Resultado de procesamiento
- UploadQueueItem: Item en la cola de carga
```

#### 2. `app/lib/pdf-utils.ts`
```typescript
Funciones de utilidad PDF:
- validateRecipeDocument(text): boolean
  → Verifica presencia de "Egresos - Dispensación A Pacientes"
  
- parseRecipeData(text): RecipeData
  → Extrae: entityOrigin, warehouseOrigin, egressDate, egressNumber, etc.
  → Llama a parseMedicaments() para tabla
  
- parseMedicaments(text): RecipeMedicament[]
  → Usa regex para parsear tabla de medicamentos
  → Extrae: SKU, nombre, unidad, lote, fecha vencimiento, cantidad, costo
```

#### 3. `app/actions/recipes.ts` (Server Action)
```typescript
Operaciones de base de datos:
- createRecipeEgress(recipeData: RecipeData): Promise<ProcessingResult>
  → Genera único prescription_group_id
  → Inserta fila en inventory_movements
  → Loop: para cada medicamento:
      • Query product por barcode
      • Query product_batches si existe lote
      • INSERT movement_details
      • UPDATE available_quantity vía RPC
      
- Retorna ProcessingResult con éxito/conteo/total
```

#### 4. `app/api/process-recipe/route.ts`
```typescript
API REST endpoint:
POST /api/process-recipe
  → Input: { pdfText: string, fileName?: string }
  → valida → parsea → saveToDatabase
  → Output: ProcessingResult JSON
  
GET /api/process-recipe?recipeCode=...
  → Query status de egreso existente
```

#### 5. `app/components/RecipeUploadQueue.tsx` (React Component)
```typescript
UI completa con:
- loadPdfJs(): Importa dinámicamente pdfjs-dist
- handleFileSelect(): Selecciona archivos, los guarda en filesMapRef.current
- processQueue(): Loop que procesa un archivo a la vez
- extractPdfText(file): Usa PDF.js para extraer texto del PDF
- uploadAndProcessFile(): POST a /api/process-recipe
- Render: Lista expandible + circuito animado minimizable
```

#### 6. `public/pdfjs/pdf.worker.js`
```
Web Worker de PDF.js copiado desde node_modules
Sirve localmente (no depende de CDN)
Path: /public/pdfjs/pdf.worker.js
```

### **MODIFICADOS:**

#### `app/layout.tsx`
```diff
+ import RecipeUploadQueue from '@/app/components/RecipeUploadQueue'

<body>
  {children}
+ <RecipeUploadQueue />  {/* Posicionado: fixed bottom-4 right-4 z-50 */}
</body>
```

---

## 🔧 Configuraciones importantes

### **PDF.js Worker (CRÍTICO)**
```typescript
// En RecipeUploadQueue.tsx - función loadPdfJs()
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.js";
// ✅ Local file (NOT CDN) - Solunta problem de "fake worker failed"
// ❌ NO usar CDN: cdnjs.cloudflare.com, jsdelivr, etc (todos fallaban)
```

### **Mapeos de base de datos (CORREGIDOS)**
```typescript
// En app/actions/recipes.ts - createRecipeEgress():

inventory_movements:
  - recipe_code: ← PDF egressNumber
  - recipe_date: ← PDF egressDate
  - movement_date: ← PDF egressDate (mismo valor)
  - patient_name: ← PDF recipientName
  - patient_identification: ← PDF patientIdentifier
  - is_recipe_movement: true (siempre)
  - prescription_group_id: ← Auto-generado: RX-{timestamp}-{random}
  - movement_type: 'egress'
  - warehouse_origin: ← De PDF entityOrigin

movement_details:
  - product_id: ← Query por barcode (NO por sku)
  - quantity: ← De medicament.quantity
  - unit_cost: ← De medicament.unitCost
  - batch_id: ← Query product_batches por número lote
  - is_recipe_movement: true
  - prescription_group_id: ← MISMO que movement
  
product_batches (opcional):
  - Se busca por product_id + batch number
```

### **Flujo de extracción de PDF**
```
1. Usuario sube archivo PDF
   ↓
2. validateRecipeDocument() - Busca texto exacto en PDF
   ├─ ✅ Contiene "Egresos" → continúa
   └─ ❌ NO contiene → Error, rechaza archivo
   ↓
3. parseRecipeData() - Usa regex para extraer:
   - Número de egreso
   - Fecha de egreso
   - Datos del paciente (nombre, identificación)
   - Llamada a parseMedicaments()
   ↓
4. parseMedicaments() - Extrae tabla de medicamentos:
   - SKU, descripción, unidad
   - Lote, fecha vencimiento
   - Cantidad, costo unitario
   ↓
5. Envía JSON a /api/process-recipe
   ├─ POST { pdfText, fileName }
   └─ API responde: ProcessingResult
   ↓
6. createRecipeEgress() - Server Action:
   - Genera prescription_group_id único
   - INSERT inventory_movements
   - LOOP medicamentos:
     • Query product por barcode
     • INSERT movement_details
     • UPDATE available_quantity
   ↓
7. Retorna resultado a componente
   ├─ ✅ Éxito: Muestra medicamentos guardados
   └─ ❌ Error: Muestra mensaje de error
```

### **Persistencia de archivos**
```typescript
// En RecipeUploadQueue.tsx
const filesMapRef = useRef<Map<string, File>>(new Map());

// Al seleccionar:
filesMapRef.current.set(itemId, file);

// Al procesar:
const file = filesMapRef.current.get(itemId);

// Razón: El input HTML se limpia, por lo que los File objects
// se pierden si no se guardan en un ref/state separado
```

---

## ⚙️ Cómo funciona el flujo de datos

### **Flujo completo: PDF → DB**

```
┌─────────────────────────────────────────────────────────────┐
│ USUARIO: Sube PDF (drag-drop o file input)                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ RecipeUploadQueue.tsx: handleFileSelect()                    │
│ - Guarda File en filesMapRef.current Map                     │
│ - Crea UploadQueueItem con status="pending"                  │
│ - Agrega a state queue[]                                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ RecipeUploadQueue.tsx: processQueue() (async loop)           │
│ 1. Recupera File de filesMapRef.current                      │
│ 2. Llama loadPdfJs() - Importa pdfjs-dist (client-side)     │
│ 3. Extrae texto del PDF con PDF.js                           │
│    Progress: 0→50%                                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ app/lib/pdf-utils.ts: extractPdfText()                       │
│ - Valida con validateRecipeDocument(text)                    │
│   └─ ✅ Contiene "Egresos" → Continúa                       │
│   └─ ❌ NO contiene → Throw error                            │
│ - Parsea con parseRecipeData(text) → RecipeData JSON        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ RecipeUploadQueue.tsx: uploadAndProcessFile()               │
│ - POST a /api/process-recipe                                │
│   Body: { pdfText: string, fileName: string }               │
│   Progress: 50→75%                                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ app/api/process-recipe/route.ts: POST handler               │
│ - Recibe pdfText (string con contenido del PDF)             │
│ - Llama validateRecipeDocument() + parseRecipeData()        │
│ - Obtiene RecipeData JSON                                    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ app/actions/recipes.ts: createRecipeEgress()                │
│ SERVER ACTIONS - Executa en servidor con acceso a DB        │
│                                                             │
│ 1. Genera prescription_group_id = RX-${timestamp}-${random} │
│                                                             │
│ 2. INSERT inventory_movements {                              │
│      recipe_code: recipeData.egressNumber,                   │
│      recipe_date: recipeData.egressDate,                     │
│      movement_date: recipeData.egressDate,                   │
│      patient_name: recipeData.recipientName,                 │
│      patient_identification: recipeData.patientIdentifier,   │
│      is_recipe_movement: true,                               │
│      prescription_group_id: generatedId,                     │
│      movement_type: 'egress',                                │
│      warehouse_origin: recipeData.entityOrigin               │
│    }                                                         │
│                                                             │
│ 3. LOOP recipeData.medicaments: {                            │
│      a) Query products WHERE barcode = medicament.sku        │
│         └─ ❌ SI NO EXISTE: Skip/Error                       │
│                                                             │
│      b) SI EXISTE lote:                                      │
│         Query product_batches {                              │
│           product_id: productId,                             │
│           batch_number: medicament.batch                     │
│         }                                                    │
│                                                             │
│      c) INSERT movement_details {                            │
│           movement_id: createdMovement.id,                   │
│           product_id: product.id,                            │
│           batch_id: batchId (null si no existe),             │
│           quantity: medicament.quantity,                     │
│           unit_cost: medicament.unitCost,                    │
│           is_recipe_movement: true,                          │
│           prescription_group_id: generatedId                 │
│         }                                                    │
│                                                             │
│      d) UPDATE product available_quantity:                   │
│         RPC call: update_product_available_quantity(         │
│           product_id,                                        │
│           -medicament.quantity  // Restar cantidad          │
│         )                                                    │
│    }                                                         │
│                                                             │
│ 4. RETURN ProcessingResult {                                 │
│      success: true,                                          │
│      message: "Receta procesada",                            │
│      egressNumber: recipe_code,                              │
│      medicamentCount: cantidad guardada,                     │
│      total: costo total,                                     │
│      error: null                                             │
│    }                                                         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ app/api/process-recipe/route.ts: Retorna JSON               │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ RecipeUploadQueue.tsx: Recibe respuesta                      │
│ - Actualiza item.status = 'completed'                        │
│ - Guarda result en item.result                               │
│ - Progress: 75→100%                                         │
│ - Elimina archivo de filesMapRef                             │
│                                                             │
│ UI: Muestra ✅ + "X medicamentos guardados" + Total $        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        DATABASE UPDATED - Egreso registrado
```

### **Estados del item en cola:**
```
pending   → Espera para procesarse
processing → Extrayendo PDF o enviando
completed → ✅ Guardado en DB
error     → ❌ Falló (validación, extracción, DB)
```

### **Progreso visual:**
```
0-50%     → Extrayendo texto del PDF
50-75%    → Enviando a servidor
75-100%   → Procesando en DB y completado
```

---

## 📝 Próximas tareas/mejoras

### **Alto prioridad (Funcional):**
- [ ] **Pruebas con PDFs reales** - Validar extracción con documentos reales del hospital
- [ ] **Toast notifications** - Agregar feedback visual (success/error/warning)
- [ ] **Retry logic** - Permitir reintentar archivos fallidos sin recargar
- [ ] **Validación de productos** - Alertar si barcode no existe antes de guardar

### **Medio prioridad (UX):**
- [ ] **localStorage persistence** - Guardar cola entre sesiones
- [ ] **Cancel/Pause** - Permitir cancelar procesamiento
- [ ] **Batch summary report** - Mostrar resumen de archivos procesados hoy
- [ ] **Error details modal** - Mostrar información detallada de errores

### **Bajo prioridad (Optional):**
- [ ] **Multiple warehouse support** - Permitir seleccionar almacén destino
- [ ] **Audit logging** - Registrar quién/cuándo cargó cada receta
- [ ] **Medicament metadata** - Guardar doctor, fecha prescripción, etc.
- [ ] **Unit tests** - Tests para parseRecipeData(), medicaments regex, etc.
- [ ] **Medicament verification** - Validar cantidad vs stock disponible

---

## 🐛 Problemas resueltos (CDN, archivos, etc.)

### **1. PDF.js Worker Loading - ❌→✅**
**Problema:**
```
Error: Failed to load PDF.js worker from CDN
Message: "fake worker detected" or "fetch error"
Causas intentadas:
- cdnjs.cloudflare.com → Pero módulo no cargaba
- jsdelivr.net → CORS issues
- unpkg.com → Más CORS
- pdfjs-dist npm → Server-side import error
```

**Solución:**
```bash
# 1. Copiar worker desde node_modules a public
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdfjs/pdf.worker.js

# 2. En RecipeUploadQueue.tsx:
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.js";
```

**Por qué funciona:** Next.js sirve archivos desde `/public` en la ruta raíz. El worker ahora está en origen local, sin dependencias de CDN.

---

### **2. Archivo "No encontrado" durante procesamiento - ❌→✅**
**Problema:**
```
Al seleccionar múltiples archivos, algunos desaparecían al momento de procesar
El input HTML se limpiaba, los File objects se perdían
```

**Raíz:**
```typescript
// ❌ ANTES: Input se limpiaba
<input type="file" onChange={handleFileSelect} />
// Al onChange, React renderizaba, el input se reiniciaba
// Los File objects del HTMLInputElement desaparecían
```

**Solución:**
```typescript
// ✅ DESPUÉS: Guardar en Map
const filesMapRef = useRef<Map<string, File>>(new Map());

handleFileSelect() {
  filesMapRef.current.set(itemId, file); // Guardar referencia
}

processQueue() {
  const file = filesMapRef.current.get(itemId); // Recuperar cuando procesar
}
```

---

### **3. Database field mappings incorrectos - ❌→✅**
**Problema:**
```typescript
// ❌ INCORRECTO - Campos que NO EXISTEN
.insert({ reference_number: ... })  // Campo NO existe
.insert({ sku: ... })               // Buscar por SKU falla

// ✅ CORRECTO
.update({ recipe_code: ... })       // Campo correcto
.eq('barcode', medicament.sku)      // Buscar por barcode
```

**Campos corregidos:**
```typescript
// Mapeos finales validados:
recipe_code       ← PDF egressNumber
recipe_date       ← PDF egressDate
patient_name      ← PDF recipientName
patient_identification ← PDF patientIdentifier
is_recipe_movement → true (siempre)
prescription_group_id → Auto-generado
barcode (buscar)  ← medicament.sku en PDF
```

---

### **4. TypeScript build errors (pdfjs-dist) - ❌→✅**
**Problema:**
```
Error: pdfjs-dist cannot be imported in server components
Module not found: pdf-dist module
```

**Solución:**
```typescript
// En RecipeUploadQueue.tsx (CLIENT COMPONENT)
"use client"; // ← Marcar como client component

// En loadPdfJs():
const pdfjs = await import('pdfjs-dist/legacy/build/pdf'); // Dynamic import
```

---

### **5. Medicament parsing regex - ✅ Working**
**Patrón usado:**
```regex
/(\d+)\s+([^\t]+)\t([^\t]+)\t([^\t]+)\t([^\t]+)\t([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/gm
```

**Extrae:** SKU | Descripción | Unidad | Lote | Fecha | Cantidad | Costo | Total

**Nota:** Puede necesitar ajuste "si PDFs usan otros formatos/delimitadores

---

## 🚀 Cómo empezar a probar

```bash
# 1. Iniciar servidor
npm run dev

# 2. Navegar a http://localhost:3000

# 3. Buscar botón "Cargar Recetas" (parte inferior derecha)

# 4. Seleccionar 1-2 PDFs de receta

# 5. Observar:
   ✅ Cola visible con nombres de archivo
   ✅ Barras de progreso avanzando 0→100%
   ✅ Al minimizar → Círculo animado con %
   ✅ Al completar → "X medicamentos guardados + Total"

# 6. Validar en DB:
SELECT * FROM inventory_movements 
WHERE is_recipe_movement = true
ORDER BY created_at DESC
LIMIT 1;

# 7. Validar medicamentos:
SELECT md.*, p.name FROM movement_details md
JOIN products p ON md.product_id = p.id 
WHERE md.is_recipe_movement = true
ORDER BY md.created_at DESC
LIMIT 10;
```

---

## 📊 Resumen técnico

| Componente | Tecnología | Ubicación | Estado |
|---|---|---|---|
| **Validación PDF** | RegEx | `app/lib/pdf-utils.ts` | ✅ Completo |
| **Extracción texto** | pdfjs-dist 4.0.379 | `app/components/RecipeUploadQueue.tsx` | ✅ Completo |
| **Parsing datos** | RegEx + JSON | `app/lib/pdf-utils.ts` | ✅ Completo |
| **Server actions** | Next.js SSA | `app/actions/recipes.ts` | ✅ Completo |
| **API REST** | Next.js Route | `app/api/process-recipe/route.ts` | ✅ Completo |
| **UI Component** | React 19 + Tailwind | `app/components/RecipeUploadQueue.tsx` | ✅ Completo |
| **Worker PDF** | Local file | `public/pdfjs/pdf.worker.js` | ✅ Completo |
| **Build** | Turbopack | `npm run build` | ✅ Sin errores |

---

## 💾 Layout de base de datos esperado

**inventory_movements** (Egreso creado por receta):
```sql
{
  id, 
  recipe_code,        -- Número de egreso del PDF
  recipe_date,        -- Fecha de egreso
  movement_date,      -- Campo redundante, mismo que recipe_date
  patient_name,       -- Nombre del destinatario
  patient_identification,  -- Número de identificación
  is_recipe_movement: true,
  prescription_group_id,  -- RX-123456789-ABC123
  movement_type: 'egress',
  warehouse_origin,   -- Farmacia origen
  ...otros campos estándar
}
```

**movement_details** (Medicamentos dentro del egreso):
```sql
{
  id,
  movement_id,        -- FK a inventory_movements
  product_id,         -- FK a products (por barcode)
  batch_id,           -- FK a product_batches (opcional)
  quantity,           -- Cantidad del medicamento
  unit_cost,          -- Costo unitario
  is_recipe_movement: true,
  prescription_group_id,  -- MISMO que movement padre
  ...otros campos estándar
}
```

---

**Última actualización:** 6 de febrero de 2026  
**Build status:** ✅ Compilado exitosamente  
**Próxima acción:** Pruebas con PDFs reales
