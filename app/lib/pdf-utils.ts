/**
 * Utilidades para procesar PDFs de recetas
 * Extrae y parsea los datos de "NOTA DE EGRESO 'Egresos - Dispensación A Pacientes'"
 * 
 * Estrategia:
 * - En el navegador: usa pdfjs-dist con coordenadas (x, y) para máxima precisión
 * - En el servidor: usa pdf-parse (más confiable en Node.js)
 */

import { RecipeData, RecipeMedicament } from "@/app/types/recipe";

// Importar pdf-parse de forma dinámica solo en el servidor
let pdfParse: any = null;

/**
 * Carga pdf-parse en el servidor de forma dinámica
 */
async function loadPdfParse() {
  if (pdfParse) return pdfParse;

  try {
    const module: any = await import("pdf-parse");
    
    // pdf-parse puede exportar de varias formas
    // 1. module.default es la función
    // 2. module es la función directamente
    // 3. module.default.default existe
    
    if (typeof module.default === "function") {
      pdfParse = module.default;
    } else if (typeof module === "function") {
      pdfParse = module;
    } else if (module && typeof module === "object") {
      // Buscar la función en las propiedades del módulo
      const func = Object.values(module).find((v) => typeof v === "function");
      if (func) {
        pdfParse = func;
      } else {
        throw new Error(
          `No se encontró función de pdf-parse en: ${Object.keys(module).join(", ")}`
        );
      }
    } else {
      throw new Error(`pdf-parse tiene tipo inesperado: ${typeof module}`);
    }
    
    return pdfParse;
  } catch (error) {
    console.error("Error cargando pdf-parse:", error);
    throw new Error(
      `No se pudo cargar pdf-parse: ${error instanceof Error ? error.message : "Error desconocido"}`
    );
  }
}

// Importar pdfjs-dist de forma dinámica para el navegador
let pdfjsLib: any = null;

/**
 * Carga pdfjs-dist en el navegador de forma dinámica
 */
async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  try {
    let pdfjs;

    if (typeof window !== "undefined") {
      // Navegador - usar la versión estándar
      pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.js";
    } else {
      // Este código no debería ejecutarse, pero es un fallback
      return null;
    }

    pdfjsLib = pdfjs;
    return pdfjs;
  } catch (error) {
    console.error("Error cargando pdfjs-dist:", error);
    return null;
  }
}

/**
 * Representa un elemento de texto con su posición en el PDF
 */
interface TextItem {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Representa una línea visual agrupada por coordenada Y
 */
interface TextLine {
  y: number;
  items: TextItem[];
  text: string;
}

/**
 * Representa una columna detectada
 */
interface Column {
  index: number;
  minX: number;
  maxX: number;
  lines: TextLine[];
}

/**
 * Valida que el PDF sea una nota de egreso válida.
 * Acepta cualquier subtipo de NOTA DE EGRESO que contenga la tabla de productos (N° SKU).
 */
export function validateRecipeDocument(text: string): boolean {
  return text.includes('NOTA DE EGRESO') && (text.includes('N\u00b0 SKU') || text.includes('N\u00ba SKU'));
}

/**
 * Extrae el subtipo del egreso desde el texto del PDF.
 * Ej: "Dispensación A Pacientes", "Abastecimiento Entre Entidades De Msp".
 * Retorna el subtipo encontrado, o undefined si no se puede determinar.
 */
export function extractEgressSubtype(text: string): string | undefined {
  // El patrón en el PDF es: NOTA DE EGRESO "Egresos - <Subtipo>"
  const match = text.match(/NOTA DE EGRESO\s+["\u201c]Egresos\s+-\s+([^"\u201d\n]+)["\u201d]/);
  if (match) {
    return match[1].trim();
  }
  return undefined;
}

// ============================================================================
// EXTRACCIÓN BASADA EN COORDENADAS (x, y) usando pdfjs-dist
// ============================================================================

/**
 * Extrae todos los elementos de texto con sus coordenadas desde un PDF
 */
async function extractTextItemsFromPDF(buffer: ArrayBuffer): Promise<TextItem[]> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const allItems: TextItem[] = [];

  // Procesar todas las páginas
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    textContent.items.forEach((item: any) => {
      if (item.str && item.str.trim()) {
        // transform[4] = x, transform[5] = y
        allItems.push({
          text: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
        });
      }
    });
  }

  return allItems;
}

/**
 * Agrupa elementos de texto en líneas visuales basándose en coordenada Y
 * Tolerancia: dos items están en la misma línea si |y1 - y2| < threshold
 */
function groupIntoLines(items: TextItem[], yThreshold = 5): TextLine[] {
  if (items.length === 0) return [];

  // Ordenar por Y descendente (PDF coordinate system: y decrece hacia abajo)
  const sorted = [...items].sort((a, b) => b.y - a.y);

  const lines: TextLine[] = [];
  let currentLine: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];

    if (Math.abs(item.y - currentY) < yThreshold) {
      // Mismo nivel Y, misma línea
      currentLine.push(item);
    } else {
      // Nueva línea
      // Ordenar items de la línea por X
      currentLine.sort((a, b) => a.x - b.x);
      lines.push({
        y: currentY,
        items: currentLine,
        text: currentLine.map((it) => it.text).join(" "),
      });

      currentLine = [item];
      currentY = item.y;
    }
  }

  // Añadir última línea
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push({
      y: currentY,
      items: currentLine,
      text: currentLine.map((it) => it.text).join(" "),
    });
  }

  return lines;
}

