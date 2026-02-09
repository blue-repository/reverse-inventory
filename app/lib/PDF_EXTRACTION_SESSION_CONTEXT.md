# Contexto Completo de Extracción de PDFs - Sistema de Recetas Bagatela

## 1. DESCRIPCIÓN GENERAL DEL PROYECTO

**Proyecto:** Sistema de inventario farmacéutico "Bagatela Inventory" construido con Next.js 16.1.6
**Objetivo Principal:** Extraer automáticamente datos de PDFs de "Notas de Egreso - Dispensación A Pacientes" para registrarlos en una base de datos

## 2. PROBLEMA INICIAL

Los PDFs de recetas tienen **estructura visual pero NO semántica**. Esto significa:
- El texto no está organizado por estructura JSON o etiquetas
- Los elementos se posicionan usando coordenadas (x, y) en el PDF
- Los métodos de extracción por regex y búsqueda de texto plano eran frágiles y poco precisos
- Se perdían o contaminaban campos como nombres de pacientes y receptores

## 3. SOLUCIÓN IMPLEMENTADA: ARQUITECTURA CLIENTE-SERVIDOR

### 3.1 Estrategia General

**Modelo: Cliente procesa, Servidor almacena**

```
1. Cliente (Navegador)
   ├─ Lee PDF como ArrayBuffer
   ├─ Usa pdfjs-dist (diseñado para navegador)
   ├─ Extrae texto completo del PDF
   └─ Parsea datos con método legacy (regex + búsqueda)

2. Servidor (Node.js)
   ├─ Recibe JSON con datos ya procesados
   ├─ Valida y normaliza los valores
   ├─ Almacena en base de datos
   └─ Devuelve confirmación

BENEFICIOS:
✅ pdfjs-dist funciona perfectamente en navegador
✅ No hay errores de AbortException
✅ Procesamiento distribuido (menos carga en servidor)
✅ Mayor velocidad
```

### 3.2 Por qué esta arquitectura

**Problema que resolvemos:**
- Inicialmente intentamos usar pdf-parse en servidor (Node.js)
- Causa: `"Class constructor AbortException cannot be invoked without 'new'"`
- Razón: pdf-parse tiene incompatibilidades internas en Node.js
- **Solución:** Delegar la extracción de texto al cliente (donde pdfjs-dist es robusto)

## 4. FLUJO COMPLETO DE PROCESAMIENTO

### 4.1 Cliente: RecipeUploadQueue.tsx

```typescript
// Paso 1: Usuario selecciona PDF
handleFileSelect() → crea UploadQueueItem con estado "pending"

// Paso 2: Convertir archivo a ArrayBuffer
fileToArrayBuffer(file: File): Promise<ArrayBuffer>
→ Usa FileReader para leer el archivo binario completo

// Paso 3: Procesar PDF en cliente
import { parseRecipeDataFromPDF } from "@/app/lib/pdf-utils"
recipeData = await parseRecipeDataFromPDF(buffer)

// Paso 4: Enviar datos al servidor
POST /api/process-recipe con JSON:
{
  fileName: "receta_xxx.pdf",
  recipeData: {
    entityOrigin: string,
    warehouseOrigin: string,
    egressDate: string,
    egressNumber: string,
    documentType: string,
    documentNumber: string,
    documentDate: string,
    additionalDocument?: string,
    recipientName: string,
    recipientId: string,
    patientIdentifier: string,
    patientName?: string,
    medicaments: RecipeMedicament[],
    total: number
  }
}

// Paso 5: Mostrar resultado en UI
- Estado "success" con 100% de progreso
- O estado "error" con mensaje descriptivo
```

### 4.2 Servidor: process-recipe/route.ts

```typescript
POST /api/process-recipe

Entrada: JSON con recipeData ya procesada

Procesamiento:
1. Valida estructura JSON
2. Verifica que medicaments sea un array válido
3. Llama a createRecipeEgress(recipeData) para guardar en DB
4. Retorna respuesta JSON

Retorno:
{
  success: boolean,
  message: string,
  data?: { /* datos guardados */ },
  error?: string
}
```

## 5. FUNCIONES CLAVE EN pdf-utils.ts

### 5.1 parseRecipeDataFromPDF(buffer: ArrayBuffer): Promise<RecipeData>

