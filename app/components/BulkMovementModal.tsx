"use client";

import { useState, useRef, useEffect } from "react";
import { Product, MovementType } from "@/app/types/product";
import { recordBulkInventoryMovements } from "@/app/actions/products";
import { useUser } from "@/app/context/UserContext";
import BarcodeScannerModal from "@/app/components/BarcodeScannerModal";

type BulkMovementItem = {
  product: Product;
  quantity: number;
  reason: string;
  notes: string;
  // Para entradas (lote)
  batchNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  shelf?: string;
  drawer?: string;
  section?: string;
  locationNotes?: string;
};

type BulkMovementModalProps = {
  products: Product[];
  onClose: () => void;
  onSuccess?: () => void;
};

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

export default function BulkMovementModal({ products, onClose, onSuccess }: BulkMovementModalProps) {
  const { currentUser } = useUser();
  const [movementType, setMovementType] = useState<MovementType>("salida");
  const [items, setItems] = useState<BulkMovementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [generalReason, setGeneralReason] = useState<string>("");
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Filtrar productos basados en búsqueda
  const filteredProducts = products.filter(
    (p) =>
      !items.find((item) => item.product.id === p.id) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Agregar producto al escanear
  const handleProductScanned = (product: Product) => {
    setItems((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev;
      }
      return [
        ...prev,
        {
          product,
          quantity: 0,
          reason: "",
          notes: "",
          batchNumber: "",
          issueDate: new Date().toISOString().split("T")[0],
          expirationDate: "",
          shelf: "",
          drawer: "",
          section: "",
          locationNotes: "",
        },
      ];
    });
    setShowScanner(false);
  };

  // Agregar producto desde búsqueda
  const addProduct = (product: Product) => {
    setItems((prev) => [
      ...prev,
      {
        product,
        quantity: 0,
        reason: "",
        notes: "",
        batchNumber: "",
        issueDate: new Date().toISOString().split("T")[0],
        expirationDate: "",
        shelf: "",
        drawer: "",
        section: "",
        locationNotes: "",
      },
    ]);
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Remover producto de la lista
  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Actualizar cantidad
  const updateItemQuantity = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    );
  };

  // Actualizar motivo
  const updateItemReason = (productId: string, reason: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, reason } : item
      )
    );
  };

  // Actualizar notas
  const updateItemNotes = (productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

  // Generar batch number
  const generateBatchNumber = (productId: string) => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const batchNumber = `LOTE-${dateStr}-${random}`;

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, batchNumber } : item
      )
    );
  };

  // Guardar movimientos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      setError("Usuario no identificado");
      return;
    }

    // Validar que al menos un producto tenga cantidad
    const hasQuantities = items.some((item) => item.quantity > 0);
    if (!hasQuantities) {
      setError("Debe ingresar al menos una cantidad");
      return;
    }

    // Para entradas, validar que tengan datos de lote
    if (movementType === "entrada") {
      const invalidEntries = items.filter(
        (item) => item.quantity > 0 && (!item.expirationDate || !item.batchNumber)
      );
      if (invalidEntries.length > 0) {
        setError(
          "Todos los ingresos deben tener número de lote y fecha de vencimiento"
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Procesar cada movimiento
      const movements = items
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          type: movementType as MovementType,
          reason: item.reason || generalReason || "Sin especificar",
          notes: item.notes || generalNotes || "",
          user_id: currentUser || "Sistema",
          // Datos de lote para entradas
          batch_number: movementType === "entrada" ? item.batchNumber : undefined,
          issue_date: movementType === "entrada" ? item.issueDate : undefined,
          expiration_date: movementType === "entrada" ? item.expirationDate : undefined,
          shelf: movementType === "entrada" ? item.shelf : undefined,
          drawer: movementType === "entrada" ? item.drawer : undefined,
          section: movementType === "entrada" ? item.section : undefined,
          location_notes: movementType === "entrada" ? item.locationNotes : undefined,
        }));

      await recordBulkInventoryMovements(movements);

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar movimientos");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activateReasons = MOVEMENT_REASONS[movementType];
  const itemsWithQuantity = items.filter((item) => item.quantity > 0);

  // Detectar clics fuera del modal (solo si no hay scanner abierto)
  useEffect(() => {
    if (showScanner) return; // No cerrar si el scanner está abierto
    
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, showScanner]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
        <div
          ref={modalRef}
          className="w-full max-w-3xl max-h-[95vh] rounded-lg bg-white shadow-lg flex flex-col overflow-hidden"
        >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3">
            <h2 className="text-base sm:text-lg font-bold">Movimiento Masivo de Inventario</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Selecciona o escanea múltiples productos para hacer movimientos simultáneos
            </p>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-2.5 sm:space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Tipo de movimiento */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
              Tipo de Movimiento
            </label>
            <div className="flex gap-1.5 sm:gap-2">
              {(["entrada", "salida", "ajuste"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="movementType"
                    value={type}
                    checked={movementType === type}
                    onChange={(e) => setMovementType(e.target.value as MovementType)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Búsqueda y escaneo */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-slate-700">
              Agregar Productos
            </label>
            <div className="flex gap-1.5 sm:gap-2 items-start">
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
                />
                
                {/* Dropdown de resultados */}
                {searchQuery && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 8).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 border-b border-slate-100 last:border-b-0"
                      >
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-600">Stock: {product.stock} | Código: {product.barcode || "N/A"}</p>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && filteredProducts.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-300 rounded-lg shadow-lg p-2.5">
                    <p className="text-xs text-slate-600">No hay productos disponibles</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4.5h14.25M3 9h14.25M3 13.5h14.25M17.6 2.5a2.4 2.4 0 1 1 4.8 0 2.4 2.4 0 0 1-4.8 0ZM3 21.75a6.75 6.75 0 0 1 13.5 0"
                  />
                </svg>
                <span className="hidden xs:inline">Escanear</span>
              </button>
            </div>
          </div>

          {/* Lista de productos */}
          {items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 px-3 py-6 text-center">
              <p className="text-xs sm:text-sm text-slate-600">
                No hay productos. Escanea o selecciona productos para comenzar.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedProductId(
                        expandedProductId === item.product.id ? null : item.product.id
                      )
                    }
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{item.product.name}</p>
                      <p className="text-xs text-slate-600">Stock actual: {item.product.stock}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max={movementType === "salida" ? item.product.stock : undefined}
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.product.id, parseInt(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm text-right"
                        placeholder="Cantidad"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.product.id);
                        }}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  {/* Detalles expandidos */}
                  {expandedProductId === item.product.id && item.quantity > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3 space-y-3">
                      {/* Motivo */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Motivo {item.reason ? "(específico)" : "(usar general si está vacío)"}
                        </label>
                        <select
                          value={item.reason}
                          onChange={(e) => updateItemReason(item.product.id, e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Seleccionar motivo --</option>
                          {activateReasons.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Notas */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Observación {item.notes ? "(específica)" : "(usar general si está vacía)"}
                        </label>
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                          maxLength={200}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                          rows={2}
                          placeholder="Observación específica para este producto"
                        />
                      </div>

                      {/* Campos de lote para entradas */}
                      {movementType === "entrada" && (
                        <div className="space-y-3 border-t border-slate-200 pt-3 bg-green-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-green-900">📦 Datos del Lote</p>
                          
                          {/* Número de Lote */}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Número de Lote
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.batchNumber || ""}
                                onChange={(e) => {
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.product.id === item.product.id
                                        ? { ...i, batchNumber: e.target.value }
                                        : i
                                    )
                                  );
                                }}
                                placeholder="Generar o ingresar..."
                                className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => generateBatchNumber(item.product.id)}
                                className="rounded bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700"
                              >
                                Generar
                              </button>
                            </div>
                          </div>

                          {/* Fechas */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Fecha de Expedición
                              </label>
                              <input
                                type="date"
                                value={item.issueDate || ""}
                                onChange={(e) => {
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.product.id === item.product.id
                                        ? { ...i, issueDate: e.target.value }
                                        : i
                                    )
                                  );
                                }}
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Fecha de Vencimiento <span className="text-red-600">*</span>
                              </label>
                              <input
                                type="date"
                                value={item.expirationDate || ""}
                                onChange={(e) => {
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.product.id === item.product.id
                                        ? { ...i, expirationDate: e.target.value }
                                        : i
                                    )
                                  );
                                }}
                                required
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                              />
                            </div>
                          </div>

                          {/* Ubicación */}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Ubicación del Lote
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={item.shelf || ""}
                                onChange={(e) => {
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.product.id === item.product.id
                                        ? { ...i, shelf: e.target.value }
                                        : i
                                    )
                                  );
                                }}
                                placeholder="Estantería"
                                className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                              />
                              <input
                                type="text"
                                value={item.drawer || ""}
                                onChange={(e) => {
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.product.id === item.product.id
                                        ? { ...i, drawer: e.target.value }
                                        : i
                                    )
                                  );
                                }}
                                placeholder="Cajón/Nivel"
                                className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                              />
                              <input
                                type="text"
                                value={item.section || ""}
                                onChange={(e) => {
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.product.id === item.product.id
                                        ? { ...i, section: e.target.value }
                                        : i
                                    )
                                  );
                                }}
                                placeholder="Sección"
                                className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                              />
                            </div>
                          </div>

                          {/* Notas de Ubicación */}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Notas de Ubicación
                            </label>
                            <textarea
                              value={item.locationNotes || ""}
                              onChange={(e) => {
                                setItems((prev) =>
                                  prev.map((i) =>
                                    i.product.id === item.product.id
                                      ? { ...i, locationNotes: e.target.value }
                                      : i
                                  )
                                );
                              }}
                              maxLength={200}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                              rows={2}
                              placeholder="Ubicación específica o referencias..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Opciones generales */}
          {itemsWithQuantity.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">
                Motivo y Observación General (opcional)
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Se usarán si un producto específico no tiene datos ingresados
              </p>
              <div className="space-y-2">
                <select
                  value={generalReason}
                  onChange={(e) => setGeneralReason(e.target.value)}
                  className="w-full rounded border border-blue-300 px-2 py-1.5 text-xs"
                >
                  <option value="">-- Sin motivo general --</option>
                  {activateReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  maxLength={200}
                  className="w-full rounded border border-blue-300 px-2 py-1.5 text-xs"
                  rows={2}
                  placeholder="Observación general para todos los movimientos"
                />
              </div>
            </div>
          )}
          </div>

          {/* Botones - siempre visible */}
          <div className="border-t border-slate-200 pt-2.5 sm:pt-3 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || itemsWithQuantity.length === 0}
              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : `Guardar ${itemsWithQuantity.length} movimiento(s)`}
            </button>
          </div>
        </form>
        </div>
      </div>

      {/* Scanner Modal - Renderizado fuera del BulkMovementModal para evitar conflictos */}
      {showScanner && (
        <BarcodeScannerModal
          mode="product"
          onClose={() => setShowScanner(false)}
          onSelectProduct={(product) => {
            handleProductScanned(product);
            setShowScanner(false);
          }}
        />
      )}
    </>
  );
}
