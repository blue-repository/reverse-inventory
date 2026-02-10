import { useEffect, useState, useCallback, useRef } from "react";
import {
  ExpiringProductNotification,
  NotificationsResponse,
} from "@/app/types/notification";

interface UseNotificationsOptions {
  pollInterval?: number; // ms, default 5 minutos
  autoRefresh?: boolean; // auto-actualizar, default true
  onNewNotification?: (notification: ExpiringProductNotification) => void;
}

/**
 * Hook personalizado para manejar notificaciones de productos por vencer
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
) {
  const {
    pollInterval = 5 * 60 * 1000, // 5 minutos por default
    autoRefresh = true,
  } = options;

  const [notifications, setNotifications] = useState<
    ExpiringProductNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingExpiringProducts, setIsCheckingExpiringProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Función para obtener notificaciones
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        "/api/notifications?limit=50&status=all",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data: NotificationsResponse = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setCriticalCount(data.criticalCount);
      lastFetchRef.current = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para marcar como leído
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notificationId,
            action: "read",
          }),
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        // Actualizar local
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, notification_status: "read" as const }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    },
    []
  );

  // Función para descartar
  const dismiss = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notificationId,
            action: "dismiss",
          }),
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        // Remover del estado local
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notificationId)
        );
      } catch (err) {
        console.error("Error dismissing notification:", err);
      }
    },
    []
  );

  // Función para disparar escaneo de vencimientos
  const triggerExpiringProductsCheck = useCallback(async () => {
    try {
      setIsCheckingExpiringProducts(true);
      setError(null);

      console.log("Triggering expiring products check...");
      const response = await fetch("/api/cron/check-expiring-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Check failed with error:", errorData);
        setError(
          errorData.details || `Check failed with status ${response.status}`
        );
        setIsCheckingExpiringProducts(false);
        return;
      }

      const result = await response.json();
      console.log("Expiring products check completed:", result);
      setError(null);

      // Refrescar notificaciones después de procesar
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error triggering expiring products check:", err);
      setError(message);
    } finally {
      setIsCheckingExpiringProducts(false);
    }
  }, [fetchNotifications]);

  // Configurar polling automático
  useEffect(() => {
    if (!autoRefresh) return;

    // Primera carga
    fetchNotifications();

    // Ejecutar check de productos cada polling interval
    intervalRef.current = setInterval(async () => {
      // Primero ejecutar el check
      await triggerExpiringProductsCheck();
      // Luego obtener las notificaciones
      await fetchNotifications();
    }, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, pollInterval, fetchNotifications, triggerExpiringProductsCheck]);

  // Forzar recarga manual
  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    criticalCount,
    isLoading,
    isCheckingExpiringProducts,
    error,
    markAsRead,
    dismiss,
    refresh,
    triggerExpiringProductsCheck,
  };
}
