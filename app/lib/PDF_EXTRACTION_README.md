# Sistema de Extracción de PDFs basado en Coordenadas

## 📋 Resumen

Este sistema utiliza **pdfjs-dist** para extraer información key-value de PDFs sin estructura semántica, basándose exclusivamente en las coordenadas (x, y) de cada elemento de texto.

## 🎯 Problema que Resuelve

Los PDFs legacy generados por sistemas antiguos no tienen:
- ❌ Tablas reales (solo layout visual)
- ❌ Formularios estructurados
- ❌ Metadata semántica

Tienen:
- ✅ Layout en columnas (visual)
- ✅ Keys y values en filas separadas
- ✅ Posicionamiento por coordenadas

### Ejemplo Visual del PDF:

```
Entidad Origen:           Bodega Origen:
BAGATELA                 BODEGA DE FARMACIA BAGATELA

Fecha Egreso:            Número Egreso:
2026-01-30               001204-2026-EGR-001204MD1-93
```

## 🏗️ Arquitectura de la Solución

### 1. Extracción de Elementos con Coordenadas

```typescript
interface TextItem {
  text: string;
  x: number;      // transform[4] de pdfjs
  y: number;      // transform[5] de pdfjs
  width?: number;
  height?: number;
}
```

**Función:** `extractTextItemsFromPDF(buffer: ArrayBuffer)`

- Carga el PDF usando `pdfjs-dist`
- Itera sobre todas las páginas
- Extrae `textContent.items`
- Mapea cada item a coordenadas (x, y)

### 2. Agrupación en Líneas Visuales

```typescript
interface TextLine {
  y: number;
  items: TextItem[];
  text: string;
}
```

**Función:** `groupIntoLines(items: TextItem[], yThreshold = 5)`

- Agrupa items con coordenadas Y similares (tolerancia: 5px)
- Ordena items dentro de cada línea por X (izquierda a derecha)
- Genera texto concatenado de cada línea

**Lógica:**
```
|y1 - y2| < 5  →  Misma línea visual
```

### 3. Detección Automática de Columnas

```typescript
interface Column {
  index: number;
  minX: number;
  maxX: number;
  lines: TextLine[];
}
```

**Función:** `detectColumns(items: TextItem[], numColumns = 2)`

- Calcula el rango de coordenadas X: `[minX, maxX]`
- Divide el rango en N columnas equidistantes
- Por defecto detecta 2 columnas

**Ejemplo:**
```
minX = 50, maxX = 550
columnWidth = (550 - 50) / 2 = 250

Columna 0: [50, 300)
Columna 1: [300, 550]
```

### 4. Asignación de Líneas a Columnas

**Función:** `assignLinesToColumns(lines: TextLine[], columns: Column[])`

- Examina el primer item de cada línea
- Asigna la línea a la columna según su coordenada X
- Maneja casos edge (texto fuera de rangos)

### 5. Extracción de Pares Key-Value

**Función:** `extractKeyValuePairs(lines: TextLine[])`

**Reglas:**
1. Una línea que termina en `:` es una **KEY**
2. El **VALUE** es la siguiente línea (con Y menor)
3. Solo si el value NO es otra key

**Algoritmo:**
```typescript
for (cada línea) {
  if (línea termina en ":") {
    key = línea sin ":"
    value = siguiente línea
    
    if (value no termina en ":") {
      pairs[key] = value
    }
  }
}
```

### 6. Función Principal

**Función:** `extractKeyValuesFromPDF(buffer: ArrayBuffer)`

Pipeline completo:
```
ArrayBuffer
  → extractTextItemsFromPDF()
  → groupIntoLines()
  → detectColumns()
  → assignLinesToColumns()
  → extractKeyValuePairs()
  → Record<string, string>
```

## 📚 API Reference

### Funciones Principales

#### `extractKeyValuesFromPDF(buffer: ArrayBuffer)`

Extrae todos los pares key-value del PDF.

**Entrada:** ArrayBuffer del PDF  
**Salida:** `Record<string, string>`

```typescript
const keyValues = await extractKeyValuesFromPDF(buffer);
// {
//   "Entidad Origen": "BAGATELA",
//   "Bodega Origen": "BODEGA DE FARMACIA BAGATELA",
//   ...
// }
```

#### `parseRecipeDataFromPDF(buffer: ArrayBuffer)`

Parsea una receta completa (header + medicamentos).

**Entrada:** ArrayBuffer del PDF  
**Salida:** `RecipeData`

```typescript
const recipe = await parseRecipeDataFromPDF(buffer);
// {
//   entityOrigin: "BAGATELA",
//   warehouseOrigin: "BODEGA...",
//   medicaments: [...],
//   total: 1234.56
// }
```

#### `extractTextFromPDF(buffer: ArrayBuffer)`

Extrae texto completo respetando layout.

**Entrada:** ArrayBuffer del PDF  
**Salida:** `string`

```typescript
const text = await extractTextFromPDF(buffer);
```

### Funciones Legacy (Compatibilidad)

#### `parseRecipeData(text: string)` ⚠️ Deprecated

