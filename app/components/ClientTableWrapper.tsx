"use client";

import { useTheme, rgbToString } from "@/app/context/ThemeContext";
import ProductsTableClient, { type ProductsTableClientProps } from "@/app/components/ProductsTableClient";
import { useEffect, useState } from "react";

type ClientTableWrapperProps = ProductsTableClientProps & {
  allCategories?: string[];
  allSpecialties?: string[];
};

export default function ClientTableWrapper({
  allCategories = [],
  allSpecialties = [],
  ...props
}: ClientTableWrapperProps) {
  const { colors } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar si es tema oscuro comparando el brillo del color de fondo
  useEffect(() => {
    const brightness = (colors.bgTable.r * 299 + colors.bgTable.g * 587 + colors.bgTable.b * 114) / 1000;
    const dark = brightness < 128;
    setIsDarkMode(dark);
  }, [colors.bgTable]);

  const bgTableStyle = {
    backgroundColor: rgbToString(colors.bgTable.r, colors.bgTable.g, colors.bgTable.b),
  };

  return (
    <div 
      style={bgTableStyle} 
      className={`rounded-lg transition-colors duration-300 ${isDarkMode ? "dark-mode" : ""}`}
    >
      <ProductsTableClient {...props} allCategories={allCategories} allSpecialties={allSpecialties} />
    </div>
  );
}
