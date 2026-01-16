"use client";

import { useState } from "react";
import { useTheme, THEME_PRESETS, rgbToString, type ThemeColors } from "@/app/context/ThemeContext";

type Section = keyof ThemeColors;

export default function ThemeConfig() {
  const { colors, updateColor, applyPreset, resetToDefault } = useTheme();
  const [selectedSection, setSelectedSection] = useState<Section>("bgMain");
  const [showPresets, setShowPresets] = useState(false);

  const currentColor = colors[selectedSection];

  const handleRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateColor(selectedSection, parseInt(e.target.value), currentColor.g, currentColor.b);
  };

  const handleGChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateColor(selectedSection, currentColor.r, parseInt(e.target.value), currentColor.b);
  };

  const handleBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateColor(selectedSection, currentColor.r, currentColor.g, parseInt(e.target.value));
  };

  const sectionLabels: Record<Section, string> = {
    bgMain: "Fondo Principal",
    bgTable: "Fondo Tabla",
    bgNavbar: "Fondo Navbar",
  };

  return (
    <div className="border-t border-slate-200 px-4 py-3">
      {/* Section Selector */}
      <div className="mb-4">
        <label className="block text-xs text-slate-600 mb-2 font-medium">
          Sección a personalizar
        </label>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value as Section)}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="bgMain">{sectionLabels.bgMain}</option>
          <option value="bgTable">{sectionLabels.bgTable}</option>
          <option value="bgNavbar">{sectionLabels.bgNavbar}</option>
        </select>
      </div>

      {/* Presets */}
      <div className="mb-4">
        <label className="block text-xs text-slate-600 mb-2 font-medium">
          Temas predefinidos
        </label>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-left text-slate-700 font-medium"
        >
          {showPresets ? "Ocultar" : "Ver"} presets
        </button>

        {showPresets && (
          <div className="mt-2 space-y-1.5">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  applyPreset(preset);
                  setShowPresets(false);
                }}
                className="w-full px-3 py-2 text-xs text-left rounded-md border border-slate-200 hover:bg-slate-50 transition-colors font-medium text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div
                      className="h-4 w-4 rounded border border-slate-300"
                      style={{
                        backgroundColor: rgbToString(
                          preset.colors.bgMain.r,
                          preset.colors.bgMain.g,
                          preset.colors.bgMain.b
                        ),
                      }}
                    />
                    <div
                      className="h-4 w-4 rounded border border-slate-300"
                      style={{
                        backgroundColor: rgbToString(
                          preset.colors.bgTable.r,
                          preset.colors.bgTable.g,
                          preset.colors.bgTable.b
                        ),
                      }}
                    />
                    <div
                      className="h-4 w-4 rounded border border-slate-300"
                      style={{
                        backgroundColor: rgbToString(
                          preset.colors.bgNavbar.r,
                          preset.colors.bgNavbar.g,
                          preset.colors.bgNavbar.b
                        ),
                      }}
                    />
                  </div>
                  <span>{preset.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RGB Sliders */}
      <div className="mb-4">
        <label className="block text-xs text-slate-600 mb-3 font-medium">
          Personalizar {sectionLabels[selectedSection].toLowerCase()}
        </label>

        {/* Red */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <label className="text-xs text-slate-600">Rojo</label>
            <span className="text-xs font-mono text-slate-700">{currentColor.r}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={currentColor.r}
            onChange={handleRChange}
            className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        {/* Green */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <label className="text-xs text-slate-600">Verde</label>
            <span className="text-xs font-mono text-slate-700">{currentColor.g}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={currentColor.g}
            onChange={handleGChange}
            className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        {/* Blue */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <label className="text-xs text-slate-600">Azul</label>
            <span className="text-xs font-mono text-slate-700">{currentColor.b}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={currentColor.b}
            onChange={handleBChange}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Color Preview */}
        <div className="mt-3 p-2 rounded-md border border-slate-300 flex items-center gap-2">
          <div
            className="h-8 w-8 rounded border border-slate-300"
            style={{
              backgroundColor: rgbToString(currentColor.r, currentColor.g, currentColor.b),
            }}
          />
          <span className="text-xs font-mono text-slate-600">
            rgb({currentColor.r}, {currentColor.g}, {currentColor.b})
          </span>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetToDefault}
        className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
      >
        Restaurar colores predeterminados
      </button>
    </div>
  );
}
