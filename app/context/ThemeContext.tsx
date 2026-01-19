"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface ThemeColors {
  bgMain: { r: number; g: number; b: number };
  bgTable: { r: number; g: number; b: number };
  bgNavbar: { r: number; g: number; b: number };
}

export interface ThemePreset {
  name: string;
  colors: ThemeColors;
}

const DEFAULT_COLORS: ThemeColors = {
  bgMain: { r: 255, g: 255, b: 255 },
  bgTable: { r: 255, g: 255, b: 255 },
  bgNavbar: { r: 255, g: 255, b: 255 },
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Claro (Defecto)",
    colors: {
      bgMain: { r: 255, g: 255, b: 255 },
      bgTable: { r: 255, g: 255, b: 255 },
      bgNavbar: { r: 255, g: 255, b: 255 },
    },
  },
  {
    name: "Modo Oscuro Profesional",
    colors: {
      bgMain: { r: 17, g: 24, b: 39 },
      bgTable: { r: 30, g: 41, b: 59 },
      bgNavbar: { r: 15, g: 23, b: 42 },
    },
  },
  {
    name: "Suave Azul",
    colors: {
      bgMain: { r: 240, g: 248, b: 255 },
      bgTable: { r: 245, g: 250, b: 255 },
      bgNavbar: { r: 230, g: 240, b: 255 },
    },
  },
  {
    name: "Suave Gris",
    colors: {
      bgMain: { r: 249, g: 250, b: 251 },
      bgTable: { r: 255, g: 255, b: 255 },
      bgNavbar: { r: 240, g: 241, b: 245 },
    },
  },
  {
    name: "Suave Verde",
    colors: {
      bgMain: { r: 240, g: 253, b: 244 },
      bgTable: { r: 245, g: 255, b: 250 },
      bgNavbar: { r: 220, g: 252, b: 231 },
    },
  },
];

type ThemeContextType = {
  colors: ThemeColors;
  setColors: (colors: ThemeColors) => void;
  updateColor: (section: keyof ThemeColors, r: number, g: number, b: number) => void;
  applyPreset: (preset: ThemePreset) => void;
  resetToDefault: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColorsState] = useState<ThemeColors>(DEFAULT_COLORS);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar colores del localStorage al montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedColors = localStorage.getItem("farmacia-theme-colors");
      if (savedColors) {
        try {
          setColorsState(JSON.parse(savedColors));
        } catch (error) {
          console.error("Error parsing saved theme colors:", error);
          setColorsState(DEFAULT_COLORS);
        }
      }
      setIsLoading(false);
    }
  }, []);

  const setColors = useCallback((newColors: ThemeColors) => {
    setColorsState(newColors);
    if (typeof window !== "undefined") {
      localStorage.setItem("farmacia-theme-colors", JSON.stringify(newColors));
    }
  }, []);

  const updateColor = useCallback(
    (section: keyof ThemeColors, r: number, g: number, b: number) => {
      const newColors = {
        ...colors,
        [section]: { r, g, b },
      };
      setColors(newColors);
    },
    [colors, setColors]
  );

  const applyPreset = useCallback((preset: ThemePreset) => {
    setColors(preset.colors);
  }, [setColors]);

  const resetToDefault = useCallback(() => {
    setColors(DEFAULT_COLORS);
  }, [setColors]);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        setColors,
        updateColor,
        applyPreset,
        resetToDefault,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}

export function rgbToString(r: number, g: number, b: number): string {
  return `rgb(${r}, ${g}, ${b})`;
}
