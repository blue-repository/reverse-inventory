"use client";

import { useState } from "react";
import { Product, MovementType } from "@/app/types/product";
import { recordInventoryMovement, createBatch } from "@/app/actions/products";
import { useUser } from "@/app/context/UserContext";

type InventoryMovementModalProps = {
  product: Product;
  onClose: () => void;
  onSuccess?: () => void;
};

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Entrega de receta", "Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

export default function InventoryMovementModal({
  product,
  onClose,
  onSuccess,
}: InventoryMovementModalProps) {
  const { currentUser } = useUser();
  const [movementType, setMovementType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Campos para lotes (entrada)
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [shelf, setShelf] = useState<string>("");
  const [drawer, setDrawer] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [locationNotes, setLocationNotes] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBatchNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    setBatchNumber(`LOTE-${dateStr}-${random}`);
  };

  const reasons = MOVEMENT_REASONS[movementType];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(quantity);
    if (!quantity || qty <= 0) {
      setError("Ingresa una cantidad válida mayor a 0");
      return;
    }

    // Validar que hay suficiente stock para salidas
    if (movementType === "salida" && product.stock < qty) {
      setError(`Stock insuficiente. Disponible: ${product.stock}`);
      return;
    }

    // Validaciones para entrada (lote)
    if (movementType === "entrada") {
      if (!batchNumber.trim()) {
        setError("Genera o ingresa el número de lote");
        return;
      }
      if (!expirationDate) {
        setError("Ingresa la fecha de vencimiento");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Si es entrada, crear el lote primero
      if (movementType === "entrada") {
        const formData = new FormData();
        formData.append("batch_number", batchNumber);
        formData.append("stock", quantity);
        formData.append("issue_date", issueDate);
        formData.append("expiration_date", expirationDate);
        formData.append("shelf", shelf);
        formData.append("drawer", drawer);
        formData.append("section", section);
        formData.append("location_notes", locationNotes);

        const batchResult = await createBatch(
          product.id,
          formData,
          currentUser || undefined
        );

        if (!batchResult.success) {
          throw new Error(batchResult.error || "Error al crear el lote");
        }
      } else {
        // Para salidas y ajustes, registrar movimiento normal
        const result = await recordInventoryMovement(
          product.id as string,
          movementType,
          qty,
          reason || undefined,
          notes || undefined,
          currentUser || undefined
        );

        if (!result.success) {
          throw new Error(result.error || "Error al registrar el movimiento");
        }
      }

      // Limpiar formulario
      setQuantity("");
      setReason("");
      setNotes("");
      setBatchNumber("");
      setIssueDate("");
      setExpirationDate("");
      setShelf("");
      setDrawer("");
      setSection("");
      setLocationNotes("");
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
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

  const getTypeLabel = (type: MovementType) => {
    switch (type) {
      case "entrada":
        return "Entrada de Stock";
      case "salida":
        return "Salida de Stock";
      case "ajuste":
        return "Ajuste de Inventario";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl my-2 sm:my-4 max-h-[95vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
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

        <div className="border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Registrar Movimiento
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600">{product.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {(["entrada", "salida", "ajuste"] as MovementType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setMovementType(type);
                  setReason("");
                }}
                className={`rounded-lg border-2 px-2 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
                  movementType === type
                    ? getTypeColor(type) + " border-current"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
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
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              required
            />
          </div>

          {/* Campos específicos para ENTRADA (Lote) */}
          {movementType === "entrada" && (
            <>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold text-emerald-900 mb-2">Datos del Lote</p>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                      Número de Lote
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="Generar o ingresar..."
                        className="flex-1 rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <button
                        type="button"
                        onClick={generateBatchNumber}
                        className="rounded-lg bg-blue-600 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                        title="Generar número de lote automático"
                      >
                        Generar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div>
                      <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                        Fecha de Expedición
                      </label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                        Fecha de Vencimiento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Ubicación del Lote</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600">Estantería</label>
                        <input
                          type="text"
                          value={shelf}
                          onChange={(e) => setShelf(e.target.value)}
                          placeholder="A, B, C..."
                          className="w-full rounded-lg border border-slate-300 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600">Cajón/Nivel</label>
                        <input
                          type="text"
                          value={drawer}
                          onChange={(e) => setDrawer(e.target.value)}
                          placeholder="1, 2, 3..."
                          className="w-full rounded-lg border border-slate-300 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600">Sección</label>
                        <input
                          type="text"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          placeholder="Izq, Der, Cen..."
                          className="w-full rounded-lg border border-slate-300 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                        Notas de Ubicación
                      </label>
                      <textarea
                        value={locationNotes}
                        onChange={(e) => setLocationNotes(e.target.value)}
                        placeholder="Ubicación específica o referencias..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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

              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Notas (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </>
          )}

          {/* Para SALIDA y AJUSTE */}
          {movementType !== "entrada" && (
            <>
              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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

              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Notas (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Referencia de documento, observaciones..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-600">Stock Inicial</p>
                <p className="font-semibold text-slate-900">{product.stock_inicial} unidades</p>
              </div>
              <div>
                <p className="text-slate-600">Stock Actual</p>
                <p className="font-semibold text-slate-900">{product.stock} unidades</p>
              </div>
            </div>
          </div>

          {/* Información sobre lotes para entradas y salidas */}
          {(movementType === "entrada" || movementType === "salida") && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 sm:p-3 text-xs sm:text-sm">
              {movementType === "entrada" ? (
                <div>
                  <p className="font-semibold text-blue-900 mb-2">📦 Crear nuevo lote</p>
                  <p className="text-blue-700">Este ingreso creará un nuevo lote con los datos especificados arriba. El número de lote se generará automáticamente si lo dejas en blanco.</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-blue-900 mb-2">📤 Salida de inventario</p>
                  <p className="text-blue-700">El sistema utilizará el método FEFO (First Expired, First Out). Se utilizarán primero los lotes que vencen antes.</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto border-t border-slate-200 pt-2.5 sm:pt-3 flex flex-col-reverse sm:flex-row gap-2 justify-end">
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
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting 
                ? "Procesando..." 
                : movementType === "entrada" 
                  ? "Crear Lote" 
                  : "Registrar Movimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
