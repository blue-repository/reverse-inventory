import { supabase } from "@/app/lib/conections/supabase";
import { Product } from "@/app/types/product";
import ProductsTable from "@/app/components/ProductsTable";

export default async function Home() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inventario
            </p>
            <h1 className="text-3xl font-bold">Productos - Farmacia</h1>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            Error: {error.message}
          </div>
        ) : (
          <ProductsTable products={(products as Product[]) || []} />
        )}
      </div>
    </div>
  );
}
