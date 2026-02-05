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

    // Obtener movimientos de entrada en el rango de fechas
    const { data: movements, error: movError } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("movement_type", "entrada")
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

    // Combinar datos
    const reportData = movements.map((movement) => {
      const product = productMap.get(movement.product_id);
      return {
        id: movement.id,
        fecha: new Date(movement.created_at).toLocaleDateString("es-EC"),
        hora: new Date(movement.created_at).toLocaleTimeString("es-EC"),
        codigo: product?.barcode || "N/A",
        producto: product?.name || "N/A",
        categoria: product?.category || "N/A",
        especialidad: product?.specialty || "-",
        cantidad: movement.quantity,
        unidad: movement.reporting_unit || product?.unit_of_measure || "unidad",
        lote: movement.batch_number || "-",
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
