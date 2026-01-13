"use client";

import { useState } from "react";
import { Product, MovementType } from "@/app/types/product";
import { recordInventoryMovement } from "@/app/actions/products";

type InventoryMovementModalProps = {
  product: Product;
  onClose: () => void;
  onSuccess?: () => void;
};

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

export default function InventoryMovementModal({
  product,
  onClose,
  onSuccess,
}: InventoryMovementModalProps) {
  const [movementType, setMovementType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = MOVEMENT_REASONS[movementType];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!quantity || parseInt(quantity) <= 0) {
      setError("Ingresa una cantidad válida mayor a 0");
      return;
    }

    setIsSubmitting(true);

    const result = await recordInventoryMovement(
      product.id as string,
      movementType,
      parseInt(quantity),
      reason || undefined,
      notes || undefined
    );

    setIsSubmitting(false);

    if (result.success) {
      setQuantity("");
      setReason("");
      setNotes("");
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
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl my-4 sm:my-8"
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
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
            Registrar Movimiento
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">{product.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(["entrada", "salida", "ajuste"] as MovementType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setMovementType(type);
                  setReason("");
                }}
                className={`rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all ${
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
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Registrar Movimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
