"use client";

import { useState } from "react";
import { Product, MovementType } from "@/app/types/product";
import { ProductDetailDrawer } from "./ProductDetailDrawer";

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

interface WizardStep5Props {
  items: BulkMovementItem[];
  movementType: MovementType;
  generalReason: string;
  generalNotes: string;
  onUpdateItemQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateItemData: (productId: string, data: Partial<BulkMovementItem>) => void;
  itemsWithWarning: Set<string>;
}

export function WizardStep5({
  items,
  movementType,
  generalReason,
  generalNotes,
  onUpdateItemQuantity,
  onRemoveItem,
  onUpdateItemData,
  itemsWithWarning,
}: WizardStep5Props) {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const itemsWithQuantity = items.filter((item) => item.quantity > 0);
  const totalQuantity = itemsWithQuantity.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col space-y-4 p-4 pb-20">
      {/* Resumen */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-indigo-600">{itemsWithQuantity.length}</p>
            <p className="text-xs text-indigo-700">Productos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{totalQuantity}</p>
            <p className="text-xs text-indigo-700">Cantidad Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{items.length}</p>
            <p className="text-xs text-indigo-700">Agregados</p>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Productos</h3>
        
        {items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center">
            <p className="text-xs text-slate-600">No hay productos agregados</p>
            <p className="text-xs text-slate-500 mt-1">Vuelve al paso anterior para agregar</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {items.map((item) => {
              const hasWarning = itemsWithWarning.has(item.product.id);
              const hasQuantity = item.quantity > 0;
              
              return (
                <div
                  key={item.product.id}
                  className={`rounded-lg border p-3 ${
                    hasWarning ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  {/* Nombre y stock */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">{item.product.name}</p>
                      <p className="text-xs text-slate-600">Stock: {item.product.stock}</p>
                    </div>
                    {hasWarning && (
                      <span className="text-red-600 text-lg" title="Problema de stock">⚠️</span>
                    )}
                  </div>

                  {/* Cantidad y acciones */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => onUpdateItemQuantity(item.product.id, parseInt(e.target.value) || 0)}
                      placeholder="Cant."
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingProductId(item.product.id)}
                      className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      title="Editar detalles"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id)}
                      className="w-8 h-8 flex items-center justify-center rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                      title="Eliminar producto"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Mostrar datos rápidos si tiene cantidad */}
                  {hasQuantity && (
                    <div className="text-xs text-slate-600 space-y-1 border-t border-slate-200 pt-2">
                      {item.reason && (
                        <p><span className="font-semibold">Motivo:</span> {item.reason}</p>
                      )}
                      {item.notes && (
                        <p><span className="font-semibold">Nota:</span> {item.notes.substring(0, 40)}...</p>
                      )}
                      {item.batchNumber && (
                        <p><span className="font-semibold">Lote:</span> {item.batchNumber}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Motivo y notas globales */}
      {(generalReason || generalNotes) && (
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-xs">
          <p className="font-semibold text-slate-700 mb-1">Datos globales</p>
          {generalReason && <p><span className="font-semibold">Motivo:</span> {generalReason}</p>}
          {generalNotes && <p><span className="font-semibold">Notas:</span> {generalNotes}</p>}
        </div>
      )}
      </div>

      {/* Drawer para editar detalles */}
      {editingProductId && (
        <ProductDetailDrawer
          item={items.find((item) => item.product.id === editingProductId)!}
          movementType={movementType}
          onClose={() => setEditingProductId(null)}
          onUpdate={(data) => {
            onUpdateItemData(editingProductId, data);
            setEditingProductId(null);
          }}
        />
      )}
    </div>
  );
}
