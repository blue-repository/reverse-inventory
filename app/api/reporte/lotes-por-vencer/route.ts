import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/conections/supabase";
import ExcelJS from "exceljs";

// Umbral igual al de notificaciones: 3 meses
const THREE_MONTHS_DAYS = 90;

function getStatus(days: number): string {
  if (days < 0) return "Vencido";
  if (days <= 7) return "Crítico";
  if (days <= 30) return "Alerta";
  return "Por Vencer";
}

export async function GET() {
  try {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setDate(threeMonthsLater.getDate() + THREE_MONTHS_DAYS);
    const threeMonthsStr = threeMonthsLater.toISOString().split("T")[0];

    // Paso 1: obtener lotes activos con fecha de vencimiento dentro de los próximos 3 meses
    // (mismo criterio que vw_expiring_products usado por las notificaciones)
    const { data: batchesRaw, error: batchError } = await supabase
      .from("product_batches")
      .select(
        "id, batch_number, stock, expiration_date, shelf, drawer, section, product_id"
      )
      .eq("is_active", true)
      .not("expiration_date", "is", null)
      .lte("expiration_date", threeMonthsStr)
      .gt("stock", 0)
      .order("expiration_date", { ascending: true });

    if (batchError) throw batchError;

    if (!batchesRaw || batchesRaw.length === 0) {
      // Devolver Excel vacío con encabezados si no hay datos
      const workbook = new ExcelJS.Workbook();
      buildWorksheet(workbook, []);
      const buffer = await workbook.xlsx.writeBuffer();
      return buildResponse(buffer);
    }

    // Paso 2: obtener nombres de productos (igual que hace vw_expiring_products con INNER JOIN)
    const productIds = [...new Set(batchesRaw.map((b) => b.product_id))];
    const { data: productsRaw, error: productsError } = await supabase
      .from("products")
      .select("id, name, unit_of_measure")
      .in("id", productIds)
      .is("deleted_at", null);

    if (productsError) throw productsError;

    const productMap = new Map(
      (productsRaw ?? []).map((p) => [p.id, p])
    );

    // Paso 3: combinar y calcular días
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);

    const batches = batchesRaw
      .filter((b) => productMap.has(b.product_id))
      .map((b) => {
        const exp = new Date(b.expiration_date);
        exp.setHours(0, 0, 0, 0);
        const daysUntil = Math.round(
          (exp.getTime() - today0.getTime()) / (1000 * 60 * 60 * 24)
        );
        const product = productMap.get(b.product_id)!;
        return {
          product_name: product.name,
          unit_of_measure: product.unit_of_measure,
          batch_number: b.batch_number,
          stock: b.stock,
          expiration_date: b.expiration_date,
          days_until_expiration: daysUntil,
          status: getStatus(daysUntil),
          location: [b.shelf, b.drawer, b.section].filter(Boolean).join(" | ") || "—",
        };
      });

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    buildWorksheet(workbook, batches);
    const buffer = await workbook.xlsx.writeBuffer();
    return buildResponse(buffer);
  } catch (error) {
    console.error("Error generating batch report:", error);
    return NextResponse.json(
      {
        error: "Error al generar el reporte",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function buildWorksheet(workbook: ExcelJS.Workbook, batches: any[]) {
  const worksheet = workbook.addWorksheet("Lotes por Vencer");

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1e293b" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };

  const fillVencido: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFfecaca" }, // rojo claro
  };
  const fillCritico: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFfca5a5" }, // rojo más intenso
  };
  const fillAlerta: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFfef3c7" }, // amarillo
  };
  const fillPorVencer: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFd1fae5" }, // verde claro
  };

  worksheet.columns = [
    { header: "Producto", key: "product_name", width: 30 },
    { header: "Número de Lote", key: "batch_number", width: 15 },
    { header: "Stock Disponible", key: "stock", width: 15 },
    { header: "Unidad", key: "unit_of_measure", width: 12 },
    { header: "Fecha Vencimiento", key: "expiration_date", width: 18 },
    { header: "Días para Vencer", key: "days_until_expiration", width: 16 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Ubicación", key: "location", width: 30 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.fill = headerFill;
  headerRow.font = headerFont;
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 20;

  batches.forEach((batch) => {
    const row = worksheet.addRow({
      product_name: batch.product_name,
      batch_number: batch.batch_number ?? "—",
      stock: batch.stock,
      unit_of_measure: batch.unit_of_measure ?? "—",
      expiration_date: new Date(batch.expiration_date).toLocaleDateString("es-EC"),
      days_until_expiration: batch.days_until_expiration,
      status: batch.status,
      location: batch.location,
    });

    switch (batch.status) {
      case "Vencido":
        row.fill = fillVencido;
        break;
      case "Crítico":
        row.fill = fillCritico;
        break;
      case "Alerta":
        row.fill = fillAlerta;
        break;
      default:
        row.fill = fillPorVencer;
    }

    row.getCell("stock").alignment = { horizontal: "center" };
    row.getCell("days_until_expiration").alignment = { horizontal: "center" };
    row.getCell("status").alignment = { horizontal: "center" };
  });

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function buildResponse(buffer: ExcelJS.Buffer) {
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-lotes-por-vencer-${new Date()
        .toISOString()
        .split("T")[0]}.xlsx"`,
    },
  });
}
