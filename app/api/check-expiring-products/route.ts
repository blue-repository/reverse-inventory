import { supabase } from "@/app/lib/conections/supabase";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST: Ejecuta el escaneo de productos por vencer y crea/actualiza notificaciones
 * Este endpoint puede ser llamado:
 * 1. Por un cron job (si está deplorado en Vercel)
 * 2. Por el cliente bajo demanda
 * 3. Por un worker externo
 * 
 * Headers opcionales para autenticación:
 *   - x-api-key: token secreto configurado en variables de entorno
 */
export async function POST(req: NextRequest) {
  try {
    // Validar autenticación (opcional pero recomendado)
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = process.env.CRON_JOB_SECRET_KEY || "development";

    // En desarrollo, permitir sin clave
    if (process.env.NODE_ENV === "production" && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Ejecutar la función de creación de notificaciones
    const { data, error } = await supabase.rpc(
      "fn_create_or_update_expiring_notifications"
    );

    if (error) {
      console.error("Error ejecutando fn_create_or_update_expiring_notifications:", error);
      return NextResponse.json(
        { error: "Error al procesar notificaciones", details: error.message },
        { status: 500 }
      );
    }

    // Ejecutar limpieza de notificaciones antiguas
    const { data: cleanupData, error: cleanupError } = await supabase.rpc(
      "fn_cleanup_old_notifications"
    );

    if (cleanupError) {
      console.error("Error limpiando notificaciones antiguas:", cleanupError);
      // No fallar por esto, solo loguear
    }

    // Obtener conteo actual de notificaciones activas
    const { data: activeNotifications, error: countError } = await supabase
      .from("vw_active_expiring_notifications")
      .select("*", { count: "exact" });

    if (countError) {
      console.error("Error contando notificaciones activas:", countError);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      createdCount: data?.[0]?.created_count || 0,
      updatedCount: data?.[0]?.updated_count || 0,
      cleanedCount: cleanupData?.[0]?.deleted_count || 0,
      totalActiveNotifications: activeNotifications?.length || 0,
      message: "Notificaciones procesadas correctamente",
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/check-expiring-products:", error);
    return NextResponse.json(
      {
        error: "Error inesperado",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Verifica el estado del sistema de notificaciones (para debugging)
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener estadísticas
    const { data: notifications } = await supabase
      .from("vw_active_expiring_notifications")
      .select("severity, notification_status", { count: "exact" });

    const pendingCount =
      notifications?.filter((n) => n.notification_status === "pending").length || 0;
    const readCount =
      notifications?.filter((n) => n.notification_status === "read").length || 0;
    const criticalCount =
      notifications?.filter((n) => n.severity === "critical").length || 0;
    const warningCount =
      notifications?.filter((n) => n.severity === "warning").length || 0;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      statistics: {
        totalNotifications: notifications?.length || 0,
        pendingCount,
        readCount,
        criticalCount,
        warningCount,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/check-expiring-products:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
