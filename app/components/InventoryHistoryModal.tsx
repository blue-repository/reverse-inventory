"use client";

import { useEffect, useState } from "react";
import { Product, InventoryMovement } from "@/app/types/product";
import { getProductMovements } from "@/app/actions/products";

type InventoryHistoryModalProps = {
  product: Product;
  onClose: () => void;
};

const MOVEMENT_TYPE_COLORS = {
  entrada: "bg-emerald-100 text-emerald-800",
  salida: "bg-red-100 text-red-800",
  ajuste: "bg-blue-100 text-blue-800",
};

const MOVEMENT_TYPE_ICONS = {
  entrada: "📥",
  salida: "📤",
  ajuste: "⚙️",
};

export default function InventoryHistoryModal({
  product,
  onClose,
}: InventoryHistoryModalProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMovements = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getProductMovements(product.id as string);

      if (result.error) {
        setError(result.error);
      } else {
        setMovements(result.data);
      }

      setIsLoading(false);
    };

    loadMovements();
  }, [product.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl my-4 sm:my-8 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-slate-900 p-1.5 sm:p-2 text-white hover:bg-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4 sm:h-5 sm:w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 pr-8">
            Historial de Movimientos
          </h2>
          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-xs sm:text-sm text-slate-600">
            <span className="font-medium text-slate-800">{product.name}</span>
            <div className="flex flex-wrap gap-1.5">
              {product.category && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-slate-800">
                  {product.category}
                </span>
              )}
              {product.specialty && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-amber-800">
                  {product.specialty}
                </span>
              )}
              {product.unit_of_measure && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-blue-800">
                  {product.unit_of_measure}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500">Cargando movimientos...</div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-800">
              Error al cargar movimientos: {error}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-12 w-12 mx-auto text-slate-300 mb-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15"
                />
              </svg>
              <p className="text-slate-500 text-sm">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3 md:p-4 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 rounded-full px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-semibold ${MOVEMENT_TYPE_COLORS[movement.movement_type]}`}
                      >
                        {MOVEMENT_TYPE_ICONS[movement.movement_type]} {movement.movement_type}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900">
                            {movement.quantity} unidades
                          </p>
                          {movement.reason && (
                            <p className="text-xs text-slate-600">• {movement.reason}</p>
                          )}
                          {movement.reporting_unit && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-slate-700">
                              {movement.reporting_unit}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(movement.created_at)}
                        </p>
                        {movement.notes && (
                          <p className="text-xs sm:text-sm text-slate-700 mt-2 italic break-words">
                            "{movement.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
