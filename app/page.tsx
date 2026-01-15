import { Suspense } from "react";
import { supabase } from "@/app/lib/conections/supabase";
import { Product } from "@/app/types/product";
import ProductsTable from "@/app/components/ProductsTable";
import RefreshButton from "@/app/components/RefreshButton";
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-10">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inventario
            </p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Productos - Farmacia</h1>
          </div>
          <RefreshButton />
        </div>

        <Suspense fallback={<div className="py-6 text-center text-slate-600">Cargando...</div>}>
          <ProductsContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
