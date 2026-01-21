"use client";

import { useState, useRef, useEffect } from "react";
import { containsNormalized } from "@/app/lib/search-utils";

type SearchableSelectProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  label?: string;
  showLabel?: boolean;
};

export default function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  required = false,
  label,
  showLabel = true,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    containsNormalized(option, search)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      {showLabel && label && (
        <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Hidden input para form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Input visible para búsqueda/visualización */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value || ""}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-300 bg-white shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-100 ${
                  value === option ? "bg-slate-50 font-medium text-slate-900" : "text-slate-700"
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs sm:text-sm text-slate-500 text-center">
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
