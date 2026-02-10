"use client";

import { ExpiringProductNotification } from "@/app/types/notification";
import React from "react";

interface NotificationItemProps {
  notification: ExpiringProductNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onItemClick: (notification: ExpiringProductNotification) => void;
}

/**
 * Componente individual de una notificación
 */
export function NotificationItem({
  notification,
  onRead,
  onDismiss,
  onItemClick,
}: NotificationItemProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-l-4 border-red-500";
      case "warning":
        return "bg-yellow-50 border-l-4 border-yellow-500";
      default:
        return "bg-blue-50 border-l-4 border-blue-500";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "critical":
        return "¡Crítico!";
      case "warning":
        return "Atención";
      default:
        return "Info";
    }
  };

  const handleRead = () => {
    if (notification.notification_status === "pending") {
      onRead(notification.id);
    }
  };

  const handleItemClick = (e: React.MouseEvent) => {
    // Evitar que el click en botones dispare el click del item
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    onItemClick(notification);
  };

  return (
    <div
      onClick={handleItemClick}
      onMouseEnter={handleRead}
      className={`${getSeverityColor(
        notification.severity
      )} p-3 rounded transition-all hover:shadow-md cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Encabezado con badge */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`${getSeverityBadgeColor(
                notification.severity
              )} text-xs font-semibold px-2 py-0.5 rounded-full`}
            >
              {getSeverityLabel(notification.severity)}
            </span>
            {notification.notification_status === "pending" && (
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            )}
          </div>

          {/* Nombre del producto */}
          <p className="text-xs font-semibold text-slate-900 break-words">
            {notification.product_name}
          </p>

          {/* Información del lote o detalles */}
          {notification.batch_number && (
            <p className="text-[11px] text-slate-600 break-words">
              Lote: {notification.batch_number}
            </p>
          )}

          {/* Días hasta expiración */}
          <div className="flex items-center gap-2 mt-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-slate-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            <span className="text-sm text-slate-700 font-medium">
              {notification.days_until_expiration === 0
                ? "¡Vence hoy!"
                : notification.days_until_expiration === 1
                  ? "Vence mañana"
                  : `Vence en ${notification.days_until_expiration} días`}
            </span>
          </div>

          {/* Fecha exacta */}
          <p className="text-xs text-slate-500 mt-1">
            Vencimiento:{" "}
            {new Date(notification.expiration_date).toLocaleDateString(
              "es-CO",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            )}
          </p>

          {/* Stock si aplica */}
          {notification.quantity > 0 && (
            <p className="text-xs text-slate-600 mt-1">
              Cantidad: {notification.quantity} {notification.unit_of_measure || "unidades"}
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-1 shrink-0">
          {notification.notification_status === "pending" && (
            <button
              onClick={handleRead}
              title="Marcar como leído"
              className="p-1 rounded hover:bg-slate-200 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-slate-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDismiss(notification.id)}
            title="Descartar"
            className="p-1 rounded hover:bg-red-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-red-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
