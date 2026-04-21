"use client";

import { useEffect, useRef, useState } from "react";
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
  const PAGE_SIZE = 10;
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movementTypeFilter, setMovementTypeFilter] = useState<"all" | "entrada" | "salida">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const hasActiveFilters = movementTypeFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo) || Boolean(search.trim());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const loadMovements = async (reset: boolean) => {
    const nextOffset = reset ? 0 : offset;
    const requestId = ++requestIdRef.current;

    if (reset) {
      setIsLoading(true);
      setIsLoadingMore(false);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    const result = await getProductMovements(product.id as string, {
      limit: PAGE_SIZE,
      offset: nextOffset,
      movementType: movementTypeFilter,
      search: debouncedSearch,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.error) {
      setError(result.error);
      if (reset) {
        setMovements([]);
      }
      setHasMore(false);
    } else {
      const loadedData = result.data || [];
      setMovements((prev) => (reset ? loadedData : [...prev, ...loadedData]));
      setOffset(nextOffset + loadedData.length);
      setHasMore(Boolean(result.hasMore));
    }

    if (reset) {
      setIsLoading(false);
    } else {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const loadInitialMovements = async () => {
      await loadMovements(true);
    };

    loadInitialMovements();
  }, [product.id, movementTypeFilter, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    if (!observerTargetRef.current || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMovements(false);
        }
      },
      {
        root: null,
        rootMargin: "120px",
        threshold: 0,
      }
    );

    observer.observe(observerTargetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, offset]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) {
      return "Sin fecha";
    }

    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRecipeDate = (dateString?: string | null) => {
    if (!dateString) {
      return "Sin fecha";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    }

    return formatDateTime(dateString);
  };

  const clearFilters = () => {
    setMovementTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
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

          <div className="mt-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 sm:p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <label className="mb-1 block text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Buscar
                </label>
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.04 6.04a7.5 7.5 0 0 0 10.61 10.61Z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Motivo, notas, paciente o código de lote"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tipo
                </label>
                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value as "all" | "entrada" | "salida")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="entrada">Solo ingresos</option>
                  <option value="salida">Solo egresos</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Desde (receta)
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  title="Desde (recipe_date)"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hasta (receta)
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  title="Hasta (recipe_date)"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] sm:text-xs text-slate-500">
                Filtra por tipo y fecha de receta. El buscador también revisa código de lote.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Limpiar
              </button>
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
              <p className="text-slate-500 text-sm">No hay movimientos para los filtros aplicados</p>
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
                          {movement.recipe_date ? "Fecha receta: " : "Fecha registro: "}
                          {movement.recipe_date
                            ? formatRecipeDate(movement.recipe_date)
                            : formatDateTime(movement.created_at)}
                        </p>
                        {movement.movement_batch_details && movement.movement_batch_details.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {movement.movement_batch_details
                              .map((detail) => detail.product_batches?.batch_number)
                              .filter(Boolean)
                              .map((batchNumber, index) => (
                                <span
                                  key={`${movement.id}-batch-${index}`}
                                  className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-violet-800"
                                >
                                  Lote: {batchNumber}
                                </span>
                              ))}
                          </div>
                        )}
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

              <div ref={observerTargetRef} className="h-1" />

              {isLoadingMore && (
                <div className="py-2 text-center text-xs sm:text-sm text-slate-500">
                  Cargando más movimientos...
                </div>
              )}

              {!hasMore && movements.length > 0 && (
                <div className="py-2 text-center text-xs sm:text-sm text-slate-400">
                  No hay más movimientos para mostrar
                </div>
              )}
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
