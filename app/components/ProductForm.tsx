"use client";

import { useState } from "react";
import { Product, UNITS_OF_MEASURE } from "@/app/types/product";
import { createProduct, updateProduct } from "@/app/actions/products";

type ProductFormProps = {
  product?: Product;
  onClose: () => void;
};

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = product
      ? await updateProduct(product.id, formData)
      : await createProduct(formData);

    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Error al guardar el producto");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-slate-200 px-4 sm:px-6 py-4 bg-white rounded-t-xl">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {product ? "Editar Producto" : "Nuevo Producto"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                defaultValue={product?.name}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Código de barras */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Código de Barras
              </label>
              <input
                type="text"
                name="barcode"
                defaultValue={product?.barcode || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Stock */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock"
                defaultValue={product?.stock || 0}
                min="0"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Unidad de medida */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unidad de Medida
              </label>
              <select
                name="unit_of_measure"
                defaultValue={product?.unit_of_measure || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="">Seleccionar...</option>
                {UNITS_OF_MEASURE.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Vía de administración */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Vía de Administración
              </label>
              <input
                type="text"
                name="administration_route"
                defaultValue={product?.administration_route || ""}
                placeholder="Ej: Oral, Tópica, IV"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Descripción
              </label>
              <textarea
                name="description"
                defaultValue={product?.description || ""}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Fecha de expedición */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fecha de Expedición
              </label>
              <input
                type="date"
                name="issue_date"
                defaultValue={product?.issue_date || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Fecha de expiración */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fecha de Expiración
              </label>
              <input
                type="date"
                name="expiration_date"
                defaultValue={product?.expiration_date || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* URL de imagen */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                URL de Imagen
              </label>
              <input
                type="url"
                name="image_url"
                defaultValue={product?.image_url || ""}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Notas */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Notas / Observaciones
              </label>
              <textarea
                name="notes"
                defaultValue={product?.notes || ""}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}