**Función principal - PUNTO DE ENTRADA PÚBLICO**

```typescript
// Detecta si está en servidor o navegador
const isServer = typeof window === "undefined"

if (isServer) {
  // Servidor: intenta pdf-parse con timeout y fallback
  // Si falla, lanza error informativo
  const pdfParseFn = await loadPdfParse()
  const data = await pdfParseFn(Buffer.from(buffer))
  fullText = data.text
} else {
  // Navegador: usa pdfjs-dist (RECOMENDADO)
  fullText = await extractTextFromPDF(buffer)
}

// Valida que sea receta válida
if (!validateRecipeDocument(fullText))
  throw new Error('No es una "Nota de Egreso"')

// Parsea usando método legacy
recipeData = parseRecipeData(fullText)

return recipeData
```

### 5.2 parseRecipeData(text: string): RecipeData

**Función de PARSEO - Procesa el texto extraído**

```typescript
1. parseHeaderFields(text)
   → Extrae campos del header (entidad, bodega, fechas, receptor, paciente)
   
2. validateAndNormalizeHeaderFields(fields)
   → Limpia y valida cada campo
   → Elimina duplicaciones de texto
   → Separa nombres de IDs si están mezclados
   
3. parseMedicaments(text)
   → Busca patrón de SKU en tabla
   → Extrae: nombre, cantidad, costo, total
   
4. Retorna objeto RecipeData completo
```

### 5.3 parseHeaderFields(text: string): Partial<Record<HeaderKey, string>>

**Extrae campos del header del PDF**

ESTRATEGIA:
1. Busca etiquetas conocidas: "Entidad Origen:", "Fecha Egreso:", "Paciente:", etc.
2. Extrae el valor después de cada etiqueta
3. Si el valor es corto o sospechoso, lo marca como "pendiente"
4. Usa líneas siguientes para completar valores pendientes
5. Rechaza valores cortos sospechosos (≤3 chars) para campos importantes

CAMPOS EXTRAÍDOS:
- entityOrigin, warehouseOrigin
- egressDate, egressNumber  
- documentType, documentNumber, documentDate
- additionalDocument
- recipientName, recipientId
- patientIdentifier, patientName

### 5.4 validateAndNormalizeHeaderFields(fields): Partial<Record<HeaderKey, string>>

**NORMALIZACIÓN Y VALIDACIÓN POST-EXTRACCIÓN**

```typescript
Para recipientName y patientName:
1. removeDuplication(text)
   - Divide en palabras
   - Si primera mitad = segunda mitad, elimina la duplicación
   - Ejemplo: "JUAN JUAN" → "JUAN"

2. Separa nombre de ID si están combinados
   - Patrón: /^(.+)\s+(\d{7,})$/
   - Ejemplo: "JUAN PEREZ 1234567" → name: "JUAN PEREZ", id: "1234567"

3. Limpia caracteres especiales y headers de tabla
   - Elimina: "SKU", "Nombre", "Unidad", "Lote", etc.

Para IDs (recipientId, patientIdentifier):
1. Valida que sean solo números
2. Si contiene no-números, extrae el número más largo (7+ dígitos)
3. Mantiene solo dígitos válidos
```

### 5.5 assignPendingValues() - Extracción Inteligente

**Procesa líneas posteriores cuando hay valores pendientes**

CASOS ESPECIALES:
1. **egressDate + egressNumber**: Busca patrón YYYY-MM-DD seguido de número
2. **documentType + documentNumber**: Separa tipo de documento del número
3. **entityOrigin + warehouseOrigin**: Busca palabra clave "BODEGA"
4. **recipientName + recipientId**: Busca 7+ dígitos al final, extrae nombre antes
5. **patientName + patientIdentifier**: 
   - Busca PRIMER número de 7+ dígitos
   - Todo lo anterior = nombre
   - Todo lo posterior = nombre (si anterior era muy corto)
   - El número = ID

### 5.6 assignHeaderValue()

**Asigna valores de forma inteligente SIN SOBRESCRIBIR**

```typescript
REGLAS:
1. Si el campo ya tiene valor y el nuevo es ≤3 chars
   → Mantiene el existente
   
2. Si el campo ya tiene valor válido (≥3 chars)
   → NO sobrescribe (excepto si es significativamente mejor)
   
3. Registra en logs qué se asigna y qué se rechaza

PROPÓSITO: Evitar que valores cortos y sospechosos contaminen datos válidos
```

