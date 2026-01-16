import { Product } from "@/app/types/product";
import ClientTableWrapper from "@/app/components/ClientTableWrapper";

type ProductsTableProps = {
  products: Product[];
  initialQuery: string;
  initialPageSize: number;
  totalCount: number;
  currentPage: number;
};

export default function ProductsTable({
  products,
  initialQuery,
  initialPageSize,
  totalCount,
  currentPage,
}: ProductsTableProps) {
  return (
    <ClientTableWrapper
      products={products}
      initialQuery={initialQuery}
      initialPageSize={initialPageSize}
      totalCount={totalCount}
      currentPage={currentPage}
    />
  );
}

