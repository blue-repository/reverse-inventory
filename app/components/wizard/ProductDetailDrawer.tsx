"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { MovementType, Product } from "@/app/types/product";

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Entrega de receta", "Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

interface BulkMovementItem {
  product: Product;
  quantity: number;
  reason: string;
  notes: string;
  useIndividualReason: boolean;
  batchNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  shelf?: string;
  drawer?: string;
  section?: string;
  locationNotes?: string;
  recipeDate?: string;
  recipeCode?: string;
  patientName?: string;
  prescribedBy?: string;
  cieCode?: string;
  recipeNotes?: string;
}

interface ProductDetailDrawerProps {
  item: BulkMovementItem;
  movementType: MovementType;
  onClose: () => void;
  onUpdate: (data: Partial<BulkMovementItem>) => void;
}

export function ProductDetailDrawer({
  item,
  movementType,
  onClose,
  onUpdate,
}: ProductDetailDrawerProps) {
  const [localData, setLocalData] = useState<Partial<BulkMovementItem>>(item);

  const handleSave = () => {
    onUpdate(localData);
  };

  const content = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      {/* Drawer / Modal */}
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 px-4 py-3 flex items-center justify-between bg-indigo-50">
          <h3 className="font-bold text-slate-900">Detalles: {item.product.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {/* Cantidad */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Cantidad</label>
            <input
              type="number"
              min="0"
              value={localData.quantity}
              onChange={(e) => setLocalData({ ...localData, quantity: parseInt(e.target.value) || 0 })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Motivo individual */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo individual</label>
            <select
              value={localData.reason || ""}
              onChange={(e) => setLocalData({ ...localData, reason: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">— Sin motivo específico —</option>
              {MOVEMENT_REASONS[movementType].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notas del producto</label>
            <textarea
              value={localData.notes || ""}
              onChange={(e) => setLocalData({ ...localData, notes: e.target.value })}
              placeholder="Observaciones específicas..."
              rows={2}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Sección de Lote (solo para entrada) */}
          {movementType === "entrada" && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-700 uppercase">📦 Datos de Lote Individual</p>

              <input
                type="text"
                value={localData.batchNumber || ""}
                onChange={(e) => setLocalData({ ...localData, batchNumber: e.target.value })}
                placeholder="Número de lote"
                className="w-full rounded border border-amber-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={localData.issueDate || ""}
                  onChange={(e) => setLocalData({ ...localData, issueDate: e.target.value })}
                  className="rounded border border-amber-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={localData.expirationDate || ""}
                  onChange={(e) => setLocalData({ ...localData, expirationDate: e.target.value })}
                  className="rounded border border-amber-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={localData.shelf || ""}
                  onChange={(e) => setLocalData({ ...localData, shelf: e.target.value })}
                  placeholder="Estantería"
                  className="rounded border border-amber-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={localData.drawer || ""}
                  onChange={(e) => setLocalData({ ...localData, drawer: e.target.value })}
                  placeholder="Cajón"
                  className="rounded border border-amber-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={localData.section || ""}
                  onChange={(e) => setLocalData({ ...localData, section: e.target.value })}
                  placeholder="Sección"
                  className="rounded border border-amber-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <textarea
                value={localData.locationNotes || ""}
                onChange={(e) => setLocalData({ ...localData, locationNotes: e.target.value })}
                placeholder="Notas de ubicación"
                rows={2}
                className="w-full rounded border border-amber-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {/* Sección de Receta (para salida con "Entrega de receta") */}
          {movementType === "salida" && localData.reason === "Entrega de receta" && (
            <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
              <p className="text-xs font-semibold text-purple-700 uppercase">💊 Datos de Receta Médica</p>

              <input
                type="text"
                value={localData.recipeCode || ""}
                onChange={(e) => setLocalData({ ...localData, recipeCode: e.target.value })}
                placeholder="Código de receta"
                maxLength={50}
                className="w-full rounded border border-purple-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />

              <input
                type="date"
                value={localData.recipeDate || ""}
                onChange={(e) => setLocalData({ ...localData, recipeDate: e.target.value })}
                className="w-full rounded border border-purple-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />

              <input
                type="text"
                value={localData.patientName || ""}
                onChange={(e) => setLocalData({ ...localData, patientName: e.target.value })}
                placeholder="Nombre del paciente"
                className="w-full rounded border border-purple-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />

              <input
                type="text"
                value={localData.prescribedBy || ""}
                onChange={(e) => setLocalData({ ...localData, prescribedBy: e.target.value })}
                placeholder="Médico prescriptor"
                className="w-full rounded border border-purple-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />

              <input
                type="text"
                value={localData.cieCode || ""}
                onChange={(e) => setLocalData({ ...localData, cieCode: e.target.value })}
                placeholder="Código CIE"
                className="w-full rounded border border-purple-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />

              <textarea
                value={localData.recipeNotes || ""}
                onChange={(e) => setLocalData({ ...localData, recipeNotes: e.target.value })}
                placeholder="Notas de la receta"
                rows={2}
                className="w-full rounded border border-purple-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3 bg-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