## 6. PROBLEMAS RESUELTOS EN ESTA SESIÓN

### 6.1 Problema: AbortException en servidor
**Causa:** pdf-parse incompatible con Node.js
**Solución:** Cliente procesa con pdfjs-dist, servidor solo almacena

### 6.2 Problema: Campos contaminados (nombre + ID juntos)
**Causa:** Líneas del PDF tienen "Nombre: JUAN PEREZ 1234567"
**Solución:** regex `/^(.+)\s+(\d{7,})$/` para separar correctamente

### 6.3 Problema: Valores sospechosos cortos ("s\"")
**Causa:** Parsing de headers encontraba caracteres sueltos
**Solución:** Rechazar valores ≤3 chars para campos importantes

### 6.4 Problema: Nombres duplicados
**Causa:** Algunos PDFs tienen "JUAN PEREZ JUAN PEREZ"
**Solución:** removeDuplication() detecta y elimina segunda mitad idéntica

### 6.5 Problema: Selección entre múltiples números en misma línea
**Causa:** "1726874637 RODRIGUEZ PACHECO ARELIS ZULAY RODRIGUEZ..."
**Solución:** Buscar PRIMER número, not el último (cambio de estrategia)

## 7. ARCHIVOS MODIFICADOS

### A. app/lib/pdf-utils.ts (PRINCIPAL - 965 líneas)

**Cambios realizados:**
- ✅ Función `loadPdfParse()`: Carga dinámica con 4 patrones de detección
- ✅ Función `loadPdfJs()`: Carga dinámica de pdfjs-dist solo en navegador
- ✅ Función `parseRecipeDataFromPDF()`: Detección servidor/cliente con estrategia fallback
- ✅ Función `parseRecipeData()`: Ahora llama a `validateAndNormalizeHeaderFields()`
- ✅ Función `parseHeaderFields()`: Extracción robusta de headers
- ✅ Función `assignPendingValues()`: Lógica de extracción de múltiples líneas
- ✅ Función `assignHeaderValue()`: Asignación inteligente sin sobrescritura
- ✅ Función `validateAndNormalizeHeaderFields()` (NUEVA): Normaliza y valida
- ✅ Función `removeDuplication()` (NUEVA): Elimina nombres/valores duplicados
- ✅ Función `parseMedicaments()`: Extrae tabla de medicamentos
- ✅ Logging extenso para debugging

### B. app/components/RecipeUploadQueue.tsx (REFACTORIZADO)

**Cambios realizados:**
- ✅ Función `fileToArrayBuffer()`: Lee PDF como ArrayBuffer
- ✅ Función `uploadAndProcessFile()`: 
  - Paso 1: Lee archivo → ArrayBuffer
  - Paso 2: Procesa en cliente con parseRecipeDataFromPDF()
  - Paso 3: Envía JSON con recipeData al servidor
- ✅ Progreso visual: 25% → 50% → 75% → 100%
- ✅ Mejor manejo de errores

### C. app/api/process-recipe/route.ts (ACTUALIZADO)

**Cambios realizados:**
- ✅ Opción 1 (NUEVO): Acepta JSON con `recipeData` ya procesada ⭐ PRIMARIA
- ✅ Opción 2 (LEGACY): Acepta FormData con PDF
- ✅ Opción 3 (LEGACY): Acepta JSON con pdfBase64
- ✅ Validación: Verifica estructura mínima de recipeData
- ✅ Guarda directamente sin procesar (más rápido)

## 8. INTERFACES Y TIPOS

### RecipeData (en app/types/recipe.ts)

```typescript
interface RecipeData {
  entityOrigin: string              // Ej: "BAGATELA"
  warehouseOrigin: string           // Ej: "BODEGA DE FARMACIA BAGATELA"
  egressDate: string                // YYYY-MM-DD
  egressNumber: string              // Número del egreso
  documentType: string              // Ej: "Receta"
  documentNumber: string            // Nro de documento receptor
  documentDate: string              // Fecha del documento
  additionalDocument?: string       // Documento adicional (opcional)
  recipientName: string             // Nombre del receptor
  recipientId: string               // ID del receptor (7+ dígitos)
  patientIdentifier: string         // ID del paciente (7+ dígitos)
  patientName?: string              // Nombre del paciente (opcional)
  medicaments: RecipeMedicament[]   // Array de medicamentos
  total: number                     // Total en dinero
}

interface RecipeMedicament {
  sku: string                       // Código único del medicamento
  name: string                      // Nombre comercial
  unit: string                      // Unidad (Caja, Frasco, etc.)
  batch: string                     // Número de lote
  expirationDate: string            // YYYY-MM-DD
  quantity: number                  // Cantidad dispensada
  unitCost: number                  // Costo unitario
  total: number                     // Cantidad × Costo
}
```

