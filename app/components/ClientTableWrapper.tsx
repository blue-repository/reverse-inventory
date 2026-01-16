"use client";

import { useTheme, rgbToString } from "@/app/context/ThemeContext";
import ProductsTableClient, { type ProductsTableClientProps } from "@/app/components/ProductsTableClient";

export default function ClientTableWrapper(props: ProductsTableClientProps) {
  const { colors } = useTheme();

  const bgTableStyle = {
    backgroundColor: rgbToString(colors.bgTable.r, colors.bgTable.g, colors.bgTable.b),
  };

  return (
    <div style={bgTableStyle} className="rounded-lg transition-colors duration-300">
      <ProductsTableClient {...props} />
    </div>
  );
}
