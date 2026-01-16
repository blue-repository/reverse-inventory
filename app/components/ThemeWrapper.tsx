"use client";

import { useTheme, rgbToString } from "@/app/context/ThemeContext";
import { ReactNode } from "react";

export function ThemeWrapper({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  const bgMainStyle = {
    backgroundColor: rgbToString(colors.bgMain.r, colors.bgMain.g, colors.bgMain.b),
  };

  return (
    <div style={bgMainStyle} className="min-h-screen transition-colors duration-300">
      {children}
    </div>
  );
}
