"use client";

import React, { useEffect } from "react";

export type ReportBatch = {
  id: string;
  product_id: string;
  batch_number: string;
  stock: number;
  initial_stock: number;
  issue_date?: string | null;
  expiration_date: string;
  shelf?: string | null;
  drawer?: string | null;
  section?: string | null;
  location_notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

interface ReportBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: ReportBatch[];
  productName: string;
}

export default function ReportBatchesModal({
  isOpen,
  onClose,
  batches,
  productName,
}: ReportBatchesModalProps) {
  if (!isOpen) return null;

  // Escuchar la tecla ESC
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [onClose]);

  const getDaysUntilExpiration = (expirationDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpirationStatus = (
    expirationDate: string
  ): "Vencido" | "Crítico" | "Alerta" | "Normal" => {
    const daysUntil = getDaysUntilExpiration(expirationDate);
    if (daysUntil < 0) return "Vencido";
    if (daysUntil <= 7) return "Crítico";
    if (daysUntil <= 15) return "Alerta";
    return "Normal";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Vencido":
        return "bg-red-50 border-red-200";
      case "Crítico":
        return "bg-orange-50 border-orange-200";
      case "Alerta":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-green-50 border-green-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Vencido":
        return "bg-red-100 text-red-800";
      case "Crítico":
        return "bg-orange-100 text-orange-800";
      case "Alerta":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("es-EC");
    } catch {
      return dateStr;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Lotes del Producto</h2>
            <p className="text-xs text-slate-600 mt-0.5">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
            title="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {batches.length === 0 ? (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                className="w-12 h-12 mx-auto mb-3 text-slate-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m0 0C5.306 6.117 5.75 5.585 5.75 5c0-1.268 3.694-2.25 8.25-2.25s8.25.982 8.25 2.25c0 .585-.444 1.117-1.231 1.375"
                />
              </svg>
              <p className="text-slate-600 font-medium">No hay lotes disponibles para este producto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => {
                const status = getExpirationStatus(batch.expiration_date);
                const daysUntil = getDaysUntilExpiration(batch.expiration_date);

                return (
                  <div
                    key={batch.id}
                    className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(status)}`}
                  >
                    {/* Encabezado del lote */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {batch.batch_number}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Creado: {formatDate(batch.created_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${getStatusBadgeColor(
                          status
                        )}`}
                      >
                        {status}
                        {daysUntil !== null && (
                          <span className="ml-1">
                            ({daysUntil > 0 ? `${daysUntil}d` : "Hoy"})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Información principal */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div className="bg-white/60 rounded px-2.5 py-2">
                        <p className="text-[9px] text-slate-600 uppercase font-semibold tracking-wide">
                          Stock Actual
                        </p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{batch.stock}</p>
                      </div>
                      <div className="bg-white/60 rounded px-2.5 py-2">
                        <p className="text-[9px] text-slate-600 uppercase font-semibold tracking-wide">
                          Stock Inicial
                        </p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{batch.initial_stock}</p>
                      </div>
                      <div className="bg-white/60 rounded px-2.5 py-2">
                        <p className="text-[9px] text-slate-600 uppercase font-semibold tracking-wide">
                          Vencimiento
                        </p>
                        <p className="text-sm font-semibold text-slate-900 mt-1">
                          {formatDate(batch.expiration_date)}
                        </p>
                      </div>
                    </div>

                    {/* Información de ubicación */}
                    {(batch.shelf || batch.drawer || batch.section || batch.location_notes) && (
                      <div className="bg-white/60 rounded px-3 py-2 mb-2">
                        <p className="text-[9px] text-slate-600 uppercase font-semibold tracking-wide mb-1.5">
                          Ubicación
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {batch.shelf && (
                            <div>
                              <span className="text-slate-600">Estante:</span>
                              <span className="font-medium text-slate-900 ml-1">{batch.shelf}</span>
                            </div>
                          )}
                          {batch.drawer && (
                            <div>
                              <span className="text-slate-600">Cajón:</span>
                              <span className="font-medium text-slate-900 ml-1">{batch.drawer}</span>
                            </div>
                          )}
                          {batch.section && (
                            <div>
                              <span className="text-slate-600">Sección:</span>
                              <span className="font-medium text-slate-900 ml-1">{batch.section}</span>
                            </div>
                          )}
                          {batch.location_notes && (
                            <div className="col-span-2">
                              <span className="text-slate-600">Notas:</span>
                              <span className="font-medium text-slate-900 ml-1">{batch.location_notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fecha de emisión */}
                    {batch.issue_date && (
                      <div className="bg-white/60 rounded px-3 py-2 text-xs">
                        <span className="text-slate-600">Fecha emisión:</span>
                        <span className="font-medium text-slate-900 ml-1">
                          {formatDate(batch.issue_date)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
