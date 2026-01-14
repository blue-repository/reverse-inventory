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

    // 2. Crear workbook de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Productos");

    // 3. Configurar encabezados
    worksheet.columns = [
      { header: "Nombre del Producto", key: "name", width: 30 },
      { header: "Código de Barras", key: "barcode", width: 18 },
      { header: "Stock Actual", key: "stock", width: 12 },
      { header: "Stock Inicial", key: "stock_inicial", width: 14 },
      { header: "Unidad de Medida", key: "unit_of_measure", width: 15 },
      { header: "Ubicación", key: "location", width: 25 },
      { header: "Fecha de Expiración", key: "expiration_date", width: 18 },
    ];

    // 4. Estilizar encabezados
    const headerRow = worksheet.getRow(1);
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" }, // Gris oscuro
    };
    headerRow.font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 11,
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    // 5. Agregar datos
    products?.forEach((product, index) => {
      const location = [product.shelf, product.drawer, product.section]
        .filter(Boolean)
        .join(" / ") || "—";

      const expirationDate = product.expiration_date
        ? new Date(product.expiration_date).toLocaleDateString("es-EC")
        : "—";

      const row = worksheet.addRow({
        name: product.name,
        barcode: product.barcode || "—",
        stock: product.stock,
        stock_inicial: product.stock_inicial,
        unit_of_measure: product.unit_of_measure || "—",
        location: location,
        expiration_date: expirationDate,
      });

      // Colorear las filas alternadas
      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" }, // Gris claro
        };
      }

      // Alineación de celdas
      row.alignment = { horizontal: "left", vertical: "middle" };

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
    });

    // 6. Ajustar altura de filas de datos
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 20;
      }
    });

    // 7. Congelar la primera fila
    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1,
        activeCell: "A2",
      },
    ];

    // 8. Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 9. Devolver archivo
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