/**
 * Detecta automáticamente las columnas basándose en distribución de coordenadas X
 */
function detectColumns(items: TextItem[], numColumns = 2): Column[] {
  if (items.length === 0) return [];

  const xCoords = items.map((item) => item.x);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);

  const columns: Column[] = [];
  const columnWidth = (maxX - minX) / numColumns;

  for (let i = 0; i < numColumns; i++) {
    const colMinX = minX + i * columnWidth;
    const colMaxX = minX + (i + 1) * columnWidth;

    columns.push({
      index: i,
      minX: colMinX,
      maxX: colMaxX,
      lines: [],
    });
  }

  return columns;
}

/**
 * Asigna líneas a columnas basándose en la posición X del primer item
 */
function assignLinesToColumns(lines: TextLine[], columns: Column[]): Column[] {
  const result: Column[] = columns.map((col) => ({ ...col, lines: [] as TextLine[] }));

  lines.forEach((line) => {
    if (line.items.length === 0) return;

    const firstX = line.items[0].x;

    // Encontrar la columna a la que pertenece
    const column = result.find(
      (col) => firstX >= col.minX && firstX < col.maxX
    );

    if (column) {
      column.lines.push(line);
    } else {
      // Si no encaja exactamente, asignar a la columna más cercana
      const closest = result.reduce((prev, curr) =>
        Math.abs(curr.minX - firstX) < Math.abs(prev.minX - firstX)
          ? curr
          : prev
      );
      closest.lines.push(line);
    }
  });

  return result;
}

/**
 * Extrae pares key-value desde las líneas de una columna
 * Una línea que termina en ":" es una KEY
 * El VALUE es la siguiente línea en la misma columna (con Y menor)
 */
function extractKeyValuePairs(lines: TextLine[]): Record<string, string> {
  const pairs: Record<string, string> = {};

  // Ordenar líneas por Y descendente (de arriba hacia abajo)
  const sortedLines = [...lines].sort((a, b) => b.y - a.y);

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i];
    const text = line.text.trim();

    // Detectar si es una key (termina en ":")
    if (text.endsWith(":")) {
      const key = text.slice(0, -1).trim();

      // Buscar el valor en la siguiente línea
      if (i + 1 < sortedLines.length) {
        const valueLine = sortedLines[i + 1];
        const value = valueLine.text.trim();

        // Solo asignar si el valor no es otra key
        if (value && !value.endsWith(":")) {
          pairs[key] = value;
        }
      }
    }
  }

  return pairs;
}

/**
 * Función principal: extrae key-values desde un PDF usando coordenadas
 */
export async function extractKeyValuesFromPDF(
  buffer: ArrayBuffer
): Promise<Record<string, string>> {
  try {
    // 1. Extraer items con coordenadas
    const items = await extractTextItemsFromPDF(buffer);

    // 2. Agrupar en líneas visuales
    const lines = groupIntoLines(items, 5);

    // 3. Detectar columnas
    const columns = detectColumns(items, 2);

    // 4. Asignar líneas a columnas
    const columnsWithLines = assignLinesToColumns(lines, columns);

    // 5. Extraer key-value de cada columna
    const allPairs: Record<string, string> = {};

    columnsWithLines.forEach((column) => {
      const columnPairs = extractKeyValuePairs(column.lines);
      Object.assign(allPairs, columnPairs);
    });

    return allPairs;
  } catch (error) {
    console.error("Error extrayendo key-values del PDF:", error);
    throw new Error("No se pudo procesar el PDF");
  }
}

/**
 * Extrae todo el texto del PDF (útil para validación y debugging)
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const items = await extractTextItemsFromPDF(buffer);
    const lines = groupIntoLines(items, 5);
    return lines.map((line) => line.text).join("\n");
  } catch (error) {
    console.error("Error extrayendo texto del PDF:", error);
    throw new Error("No se pudo extraer texto del PDF");
  }
}

/**
 * Parsea datos de receta desde un PDF
 * 
 * En el servidor: usa pdf-parse (más confiable en Node.js)
 * En el navegador: usa pdfjs-dist (máxima precisión)
 */
