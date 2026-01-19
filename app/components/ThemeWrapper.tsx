"use client";

import { useTheme, rgbToString } from "@/app/context/ThemeContext";
import { ReactNode, useEffect, useState } from "react";

export function ThemeWrapper({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar si es tema oscuro comparando el brillo del color de fondo
  useEffect(() => {
    const brightness = (colors.bgMain.r * 299 + colors.bgMain.g * 587 + colors.bgMain.b * 114) / 1000;
    const dark = brightness < 128;
    setIsDarkMode(dark);

    // Aplicar clase al documento para estilos globales
    if (dark) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }, [colors.bgMain]);

  const bgMainStyle = {
    backgroundColor: rgbToString(colors.bgMain.r, colors.bgMain.g, colors.bgMain.b),
  };

  return (
    <div 
      style={bgMainStyle} 
      className="min-h-screen transition-colors duration-300"
    >
      {children}
    </div>
  );
}
