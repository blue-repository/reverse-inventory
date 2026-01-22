"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Product, MovementType } from "@/app/types/product";
import { recordBulkInventoryMovements, searchProducts } from "@/app/actions/products";
import { useUser } from "@/app/context/UserContext";
import { containsNormalized } from "@/app/lib/search-utils";
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
  salida: ["Entrega de receta", "Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

export default function BulkMovementModal({ products, onClose, onSuccess }: BulkMovementModalProps) {
  const { currentUser } = useUser();
  const [movementType, setMovementType] = useState<MovementType>("salida");
  const [items, setItems] = useState<BulkMovementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Product[]>(products);
  const [isSearching, setIsSearching] = useState(false);
  const [generalReason, setGeneralReason] = useState<string>("");
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [itemsWithWarning, setItemsWithWarning] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filtrar productos basados en búsqueda
  const filteredProducts = searchResults.filter(
    (p) =>
      !items.find((item) => item.product.id === p.id) &&
      (containsNormalized(p.name, searchQuery) ||
        (p.barcode && containsNormalized(p.barcode, searchQuery)))
  );

  // Calcular posición del dropdown
  useEffect(() => {
    if (searchInputRef.current && searchQuery) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 10, // Posicionar encima del input
        left: rect.left,
        width: Math.max(rect.width, 384) // Mínimo 384px (24rem)
      });
    } else {
      setDropdownPosition(null);
    }
  }, [searchQuery, isSearching]);

  // Búsqueda remota cuando se escribe en el buscador
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const term = searchQuery.trim();

    // Con pocos caracteres, mostrar los productos ya cargados (paginados)
    if (term.length < 2) {
      setSearchResults(products);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await searchProducts(term, 1, 50);
        setSearchResults(data || []);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, products]);

  // Validar items cuando cambia el tipo de movimiento
  const validateItemsForMovementType = (type: MovementType, currentItems: BulkMovementItem[]) => {
    const warnings = new Set<string>();
    
    if (type === "salida") {
      // En salida, no se puede vender productos sin stock
      currentItems.forEach((item) => {
        // Producto sin stock
        if (item.product.stock === 0) {
          warnings.add(item.product.id);
        }
        // Cantidad mayor al stock disponible
        else if (item.quantity > item.product.stock) {
          warnings.add(item.product.id);
        }
      });
    }
    
    setItemsWithWarning(warnings);
    return warnings;
  };

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
    
    // Revalidar advertencias después de cambiar cantidad
    if (movementType === "salida") {
      validateItemsForMovementType(movementType, items);
    }
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

    // Validar que no haya items con advertencia
    if (itemsWithWarning.size > 0) {
      setError("Hay productos con problemas de stock. Por favor remuevalos o cambie el tipo de movimiento.");
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

  const itemsWithQuantity = items.filter((item) => item.quantity > 0);

  // Detectar clics fuera del modal (solo si no hay scanner abierto)
  useEffect(() => {
    if (showScanner) return; // No cerrar si el scanner está abierto
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Si hay dropdown abierto y se hace clic fuera de él, cerrarlo
      if (dropdownRef.current && !dropdownRef.current.contains(target) && searchQuery) {
        setSearchQuery("");
        return;
      }
      
      // Si se hace clic fuera del modal Y fuera del dropdown, cerrar el modal
      if (
        modalRef.current && 
        !modalRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC para cerrar el dropdown primero
      if (event.key === "Escape" && searchQuery) {
        setSearchQuery("");
        return;
      }
      // ESC para cerrar el modal
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, showScanner, searchQuery]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
        <div
          ref={modalRef}
          className="w-full max-w-7xl max-h-[95vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
        >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-5 bg-white">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Movimiento de Inventario</h2>
          </div>

          {/* Contenido en dos columnas */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 p-3 sm:p-6 bg-slate-50">
          
          {error && (
            <div className="col-span-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          {/* COLUMNA IZQUIERDA - CONFIGURACIÓN */}
          <div className="md:col-span-1 overflow-y-auto overflow-x-visible space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Configuración</h3>

              {/* Tipo de movimiento */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2.5">
                  Tipo de movimiento
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(["entrada", "salida", "ajuste"] as const).map((type) => (
                    <label key={type} className="cursor-pointer">
                      <input
                        type="radio"
                        name="movementType"
                        value={type}
                        checked={movementType === type}
                        onChange={(e) => {
                          const newType = e.target.value as MovementType;
                          setMovementType(newType);
                          validateItemsForMovementType(newType, items);
                        }}
                        className="hidden"
                      />
                      <span
                        className={`inline-block px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border-2 transition-all ${
                          movementType === type
                            ? "bg-indigo-100 text-indigo-700 border-indigo-500"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {type === "entrada" ? "📥 Entrada" : type === "salida" ? "📤 Salida" : "⚙️ Ajuste"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Búsqueda y escaneo */}
              <div className="relative">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2.5">
                  Buscar producto
                </label>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nombre o código de barras"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Dropdown de resultados renderizado en Portal */}
              </div>

              {/* Botón escanear */}
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4.5h14.25M3 9h14.25M3 13.5h14.25M17.6 2.5a2.4 2.4 0 1 1 4.8 0 2.4 2.4 0 0 1-4.8 0ZM3 21.75a6.75 6.75 0 0 1 13.5 0"
                  />
                </svg>
                Escanear código
              </button>

              {/* Motivo general */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                  Motivo general
                </label>
                <select
                  value={generalReason}
                  onChange={(e) => setGeneralReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                >
                  <option value="">— Sin motivo general —</option>
                  {MOVEMENT_REASONS[movementType].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observación general */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                  Observación general
                </label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  maxLength={200}
                  placeholder="Aplica a todos los productos"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                />
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA - PRODUCTOS SELECCIONADOS */}
          <div className="md:col-span-3 flex flex-col bg-white rounded-xl border border-slate-200 min-h-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Productos seleccionados ({items.length})
              </h3>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 300px)' }}>

              {items.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-8 w-8 mx-auto text-slate-400 mb-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H2.25c-.621 0-1.125.504-1.125 1.125v1.625c0 .621.504 1.125 1.125 1.125z"
                    />
                  </svg>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Busca o escanea productos para agregarlos
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const hasWarning = itemsWithWarning.has(item.product.id);
                    const warningMessage = 
                      item.product.stock === 0 
                        ? "No se puede vender: Stock = 0"
                        : item.quantity > item.product.stock
                        ? `No se puede vender: Cantidad (${item.quantity}) > Stock (${item.product.stock})`
                        : null;
                    
                    return (
                    <div
                      key={item.product.id}
                      className={`rounded-lg border p-3.5 space-y-3 ${
                        hasWarning
                          ? "border-red-300 bg-red-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      {/* Header del producto */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${hasWarning ? "text-red-900" : "text-slate-900"}`}>
                            {item.product.name}
                          </p>
                          <p className={`text-xs mt-0.5 ${hasWarning ? "text-red-700" : "text-slate-600"}`}>
                            Stock actual: {item.product.stock}
                          </p>
                          {hasWarning && warningMessage && (
                            <p className="text-xs font-semibold text-red-600 mt-1">⚠️ {warningMessage}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors whitespace-nowrap"
                        >
                          Quitar
                        </button>
                      </div>

                      {/* Cantidad y motivo específico */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={movementType === "salida" ? item.product.stock : undefined}
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.product.id, parseInt(e.target.value) || 0)}
                            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Motivo
                          </label>
                          <select
                            value={item.reason}
                            onChange={(e) => updateItemReason(item.product.id, e.target.value)}
                            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">— Motivo —</option>
                            {MOVEMENT_REASONS[movementType].map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Observación específica */}
                      {item.quantity > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Observación específica
                          </label>
                          <textarea
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                            maxLength={100}
                            rows={2}
                            placeholder="Observación para este producto"
                            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {/* Campos de lote para entradas */}
                      {movementType === "entrada" && item.quantity > 0 && (
                        <div className="border-t border-slate-200 pt-3 space-y-3 bg-emerald-50 -m-3.5 p-3.5 rounded">
                          <p className="text-xs font-semibold text-emerald-900">📦 Datos del Lote</p>

                          {/* Número de Lote */}
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
                              placeholder="Número de lote"
                              className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => generateBatchNumber(item.product.id)}
                              className="rounded bg-blue-600 text-white px-2.5 py-1.5 text-xs font-medium hover:bg-blue-700 whitespace-nowrap"
                            >
                              Gen.
                            </button>
                          </div>

                          {/* Fechas */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Expedición</label>
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
                                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                                Vencimiento <span className="text-red-600">*</span>
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
                                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Ubicación */}
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">Ubicación</label>
                            <div className="grid grid-cols-3 gap-1.5">
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
                                placeholder="Est."
                                className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                placeholder="Nivel"
                                className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                placeholder="Secc."
                                className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
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

          {/* Footer */}
          <div className="border-t border-slate-200 px-4 sm:px-8 py-3.5 sm:py-4 flex justify-between gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || itemsWithQuantity.length === 0}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting
                ? "Guardando..."
                : `Guardar movimiento${itemsWithQuantity.length > 1 ? `s (${itemsWithQuantity.length})` : ""}`}
            </button>
          </div>
        </form>
        </div>
      </div>

      {/* Scanner Modal */}
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

      {/* Dropdown de resultados en Portal */}
      {mounted && dropdownPosition && searchQuery && createPortal(
        <>
          {!isSearching && filteredProducts.length > 0 && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                transform: 'translateY(-100%)',
                zIndex: 9999
              }}
              className="bg-white border border-slate-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
            >
              {filteredProducts.slice(0, 10).map((product) => {
                const isDisabled = movementType === "salida" && product.stock === 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      !isDisabled && addProduct(product);
                    }}
                    disabled={isDisabled}
                    className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-100 last:border-b-0 ${
                      isDisabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "hover:bg-indigo-50 cursor-pointer transition-colors"
                    }`}
                  >
                    <p className="font-medium text-slate-900 mb-0.5">{product.name}</p>
                    <p className="text-xs text-slate-600">Stock: {product.stock} | {product.barcode || "N/A"}</p>
                  </button>
                );
              })}
            </div>
          )}
          {isSearching && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                transform: 'translateY(-100%)',
                zIndex: 9999
              }}
              className="bg-white border border-slate-300 rounded-lg shadow-2xl p-3"
            >
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                Buscando...
              </p>
            </div>
          )}
          {!isSearching && filteredProducts.length === 0 && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                transform: 'translateY(-100%)',
                zIndex: 9999
              }}
              className="bg-white border border-slate-300 rounded-lg shadow-2xl p-3"
            >
              <p className="text-xs text-slate-600">No hay productos</p>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}