export async function parseRecipeDataFromPDF(
  buffer: ArrayBuffer
): Promise<RecipeData | { success: false; error: string }> {
  // Detectar si estamos en el servidor o navegador
  const isServer = typeof window === "undefined";

  let fullText: string;

  if (isServer) {
    // Servidor: intentar con pdf-parse, pero con fallback robusto
    fullText = "";
    let pdfParseFailed = false;

    try {
      const pdfParseFn = await loadPdfParse();
      const pdfBuffer = Buffer.from(buffer);
      
      // Ejecutar pdf-parse con timeout interno
      let data;
      try {
        data = await Promise.race([
          pdfParseFn(pdfBuffer),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("pdf-parse timeout")), 10000)
          )
        ]);
      } catch (timeoutError) {
        console.warn("pdf-parse timeout o error:", timeoutError);
        pdfParseFailed = true;
        throw timeoutError;
      }
      
      fullText = data.text || "";

      if (!fullText || fullText.trim().length === 0) {
        throw new Error("PDF no contiene texto extraíble");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[pdf-parse] Error:", errorMsg);
      
      // Si es error de carga de módulo, relanzar
      if (errorMsg.includes("No se pudo cargar pdf-parse")) {
        throw error;
      }
      
      // Para otros errores (AbortException, timeout, etc), intentar fallback
      pdfParseFailed = true;
    }

    // Fallback: si pdf-parse falló, informar al cliente
    if (pdfParseFailed || !fullText) {
      console.warn(
        "[pdf-parse] Falló. Requiere procesamiento en navegador."
      );
      throw new Error(
        "El servidor no puede procesar este PDF. Por favor, intenta de nuevo."
      );
    }
  } else {
    // Navegador: usar pdfjs-dist (como antes)
    fullText = await extractTextFromPDF(buffer);
  }

  // Validar que sea una nota de egreso válida
  if (!validateRecipeDocument(fullText)) {
    return {
      success: false,
      error: 'Documento no válido: El archivo debe ser una "NOTA DE EGRESO" del sistema MSP con tabla de productos (N° SKU).',
    };
  }

  // Parsear usando el método legacy (funciona con texto plano)
  // Este método es más robusto y no depende de pdfjs-dist en el servidor
  const recipeData = parseRecipeData(fullText);
  
  // Verificar si parseRecipeData retornó un error
  if (recipeData && typeof recipeData === 'object' && 'success' in recipeData && recipeData.success === false) {
    return recipeData;
  }

  // En el navegador: intentar extracción de tabla basada en coordenadas
  // para capturar correctamente celdas con texto multilínea
  if (!isServer) {
    try {
      const coordMedicaments = await parseMedicamentsFromCoords(buffer);
      if (coordMedicaments.length > 0) {
        (recipeData as RecipeData).medicaments = coordMedicaments;
        const coordTotal = coordMedicaments.reduce((sum, m) => sum + m.total, 0);
        if (!(recipeData as RecipeData).total) {
          (recipeData as RecipeData).total = coordTotal;
        }
        console.log(
          `[parseRecipeDataFromPDF] Extracción por coordenadas exitosa: ${coordMedicaments.length} productos`
        );
      }
    } catch (err) {
      console.warn(
        "[parseRecipeDataFromPDF] Falló extracción por coordenadas, usando texto plano:",
        err
      );
    }
  }

  return recipeData as RecipeData;
}

// ============================================================================
// EXTRACCIÓN DE TABLA POR COORDENADAS (pdfjs-dist, solo navegador)
// ============================================================================

/**
 * Parsea la tabla de medicamentos/productos usando las coordenadas (x, y)
 * de cada elemento de texto extraído con pdfjs-dist.
 *
 * Ventajas sobre el método basado en texto plano:
 * - Captura correctamente celdas con texto que ocupa múltiples líneas
 *   (ej: "Catéter Urinario Uretral, 14 Fr, Tres Vías")
 * - Asigna cada fragmento de texto a su columna correcta usando posición X
 * - Agrupa fragmentos de la misma celda por rango de Y
 */
