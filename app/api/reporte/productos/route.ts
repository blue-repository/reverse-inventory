import { supabase } from "@/app/lib/conections/supabase";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    // 1. Extraer datos de Supabase
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("name");

    if (error) throw error;

    // 2. Obtener IDs de productos para buscar lotes
    const productIds = products?.map((p) => p.id) || [];

    // 3. Obtener lotes de todos los productos
    let batches: any[] = [];
    if (productIds.length > 0) {
      const { data: batchData, error: batchError } = await supabase
        .from("product_batches")
        .select(
          `
          id,
          product_id,
          batch_number,
          stock,
          initial_stock,
          issue_date,
          expiration_date,
          shelf,
          drawer,
          section,
          location_notes,
          is_active,
          created_at,
          updated_at,
          products(name, barcode)
          `
        )
        .in("product_id", productIds)
        .eq("is_active", true)
        .order("batch_number", { ascending: false });

      if (batchError) {
        console.error("Error al obtener lotes:", batchError);
      } else {
        batches = batchData || [];
      }
    }

    // 4. Crear workbook de Excel
    const workbook = new ExcelJS.Workbook();

    // ============ HOJA 1: PRODUCTOS ============
    const productsSheet = workbook.addWorksheet("Productos");

    // Configurar encabezados
    productsSheet.columns = [
      { header: "Nombre del Producto", key: "name", width: 30 },
      { header: "Código de Barras", key: "barcode", width: 18 },
      { header: "Stock Actual", key: "stock", width: 12 },
      { header: "Stock Inicial", key: "stock_inicial", width: 14 },
      { header: "Unidad de Medida", key: "unit_of_measure", width: 15 },
      { header: "Ubicación", key: "location", width: 25 },
      { header: "Fecha de Expiración", key: "expiration_date", width: 18 },
    ];

    // Estilizar encabezados
    const headerRow = productsSheet.getRow(1);
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" }, // slate-700
    };
    headerRow.font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 11,
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 25;

    // Agregar datos de productos
    products?.forEach((product, index) => {
      const location = [product.shelf, product.drawer, product.section]
        .filter(Boolean)
        .join(" / ") || "—";

      const expirationDate = product.expiration_date
        ? new Date(product.expiration_date).toLocaleDateString("es-EC")
        : "—";

      const row = productsSheet.addRow({
        name: product.name,
        barcode: product.barcode || "—",
        stock: product.stock,
        stock_inicial: product.stock_inicial,
        unit_of_measure: product.unit_of_measure || "—",
        location: location,
        expiration_date: expirationDate,
      });

      // Colorear las filas alternadas
      const bgColor = index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC"; // blanco / slate-50

      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
        cell.font = {
          size: 10,
          color: { argb: "FF1E293B" }, // slate-800
        };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      // Resaltar stock bajo (menos de 5)
      if (product.stock < 5) {
        const stockCell = row.getCell("stock");
        stockCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCA5A5" }, // Rojo claro
        };
        stockCell.font = {
          bold: true,
          color: { argb: "FFDC2626" }, // Rojo
        };
      }

      row.height = 20;
    });

    // Congelar la primera fila
    productsSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
        activeCell: "A2",
      },
    ];

    // ============ HOJA 2: DETALLE DE LOTES ============
    const batchesSheet = workbook.addWorksheet("Detalle de Lotes");

    // Configurar columnas de lotes
    batchesSheet.columns = [
      { header: "Producto", key: "producto", width: 25 },
      { header: "Código de Barras", key: "barcode", width: 15 },
      { header: "Lote", key: "batch_number", width: 20 },
      { header: "Stock Actual", key: "stock", width: 12 },
      { header: "Stock Inicial", key: "initial_stock", width: 12 },
      { header: "Vencimiento", key: "expiration_date", width: 15 },
      { header: "Estante", key: "shelf", width: 12 },
      { header: "Cajón", key: "drawer", width: 12 },
      { header: "Sección", key: "section", width: 12 },
      { header: "Notas Ubicación", key: "location_notes", width: 25 },
      { header: "Observaciones", key: "observations", width: 18 },
    ];

    // Estilo header de lotes
    const batchHeaderRow = batchesSheet.getRow(1);
    batchHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF059669" }, // green-600
      };
      cell.font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
        size: 11,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF10B981" } },
        left: { style: "thin", color: { argb: "FF10B981" } },
        bottom: { style: "thin", color: { argb: "FF10B981" } },
        right: { style: "thin", color: { argb: "FF10B981" } },
      };
    });
    batchHeaderRow.height = 25;

    // Calcular fecha actual y fecha de 3 meses adelante
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    // Agregar lotes
    batches.forEach((batch, index) => {
      const expirationDate = new Date(batch.expiration_date);
      const isExpiringSoon = expirationDate <= threeMonthsLater && expirationDate >= today;
      const observations = isExpiringSoon ? "Lote por vencer" : "";

      const batchRow = batchesSheet.addRow({
        producto: batch.products?.name || "N/A",
        barcode: batch.products?.barcode || "—",
        batch_number: batch.batch_number,
        stock: batch.stock,
        initial_stock: batch.initial_stock,
        expiration_date: expirationDate.toLocaleDateString("es-EC"),
        shelf: batch.shelf || "—",
        drawer: batch.drawer || "—",
        section: batch.section || "—",
        location_notes: batch.location_notes || "—",
        observations: observations,
      });

      // Determinar color de fila
      let bgColor = "FFFFFFFF"; // blanco por defecto
      let borderColor = "FFD1FAE5"; // verde claro por defecto

      if (isExpiringSoon) {
        bgColor = "FFFEF08A"; // amarillo warning
        borderColor = "FFFCD34D"; // amarillo más oscuro para bordes
      } else if (index % 2 === 1) {
        bgColor = "FFF0FDF4"; // green-50
      }

      batchRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
        cell.font = {
          size: 10,
          color: { argb: "FF1E293B" },
          bold: isExpiringSoon ? true : false,
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin", color: { argb: borderColor } },
          left: { style: "thin", color: { argb: borderColor } },
          bottom: { style: "thin", color: { argb: borderColor } },
          right: { style: "thin", color: { argb: borderColor } },
        };
      });

      batchRow.height = 20;
    });

    // 5. Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 6. Devolver archivo
    const fileName = `reporte-productos-${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error al generar reporte:", error);
    return Response.json(
      { error: "Error al generar reporte de productos" },
      { status: 500 }
    );
  }
}
