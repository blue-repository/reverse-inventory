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
    <div className="border-t border-slate-200 px-4 py-3 space-y-3">
      {/* Section Selector */}
      <div>
        <label className="block text-xs text-slate-600 mb-1.5 font-medium">
          Sección
        </label>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value as Section)}
          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="bgMain">{sectionLabels.bgMain}</option>
          <option value="bgTable">{sectionLabels.bgTable}</option>
          <option value="bgNavbar">{sectionLabels.bgNavbar}</option>
        </select>
      </div>

      {/* Presets */}
      <div>
        <label className="block text-xs text-slate-600 mb-1.5 font-medium">
          Temas
        </label>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-left text-slate-700 font-medium"
        >
          {showPresets ? "Ocultar" : "Ver"} presets
        </button>

        {showPresets && (
          <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  applyPreset(preset);
                  setShowPresets(false);
                }}
                className="w-full px-2 py-1.5 text-xs text-left rounded-md border border-slate-200 hover:bg-slate-50 transition-colors font-medium text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <div
                      className="h-3 w-3 rounded border border-slate-300"
                      style={{
                        backgroundColor: rgbToString(
                          preset.colors.bgMain.r,
                          preset.colors.bgMain.g,
                          preset.colors.bgMain.b
                        ),
                      }}
                    />
                    <div
                      className="h-3 w-3 rounded border border-slate-300"
                      style={{
                        backgroundColor: rgbToString(
                          preset.colors.bgTable.r,
                          preset.colors.bgTable.g,
                          preset.colors.bgTable.b
                        ),
                      }}
                    />
                    <div
                      className="h-3 w-3 rounded border border-slate-300"
                      style={{
                        backgroundColor: rgbToString(
                          preset.colors.bgNavbar.r,
                          preset.colors.bgNavbar.g,
                          preset.colors.bgNavbar.b
                        ),
                      }}
                    />
                  </div>
                  <span className="truncate">{preset.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RGB Sliders - Compact */}
      <div>
        <label className="block text-xs text-slate-600 mb-2 font-medium">
          RGB
        </label>

        {/* Red */}
        <div className="mb-2">
          <div className="flex justify-between mb-0.5">
            <label className="text-xs text-slate-600">R</label>
            <span className="text-xs font-mono text-slate-700">{currentColor.r}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={currentColor.r}
            onChange={handleRChange}
            className="w-full h-1.5 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        {/* Green */}
        <div className="mb-2">
          <div className="flex justify-between mb-0.5">
            <label className="text-xs text-slate-600">G</label>
            <span className="text-xs font-mono text-slate-700">{currentColor.g}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={currentColor.g}
            onChange={handleGChange}
            className="w-full h-1.5 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        {/* Blue */}
        <div className="mb-2">
          <div className="flex justify-between mb-0.5">
            <label className="text-xs text-slate-600">B</label>
            <span className="text-xs font-mono text-slate-700">{currentColor.b}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={currentColor.b}
            onChange={handleBChange}
            className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Color Preview */}
        <div className="mt-2 p-1.5 rounded-md border border-slate-300 flex items-center gap-2">
          <div
            className="h-5 w-5 rounded border border-slate-300 flex-shrink-0"
            style={{
              backgroundColor: rgbToString(currentColor.r, currentColor.g, currentColor.b),
            }}
          />
          <span className="text-xs font-mono text-slate-600 truncate">
            {currentColor.r},{currentColor.g},{currentColor.b}
          </span>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetToDefault}
        className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
      >
        Restaurar
      </button>
    </div>
  );
}