async function parseMedicamentsFromCoords(
  buffer: ArrayBuffer
): Promise<RecipeMedicament[]> {
  const allItems = await extractTextItemsFromPDF(buffer);
  if (allItems.length === 0) return [];

  // ── Paso 1: Localizar la fila de encabezado ──────────────────────────
  const skuItem = allItems.find((i) => i.text === "SKU");
  if (!skuItem) return [];

  const headerY = skuItem.y;
  const yTol = 3;

  // Items de la línea principal del encabezado
  const headerPrimaryItems = allItems
    .filter((i) => Math.abs(i.y - headerY) < yTol)
    .sort((a, b) => a.x - b.x);

  // Incluir segunda línea del encabezado (ej: "Caducidad", "achada")
  const headerAllItems = allItems
    .filter((i) => i.y <= headerY + yTol && i.y >= headerY - 15)
    .sort((a, b) => a.x - b.x);

  // ── Paso 2: Detectar posiciones X de cada columna ────────────────────
  const findX = (
    keyword: string,
    items: TextItem[] = headerPrimaryItems
  ): number | undefined => {
    const found = items.find((i) => i.text.includes(keyword));
    return found?.x;
  };

  const skuX = findX("SKU")!;
  const nombreX = findX("Nombre");
  const unidadX = findX("Unidad");
  const loteX = findX("Lote");
  const fechaX = findX("Fecha");
  const cantX = findX("Cant");
  const costoX = findX("Costo");
  const totalX = findX("Total");

  // N° es la columna más a la izquierda (antes de SKU)
  const nItems = headerPrimaryItems.filter((i) => i.x < skuX);
  const nX = nItems.length > 0 ? nItems[0].x : skuX - 30;

  // Construir definiciones de columnas ordenadas por X
  type ColDef = { name: string; x: number };
  const cols: ColDef[] = [{ name: "N", x: nX }, { name: "SKU", x: skuX }];
  if (nombreX !== undefined) cols.push({ name: "Nombre", x: nombreX });
  if (unidadX !== undefined) cols.push({ name: "Unidad", x: unidadX });
  if (loteX !== undefined) cols.push({ name: "Lote", x: loteX });
  if (fechaX !== undefined) cols.push({ name: "Fecha", x: fechaX });
  if (cantX !== undefined) cols.push({ name: "Cantidad", x: cantX });
  if (costoX !== undefined) cols.push({ name: "Costo", x: costoX });
  if (totalX !== undefined) cols.push({ name: "Total", x: totalX });
  cols.sort((a, b) => a.x - b.x);

  if (cols.length < 5) return [];

  // Límites de cada columna: desde su X hasta el X de la siguiente columna
  const bounds = cols.map((c, i) => ({
    name: c.name,
    left: c.x - 5,
    right: i + 1 < cols.length ? cols[i + 1].x - 5 : Infinity,
  }));

  // ── Paso 3: Límites verticales de la tabla ───────────────────────────
  const headerBottomY = Math.min(...headerAllItems.map((i) => i.y));

  const endItems = allItems.filter(
    (i) =>
      i.text.includes("OBSERVACIONES") || i.text.startsWith("TOTAL(")
  );
  const tableEndY =
    endItems.length > 0 ? Math.max(...endItems.map((i) => i.y)) : 0;

  // ── Paso 4: Filtrar items del área de datos ──────────────────────────
  const tableItems = allItems
    .filter((i) => i.y < headerBottomY - 2 && i.y > tableEndY)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  if (tableItems.length === 0) return [];

  // ── Paso 5: Detectar inicio de cada fila lógica ──────────────────────
  const nBound = bounds.find((b) => b.name === "N")!;
  const rowStarters = tableItems
    .filter(
      (i) =>
        /^\d+$/.test(i.text.trim()) &&
        i.x >= nBound.left &&
        i.x < nBound.right
    )
    .sort((a, b) => b.y - a.y);

  if (rowStarters.length === 0) return [];

  // ── Paso 6: Extraer medicamentos ─────────────────────────────────────
  const medicaments: RecipeMedicament[] = [];

  for (let r = 0; r < rowStarters.length; r++) {
    const yTop = rowStarters[r].y + yTol;
    const yBot =
      r + 1 < rowStarters.length ? rowStarters[r + 1].y : tableEndY;

    // Items que pertenecen a esta fila
    const rowItems = tableItems.filter(
      (i) => i.y <= yTop && i.y > yBot
    );

    // Asignar cada item a su columna
    const colTexts: Record<string, TextItem[]> = {};
    for (const b of bounds) colTexts[b.name] = [];

    for (const item of rowItems) {
      const col = bounds.find(
        (b) => item.x >= b.left && item.x < b.right
      );
      if (col) colTexts[col.name].push(item);
    }

    // Unir items de cada columna manteniendo orden de lectura
    const mergeCol = (name: string): string => {
      const citems = colTexts[name] || [];
      if (citems.length === 0) return "";

      // Agrupar por nivel Y (items en la misma línea visual)
      const lineGroups: { y: number; items: TextItem[] }[] = [];
      for (const item of citems) {
        const existing = lineGroups.find(
          (g) => Math.abs(g.y - item.y) < yTol
        );
        if (existing) {
          existing.items.push(item);
        } else {
          lineGroups.push({ y: item.y, items: [item] });
        }
      }

      // Ordenar: arriba → abajo, izquierda → derecha dentro de cada línea
      lineGroups.sort((a, b) => b.y - a.y);
      return lineGroups
        .map((g) => {
          g.items.sort((a, b) => a.x - b.x);
          return g.items.map((it) => it.text).join(" ");
        })
        .join(" ")
        .trim();
    };

    const sku = mergeCol("SKU");
    if (!sku) continue;

    const name = mergeCol("Nombre");
    const batch = mergeCol("Lote");
    const fechaRaw = mergeCol("Fecha");
    const cantRaw = mergeCol("Cantidad");
    const costoRaw = mergeCol("Costo");
    const totalRaw = mergeCol("Total");

    // Extraer fecha YYYY-MM-DD
    const dateMatch = fechaRaw.match(/\d{4}-\d{2}-\d{2}/);
    const expirationDate = dateMatch ? dateMatch[0] : fechaRaw;

    medicaments.push({
      sku,
      name: name.replace(/\s+/g, " "),
      unit: "Caja",
      batch,
      expirationDate,
      quantity: parseInt(cantRaw, 10) || 0,
      unitCost: parseFloat(costoRaw) || 0,
      total: parseFloat(totalRaw) || 0,
    });
  }

  return medicaments;
}

// ============================================================================
// FUNCIONES LEGACY (compatibilidad con texto plano ya extraído)
// ============================================================================


type HeaderKey =
  | "entityOrigin"
  | "warehouseOrigin"
  | "egressDate"
  | "egressNumber"
  | "documentType"
  | "documentNumber"
  | "documentDate"
  | "additionalDocument"
  | "recipientName"
  | "recipientId"
  | "patientIdentifier"
  | "patientName";

interface HeaderLabel {
  key: HeaderKey;
  label: string;
}

