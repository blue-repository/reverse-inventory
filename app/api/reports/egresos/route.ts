import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/conections/supabase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Debe proporcionar fromDate y toDate" },
        { status: 400 }
      );
    }

    // Convertir fechas a formato ISO con hora
    const startDate = new Date(fromDate + "T00:00:00");
    const endDate = new Date(toDate + "T23:59:59.999");
    
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    // Obtener movimientos de salida en el rango de fechas
    const { data: movements, error: movError } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("movement_type", "salida")
      .gte("created_at", startDateISO)
      .lte("created_at", endDateISO)
      .order("created_at", { ascending: false });

    if (movError) {
      console.error("Error al obtener movimientos:", movError);
      return NextResponse.json(
        { error: "Error al obtener movimientos" },
        { status: 500 }
      );
    }

    if (!movements || movements.length === 0) {
      return NextResponse.json({
        data: [],
        summary: {
          totalRecords: 0,
          totalQuantity: 0,
          fromDate,
          toDate,
        },
      });
    }

    // Obtener IDs de productos únicos
    const productIds = [...new Set(movements.map((m) => m.product_id))];

    // Obtener información de productos
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, barcode, name, category, specialty")
      .in("id", productIds);

    if (prodError) {
      console.error("Error al obtener productos:", prodError);
      return NextResponse.json(
        { error: "Error al obtener productos" },
        { status: 500 }
      );
    }

    // Obtener lotes asociados a los productos
    const { data: batches, error: batchError } = await supabase
      .from("product_batches")
      .select("*")
      .in("product_id", productIds)
      .eq("is_active", true);

    if (batchError) {
      console.error("Error al obtener lotes:", batchError);
      return NextResponse.json(
        { error: "Error al obtener lotes" },
        { status: 500 }
      );
    }

    // Mapear productos por ID
    const productMap = new Map(products?.map((p) => [p.id, p]) || []);
    
    // Mapear lotes por product_id
    const batchesByProductId = new Map<string, typeof batches>();
    batches?.forEach((batch) => {
      if (!batchesByProductId.has(batch.product_id)) {
        batchesByProductId.set(batch.product_id, []);
      }
      batchesByProductId.get(batch.product_id)?.push(batch);
    });

    // Combinar datos
    const reportData = movements.map((movement) => {
      const product = productMap.get(movement.product_id);
      const productBatches = batchesByProductId.get(movement.product_id) || [];
      
      return {
        id: movement.id,
        fecha: new Date(movement.created_at).toLocaleDateString("es-EC"),
        hora: new Date(movement.created_at).toLocaleTimeString("es-EC"),
        codigo: product?.barcode || "N/A",
        producto: product?.name || "N/A",
        categoria: product?.category || "N/A",
        especialidad: product?.specialty || "-",
        cantidad: movement.quantity,
        unidad: movement.reporting_unit || "unidad",
        lote: movement.batch_number || "-",
        lotes: productBatches,
        motivo: movement.reason || "-",
        notas: movement.notes || "-",
        // Campos de receta
        codigoReceta: movement.recipe_code || "-",
        fechaReceta: movement.recipe_date ? new Date(movement.recipe_date).toLocaleDateString("es-EC") : "-",
        paciente: movement.patient_name || "-",
        prescriptor: movement.prescribed_by || "-",
        codigoCIE: movement.cie_code || "-",
        notasReceta: movement.recipe_notes || "-",
        usuario: movement.recorded_by || "-",
      };
    });

    // Calcular resumen
    const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);

    return NextResponse.json({
      data: reportData,
      summary: {
        totalRecords: reportData.length,
        totalQuantity,
        fromDate,
        toDate,
      },
    });
  } catch (error: any) {
    console.error("Error en API de reportes de egresos:", error);
    return NextResponse.json(
      { error: "Error al generar reporte", details: error.message },
      { status: 500 }
    );
  }
}
