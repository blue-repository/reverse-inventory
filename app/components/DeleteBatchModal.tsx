"use client";

import { useState } from "react";
import { ProductBatch } from "@/app/types/product";
import { deleteBatchWithMovement } from "@/app/actions/products";

type DeleteBatchModalProps = {
  batch: ProductBatch | null;
  productId: string;
  productName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DeleteBatchModal({
  batch,
  productId,
  productName,
  onClose,
  onSuccess,
}: DeleteBatchModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    reason: "Destrucción",
    observations: "",
    recordedBy: "",
  });

  if (!batch) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      alert("El motivo es requerido");
      return;
    }

    setIsLoading(true);

    try {
      const result = await deleteBatchWithMovement(
        batch.id,
        productId,
        batch.stock,
        formData.reason,
        formData.observations,
        formData.recordedBy || "Sistema"
      );

      if (result.success) {
        alert("Lote eliminado y movimiento registrado exitosamente");
        onSuccess();
        onClose();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar el lote");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl max-h-[95vh] overflow-y-auto"
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

        <div className="border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-red-50">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-red-900 pr-8">
            Eliminar Lote
          </h2>
          <p className="text-xs sm:text-sm text-red-700 mt-1">
            Se registrará una salida de inventario
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs sm:text-sm text-slate-600">
              <span className="font-semibold">Producto:</span> {productName}
            </p>
            <p className="text-xs sm:text-sm text-slate-600">
              <span className="font-semibold">Lote:</span> {batch.batch_number}
            </p>
            <p className="text-xs sm:text-sm text-slate-600">
              <span className="font-semibold">Stock:</span> {batch.stock} unidades
            </p>
            <p className="text-xs sm:text-sm text-slate-600">
              <span className="font-semibold">Vencimiento:</span>{" "}
              {new Date(batch.expiration_date).toLocaleDateString("es-EC")}
            </p>
          </div>

          <div>
            <label htmlFor="reason" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
              Motivo de Eliminación *
            </label>
            <select
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Destrucción">Destrucción</option>
              <option value="Donación">Donación</option>
              <option value="Devolución">Devolución</option>
              <option value="Pérdida">Pérdida</option>
              <option value="Daño">Daño</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label htmlFor="observations" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
              Observaciones
            </label>
            <textarea
              id="observations"
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              placeholder="Detalles adicionales sobre la eliminación del lote..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="recordedBy" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
              Registrado Por
            </label>
            <input
              type="text"
              id="recordedBy"
              name="recordedBy"
              value={formData.recordedBy}
              onChange={handleInputChange}
              placeholder="Tu nombre o usuario"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Eliminando...
                </>
              ) : (
                <>
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
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Eliminar Lote
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
