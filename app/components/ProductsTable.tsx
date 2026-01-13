import { Product } from "@/app/types/product";
import ProductsTableClient from "@/app/components/ProductsTableClient";

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
    <ProductsTableClient
      products={products}
      initialQuery={initialQuery}
      initialPageSize={initialPageSize}
      totalCount={totalCount}
      currentPage={currentPage}
    />
  );
}

