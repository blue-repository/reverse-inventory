"use client";

import { useState } from "react";

const CATEGORIES = ["Medicamentos", "Dispositivos Médicos"];

export type FilterOptions = {
  category?: string;
  specialty?: string;
  stockMin?: number;
  stockMax?: number;
  expirationDateFrom?: string;
  expirationDateTo?: string;
  hasImage?: boolean;
  hasBarcode?: boolean;
};

type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  categories?: string[];
  specialties: string[];
};

export default function FilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  categories = CATEGORIES,
  specialties,
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>({});

  const handleApply = () => {
    // Limpiar valores vacíos
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    ) as FilterOptions;
    onApplyFilters(cleanedFilters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
  };

  const handleClear = () => {
    handleReset();
    onApplyFilters({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl my-4 sm:my-8 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-slate-900 p-1.5 sm:p-2 text-white hover:bg-slate-700 transition-colors"
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
            Filtrar Productos
          </h2>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            {/* Categoría */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Categoría
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    category: e.target.value || undefined,
                  })
                }
                className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Especialidad */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Especialidad
              </label>
              <select
                value={filters.specialty || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    specialty: e.target.value || undefined,
                  })
                }
                className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Todas las especialidades</option>
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  value={filters.stockMin ?? ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      stockMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="0"
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Stock Máximo
                </label>
                <input
                  type="number"
                  value={filters.stockMax ?? ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      stockMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="9999"
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Fecha de Expiración */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Expiración Desde
                </label>
                <input
                  type="date"
                  value={filters.expirationDateFrom || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      expirationDateFrom: e.target.value || undefined,
                    })
                  }
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Expiración Hasta
                </label>
                <input
                  type="date"
                  value={filters.expirationDateTo || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      expirationDateTo: e.target.value || undefined,
                    })
                  }
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasImage ?? false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      hasImage: e.target.checked || undefined,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm text-slate-700">
                  Solo productos con imagen
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasBarcode ?? false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      hasBarcode: e.target.checked || undefined,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm text-slate-700">
                  Solo productos con código de barras
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex gap-2 justify-end">
          <button
            onClick={handleClear}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
          >
            Limpiar
          </button>
          <button
            onClick={handleReset}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md bg-slate-500 text-white hover:bg-slate-600 transition-colors font-medium"
          >
            Restablecer
          </button>
          <button
            onClick={handleApply}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}
