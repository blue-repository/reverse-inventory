"use client";

import { useTheme, rgbToString } from "@/app/context/ThemeContext";
import NavbarContent from "@/app/components/NavbarContent";

export default function NavbarWrapper() {
  const { colors } = useTheme();

  const bgNavbarStyle = {
    backgroundColor: rgbToString(colors.bgNavbar.r, colors.bgNavbar.g, colors.bgNavbar.b),
  };

  return (
    <header
      style={bgNavbarStyle}
      className="border-b border-slate-200 sticky top-0 z-50 transition-colors duration-300"
    >
      <NavbarContent />
    </header>
  );
}
