"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Product } from "@/app/types/product";
import { deleteProduct } from "@/app/actions/products";
import ProductForm from "@/app/components/ProductForm";
import ProductDetailsModal from "@/app/components/ProductDetailsModal";
import QuickInventoryModal from "@/app/components/QuickInventoryModal";
import BarcodeScannerModal from "@/app/components/BarcodeScannerModal";
import Image from "next/image";

type ProductsTableClientProps = {
  products: Product[];
  initialQuery: string;
  initialPageSize: number;
  totalCount: number;
  currentPage: number;
};

export default function ProductsTableClient({
  products,
  initialQuery,
  initialPageSize,
  totalCount,
  currentPage,
}: ProductsTableClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [showQuickInventory, setShowQuickInventory] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        const params = new URLSearchParams();
        if (newQuery.trim()) {
          params.set("q", newQuery.trim());
        }
        params.set("page", "1");
        params.set("pageSize", pageSize.toString());

        router.push(`/?${params.toString()}`, { scroll: false });
      }, 300);
    },
    [router, pageSize]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = parseInt(e.target.value);
      setPageSize(newSize);

      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      params.set("pageSize", newSize.toString());
      params.set("page", "1");

      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchQuery]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      params.set("page", newPage.toString());
      params.set("pageSize", pageSize.toString());

      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, pageSize, searchQuery]
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
    setSelectedProduct(null);
  };

  const handleCreate = () => {
    setEditingProduct(undefined);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(undefined);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    setDeletingId(id);
    await deleteProduct(id);
    setDeletingId(null);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-EC");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full rounded-lg border border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm placeholder-slate-500 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 sm:py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors whitespace-nowrap flex-1 sm:flex-initial"
            title="Escanear código de barras o QR"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4.5h14.25M3 9h14.25M3 13.5h14.25M17.6 2.5a2.4 2.4 0 1 1 4.8 0 2.4 2.4 0 0 1-4.8 0ZM3 21.75a6.75 6.75 0 0 1 13.5 0"
              />
            </svg>
            <span className="hidden xs:inline">Escanear</span>
            <span className="xs:hidden">📸</span>
          </button>
          <button
            onClick={() => setShowQuickInventory(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 sm:py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap flex-1 sm:flex-initial"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            <span className="hidden xs:inline">Movimiento Rápido</span>
            <span className="xs:hidden">Movimiento</span>
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 sm:py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap flex-1 sm:flex-initial"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden xs:inline">Nuevo Producto</span>
            <span className="xs:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="overflow-x-auto -mx-px">
          <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
            <thead className="bg-slate-900 text-slate-50">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Nombre</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden md:table-cell">Código</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Stock</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden lg:table-cell">Unidad</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden xl:table-cell">Vía Admin.</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden lg:table-cell">Expiración</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products && products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className="odd:bg-white even:bg-slate-50 hover:bg-slate-100">
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="md:hidden text-xs text-slate-500 mt-0.5">
                        {product.barcode || "Sin código"}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700 hidden md:table-cell">{product.barcode || "—"}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold ${
                          product.stock > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {product.stock}
                      </span>
                      <div className="md:hidden text-xs text-slate-500 mt-0.5">
                        Init: {product.stock_inicial}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700 hidden lg:table-cell">{product.unit_of_measure || "—"}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700 hidden xl:table-cell">
                      {product.administration_route || "—"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700 hidden lg:table-cell">
                      {formatDate(product.expiration_date)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="flex gap-1 sm:gap-2 flex-wrap">
                        <div className="group relative">
                          <button
                            disabled={!product.image_url}
                            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border transition-colors ${
                              product.image_url
                                ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-default"
                                : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                            title={product.image_url ? "Ver imagen" : "Sin imagen"}
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
                                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"
                              />
                            </svg>
                          </button>
                          {/* Tooltip preview - hidden on mobile */}
                          {product.image_url && (
                            <div className="pointer-events-none absolute left-10 sm:left-12 top-1/2 -translate-y-1/2 z-50 hidden lg:group-hover:block rounded-lg border border-slate-300 bg-white p-2 shadow-2xl">
                              <div className="relative h-32 w-32 overflow-hidden rounded">
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="128px"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="rounded-lg border border-slate-300 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.734 20.84a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="rounded-lg border border-slate-300 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 9.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                          className="rounded-lg border border-red-300 p-1.5 sm:p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
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
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-2 sm:px-4 py-6 text-center text-slate-600">
                    {searchQuery ? "No se encontraron productos" : "No hay productos disponibles"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination and items per page controls */}
      <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <label htmlFor="pageSize" className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
              Mostrar:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="flex-1 sm:flex-none rounded-lg border border-slate-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">← Anterior</span>
              <span className="sm:hidden">←</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage === 1) {
                  pageNum = i + 1;
                } else if (currentPage === totalPages) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }
                
                if (pageNum < 1 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors min-w-[32px] sm:min-w-[40px] ${
                      currentPage === pageNum
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
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
              className="rounded-lg border border-slate-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Siguiente →</span>
              <span className="sm:hidden">→</span>
            </button>
          </div>

          <div className="text-center text-xs sm:text-sm text-slate-600 sm:text-right">
            {products.length > 0 ? (
              <>
                <span className="hidden sm:inline">
                  Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
                  {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
                </span>
                <span className="sm:hidden">
                  {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} de {totalCount}
                </span>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {showForm && <ProductForm product={editingProduct} onClose={handleCloseForm} />}
      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            setShowScanner(false);
          }}
        />
      )}
      {showQuickInventory && (
        <QuickInventoryModal
          onClose={() => setShowQuickInventory(false)}
          onSuccess={() => setShowQuickInventory(false)}
        />
      )}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={handleEdit}
        />
      )}
    </>
  );
}