const HEADER_LABELS: HeaderLabel[] = [
  { key: "entityOrigin", label: "Entidad Origen:" },
  { key: "warehouseOrigin", label: "Bodega Origen:" },
  { key: "egressDate", label: "Fecha Egreso:" },
  { key: "egressNumber", label: "Número Egreso:" },
  { key: "egressNumber", label: "Numero Egreso:" },
  { key: "documentType", label: "Tipo Documento:" },
  { key: "documentNumber", label: "Nro. Documento:" },
  { key: "documentDate", label: "Fecha Documento:" },
  { key: "additionalDocument", label: "Doc. Adicional:" },
  { key: "recipientName", label: "Nombre Receptor:" },
  { key: "recipientId", label: "Identificador Receptor:" },
  { key: "patientIdentifier", label: "Num. Identificación:" },
  { key: "patientIdentifier", label: "Num. Identificacion:" },
  { key: "patientName", label: "Paciente" },
  { key: "patientName", label: "Paciente:" },
];

function normalizeLine(line: string): string {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/[ ]+/g, " ")
    .replace(/\t+/g, "\t")
    .trim();
}

function splitHeaderSegments(line: string): string[] {
  const tabSplit = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tabSplit.length > 1) return tabSplit;

  const gapSplit = line.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (gapSplit.length > 1) return gapSplit;

  return [line.trim()].filter(Boolean);
}

function assignHeaderValue(
  fields: Partial<Record<HeaderKey, string>>,
  key: HeaderKey,
  value: string
): void {
  const cleanValue = value.trim();
  if (!cleanValue) return;
  
  // No sobrescribir valores ya asignados
  if (fields[key]) {
    // Excepto si el nuevo valor es significativamente mejor (más largo y válido)
    const existingValue = fields[key] || "";
    // Si el valor existente es más largo y válido, mantenerlo
    if (existingValue.length > cleanValue.length && existingValue.length > 3) {
      console.log(`[assignHeaderValue] Keeping existing value for ${key}:`, JSON.stringify(existingValue), "instead of", JSON.stringify(cleanValue));
      return;
    }
    // Si ambos son cortos/sospechosos, mantener el existente
    if (existingValue.length >= 3 && cleanValue.length <= 3) {
      console.log(`[assignHeaderValue] Keeping existing value for ${key}:`, JSON.stringify(existingValue), "instead of suspicious short value", JSON.stringify(cleanValue));
      return;
    }
  }
  
  fields[key] = cleanValue;
  console.log(`[assignHeaderValue] Assigned ${key}:`, JSON.stringify(cleanValue));
}

