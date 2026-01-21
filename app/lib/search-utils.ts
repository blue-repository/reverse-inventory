/**
 * Utilidades para búsqueda normalizada (sin acentos/tildes)
 */

/**
 * Normaliza texto removiendo acentos y tildes para búsqueda insensible a diacríticos
 * @example
 * normalizeSearchText("Líquido") // -> "liquido"
 * normalizeSearchText("PARACETAMOL") // -> "paracetamol"
 * normalizeSearchText("Ácido Acetilsalicílico") // -> "acido acetilsalicilico"
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Verifica si un texto contiene una búsqueda (ambos normalizados)
 * @example
 * containsNormalized("Paracetamol", "paracetamol") // -> true
 * containsNormalized("Líquido", "liquido") // -> true
 */
export function containsNormalized(text: string, searchTerm: string): boolean {
  return normalizeSearchText(text).includes(normalizeSearchText(searchTerm));
}
