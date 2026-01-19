import { Suspense } from "react";
import { supabase } from "@/app/lib/conections/supabase";
import { Product } from "@/app/types/product";
import ProductsTable from "@/app/components/ProductsTable";
import { ThemeWrapper } from "@/app/components/ThemeWrapper";
import { searchProducts } from "@/app/actions/products";

async function ProductsContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "20");

  console.log("ProductsContent - searchParams:", { query, page, pageSize });

  const { data: products, count, error } = await searchProducts(query, page, pageSize);

  console.log("Search result:", { productsCount: products?.length, totalCount: count, error });

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
        />
      )}
    </>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
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
