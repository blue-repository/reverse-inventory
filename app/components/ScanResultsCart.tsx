"use client";

import { Product } from "@/app/types/product";
import Image from "next/image";

type ScanResultsCartProps = {
  products: Product[];
  onRemove: (productId: string) => void;
  onSelect: (product: Product) => void;
  onClearAll: () => void;
  disabled?: boolean;
};

export default function ScanResultsCart({
  products,
  onRemove,
  onSelect,
  onClearAll,
  disabled = false,
}: ScanResultsCartProps) {
  return (
    <div className="flex flex-col bg-slate-50 rounded-lg border border-slate-200 overflow-hidden h-full max-h-[600px] lg:max-h-96">
      <div className="border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 bg-slate-100">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
            🛒 Carrito ({products.length})
          </h3>
          {products.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              title="Limpiar carrito"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-3 p-3 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-10 w-10 text-slate-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            <p className="text-xs sm:text-sm text-slate-500">
              Escanea productos para agregarlos
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {products.map((product) => (
              <div
                key={product.id}
                className="p-2 sm:p-3 hover:bg-white transition-colors group"
              >
                <div className="flex gap-2 items-start">
                  {product.image_url ? (
                    <div className="relative h-10 w-10 flex-shrink-0 rounded border border-slate-300 overflow-hidden bg-slate-100">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 flex-shrink-0 rounded border border-slate-300 bg-slate-100 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5 text-slate-300"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-6-6.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">
                      {product.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-xs font-semibold ${
                          product.stock > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {product.stock} unid
                      </span>
                      {product.barcode && (
                        <span className="text-xs text-slate-500 font-mono">
                          {product.barcode.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(product.id);
                    }}
                    className="flex-shrink-0 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-4 w-4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(product);
                    }}
                    className="mt-2 w-full rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {products.length > 0 && !disabled && (
        <div className="border-t border-slate-200 p-2 sm:p-3 bg-white">
          <div className="text-xs text-slate-600 mb-2">
            <strong>{products.length}</strong> producto{products.length !== 1 ? "s" : ""} escaneado{products.length !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-slate-500">
            Haz click en "Seleccionar" para usar un producto
          </div>
        </div>
      )}
    </div>
  );
}
