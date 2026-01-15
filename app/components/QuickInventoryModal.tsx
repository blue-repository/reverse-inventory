"use client";

import { useState, useEffect, useRef } from "react";
import { Product, MovementType } from "@/app/types/product";
import { recordInventoryMovement, searchProducts } from "@/app/actions/products";
import BarcodeScannerModal from "./BarcodeScannerModal";
import { useUser } from "@/app/context/UserContext";

type QuickInventoryModalProps = {
  onClose: () => void;
  onSuccess?: () => void;
  initialProduct?: Product;
};

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

export default function QuickInventoryModal({
  onClose,
  onSuccess,
  initialProduct,
}: QuickInventoryModalProps) {
  const { currentUser } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>(initialProduct?.name || "");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const [movementType, setMovementType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const reasons = MOVEMENT_REASONS[movementType];

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const result = await searchProducts(searchQuery, 1, 10);
      setSearchResults(result.data || []);
      setShowResults(true);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setShowResults(false);
    setSearchResults([]);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setSearchQuery("");
    setQuantity("");
    setReason("");
    setNotes("");
    setError(null);
    searchInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!selectedProduct) {
      setError("Debes seleccionar un producto");
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      setError("Ingresa una cantidad válida mayor a 0");
      return;
    }

    setIsSubmitting(true);

    const result = await recordInventoryMovement(
      selectedProduct.id as string,
      movementType,
      parseInt(quantity),
      reason || undefined,
      notes || undefined,
      currentUser || undefined
    );

    setIsSubmitting(false);

    if (result.success) {
      handleClearProduct();
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || "Error al registrar el movimiento");
    }
  };

  const getTypeColor = (type: MovementType) => {
    switch (type) {
      case "entrada":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "salida":
        return "bg-red-100 text-red-800 border-red-200";
      case "ajuste":
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto"
      onClick={onClose}
    >
      <div className="mx-auto w-full max-w-md p-2 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] min-h-[70vh] flex flex-col overflow-hidden">
          <div className="sticky top-0 z-10 border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white flex items-start gap-3">
            <div className="flex-1">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
                Movimiento Rápido
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Busca y registra entrada/salida rápidamente
              </p>
            </div>
            <button
              onClick={onClose}
              className="relative -mr-1 -mt-1 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-700 transition-colors"
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
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Búsqueda de Producto */}
          <div className="relative">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Buscar Producto <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Nombre, código de barras o descripción..."
                disabled={!!selectedProduct}
                className="w-full rounded-lg border border-slate-300 pr-10 sm:pr-12 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                aria-label="Escanear con cámara"
              >
                📸
              </button>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={handleClearProduct}
                  className="absolute right-10 sm:right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Cambiar producto"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {isSearching && (
                <div className="absolute right-10 sm:right-12 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                </div>
              )}
            </div>

            {/* Resultados de búsqueda */}
            {showResults && searchResults.length > 0 && !selectedProduct && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-lg">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="font-medium text-xs sm:text-sm text-slate-900">
                      {product.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      {product.barcode && <span>Código: {product.barcode}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        product.stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-lg px-3 py-4 text-center text-xs sm:text-sm text-slate-500">
                No se encontraron productos
              </div>
            )}
          </div>

          {/* Información del Producto Seleccionado */}
          {selectedProduct && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-600">Stock Inicial</p>
                  <p className="font-semibold text-slate-900">{selectedProduct.stock_inicial} unidades</p>
                </div>
                <div>
                  <p className="text-slate-600">Stock Actual</p>
                  <p className="font-semibold text-slate-900">{selectedProduct.stock} unidades</p>
                </div>
              </div>
            </div>
          )}

          {/* Tipo de Movimiento */}
          <div className="grid grid-cols-3 gap-2">
            {(["entrada", "salida", "ajuste"] as MovementType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setMovementType(type);
                  setReason("");
                }}
                disabled={!selectedProduct}
                className={`rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  movementType === type
                    ? getTypeColor(type) + " border-current"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {type === "entrada"
                  ? "📥 Entrada"
                  : type === "salida"
                    ? "📤 Salida"
                    : "⚙️ Ajuste"}
              </button>
            ))}
          </div>

          {/* Cantidad */}
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej: 10"
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Motivo <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">Seleccionar motivo...</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Referencia de documento, observaciones..."
              rows={2}
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-200 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct}
              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Registrando..." : "Registrar Movimiento"}
            </button>
          </div>
          </form>
        </div>
      </div>
      
      {/* Scanner Modal - Renderizado a nivel superior */}
      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onSelectProduct={(product) => {
            handleSelectProduct(product);
            setShowScanner(false);
          }}
        />
      )}
    </div>
  );
}
