"use client";

import { useState } from "react";
import Image from "next/image";
import { Product, UNITS_OF_MEASURE } from "@/app/types/product";
import { updateProduct } from "@/app/actions/products";

type ProductDetailsModalProps = {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
};

export default function ProductDetailsModal({
  product,
  onClose,
  onEdit,
}: ProductDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-EC");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateProduct(product.id as string, formData);

    setIsSubmitting(false);

    if (result.success) {
      setIsEditing(false);
      onClose();
    } else {
      setError(result.error || "Error al guardar el producto");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-2 top-2 z-10 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {!isEditing ? (
            <>
              <div className="border-b border-slate-200 px-4 sm:px-6 py-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {product.name}
                </h2>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {/* Imagen */}
                {product.image_url ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <div className="relative h-64 sm:h-80 w-full">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 448px"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-100 h-64 sm:h-80 flex items-center justify-center">
                    <div className="text-center">
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
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"
                        />
                      </svg>
                      <p className="text-slate-500 text-sm">Sin imagen disponible</p>
                    </div>
                  </div>
                )}

                {/* Información del producto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Código de Barras
                    </p>
                    <p className="mt-1 text-slate-900 font-medium">
                      {product.barcode || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Stock
                    </p>
                    <p className="mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          product.stock > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {product.stock} unidades
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Unidad de Medida
                    </p>
                    <p className="mt-1 text-slate-900 font-medium">
                      {product.unit_of_measure || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Vía de Administración
                    </p>
                    <p className="mt-1 text-slate-900 font-medium">
                      {product.administration_route || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Fecha de Expedición
                    </p>
                    <p className="mt-1 text-slate-900 font-medium">
                      {formatDate(product.issue_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Fecha de Expiración
                    </p>
                    <p className="mt-1 text-slate-900 font-medium">
                      {formatDate(product.expiration_date)}
                    </p>
                  </div>
                </div>

                {product.description && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Descripción
                    </p>
                    <p className="mt-2 text-slate-700 whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                )}

                {product.notes && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Notas
                    </p>
                    <p className="mt-2 text-slate-700 whitespace-pre-wrap">
                      {product.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-200 p-4 sm:p-6">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
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
            </>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 sm:px-6 py-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Editar Producto
                </h2>
              </div>

              <button
                onClick={() => setIsEditing(false)}
                className="absolute left-2 top-2 z-10 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-700 transition-colors"
                aria-label="Atrás"
                title="Volver"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
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
                  <div className="sm:col-span-2">
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
                  <div className="sm:col-span-2">
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
                  <div className="sm:col-span-2">
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
                    onClick={() => setIsEditing(false)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
