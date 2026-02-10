/**
 * POST /api/cron/check-expiring-products
 * 
 * Endpoint para ejecutar la verificación de productos por vencer
 * - Puede ser ejecutado por Vercel Cron (automático)
 * - Puede ser ejecutado manualmente desde el frontend (botón en navbar)
 * 
 * Ejecuta dos funciones en Supabase:
 * 1. fn_create_or_update_expiring_notifications() - Crea notificaciones
 * 2. fn_cleanup_old_notifications() - Limpia notificaciones antiguas
 */

import { createClient } from "@supabase/supabase-js";

// Inicializar cliente de Supabase con la clave de servicio
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any = null;

// Solo inicializar si las variables existen
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  try {
    // Verificar variables de entorno
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return Response.json(
        {
          success: false,
          error: "Configuration error",
          details: "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
          debug: {
            has_url: !!supabaseUrl,
            has_key: !!supabaseServiceKey,
          },
        },
        { status: 500 }
      );
    }

    if (!supabase) {
      console.error("Supabase client not initialized");
      return Response.json(
        {
          success: false,
          error: "Initialization error",
          details: "Supabase client could not be initialized",
        },
        { status: 500 }
      );
    }

    // Verificar si es una llamada de Vercel Cron o del frontend
    const authHeader = request.headers.get("authorization");
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    console.log("Cron trigger:", {
      isVercelCron,
      isManual: !isVercelCron,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();
    let results: any = {};

    // 1️⃣ Ejecutar la función para crear/actualizar notificaciones de productos por vencer
    console.log("Calling fn_create_or_update_expiring_notifications...");
    const { data: expiringData, error: expiringError } = await supabase.rpc(
      "fn_create_or_update_expiring_notifications",
      {
        p_days_threshold: 90,
      }
    );

    if (expiringError) {
      console.error("Error executing fn_create_or_update_expiring_notifications:", expiringError);
      return Response.json(
        {
          success: false,
          error: "Failed to create expiring notifications",
          details: expiringError.message,
          code: expiringError.code,
        },
        { status: 500 }
      );
    }

    console.log("Expiring check completed:", expiringData);
    results.expiring_notifications = expiringData;

    // 2️⃣ Ejecutar la función de limpieza
    console.log("Calling fn_cleanup_old_notifications...");
    const { data: cleanupData, error: cleanupError } = await supabase.rpc(
      "fn_cleanup_old_notifications",
      {
        p_days_old: 30,
      }
    );

    if (cleanupError) {
      console.error("Error executing fn_cleanup_old_notifications:", cleanupError);
      // No fallar completamente si la limpieza falla
      results.cleanup_error = cleanupError.message;
    } else {
      console.log("Cleanup completed:", cleanupData);
      results.cleaned_notifications = cleanupData;
    }

    // 3️⃣ Obtener estadísticas
    console.log("Fetching statistics...");
    const { data: stats, error: statsError } = await supabase
      .from("notifications")
      .select("notification_status, severity", { count: "exact" })
      .eq("notification_status", "pending");

    if (statsError) {
      console.error("Error fetching stats:", statsError);
    } else if (stats) {
      results.current_pending_count = stats.length;
      results.critical_count = stats.filter((n: any) => n.severity === "critical").length;
      results.warning_count = stats.filter((n: any) => n.severity === "warning").length;
      console.log("Stats:", results);
    }

    const duration = Date.now() - startTime;

    // Respuesta exitosa
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      results,
      message: isVercelCron 
        ? "Automated cron job executed successfully" 
        : "Manual check executed successfully",
    };

    console.log("Cron response:", response);
    return Response.json(response, { status: 200 });

  } catch (error) {
    console.error("Error in cron endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    return Response.json(
      {
        success: false,
        error: "Internal server error",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para obtener el estado del último check
 * Útil para debugging
 */
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return Response.json(
        {
          success: false,
          error: "Supabase not initialized",
        },
        { status: 500 }
      );
    }

    console.log("GET /api/cron/check-expiring-products - Stats request");

    // Obtener estadísticas actuales
    const { data: pendingStats, count: pendingCount, error: pendingError } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("notification_status", "pending");

    const { data: readStats, count: readCount, error: readError } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("notification_status", "read");

    const { data: dismissedStats, count: dismissedCount, error: dismissedError } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("notification_status", "dismissed");

    if (pendingError) console.error("Error fetching pending:", pendingError);
    if (readError) console.error("Error fetching read:", readError);
    if (dismissedError) console.error("Error fetching dismissed:", dismissedError);

    const stats = {
      success: true,
      timestamp: new Date().toISOString(),
      statistics: {
        pending: pendingCount || 0,
        read: readCount || 0,
        dismissed: dismissedCount || 0,
        total: (pendingCount || 0) + (readCount || 0) + (dismissedCount || 0),
      },
      sample_pending: pendingStats?.slice(0, 5) || [],
    };

    console.log("Stats response:", stats);
    return Response.json(stats, { status: 200 });
  } catch (error) {
    console.error("Error getting cron stats:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to retrieve statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
