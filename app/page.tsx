import { Suspense } from "react";
import { supabase } from "@/app/lib/conections/supabase";
import { Product } from "@/app/types/product";
import ProductsTable from "@/app/components/ProductsTable";
import { ThemeWrapper } from "@/app/components/ThemeWrapper";
import { searchProducts, getAllCategoriesAndSpecialties } from "@/app/actions/products";

async function ProductsContent({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
    category?: string;
    specialty?: string;
    stockMin?: string;
    stockMax?: string;
    expirationFrom?: string;
    expirationTo?: string;
    hasImage?: string;
    hasBarcode?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "20");

  // Construir objeto de filtros
  const filters = {
    category: params.category,
    specialty: params.specialty,
    stockMin: params.stockMin ? parseInt(params.stockMin) : undefined,
    stockMax: params.stockMax ? parseInt(params.stockMax) : undefined,
    expirationDateFrom: params.expirationFrom,
    expirationDateTo: params.expirationTo,
    hasImage: params.hasImage === "true",
    hasBarcode: params.hasBarcode === "true",
  };

  const { data: products, count, error } = await searchProducts(query, page, pageSize, filters);
  const { categories, specialties } = await getAllCategoriesAndSpecialties();

  return (
    <>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          Error: {error.message}
        </div>
      ) : (
        <ProductsTable
          products={(products as Product[]) || []}
          initialQuery={query}
          initialPageSize={pageSize}
          totalCount={count || 0}
          currentPage={page}
          allCategories={categories}
          allSpecialties={specialties}
        />
      )}
    </>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
    category?: string;
    specialty?: string;
    stockMin?: string;
    stockMax?: string;
    expirationFrom?: string;
    expirationTo?: string;
    hasImage?: string;
    hasBarcode?: string;
  }>;
}) {
  return (
    <ThemeWrapper>
      <div className="min-h-screen text-slate-900 transition-colors duration-300">
        <div className="mx-auto px-2 sm:px-4 lg:px-6 max-w-full py-3 sm:py-5">
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-1 rounded-full bg-blue-600"></div>
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Gestión de Productos
              </p>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Inventario de Productos</h2>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                <p className="text-xs text-slate-500">Cargando productos...</p>
              </div>
            </div>
          }>
            <ProductsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </ThemeWrapper>
  );
}
