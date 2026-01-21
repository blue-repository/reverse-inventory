/**
 * Script de prueba para validar la función de normalización
 * Ejecutar con: node test_normalization.js
 */

function normalizeSearchText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Casos de prueba
const testCases = [
  { input: "Líquidos", expected: "liquidos", description: "Acentos en palabra" },
  { input: "PARACETAMOL", expected: "paracetamol", description: "Mayúsculas" },
  { input: "Paracetamol", expected: "paracetamol", description: "Mixto" },
  { input: "ÁCIDO ACETILSALICÍLICO", expected: "acido acetilsalicilico", description: "Múltiples acentos" },
  { input: "  Liquido  ", expected: "liquido", description: "Con espacios al inicio/final" },
  { input: "Café", expected: "cafe", description: "Acento simple" },
  { input: "Peluquería", expected: "peluqueria", description: "Tilde" },
];

console.log("🧪 Pruebas de Normalización\n");

let passed = 0;
let failed = 0;

testCases.forEach((test) => {
  const result = normalizeSearchText(test.input);
  const success = result === test.expected;

  if (success) {
    passed++;
    console.log(`✅ ${test.description}`);
    console.log(`   Input: "${test.input}" → Output: "${result}"\n`);
  } else {
    failed++;
    console.log(`❌ ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got: "${result}"\n`);
  }
});

console.log(`\n📊 Resultados: ${passed} pasadas, ${failed} fallidas`);

// Prueba de búsqueda
console.log("\n🔍 Ejemplo de búsqueda:\n");

const productos = [
  { name: "Líquidos", barcode: null, description: "Solución líquida" },
  { name: "Paracetamol", barcode: "PAR001", description: "Analgésico" },
  { name: "Ácido Acetilsalicílico", barcode: "ASPI001", description: "Aspirina" },
];

const querySearch = "liquidos"; // Usuario busca sin acentos
console.log(`Usuario busca: "${querySearch}"`);
console.log("Productos encontrados:");

productos.forEach((prod) => {
  const normalizedName = normalizeSearchText(prod.name || "");
  const matches = normalizedName.includes(querySearch);

  console.log(`  ${matches ? "✅" : "❌"} ${prod.name} (normalizado: "${normalizedName}")`);
});