## 9. FLUJO VISUAL COMPLETO

```
PDF File (en navegador)
    ↓
fileToArrayBuffer() → ArrayBuffer
    ↓
parseRecipeDataFromPDF()
    ├─ extractTextFromPDF() (pdfjs-dist)
    ├─ validateRecipeDocument()
    └─ parseRecipeData()
        ├─ parseHeaderFields()
        ├─ validateAndNormalizeHeaderFields()
        └─ parseMedicaments()
    ↓
RecipeData (JSON)
    ↓
POST /api/process-recipe
    ↓
Servidor valida
    ↓
createRecipeEgress(recipeData)
    ↓
Base de datos
    ↓
Respuesta success/error
```

## 10. ESTADO ACTUAL - QUÉ FUNCIONA

✅ **Extracción de datos del header:**
- Entidad y bodega origen
- Fechas de egreso
- Números de documento
- Receptor (nombre + ID separados correctamente)
- Paciente (nombre + ID separados correctamente, sin duplicación)

✅ **Extracción de medicamentos:**
- SKU del medicamento
- Nombre del medicamento
- Cantidad
- Costo unitario
- Total

✅ **Validaciones:**
- Rechaza PDFs que no son "Notas de Egreso"
- Detecta y previene valores sospechosos
- Valida que IDs sean números
- Limpia texto de headers de tabla

✅ **Arquitectura:**
- Cliente procesa PDFs con pdfjs-dist
- Servidor solo almacena datos
- Sin errores de AbortException
- Mejor separación de responsabilidades

## 11. PARA FUTUROS CAMBIOS

### Cómo agregar validación adicional:
1. Modifica la función correspondiente en `pdf-utils.ts`
2. Usa logging con `console.log("[tag]", data)` para debugging
3. Prueba en http://localhost:3001/test

### Cómo cambiar patrones de extracción:
1. Los patrones de búsqueda están en `HEADER_LABELS` array
2. Los regex están en `assignPendingValues()` y `validateAndNormalizeHeaderFields()`
3. Funciones de parsing: `parseMedicaments()`, `parseHeaderFields()`

### Cómo ver logs:
- Consola del servidor (terminal Next.js debug)
- Buscar prefijos: `[patientName extraction]`, `[validateAndNormalizeHeaderFields]`, etc.

## 12. NOTAS TÉCNICAS IMPORTANTES

**Coordenadas vs Texto Plano:**
- Se implementó sistema de coordenadas (x,y) con pdfjs-dist pero finalmente se usa método legacy (texto plano + regex)
- Razón: El método legacy es más robusto para este tipo de PDFs y más fácil de mantener

**Por qué NOT pdf-parse en servidor:**
```
pdf-parse:
❌ Errores de AbortException en Node.js
❌ Incompatibilidades internas
❌ No confiable para este use case

pdfjs-dist:
✅ Funciona perfectamente en navegador
✅ Diseñado para este propósito
✅ Stable y mantenido
```

**Estrategia de normalización:**
- Los datos se procesan 2 veces:
  1. En `parseHeaderFields()` - extracción inicial
  2. En `validateAndNormalizeHeaderFields()` - limpieza y correcciones
- Esto permite corregir problemas después de la extracción inicial

---

## RESUMEN EJECUTIVO

**Sesión completó:**
1. ✅ Refactorización de arquitectura (cliente → servidor)
2. ✅ Resolución de 5+ problemas de extracción
3. ✅ Normalización y validación robusta
4. ✅ Logging para debugging
5. ✅ Todos los campos de header extraen correctamente

**Sistema LISTO para:**
- Cambios en validación adicional
- Nuevos campos de extracción
- Ajustes en parsing de medicamentos
- Mejoras en UI/UX