function assignPendingValues(
  line: string,
  pending: HeaderKey[],
  fields: Partial<Record<HeaderKey, string>>
): HeaderKey[] {
  let remaining = [...pending];
  let handled = false;

  const hasKey = (key: HeaderKey) => remaining.includes(key);
  const clearKey = (key: HeaderKey) => {
    remaining = remaining.filter((k) => k !== key);
  };

  // Evitar capturar headers de tabla (líneas como "N° SKU Nombre Unidad...")
  if (line.includes("SKU") && line.includes("Nombre") && line.includes("Unidad")) {
    return remaining;
  }

  if (hasKey("egressDate") && hasKey("egressNumber")) {
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      assignHeaderValue(fields, "egressDate", dateMatch[0]);
      const rest = line.replace(dateMatch[0], "").trim();
      assignHeaderValue(fields, "egressNumber", rest);
      clearKey("egressDate");
      clearKey("egressNumber");
      handled = true;
    }
  }

  if (hasKey("documentType") && hasKey("documentNumber")) {
    const typeNumberMatch = line.match(/^(.*?)(\d+)\s*$/);
    if (typeNumberMatch) {
      assignHeaderValue(fields, "documentType", typeNumberMatch[1]);
      assignHeaderValue(fields, "documentNumber", typeNumberMatch[2]);
      clearKey("documentType");
      clearKey("documentNumber");
      handled = true;
    }
  }

  if (hasKey("documentDate") && hasKey("additionalDocument")) {
    const dateTimeMatch = line.match(/\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?/);
    if (dateTimeMatch) {
      assignHeaderValue(fields, "documentDate", dateTimeMatch[0]);
      const rest = line.replace(dateTimeMatch[0], "").trim();
      const docMatch = rest.match(/\b\d+\b/);
      if (docMatch) {
        assignHeaderValue(fields, "additionalDocument", docMatch[0]);
      }
      clearKey("documentDate");
      clearKey("additionalDocument");
      handled = true;
    }
  }

  if (hasKey("entityOrigin") && hasKey("warehouseOrigin")) {
    const segments = splitHeaderSegments(line);
    if (segments.length >= 2) {
      assignHeaderValue(fields, "entityOrigin", segments[0]);
      assignHeaderValue(fields, "warehouseOrigin", segments.slice(1).join(" "));
      clearKey("entityOrigin");
      clearKey("warehouseOrigin");
      handled = true;
    } else {
      const splitIndex = line.search(/\bBODEGA\b/i);
      if (splitIndex > 0) {
        assignHeaderValue(fields, "entityOrigin", line.slice(0, splitIndex));
        assignHeaderValue(fields, "warehouseOrigin", line.slice(splitIndex));
        clearKey("entityOrigin");
        clearKey("warehouseOrigin");
        handled = true;
      }
    }
  }

  // Mejorado: Separar recipientName de recipientId
  if (hasKey("recipientName") && hasKey("recipientId")) {
    // Patrón: Nombre (solo letras, espacios, algunos caracteres) seguido de ID (números)
    // Buscar un número de 7+ dígitos al final de la línea
    const idMatch = line.match(/\b(\d{7,})\s*$/);
    if (idMatch) {
      // El ID está al final
      const nameCandidate = line.substring(0, line.lastIndexOf(idMatch[1])).trim();
      if (nameCandidate && nameCandidate.length > 0) {
        assignHeaderValue(fields, "recipientName", nameCandidate);
        assignHeaderValue(fields, "recipientId", idMatch[1]);
        clearKey("recipientName");
        clearKey("recipientId");
        handled = true;
      }
    } else {
      // Intentar separar por tabs o múltiples espacios
      const segments = splitHeaderSegments(line);
      if (segments.length >= 2) {
        // Último segmento podría ser el ID si es solo números
        const lastSegment = segments[segments.length - 1];
        if (/^\d{7,}$/.test(lastSegment)) {
          const nameSegements = segments.slice(0, -1);
          assignHeaderValue(fields, "recipientName", nameSegements.join(" "));
          assignHeaderValue(fields, "recipientId", lastSegment);
          clearKey("recipientName");
          clearKey("recipientId");
          handled = true;
        }
      }
    }
  }

  // Mejorado: Separar patientName de patientIdentifier
  if (hasKey("patientIdentifier") && hasKey("patientName")) {
    // Estrategia: buscar EL PRIMER grupo de 7+ dígitos en la línea
    // TODO antes = nombre, TODO desde ese ID en adelante = el ID
    const idMatch = line.match(/(\d{7,})/);
    if (idMatch) {
      const idPosition = line.indexOf(idMatch[1]);
      const namePart = line.substring(0, idPosition).trim();
      const idPart = idMatch[1];
      
      // Si el nombre tiene contenido válido
      if (namePart && namePart.length > 2 && !namePart.includes("SKU")) {
        assignHeaderValue(fields, "patientName", namePart);
        assignHeaderValue(fields, "patientIdentifier", idPart);
        clearKey("patientIdentifier");
        clearKey("patientName");
        handled = true;
      } else {
        // Si el nombre es muy corto, podría ser todo el resto de la línea
        const afterId = line.substring(idPosition + idPart.length).trim();
        if (afterId && afterId.length > 2 && !afterId.includes("SKU")) {
          assignHeaderValue(fields, "patientName", afterId);
          assignHeaderValue(fields, "patientIdentifier", idPart);
          clearKey("patientIdentifier");
          clearKey("patientName");
          handled = true;
        }
      }
    } else {
      // Sin números de ID, intentar separar por tabs
      const segments = splitHeaderSegments(line);
      
      if (segments.length >= 2) {
        const lastSegment = segments[segments.length - 1];
        if (/^\d{7,}$/.test(lastSegment)) {
          const nameSegments = segments.slice(0, -1);
          const nameCandidate = nameSegments.join(" ");
          
          if (!nameCandidate.includes("SKU")) {
            assignHeaderValue(fields, "patientName", nameCandidate);
            assignHeaderValue(fields, "patientIdentifier", lastSegment);
            clearKey("patientIdentifier");
            clearKey("patientName");
            handled = true;
          }
        }
      }
    }
  }

  if (!handled && remaining.length > 0) {
    const segments = splitHeaderSegments(line);
    if (segments.length >= remaining.length) {
      remaining.forEach((key, index) => {
        assignHeaderValue(fields, key, segments[index]);
      });
      remaining = [];
    } else if (segments.length === 1 && !line.includes("SKU")) {
      // No asignar líneas que parecen ser headers de tabla
      assignHeaderValue(fields, remaining[0], segments[0]);
      remaining = remaining.slice(1);
    }
  }

  return remaining;
}

function parseHeaderFields(text: string): Partial<Record<HeaderKey, string>> {
  const fields: Partial<Record<HeaderKey, string>> = {};
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);

  let pendingKeys: HeaderKey[] = [];

  for (const line of lines) {
    const occurrences = HEADER_LABELS.map((entry) => ({
      key: entry.key,
      label: entry.label,
      index: line.indexOf(entry.label),
    }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index);

    if (occurrences.length === 0) {
      if (pendingKeys.length > 0) {
        pendingKeys = assignPendingValues(line, pendingKeys, fields);
      }
      continue;
    }

    if (pendingKeys.length > 0) {
      const leadingText = line.substring(0, occurrences[0].index).trim();
      if (leadingText) {
        pendingKeys = assignPendingValues(leadingText, pendingKeys, fields);
      }
    }

    occurrences.forEach((current, idx) => {
      const start = current.index + current.label.length;
      const end = idx + 1 < occurrences.length ? occurrences[idx + 1].index : line.length;
      const value = line.substring(start, end).trim();

      if (value) {
        // Validación especial: rechazar valores sospechosamente cortos para campos importantes
        const suspiciousShortValue = 
          (current.key === "patientName" || current.key === "recipientName") && 
          value.length <= 3;
        
        if (suspiciousShortValue) {
          pendingKeys.push(current.key);
        } else {
          assignHeaderValue(fields, current.key, value);
        }
      } else {
        pendingKeys.push(current.key);
      }
    });
  }

  return fields;
}

