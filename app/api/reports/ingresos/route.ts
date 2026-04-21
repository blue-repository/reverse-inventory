import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/conections/supabase";

function formatDateForDisplay(dateValue: string | null | undefined): string {
  if (!dateValue) return "-";

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-");
    return `${day}/${month}/${year}`;
  }

  return new Date(dateValue).toLocaleDateString("es-EC");
}

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

    // Obtener movimientos de entrada en el rango de fechas de receta
    const { data: movements, error: movError } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("movement_type", "entrada")
      .gte("recipe_date", fromDate)
      .lte("recipe_date", toDate)
      .order("recipe_date", { ascending: false });

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
      .select("id, barcode, name, category, specialty, unit_of_measure")
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
      const movementDate = movement.recipe_date || movement.created_at;
      
      return {
        id: movement.id,
        fecha: formatDateForDisplay(movementDate),
        hora: new Date(movement.created_at).toLocaleTimeString("es-EC"),
        codigo: product?.barcode || "N/A",
        producto: product?.name || "N/A",
        categoria: product?.category || "N/A",
        especialidad: product?.specialty || "-",
        cantidad: movement.quantity,
        unidad: movement.reporting_unit || product?.unit_of_measure || "unidad",
        lote: movement.batch_number || "-",
        lotes: affectedBatches,
        fechaEmision: movement.issue_date ? new Date(movement.issue_date).toLocaleDateString("es-EC") : "-",
        fechaVencimiento: movement.expiration_date ? new Date(movement.expiration_date).toLocaleDateString("es-EC") : "-",
        motivo: movement.reason || "-",
        notas: movement.notes || "-",
        ubicacion: [movement.shelf, movement.drawer, movement.section]
          .filter(Boolean)
          .join(" / ") || "-",
        notasUbicacion: movement.location_notes || "-",
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
    console.error("Error en API de reportes de ingresos:", error);
    return NextResponse.json(
      { error: "Error al generar reporte", details: error.message },
      { status: 500 }
    );
  }
}
