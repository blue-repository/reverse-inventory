"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Product, ProductBatch } from "@/app/types/product";
import { getProductBatches, getProduct } from "@/app/actions/products";
import InventoryMovementModal from "./InventoryMovementModal";
import InventoryHistoryModal from "./InventoryHistoryModal";
import BatchesModal from "./BatchesModal";

type ProductDetailsModalProps = {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
  highlightedBatchId?: string | null;
};

export default function ProductDetailsModal({
  product,
  onClose,
  onEdit,
  highlightedBatchId,
}: ProductDetailsModalProps) {
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentProduct, setCurrentProduct] = useState<Product>(product);

  const loadBatches = async () => {
    setLoadingBatches(true);
    const result = await getProductBatches(product.id);
    setBatches(result.data);
    setLoadingBatches(false);
  };

  useEffect(() => {
    loadBatches();
  }, [product.id, refreshKey]);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product.id, product]);

  // Abrira automáticamente el modal de batches si hay un highlightedBatchId
  useEffect(() => {
    if (highlightedBatchId) {
      setShowBatchesModal(true);
    }
  }, [highlightedBatchId]);

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !showMovementModal && !showHistoryModal && !showBatchesModal) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, showMovementModal, showHistoryModal, showBatchesModal]);

  const refreshProduct = async () => {
    try {
      const { data } = await getProduct(product.id);
      if (data) {
        setCurrentProduct(data);
      }
    } catch (e) {
      // Silenciar errores de refresco en UI
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-EC");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl my-4 sm:my-8 max-h-[95vh] overflow-y-auto"
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
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 pr-8">
                {currentProduct.name}
              </h2>
            </div>

            <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-3 sm:gap-4 items-start">
                {currentProduct.image_url ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <div className="relative h-44 sm:h-52 md:h-56 w-full">
                      <Image
                        src={currentProduct.image_url}
                        alt={currentProduct.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 220px"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-100 h-44 sm:h-52 md:h-56 flex items-center justify-center">
                    <div className="text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-slate-400 mb-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"
                        />
                      </svg>
                      <p className="text-slate-500 text-xs sm:text-sm">Sin imagen disponible</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Código de Barras</p>
                  <p className="mt-1 text-sm sm:text-base text-slate-900 font-medium">{currentProduct.barcode || "—"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {currentProduct.category && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                      {currentProduct.category}
                    </span>
                  )}
                  {currentProduct.specialty && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      {currentProduct.specialty}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock Inicial</p>
                  <p className="mt-1 text-sm sm:text-base text-slate-900 font-medium">{currentProduct.stock_inicial} unidades</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock Actual</p>
                  <p className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold ${
                        currentProduct.stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {currentProduct.stock} unidades
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unidad de Medida</p>
                  <p className="mt-1 text-sm sm:text-base text-slate-900 font-medium">{currentProduct.unit_of_measure || "—"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unidad de Reporte</p>
                  <p className="mt-1 text-sm sm:text-base text-slate-900 font-medium">{currentProduct.reporting_unit || "—"}</p>
                </div>

                {currentProduct.category === "Medicamentos" && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vía de Administración</p>
                    <p className="mt-1 text-sm sm:text-base text-slate-900 font-medium">{currentProduct.administration_route || "—"}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha de Expedición</p>
                  <p className="mt-1 text-sm sm:text-base text-slate-900 font-medium">{formatDate(currentProduct.issue_date)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha de Expiración</p>
                  <p className="mt-1 text-sm sm:text-base text-slate-900 font-medium">{formatDate(currentProduct.expiration_date)}</p>
                </div>
                </div>
              </div>

              {/* Sección de Lotes */}
              <div className="pt-3 sm:pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Lotes ({batches.length})
                  </p>
                  <button
                    onClick={() => setShowBatchesModal(true)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6h9m-9-12h9" />
                    </svg>
                    Ver todos
                  </button>
                </div>

                {loadingBatches ? (
                  <div className="text-center py-4 text-slate-500">Cargando lotes...</div>
                ) : (() => {
                  // Mostrar lotes vencidos, si no hay, mostrar el próximo por vencer
                  const today = new Date();
                  
                  // Filtrar lotes activos y calcular días hasta vencimiento
                  const activeBatchesWithDays = batches
                    .filter((batch) => batch.is_active && batch.stock > 0)
                    .map((batch) => {
                      const expDate = new Date(batch.expiration_date);
                      const daysUntil = Math.floor(
                        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return { batch, daysUntil };
                    });

                  // Primero buscar lotes vencidos
                  let selectedBatchWithDays = activeBatchesWithDays.find((bd) => bd.daysUntil < 0);
                  
                  // Si no hay vencidos, buscar el próximo por vencer
                  if (!selectedBatchWithDays) {
                    selectedBatchWithDays = activeBatchesWithDays
                      .filter((bd) => bd.daysUntil >= 0)
                      .sort((a, b) => a.daysUntil - b.daysUntil)[0];
                  }

                  if (!selectedBatchWithDays) {
                    return null; // No mostrar nada si no hay lotes
                  }

                  const { batch: displayBatch, daysUntil } = selectedBatchWithDays;

                  let statusColor = "bg-green-50 border-green-200 text-green-700";
                  let statusLabel = "Normal";
                  if (daysUntil < 0) {
                    statusColor = "bg-red-50 border-red-200 text-red-700";
                    statusLabel = "Vencido";
                  } else if (daysUntil <= 30) {
                    statusColor = "bg-red-50 border-red-200 text-red-700";
                    statusLabel = "Crítico";
                  } else if (daysUntil <= 90) {
                    statusColor = "bg-yellow-50 border-yellow-200 text-yellow-700";
                    statusLabel = "Por Vencer";
                  }

                  return (
                    <div className={`border rounded-lg p-2 sm:p-3 ${statusColor}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs sm:text-sm">{displayBatch.batch_number}</span>
                        <span className="text-xs sm:text-sm font-semibold">{displayBatch.stock} unidades</span>
                      </div>
                      <div className="text-[11px] sm:text-xs">
                        {statusLabel}: {formatDate(displayBatch.expiration_date)} ({daysUntil} día{Math.abs(daysUntil) !== 1 ? 's' : ''})
                      </div>
                    </div>
                  );
                })()}
              </div>
              

              {product.description && (
                <div className="pt-3 sm:pt-4 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Descripción
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              )}

              {product.notes && (
                <div className="pt-3 sm:pt-4 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Notas
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                    {product.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-200 p-3 sm:p-4 md:p-6">
              <button
                onClick={onClose}
                className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-700"
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
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                Historial
              </button>
              <button
                onClick={() => setShowMovementModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
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
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
                Movimiento
              </button>
              <button
                onClick={() => {
                  onEdit(product);
                  onClose();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-800"
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                Editar
              </button>
            </div>

            {showMovementModal && (
              <InventoryMovementModal
                product={currentProduct}
                onClose={() => setShowMovementModal(false)}
                onSuccess={async () => {
                  setShowMovementModal(false);
                  await refreshProduct();
                  setRefreshKey((prev) => prev + 1);
                }}
              />
            )}

            {showHistoryModal && (
              <InventoryHistoryModal
                product={product}
                onClose={() => setShowHistoryModal(false)}
              />
            )}

            {showBatchesModal && (
              <BatchesModal
                productId={product.id}
                productName={product.name}
                productCategory={product.category}
                batches={batches}
                onClose={() => setShowBatchesModal(false)}
                onRefresh={async () => {
                  const result = await getProductBatches(product.id);
                  setBatches(result.data);
                }}
                highlightedBatchId={highlightedBatchId}
              />
            )}
          </div>
        </div>
      );
    }
