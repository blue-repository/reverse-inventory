import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/conections/supabase";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    // Obtener lotes próximos a vencer y vencidos desde la vista
    const { data: batchesData, error } = await supabase
      .from("batches_expiring_soon")
      .select("*")
      .eq("is_active", true)
      .order("days_until_expiration", { ascending: true });

    if (error) throw error;

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lotes por Vencer");

    // Estilos
    const headerFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FF1e293b" },
    };

    const headerFont = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };

    const criticalFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFfecaca" },
    };

    const alertFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFfef3c7" },
    };

    // Definir columnas
    worksheet.columns = [
      { header: "Producto", key: "product_name", width: 25 },
      { header: "Número de Lote", key: "batch_number", width: 15 },
      { header: "Stock Disponible", key: "stock", width: 15 },
      { header: "Fecha Vencimiento", key: "expiration_date", width: 15 },
      { header: "Días para Vencer", key: "days_until_expiration", width: 15 },
      { header: "Estado", key: "status", width: 12 },
      { header: "Ubicación", key: "location", width: 30 },
    ];

    // Aplicar estilos al encabezado
    worksheet.getRow(1).fill = headerFill as any;
    worksheet.getRow(1).font = headerFont;
    worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    // Agregar datos
    if (batchesData && batchesData.length > 0) {
      batchesData.forEach((batch: any) => {
        const location = [batch.shelf, batch.drawer, batch.section]
          .filter(Boolean)
          .join(" | ");

        const row = worksheet.addRow({
          product_name: batch.product_name,
          batch_number: batch.batch_number,
          stock: batch.stock,
          expiration_date: new Date(batch.expiration_date).toLocaleDateString(
            "es-EC"
          ),
          days_until_expiration: batch.days_until_expiration,
          status: batch.status,
          location: location || "—",
        });

        // Aplicar color según estado
        if (batch.status === "Vencido" || batch.status === "Crítico") {
          row.fill = criticalFill as any;
        } else if (batch.status === "Alerta") {
          row.fill = alertFill as any;
        }

        // Centrar números
        row.getCell("stock").alignment = { horizontal: "center" };
        row.getCell("days_until_expiration").alignment = {
          horizontal: "center",
        };
      });
    }

    // Congelar primera fila
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Ajustar ancho automático
    worksheet.columns.forEach((column) => {
      if (column.width) {
        column.width = Math.min(column.width, 40);
      }
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Retornar archivo
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-lotes-por-vencer-${new Date()
          .toISOString()
          .split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating batch report:", error);
    return NextResponse.json(
      { error: "Error al generar el reporte" },
      { status: 500 }
    );
  }
}
