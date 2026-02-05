import { Product } from "@/app/types/product";
import ClientTableWrapper from "@/app/components/ClientTableWrapper";

type ProductsTableProps = {
  products: Product[];
  initialQuery: string;
  initialPageSize: number;
  totalCount: number;
  currentPage: number;
  allCategories?: string[];
  allSpecialties?: string[];
};

export default function ProductsTable({
  products,
  initialQuery,
  initialPageSize,
  totalCount,
  currentPage,
  allCategories = [],
  allSpecialties = [],
}: ProductsTableProps) {
  return (
    <ClientTableWrapper
      products={products}
      initialQuery={initialQuery}
      initialPageSize={initialPageSize}
      totalCount={totalCount}
      currentPage={currentPage}
      allCategories={allCategories}
      allSpecialties={allSpecialties}
    />
  );
}

