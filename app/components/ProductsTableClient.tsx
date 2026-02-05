"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Product } from "@/app/types/product";
import { deleteProduct } from "@/app/actions/products";
import { useTheme, rgbToString } from "@/app/context/ThemeContext";
import ProductForm from "@/app/components/ProductForm";
import ProductDetailsModal from "@/app/components/ProductDetailsModal";
import BulkMovementModal from "@/app/components/BulkMovementModal";
import BarcodeScannerModal from "@/app/components/BarcodeScannerModal";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import FilterModal, { FilterOptions } from "@/app/components/FilterModal";
import ReportsModal from "@/app/components/ReportsModal";
import Image from "next/image";

type ProductsTableClientProps = {
  products: Product[];
  initialQuery: string;
  initialPageSize: number;
  totalCount: number;
  currentPage: number;
  allCategories?: string[];
  allSpecialties?: string[];
};

export type { ProductsTableClientProps };

export default function ProductsTableClient({
  products,
  initialQuery,
  initialPageSize,
  totalCount,
  currentPage,
  allCategories = [],
  allSpecialties = [],
}: ProductsTableClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { colors } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [showBulkMovement, setShowBulkMovement] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportsModalType, setReportsModalType] = useState<"egresos" | "ingresos">("egresos");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reportMenuRef = useRef<HTMLDivElement | null>(null);

  // Función auxiliar para obtener los filtros actuales del URL
  const getCurrentFilters = useCallback((): FilterOptions => {
    return {
      category: searchParams.get("category") || undefined,
      specialty: searchParams.get("specialty") || undefined,
      stockMin: searchParams.get("stockMin") ? parseInt(searchParams.get("stockMin")!) : undefined,
      stockMax: searchParams.get("stockMax") ? parseInt(searchParams.get("stockMax")!) : undefined,
      expirationDateFrom: searchParams.get("expirationFrom") || undefined,
      expirationDateTo: searchParams.get("expirationTo") || undefined,
      hasImage: searchParams.get("hasImage") === "true",
      hasBarcode: searchParams.get("hasBarcode") === "true",
    };
  }, [searchParams]);

  // Función auxiliar para construir los parámetros con filtros
  const buildParamsWithFilters = useCallback(
    (filters: FilterOptions): URLSearchParams => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      if (filters.category) params.set("category", filters.category);
      if (filters.specialty) params.set("specialty", filters.specialty);
      if (filters.stockMin !== undefined) params.set("stockMin", filters.stockMin.toString());
      if (filters.stockMax !== undefined) params.set("stockMax", filters.stockMax.toString());
      if (filters.expirationDateFrom) params.set("expirationFrom", filters.expirationDateFrom);
      if (filters.expirationDateTo) params.set("expirationTo", filters.expirationDateTo);
      if (filters.hasImage) params.set("hasImage", "true");
      if (filters.hasBarcode) params.set("hasBarcode", "true");

      return params;
    },
    [searchQuery]
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setSearchQuery(newQuery);

      // Limpiar el timeout anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Configurar nuevo timeout para actualizar URL después de 300ms
      debounceTimerRef.current = setTimeout(() => {
        const currentFilters = getCurrentFilters();
        const params = buildParamsWithFilters(currentFilters);
        params.set("page", "1");
        params.set("pageSize", pageSize.toString());

        router.push(`/?${params.toString()}`, { scroll: false });
      }, 300);
    },
    [router, pageSize, getCurrentFilters, buildParamsWithFilters]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target as Node)) {
        setShowReportMenu(false);
      }
    };

    if (showReportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReportMenu]);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = parseInt(e.target.value);
      setPageSize(newSize);

      const currentFilters = getCurrentFilters();
      const params = buildParamsWithFilters(currentFilters);
      params.set("pageSize", newSize.toString());
      params.set("page", "1");

      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, getCurrentFilters, buildParamsWithFilters]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const currentFilters = getCurrentFilters();
      const params = buildParamsWithFilters(currentFilters);
      params.set("page", newPage.toString());
      params.set("pageSize", pageSize.toString());

      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, pageSize, getCurrentFilters, buildParamsWithFilters]
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
    setSelectedProduct(null);
  };

  const applySearchFromCode = useCallback(
    (rawCode: string) => {
      const value = rawCode.trim();
      const currentFilters = getCurrentFilters();
      const params = buildParamsWithFilters(currentFilters);
      if (value) {
        params.set("q", value);
      }
      params.set("page", "1");
      params.set("pageSize", pageSize.toString());

      setSearchQuery(value);
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, pageSize, getCurrentFilters, buildParamsWithFilters]
  );

  const handleCreate = () => {
    setEditingProduct(undefined);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(undefined);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteProduct(id);
    setDeletingId(null);
    setProductToDelete(null);
    
    if (!result.success) {
      alert(`Error al eliminar: ${result.error}`);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-EC");
  };

  const downloadReport = async (reportType: "productos" | "lotes-por-vencer") => {
    try {
      const endpoints: { [key: string]: string } = {
        productos: "/api/reporte/productos",
        "lotes-por-vencer": "/api/reporte/lotes-por-vencer",
      };

      const response = await fetch(endpoints[reportType]);
      if (!response.ok) throw new Error("Error al descargar reporte");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${reportType}-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowReportMenu(false);
    } catch (error) {
      alert("Error al descargar el reporte");
      console.error(error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Usar los filtros actuales con su paginación
      const currentFilters = getCurrentFilters();
      const params = buildParamsWithFilters(currentFilters);
      params.set("page", currentPage.toString());
      params.set("pageSize", pageSize.toString());

      router.push(`/?${params.toString()}`, { scroll: false });
      
      // Dar tiempo para que se actualice
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error("Error al refrescar:", error);
      setIsRefreshing(false);
    }
  }, [router, currentPage, pageSize, getCurrentFilters, buildParamsWithFilters]);

  const handleApplyFilters = useCallback(
    (filters: FilterOptions) => {
      const params = buildParamsWithFilters(filters);
      params.set("page", "1");
      params.set("pageSize", pageSize.toString());

      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, pageSize, buildParamsWithFilters]
  );

  // Usar las categorías y especialidades proporcionadas, o extraerlas de los productos si no se proporcionan
  const categories = allCategories.length > 0 ? allCategories : (Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[]);
  const specialties = allSpecialties.length > 0 ? allSpecialties : (Array.from(new Set(products.map((p) => p.specialty).filter(Boolean))) as string[]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between p-2 sm:p-3">
        {/* Search Bar - Left */}
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full rounded-md border border-slate-300 pl-10 pr-11 py-2.5 sm:py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-blue-600 px-2 py-1.5 sm:py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              aria-label="Escanear para buscar"
            >
              📸
            </button>
          </div>
        </div>

        {/* Action Buttons - Right */}
        <div className="flex gap-2 flex-wrap sm:flex-nowrap sm:justify-end">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 rounded-md bg-slate-500 px-2.5 sm:px-3 py-2.5 sm:py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] sm:min-h-auto"
            title="Actualizar tabla"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-slate-600 px-2.5 sm:px-3 py-2.5 sm:py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors min-h-[40px] sm:min-h-auto"
            title="Aplicar filtros"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            onClick={() => setShowBulkMovement(true)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2 sm:px-3 py-2.5 sm:py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors min-h-[40px] sm:min-h-auto"
            title="Registrar movimiento masivo de inventario"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            <span className="hidden xs:inline">Movimiento</span>
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-1.5 rounded-md bg-slate-900 px-2 sm:px-3 py-2.5 sm:py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors min-h-[40px] sm:min-h-auto"
            title="Crear nuevo producto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4 flex-shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden xs:inline">Nuevo Producto</span>
          </button>
          <div className="relative" ref={reportMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReportMenu(!showReportMenu);
              }}
              className="flex items-center justify-center gap-1.5 rounded-md bg-slate-700 px-2 sm:px-3 py-2.5 sm:py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors min-h-[40px] sm:min-h-auto"
              title="Descargar reportes"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              <span className="hidden xs:inline">Reportes</span>
            </button>

            {/* Dropdown Menu */}
            {showReportMenu && (
              <div className="absolute right-0 mt-1 w-48 sm:w-56 bg-white rounded-md border border-slate-200 shadow-xl z-10 overflow-hidden max-h-96 overflow-y-auto">
                <div className="p-1">
                  <button
                    onClick={() => downloadReport("productos")}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 transition-colors text-left text-xs text-slate-700 hover:text-blue-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-4 w-4 text-blue-600 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Productos</p>
                      <p className="text-[10px] text-slate-500">Stock actual</p>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => downloadReport("lotes-por-vencer")}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-amber-50 transition-colors text-left text-xs text-slate-700 hover:text-amber-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-4 w-4 text-amber-600 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Lotes por Vencer</p>
                      <p className="text-[10px] text-slate-500">Próximos 30 días</p>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setReportsModalType("egresos");
                      setShowReportsModal(true);
                      setShowReportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 transition-colors text-left text-xs text-slate-700 hover:text-red-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-4 w-4 text-red-600 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Egresos</p>
                      <p className="text-[10px] text-slate-500">Productos vendidos</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setReportsModalType("ingresos");
                      setShowReportsModal(true);
                      setShowReportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-green-50 transition-colors text-left text-xs text-slate-700 hover:text-green-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-4 w-4 text-green-600 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 3L3 7.5m0 0L7.5 12M3 7.5h13.5m0 13.5L21 16.5m0 0L16.5 12M21 16.5H7.5"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Ingresos</p>
                      <p className="text-[10px] text-slate-500">Productos comprados</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div 
        style={{ backgroundColor: rgbToString(colors.bgTable.r, colors.bgTable.g, colors.bgTable.b) }}
        className="overflow-hidden rounded-lg border border-slate-200 shadow-sm transition-colors duration-300 mx-2"
      >
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 whitespace-nowrap">Nombre</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 hidden md:table-cell whitespace-nowrap">Código</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 text-center whitespace-nowrap">Stock</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 hidden md:table-cell whitespace-nowrap">Categoría</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 hidden lg:table-cell whitespace-nowrap">Especialidad</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 hidden lg:table-cell whitespace-nowrap">Unidad</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 hidden xl:table-cell whitespace-nowrap">Unidad Reporte</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 hidden lg:table-cell whitespace-nowrap">Expiración</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-700 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products && products.length > 0 ? (
                products.map((product, index) => {
                  const primaryBg = rgbToString(colors.bgTable.r, colors.bgTable.g, colors.bgTable.b);
                  const alternateBg = `rgba(${colors.bgTable.r}, ${colors.bgTable.g}, ${colors.bgTable.b}, 0.7)`;
                  return (
                  <tr 
                    key={product.id} 
                    style={{ 
                      backgroundColor: index % 2 === 0 ? primaryBg : alternateBg,
                      transition: 'background-color 300ms'
                    }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm leading-tight max-w-xs overflow-hidden text-ellipsis">{product.name}</div>
                      <div className="md:hidden text-[9px] sm:text-[10px] text-slate-500 mt-1 space-y-1">
                        <div className="truncate">{product.barcode || "Sin código"}</div>
                        <div className="flex flex-wrap gap-1">
                          {product.category && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-slate-700 truncate">
                              {product.category}
                            </span>
                          )}
                          {product.specialty && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-amber-700 truncate">
                              {product.specialty}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden md:table-cell">
                      <span className="text-xs sm:text-sm text-slate-600 font-mono truncate block">{product.barcode || "—"}</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap ${
                        product.stock === 0
                          ? "bg-red-100 text-red-700"
                          : product.stock < 10
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden md:table-cell">
                      {product.category ? (
                        <span className="inline-flex items-center rounded px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 max-w-fit truncate">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden lg:table-cell">
                      {product.specialty ? (
                        <span className="inline-flex items-center rounded px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 max-w-fit truncate">
                          {product.specialty}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden lg:table-cell">
                      <span className="text-xs sm:text-sm text-slate-600 truncate block">{product.unit_of_measure || "—"}</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden xl:table-cell">
                      <span className="text-xs sm:text-sm text-slate-600 truncate block">{product.reporting_unit || "—"}</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden lg:table-cell">
                      <span className="text-xs sm:text-sm text-slate-600 truncate block">{formatDate(product.expiration_date)}</span>
                    </td>
                    <td className="px-1 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="rounded p-1 sm:p-1.5 text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                          title="Ver detalles"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="rounded p-1 sm:p-1.5 text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                          title="Editar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setProductToDelete(product)}
                          disabled={deletingId === product.id}
                          className="rounded p-1 sm:p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors flex-shrink-0"
                          title="Eliminar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-2 sm:px-4 py-8 sm:py-12 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-slate-300 mb-2 sm:mb-3"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.5l2.25 2.25m0 0l2.25-2.25M12 13.5V3m8.25 9.75h-16.5" />
                    </svg>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {searchQuery ? "No se encontraron productos" : "No hay productos disponibles"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination and items per page controls */}
      <div className="mt-3 sm:mt-5 flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between text-xs mb-2 mx-2 sm:mx-0 px-0 sm:px-2">
        <div className="w-full sm:w-auto flex justify-center sm:justify-start">
          <span className="text-slate-600 text-[11px] sm:text-xs text-center">
            Mostrando {products.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
          </span>
        </div>

        <div className="w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3">
          <label htmlFor="pageSize" className="text-slate-600 whitespace-nowrap text-[11px] sm:text-xs">
            Por página:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded border border-slate-300 px-1.5 sm:px-2 py-1.5 sm:py-1 text-[11px] sm:text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="w-full sm:w-auto flex items-center justify-center gap-0.5 sm:gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded border border-slate-300 px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex-shrink-0"
          >
            ← Ant.
          </button>
          
          <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 overflow-x-auto">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`rounded px-1.5 sm:px-2 py-1 min-w-[24px] sm:min-w-[28px] text-[10px] sm:text-xs transition-colors flex-shrink-0 ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white font-medium"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded border border-slate-300 px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex-shrink-0"
          >
            Sig. →
          </button>
        </div>
      </div>

      {showForm && (
        <ProductForm product={editingProduct} onClose={handleCloseForm} />
      )}

      {showScanner && (
        <BarcodeScannerModal
          mode="code"
          onClose={() => setShowScanner(false)}
          onCodeScanned={(code) => {
            applySearchFromCode(code);
            setShowScanner(false);
          }}
          onSelectProduct={undefined}
        />
      )}
      {showBulkMovement && (
        <BulkMovementModal
          products={products}
          onClose={() => setShowBulkMovement(false)}
          onSuccess={() => setShowBulkMovement(false)}
        />
      )}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={handleEdit}
        />
      )}
      {productToDelete && (
        <DeleteConfirmModal
          productName={productToDelete.name}
          onConfirm={() => handleDelete(productToDelete.id)}
          onCancel={() => setProductToDelete(null)}
          isDeleting={deletingId === productToDelete.id}
        />
      )}
      {showFilterModal && (
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApplyFilters={handleApplyFilters}
          categories={categories}
          specialties={specialties}
        />
      )}
      <ReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        initialType={reportsModalType}
      />
    </>
  );
}
