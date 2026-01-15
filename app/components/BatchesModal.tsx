"use client";

import { useState } from "react";
import { ProductBatch } from "@/app/types/product";
import { deleteBatch } from "@/app/actions/products";
import DeleteBatchModal from "./DeleteBatchModal";

type BatchesModalProps = {
  productId: string;
  productName: string;
  productCategory?: string | null;
  batches: ProductBatch[];
  onClose: () => void;
  onRefresh: () => void;
};

export default function BatchesModal({
  productId,
  productName,
  productCategory,
  batches,
  onClose,
  onRefresh,
}: BatchesModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedBatchForDelete, setSelectedBatchForDelete] = useState<ProductBatch | null>(null);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-EC");
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diff = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getExpirationStatus = (expirationDate: string) => {
    const days = getDaysUntilExpiration(expirationDate);
    if (days < 0) return { label: "Vencido", color: "bg-red-100 text-red-800" };
    if (days <= 7) return { label: "Crítico", color: "bg-red-100 text-red-800" };
    if (days <= 15) return { label: "Alerta", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Normal", color: "bg-green-100 text-green-800" };
  };

  const handleDelete = async (batchId: string, batch: ProductBatch) => {
    setSelectedBatchForDelete(batch);
  };

  const activeBatches = batches
    .filter((b) => b.is_active)
    .sort((a, b) => {
      // Ordenar por días hasta vencimiento (vencidos primero, luego críticos, alertas, normales)
      const daysA = getDaysUntilExpiration(a.expiration_date);
      const daysB = getDaysUntilExpiration(b.expiration_date);
      return daysA - daysB;
    });
  const inactiveBatches = batches.filter((b) => !b.is_active);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl my-4 sm:my-8 max-h-[95vh] overflow-y-auto"
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

        <div className="border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 pr-8">
              Lotes - {productName}
            </h2>
            {productCategory && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 w-fit">
                {productCategory}
              </span>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 space-y-6">
          {activeBatches.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-12 w-12 mx-auto text-slate-400 mb-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.5v2.25m3-6v6m3-6v2.25m-13.5 0h13.5"
                />
              </svg>
              <p className="text-slate-600 text-sm">No hay lotes activos para este producto</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-slate-700">
                      Número Lote
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-slate-700">
                      Stock
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-slate-700">
                      Vencimiento
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-slate-700">
                      Estado
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-slate-700 hidden md:table-cell">
                      Ubicación
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-slate-700 w-1 whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeBatches.map((batch) => {
                    const status = getExpirationStatus(batch.expiration_date);
                    const daysUntil = getDaysUntilExpiration(batch.expiration_date);

                    return (
                      <tr key={batch.id} className="odd:bg-white even:bg-slate-50 hover:bg-slate-100">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-slate-900">
                          {batch.batch_number}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className="inline-flex items-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold bg-blue-100 text-blue-800">
                            {batch.stock} unidades
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700">
                          <div className="text-xs sm:text-sm">{formatDate(batch.expiration_date)}</div>
                          <div className="text-[11px] text-slate-500">
                            {daysUntil < 0
                              ? `Vencido hace ${Math.abs(daysUntil)} días`
                              : `Faltan ${daysUntil} días`}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700 hidden md:table-cell text-xs">
                          <div>
                            {batch.shelf && <div>Est: {batch.shelf}</div>}
                            {batch.drawer && <div>Cajón: {batch.drawer}</div>}
                            {batch.section && <div>Secc: {batch.section}</div>}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex gap-1">
                            <button
                              title="Ver detalles"
                              className="rounded-lg border border-slate-300 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
                              onClick={() => handleDelete(batch.id, batch)}
                              disabled={deletingId === batch.id}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Lotes inactivos */}
          {inactiveBatches.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <details className="group">
                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 py-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4 transition-transform group-open:rotate-90"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5L15.75 12l-7.5 7.5" />
                  </svg>
                  Lotes inactivos ({inactiveBatches.length})
                </summary>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm min-w-[640px] opacity-60">
                    <tbody className="divide-y divide-slate-200">
                      {inactiveBatches.map((batch) => (
                        <tr key={batch.id} className="odd:bg-white even:bg-slate-50">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-600">
                            {batch.batch_number}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-600">
                            {batch.stock} unidades
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-600">
                            {formatDate(batch.expiration_date)}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <span className="inline-flex items-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold bg-slate-100 text-slate-600">
                              Inactivo
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}

          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {activeBatches.reduce((sum, b) => sum + b.stock, 0)}
              </div>
              <div className="text-xs text-blue-700">Stock Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{activeBatches.length}</div>
              <div className="text-xs text-green-700">Lotes Activos</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {activeBatches.filter((b) => {
                  const days = getDaysUntilExpiration(b.expiration_date);
                  return days >= 0 && days <= 15;
                }).length}
              </div>
              <div className="text-xs text-yellow-700">Por Vencer</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">
                {activeBatches.filter((b) => getDaysUntilExpiration(b.expiration_date) < 0).length}
              </div>
              <div className="text-xs text-red-700">Vencidos</div>
            </div>
          </div>
        </div>

        <DeleteBatchModal
          batch={selectedBatchForDelete}
          productId={productId}
          productName={productName}
          onClose={() => setSelectedBatchForDelete(null)}
          onSuccess={() => {
            setSelectedBatchForDelete(null);
            onRefresh();
          }}
        />
      </div>
    </div>
  );
}
