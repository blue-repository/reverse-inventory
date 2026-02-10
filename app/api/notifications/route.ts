import { supabase } from "@/app/lib/conections/supabase";
import { ExpiringProductNotification, NotificationsResponse } from "@/app/types/notification";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET: Obtiene las notificaciones activas del usuario
 * Query params:
 *   - limit: número máximo de notificaciones (default: 10)
 *   - status: 'all', 'pending', 'read' (default: 'all')
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "all";

    // Construir query
    let query = supabase
      .from("vw_active_expiring_notifications")
      .select("*")
      .order("days_until_expiration", { ascending: true })
      .limit(limit);

    // Filtrar por estado si es necesario
    if (status !== "all") {
      query = query.eq("notification_status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "Error al obtener notificaciones" },
        { status: 500 }
      );
    }

    // Procesar datos
    const notifications = (data || []) as ExpiringProductNotification[];
    const unreadCount = notifications.filter(
      (n) => n.notification_status === "pending"
    ).length;
    const criticalCount = notifications.filter(
      (n) => n.severity === "critical"
    ).length;

    const response: NotificationsResponse = {
      notifications,
      unreadCount,
      criticalCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in GET /api/notifications:", error);
    return NextResponse.json(
      { error: "Error inesperado" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Actualiza el estado de una notificación
 * Body:
 *   - notificationId: UUID
 *   - action: 'read' | 'dismiss'
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId, action } = body;

    if (!notificationId || !["read", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "notificationId y action (read/dismiss) son requeridos" },
        { status: 400 }
      );
    }

    // Actualizar según la acción
    const updateData =
      action === "read"
        ? {
            notification_status: "read",
            read_at: new Date().toISOString(),
          }
        : {
            notification_status: "dismissed",
            dismissed_at: new Date().toISOString(),
          };

    const { error } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", notificationId);

    if (error) {
      console.error("Error updating notification:", error);
      return NextResponse.json(
        { error: "Error al actualizar notificación" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Notificación marcada como ${action === "read" ? "leída" : "descartada"}`,
    });
  } catch (error) {
    console.error("Unexpected error in PUT /api/notifications:", error);
    return NextResponse.json(
      { error: "Error inesperado" },
      { status: 500 }
    );
  }
}
