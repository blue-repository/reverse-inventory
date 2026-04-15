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

    // Obtener movimientos de salida que sean de notas de egreso (from_pdf_movement = true)
    const { data: movements, error: movError } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("movement_type", "salida")
      .eq("from_pdf_movement", true)
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

    // Mapear productos por ID
    const productMap = new Map(products?.map((p) => [p.id, p]) || []);
    
    // Obtener IDs de movimientos únicos para consultar movement_batch_details
    const movementIds = movements.map((m) => m.id);
    
    // Obtener detalles de lotes-movimientos
    const { data: movementBatchDetails, error: movBatchError } = await supabase
      .from("movement_batch_details")
      .select(
        `
        movement_id,
        batch_id,
        quantity,
        batch_stock_before,
        batch_stock_after,
        product_batches(
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
          updated_at
        )
        `
      )
      .in("movement_id", movementIds);

    if (movBatchError) {
      console.error("Error al obtener detalles de lotes-movimientos:", movBatchError);
      return NextResponse.json(
        { error: "Error al obtener detalles de lotes" },
        { status: 500 }
      );
    }

    // Mapear lotes por movement_id
    const batchesByMovementId = new Map<string, any[]>();
    movementBatchDetails?.forEach((detail) => {
      if (!batchesByMovementId.has(detail.movement_id)) {
        batchesByMovementId.set(detail.movement_id, []);
      }
      if (detail.product_batches) {
        batchesByMovementId.get(detail.movement_id)?.push(detail.product_batches);
      }
    });

    // Combinar datos
    const reportData = movements.map((movement) => {
      const product = productMap.get(movement.product_id);
      const affectedBatches = batchesByMovementId.get(movement.id) || [];
      
      return {
        id: movement.id,
        codigo: product?.barcode || "N/A",
        producto: product?.name || "N/A",
        cantidad: movement.quantity,
        unidad: movement.reporting_unit || "unidad",
        motivo: movement.reason || "-",
        codigoNotaSuministro: movement.recipe_code || "-",
        fecha: new Date(movement.created_at).toLocaleDateString("es-EC"),
        hora: new Date(movement.created_at).toLocaleTimeString("es-EC"),
        notas: movement.notes || "-",
        lotes: affectedBatches,
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
    console.error("Error en API de reportes de notas de egreso:", error);
    return NextResponse.json(
      { error: "Error al generar reporte", details: error.message },
      { status: 500 }
    );
  }
}
