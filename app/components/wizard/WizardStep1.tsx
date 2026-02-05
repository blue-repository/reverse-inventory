"use client";

import { Product, MovementType } from "@/app/types/product";

interface WizardStep1Item {
  product: Product;
  quantity: number | "";
}

interface WizardStep1Props {
  movementType: MovementType;
  onMovementTypeChange: (type: MovementType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearching: boolean;
  filteredProducts: Product[];
  onAddProduct: (product: Product) => void;
  onShowScanner: () => void;
  itemIds: Set<string>;
  items: WizardStep1Item[];
  onRemoveItem: (productId: string) => void;
}

export function WizardStep1({
  movementType,
  onMovementTypeChange,
  searchQuery,
  onSearchChange,
  isSearching,
  filteredProducts,
  onAddProduct,
  onShowScanner,
  itemIds,
  items,
  onRemoveItem,
}: WizardStep1Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col space-y-4 p-4 pb-20">
        {/* Tipo de movimiento */}
        <div className="flex-shrink-0">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Tipo de movimiento
        </label>
        <div className="flex gap-2">
          {(["entrada", "salida", "ajuste"] as const).map((type) => {
            const icons = {
              entrada: "📥",
              salida: "📤",
              ajuste: "⚙️"
            };
            const labels = {
              entrada: "Entrada",
              salida: "Salida",
              ajuste: "Ajuste"
            };
            
            return (
              <label key={type} className="cursor-pointer flex-1">
                <input
                  type="radio"
                  name="movementType"
                  value={type}
                  checked={movementType === type}
                  onChange={(e) => onMovementTypeChange(e.target.value as MovementType)}
                  className="hidden"
                />
                <div
                  className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-lg border-2 transition-all ${
                    movementType === type
                      ? "bg-indigo-100 text-indigo-700 border-indigo-500"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-2xl mb-1">{icons[type]}</span>
                  <span className="text-[10px] font-semibold">{labels[type]}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Búsqueda de producto */}
      <div className="flex-shrink-0">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Buscar o escanear producto
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nombre o código de barras"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Botón escanear */}
      <button
        type="button"
        onClick={onShowScanner}
        className="flex-shrink-0 w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        Escanear
      </button>

      {/* Resultados de búsqueda */}
      {searchQuery && (
        <div className="flex-shrink-0 rounded-lg border border-slate-300 bg-white p-3 max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
              <span className="text-xs text-slate-600">Buscando...</span>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="space-y-2">
              {filteredProducts.slice(0, 8).map((product) => {
                const isAdded = itemIds.has(product.id);
                const isDisabled = movementType === "salida" && product.stock === 0;
                
                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-xs ${
                      isAdded
                        ? "border-green-300 bg-green-50"
                        : isDisabled
                        ? "border-slate-200 bg-slate-50 opacity-50"
                        : "border-slate-200 bg-white hover:bg-indigo-50"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-slate-600">Stock: {product.stock}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => !isAdded && !isDisabled && onAddProduct(product)}
                      disabled={isAdded || isDisabled}
                      className={`ml-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                        isAdded
                          ? "bg-green-100 text-green-700 cursor-default"
                          : isDisabled
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      }`}
                    >
                      {isAdded ? "✓ Agregado" : "Agregar"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-slate-600">No hay productos</p>
          )}
        </div>
      )}

      {/* Productos agregados */}
      {items.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 rounded-lg border-2 border-green-300 bg-green-50 p-3">
          <div className="flex-shrink-0 flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-green-800 flex items-center gap-1">
              <span>✓</span>
              Productos agregados
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-green-200 text-green-800 text-xs font-bold">
              {items.length}
            </span>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs border border-green-200"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.product.name}</p>
                  <p className="text-slate-600">Stock: {item.product.stock}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.product.id)}
                  className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  title="Eliminar producto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
