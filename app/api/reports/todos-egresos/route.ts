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

function getEffectiveDateString(movement: any): string {
  const recipeDate = typeof movement.recipe_date === "string" ? movement.recipe_date.trim() : "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(recipeDate)) {
    return recipeDate;
  }

  const sourceDate = recipeDate || movement.created_at;
  return new Date(sourceDate).toISOString().split("T")[0];
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

    const { data: allEgressMovements, error: movError } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("movement_type", "salida")
      .order("created_at", { ascending: false });

    if (movError) {
      console.error("Error al obtener movimientos:", movError);
      return NextResponse.json(
        { error: "Error al obtener movimientos" },
        { status: 500 }
      );
    }

    const movements = (allEgressMovements || []).filter((movement) => {
      const effectiveDate = getEffectiveDateString(movement);
      return effectiveDate >= fromDate && effectiveDate <= toDate;
    });

    if (movements.length === 0) {
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

    const productIds = [...new Set(movements.map((m) => m.product_id))];

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

    const productMap = new Map(products?.map((p) => [p.id, p]) || []);

    const movementIds = movements.map((m) => m.id);

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

    const batchesByMovementId = new Map<string, any[]>();
    movementBatchDetails?.forEach((detail) => {
      if (!batchesByMovementId.has(detail.movement_id)) {
        batchesByMovementId.set(detail.movement_id, []);
      }
      if (detail.product_batches) {
        batchesByMovementId.get(detail.movement_id)?.push(detail.product_batches);
      }
    });

    const reportData = movements.map((movement) => {
      const product = productMap.get(movement.product_id);
      const affectedBatches = batchesByMovementId.get(movement.id) || [];
      const registrationDate = movement.movement_date || movement.created_at;

      return {
        id: movement.id,
        fechaReceta: formatDateForDisplay(movement.recipe_date),
        codigo: product?.barcode || "N/A",
        producto: product?.name || "N/A",
        categoria: product?.category || "N/A",
        especialidad: product?.specialty || "-",
        cantidad: movement.quantity,
        unidad: movement.reporting_unit || "unidad",
        lote: movement.batch_number || "-",
        lotes: affectedBatches,
        motivo: movement.reason || "-",
        notas: movement.notes || "-",
        origenEgreso: movement.reason || "-",
        codigoReceta: movement.recipe_code || "-",
        fechaRegistro: formatDateForDisplay(registrationDate),
        paciente: movement.patient_name || "-",
        prescriptor: movement.prescribed_by || "-",
        codigoCIE: movement.cie_code || "-",
        notasReceta: movement.recipe_notes || "-",
        usuario: movement.recorded_by || "-",
      };
    });

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
    console.error("Error en API de reporte todos los egresos:", error);
    return NextResponse.json(
      { error: "Error al generar reporte", details: error.message },
      { status: 500 }
    );
  }
}
