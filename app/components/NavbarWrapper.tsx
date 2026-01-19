"use client";

import { useTheme, rgbToString } from "@/app/context/ThemeContext";
import NavbarContent from "@/app/components/NavbarContent";
import { useEffect, useState } from "react";

export default function NavbarWrapper() {
  const { colors } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar si es tema oscuro comparando el brillo del color de fondo
  useEffect(() => {
    const brightness = (colors.bgNavbar.r * 299 + colors.bgNavbar.g * 587 + colors.bgNavbar.b * 114) / 1000;
    const dark = brightness < 128;
    setIsDarkMode(dark);
  }, [colors.bgNavbar]);

  const bgNavbarStyle = {
    backgroundColor: rgbToString(colors.bgNavbar.r, colors.bgNavbar.g, colors.bgNavbar.b),
  };

  return (
    <header
      style={bgNavbarStyle}
      className={`border-b border-slate-200 sticky top-0 z-50 transition-colors duration-300 ${isDarkMode ? "dark-mode" : ""}`}
    >
      <NavbarContent />
    </header>
  );
}