Parsea receta desde texto plano ya extraído.

**Uso:** Solo para compatibilidad con código existente.  
**Recomendación:** Migrar a `parseRecipeDataFromPDF()`.

## 🔧 Configuración

### 1. Instalar Dependencias

```bash
npm install pdfjs-dist
```

### 2. Configurar PDF.js Worker

Copiar el worker a `public/pdfjs/`:

```bash
cp node_modules/pdfjs-dist/build/pdf.worker.mjs public/pdfjs/
```

O descargar desde:
```
https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.624/pdf.worker.mjs
```

### 3. Configuración en el Código

El worker se configura automáticamente:

```typescript
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.mjs";
}
```

## 💻 Ejemplos de Uso

### En un Componente React

```typescript
"use client";

import { parseRecipeDataFromPDF } from "@/app/lib/pdf-utils";

export function RecipeUploader() {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const recipe = await parseRecipeDataFromPDF(buffer);
      console.log("Receta:", recipe);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return <input type="file" accept=".pdf" onChange={handleFileChange} />;
}
```

### En una API Route (Next.js)

```typescript
// app/api/process-pdf/route.ts
import { parseRecipeDataFromPDF } from "@/app/lib/pdf-utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("pdf") as File;

  const buffer = await file.arrayBuffer();
  const recipe = await parseRecipeDataFromPDF(buffer);

  return NextResponse.json({ data: recipe });
}
```

### Con Drag & Drop

```typescript
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  
  const file = e.dataTransfer.files[0];
  const buffer = await file.arrayBuffer();
  const recipe = await parseRecipeDataFromPDF(buffer);
  
  console.log(recipe);
};
```

## 🧪 Testing

### Test de Extracción

```typescript
const buffer = await fetch("/sample.pdf").then(r => r.arrayBuffer());
const keyValues = await extractKeyValuesFromPDF(buffer);

console.assert(keyValues["Entidad Origen"] === "BAGATELA");
console.assert(keyValues["Fecha Egreso"] === "2026-01-30");
```

### Test de Columnas

```typescript
const items = await extractTextItemsFromPDF(buffer);
const columns = detectColumns(items, 2);

console.assert(columns.length === 2);
console.assert(columns[0].minX < columns[1].minX);
```

## 📊 Ventajas vs Método Anterior

| Característica | Método Antiguo (regex) | Método Nuevo (coordenadas) |
|----------------|------------------------|----------------------------|
| Precisión | ⚠️ Baja (espacios, tabs) | ✅ Alta (posiciones reales) |
| Columnas | ❌ Manual/hardcoded | ✅ Detección automática |
| Layout | ❌ Pierde estructura | ✅ Respeta visual layout |
| Robustez | ⚠️ Frágil a cambios | ✅ Adaptable |
| Performance | ✅ Rápido | ⚠️ Más lento (parsing completo) |

## 🐛 Troubleshooting

### Error: "Cannot read property 'workerSrc'"

**Solución:** Verificar que el worker esté en `public/pdfjs/pdf.worker.mjs`

### Keys no se detectan correctamente

**Causa:** Threshold de Y muy estricto  
**Solución:** Aumentar `yThreshold` en `groupIntoLines()`:

```typescript
const lines = groupIntoLines(items, 10); // Aumentar de 5 a 10
```

### Columnas mal detectadas

**Causa:** PDF con layout irregular  
**Solución:** Ajustar número de columnas:

```typescript
const columns = detectColumns(items, 3); // Detectar 3 columnas
```

### Valores vacíos

**Causa:** El value es otra key (termina en `:`)  
**Solución:** Este caso ya está manejado. Verificar el PDF original.

## 🔄 Migración desde Código Legacy

### Antes (texto plano):
```typescript
const text = extractTextFromSomewhere(pdf);
const recipe = parseRecipeData(text);
```

### Después (coordenadas):
```typescript
const buffer = await pdf.arrayBuffer();
const recipe = await parseRecipeDataFromPDF(buffer);
```

## 📝 Notas Importantes

1. **No hardcodear posiciones absolutas**  
   - ✅ Usar detección automática de columnas
   - ❌ Evitar `if (x === 100)` 

2. **PDF Coordinate System**  
   - Origen (0, 0) está en la esquina inferior izquierda
   - Y aumenta hacia arriba
   - Procesamos de arriba → abajo, entonces ordenamos Y descendente

3. **Tolerancias**  
   - `yThreshold = 5`: Margen para considerar misma línea
   - Ajustable según resolución del PDF

4. **Performance**  
   - PDFs grandes pueden tardar
   - Considerar caching o procesamiento en worker

## 🚀 Próximas Mejoras

- [ ] Detección inteligente de número de columnas
- [ ] Soporte para layouts irregulares
- [ ] Cache de PDFs procesados
- [ ] Web Worker para procesamiento async
- [ ] Extracción de tablas complejas
- [ ] OCR para PDFs escaneados

## 📄 Licencia

Este código es parte del proyecto Bagatela Inventory System.

---

**Última actualización:** 6 de febrero de 2026  
**Versión:** 2.0.0 (basada en coordenadas)