function normalizeEgressNumber(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?\s*/, "").trim();
}

/**
 * Valida y normaliza los campos extraídos del header
 * Separa nombres de IDs si fue necesario
 */
function validateAndNormalizeHeaderFields(
  fields: Partial<Record<HeaderKey, string>>
): Partial<Record<HeaderKey, string>> {
  const result = { ...fields };

  // Función auxiliar para detectar y remover duplicación
  const removeDuplication = (text: string): string => {
    if (!text) return text;
    
    const parts = text.split(/\s+/);
    if (parts.length < 2) return text;
    
    // Si la segunda mitad es igual a la primera mitad
    const midpoint = Math.floor(parts.length / 2);
    const firstHalf = parts.slice(0, midpoint).join(" ");
    const secondHalf = parts.slice(midpoint).join(" ");
    
    if (firstHalf === secondHalf && firstHalf.length > 0) {
      return firstHalf;
    }
    
    return text;
  };

  // Normalizar recipientName y recipientId
  if (result.recipientName) {
    // Remover duplicaciones
    result.recipientName = removeDuplication(result.recipientName);
    
    // Si el nombre contiene un ID al final, separarlo
    // Usar .+ (greedy) para capturar TODO el nombre antes del ID
    const nameIdMatch = result.recipientName.match(/^(.+)\s+(\d{7,})$/);
    if (nameIdMatch) {
      result.recipientName = nameIdMatch[1].trim();
      if (!result.recipientId) {
        result.recipientId = nameIdMatch[2];
      }
    }
    // Limpiar caracteres no deseados
    result.recipientName = result.recipientName
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "");
  }

  // Validar recipientId
  if (result.recipientId) {
    result.recipientId = result.recipientId.trim();
    // Si no es solo números, intentar extraer el ID
    if (!/^\d+$/.test(result.recipientId)) {
      const idMatch = result.recipientId.match(/\d{7,}/);
      if (idMatch) {
        result.recipientId = idMatch[0];
      } else {
        result.recipientId = "";
      }
    }
  }

  // Normalizar patientName y patientIdentifier
  if (result.patientName) {
    
    // Remover duplicaciones
    result.patientName = removeDuplication(result.patientName);
    
    // Si el nombre contiene un ID al final, separarlo
    // Usar .+ (greedy) para capturar TODO el nombre antes del ID
    const nameIdMatch = result.patientName.match(/^(.+)\s+(\d{7,})$/);
    if (nameIdMatch) {
      result.patientName = nameIdMatch[1].trim();
      if (!result.patientIdentifier) {
        result.patientIdentifier = nameIdMatch[2];
      }
    }
    // Limpiar caracteres no deseados y líneas de tabla
    result.patientName = result.patientName
      .replace(/SK[UÚ]|Nombre|Unidad|Lote|Fecha|Cant|Desp|Costo|Total|\bN°\b/gi, "")
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "");
  }

  // Validar patientIdentifier
  if (result.patientIdentifier) {
    result.patientIdentifier = result.patientIdentifier.trim();
    // Si no es solo números, intentar extraer el ID
    if (!/^\d+$/.test(result.patientIdentifier)) {
      const idMatch = result.patientIdentifier.match(/\d{7,}/);
      if (idMatch) {
        result.patientIdentifier = idMatch[0];
      } else {
        result.patientIdentifier = "";
      }
    }
  }

  return result;
}

/**
 * Parsea los medicamentos de la tabla del PDF (Strategy: Single Line Extraction)
 * 
 * Estructura REAL del PDF:
 * Línea: "[NUM] [SKU] [descripción] U [LOTE] [FECHA] [CANTIDAD] [COSTO] [TOTAL]"
 * 
 * Donde:
 * - LOTE puede tener 6, 7 u 8 dígitos
 * - FECHA siempre es YYYY-MM-DD
 * - CANTIDAD es número entero
 * - COSTO y TOTAL son decimales
 * 
 * Ejemplos:
 * "1 M01AE01LOR150X0-0001 Ibuprofeno Líquido Oral 200 mg/5 mL U 230627 2026-06-30 1 0.70000000 0.70000000"
 * "1 N02BE01SOR241X0-0004 Paracetamol Sólido Oral 500 mg Caja U 0725054 2027-07-31 10 0.00640270 0.06402700"
 */
