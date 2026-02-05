import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/conections/supabase";

// Función para obtener todos los registros de una tabla con paginación
async function getAllRecords(tableName: string) {
  const allRecords: any[] = [];
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(start, end)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`Error al obtener datos de ${tableName}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allRecords.push(...data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

// Función para convertir array de objetos a CSV
function convertToCSV(data: any[], tableName: string): string {
  if (!data || data.length === 0) {
    return `Tabla: ${tableName}\nNo hay datos\n`;
  }

  // Obtener todas las columnas
  const headers = Object.keys(data[0]);
  
  // Función para escapar valores CSV
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    
    const stringValue = String(value);
    
    // Si contiene punto y coma, comillas o saltos de línea, envolver en comillas
    if (stringValue.includes(";") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Crear encabezados
  let csv = headers.join(";") + "\n";

  // Agregar datos
  data.forEach((row) => {
    const values = headers.map((header) => escapeCSVValue(row[header]));
    csv += values.join(";") + "\n";
  });

  return csv;
}

export async function GET() {
  try {
    const timestamp = new Date().toISOString().split("T")[0];
    
    // Tablas principales a respaldar
    const tables = [
      "products",
      "inventory_movements",
      "product_batches"
    ];

    const backupData: { [key: string]: string } = {};

    // Obtener datos de cada tabla
    for (const tableName of tables) {
      console.log(`Obteniendo datos de ${tableName}...`);
      const records = await getAllRecords(tableName);
      console.log(`${tableName}: ${records.length} registros obtenidos`);
      
      const csv = convertToCSV(records, tableName);
      backupData[tableName] = csv;
    }

    // Crear un archivo de texto con todos los CSVs
    let backupContent = `BACKUP BAGATELA INVENTORY - ${timestamp}\n`;
    backupContent += `=================================================\n\n`;
    backupContent += `Este archivo contiene el respaldo completo de la base de datos.\n`;
    backupContent += `Cada tabla está separada por una línea de guiones.\n`;
    backupContent += `Formato: CSV delimitado por punto y coma (;)\n\n`;
    backupContent += `=================================================\n\n`;

    // Agregar resumen
    backupContent += `RESUMEN DEL BACKUP:\n`;
    for (const tableName of tables) {
      const lines = backupData[tableName].split("\n").length - 2; // -2 para quitar header y última línea vacía
      backupContent += `- ${tableName}: ${lines} registros\n`;
    }
    backupContent += `\n=================================================\n\n`;

    // Agregar cada tabla
    for (const tableName of tables) {
      backupContent += `\n${"=".repeat(50)}\n`;
      backupContent += `TABLA: ${tableName.toUpperCase()}\n`;
      backupContent += `${"=".repeat(50)}\n\n`;
      backupContent += backupData[tableName];
      backupContent += `\n`;
    }

    // Agregar información de restauración
    backupContent += `\n${"=".repeat(50)}\n`;
    backupContent += `INSTRUCCIONES DE RESTAURACIÓN\n`;
    backupContent += `${"=".repeat(50)}\n\n`;
    backupContent += `Para restaurar estos datos:\n`;
    backupContent += `1. Separa cada sección de tabla en archivos CSV individuales\n`;
    backupContent += `2. Los archivos están delimitados por punto y coma (;)\n`;
    backupContent += `3. Usa cualquier herramienta de importación CSV compatible con PostgreSQL\n`;
    backupContent += `4. Orden de importación recomendado:\n`;
    backupContent += `   - products (primero, es tabla principal)\n`;
    backupContent += `   - product_batches (depende de products)\n`;
    backupContent += `   - inventory_movements (depende de products)\n`;
    backupContent += `\n`;

    // Retornar como archivo descargable
    return new NextResponse(backupContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bagatela-backup-${timestamp}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Error en backup:", error);
    return NextResponse.json(
      { error: "Error al crear el backup", details: error.message },
      { status: 500 }
    );
  }
}