function parseMedicaments(text: string): RecipeMedicament[] {
  const medicaments: RecipeMedicament[] = [];

  // Paso 1: Aislar el bloque de tabla
  const tableStartPattern = /N°\s+SKU/;
  const tableEndPattern = /OBSERVACIONES:/;

  const startMatch = text.match(tableStartPattern);
  const endMatch = text.match(tableEndPattern);

  if (!startMatch || !endMatch) {
    console.warn(
      "[parseMedicaments] No se encontró bloque de tabla (búsqueda de 'N° SKU' y 'OBSERVACIONES:')"
    );
    return medicaments;
  }

  const tableStart = startMatch.index! + startMatch[0].length;
  const tableEnd = endMatch.index!;
  const tableBlock = text.substring(tableStart, tableEnd).trim();

  // Paso 2: Dividir en líneas limpias
  const lines = tableBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Estrategia: agrupar líneas en filas lógicas.
  // Una fila nueva comienza cuando una línea inicia con un número seguido de un SKU.
  // Las líneas subsiguientes que NO empiezan con ese patrón son continuaciones
  // del nombre del producto (texto que desbordó a otra línea visual en el PDF).
  const rowStartRegex = /^\d+\s+[A-Z0-9-]{10,}/;

  const logicalRows: string[][] = [];
  let currentRowLines: string[] = [];

  for (const line of lines) {
    if (rowStartRegex.test(line)) {
      if (currentRowLines.length > 0) logicalRows.push(currentRowLines);
      currentRowLines = [line];
    } else if (currentRowLines.length > 0) {
      currentRowLines.push(line);
    }
  }
  if (currentRowLines.length > 0) logicalRows.push(currentRowLines);

  // Paso 3: Parsear cada fila lógica
  // Formato principal: NUM SKU NOMBRE U LOTE FECHA CANTIDAD COSTO TOTAL
  // Las líneas de continuación solo contienen texto del nombre desbordado.
  const mainLineRegex =
    /^\d+\s+([A-Z0-9-]{10,})\s+(.+?)\s+U\s+([A-Z0-9-]{4,20})\s+(\d{4}-\d{2}-\d{2})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s*$/;

  for (const rowLines of logicalRows) {
    const mainLine = rowLines[0];
    const match = mainLine.match(mainLineRegex);
    if (!match) continue;

    let name = match[2].trim();

    // Agregar líneas de continuación al nombre
    for (let j = 1; j < rowLines.length; j++) {
      const cont = rowLines[j].trim();
      if (cont) name += " " + cont;
    }

    medicaments.push({
      sku: match[1],
      name: name.replace(/\s+/g, " ").trim(),
      unit: "Caja",
      batch: match[3],
      expirationDate: match[4],
      quantity: parseInt(match[5], 10),
      unitCost: parseFloat(match[6]),
      total: parseFloat(match[7]),
    });
  }

  // Fallback: si no se detectaron filas lógicas, intentar con regex multilínea
  // sobre el bloque completo (por compatibilidad).
  if (medicaments.length === 0) {
    const rowPattern =
      /(?:^|\n)\s*\d+\s+([A-Z0-9-]{10,})\s+([\s\S]*?)\s+U\s+([A-Z0-9-]{4,20})\s+(\d{4}-\d{2}-\d{2})\s+(\d+)\s+([\d.]+)\s+([\d.]+)(?=\s+\d+\s+[A-Z0-9-]{10,}|\s*$)/g;

    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowPattern.exec(tableBlock)) !== null) {
      medicaments.push({
        sku: rowMatch[1],
        name: rowMatch[2].trim().replace(/\s+/g, " "),
        unit: "Caja",
        batch: rowMatch[3],
        expirationDate: rowMatch[4],
        quantity: parseInt(rowMatch[5], 10),
        unitCost: parseFloat(rowMatch[6]),
        total: parseFloat(rowMatch[7]),
      });
    }
  }

  return medicaments;
}

/**
 * Extrae una fecha en formato YYYY-MM-DD del texto
 */
function extractDateFromText(text: string): string {
  const datePattern = /\d{4}-\d{2}-\d{2}/;
  const match = text.match(datePattern);
  return match ? match[0] : new Date().toISOString().split("T")[0];
}

/**
 * Parsea todos los datos del PDF de receta (versión legacy)
 * Este método funciona con el texto ya extraído del PDF (realizado en el cliente)
 * 
 * @deprecated Usar parseRecipeDataFromPDF() para mejor precisión con coordenadas
 */
export function parseRecipeData(text: string): RecipeData | { success: false; error: string } {
  // Validar que sea una nota de egreso válida
  if (!validateRecipeDocument(text)) {
    return {
      success: false,
      error: 'Documento no válido: El archivo debe ser una "NOTA DE EGRESO" del sistema MSP con tabla de productos (N° SKU).',
    };
  }

  let header = parseHeaderFields(text);
  // Normalizar y validar los campos extraídos
  header = validateAndNormalizeHeaderFields(header);
  const totalMatch = text.match(/TOTAL\(\$\):\s*([\d.]+)/);

  // Parsear medicamentos
  const medicaments = parseMedicaments(text);
  const totalMedicaments = medicaments.reduce((sum, med) => sum + med.total, 0);

  return {
    entityOrigin: header.entityOrigin || "BAGATELA",
    warehouseOrigin: header.warehouseOrigin || "BODEGA DE FARMACIA BAGATELA",
    egressDate: header.egressDate || extractDateFromText(text),
    egressNumber: normalizeEgressNumber(header.egressNumber),
    egressSubtype: extractEgressSubtype(text),
    documentType: header.documentType || "Receta",
    documentNumber: header.documentNumber || "",
    documentDate: header.documentDate || "",
    additionalDocument: header.additionalDocument || undefined,
    recipientName: header.recipientName || "",
    recipientId: header.recipientId || "",
    patientIdentifier: header.patientIdentifier || "",
    patientName: header.patientName || undefined,
    medicaments,
    total: totalMatch ? parseFloat(totalMatch[1]) : totalMedicaments,
  };
}
