"use client";

import { useState } from "react";
import { useUser } from "@/app/context/UserContext";

export default function UserIdentificationModal() {
  const { currentUser, setCurrentUser, isLoading } = useUser();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  // Si aún está cargando o ya está identificado, no mostrar modal
  if (isLoading || currentUser) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setError("Por favor ingresa tu nombre o identificador");
      return;
    }
    setCurrentUser(input);
    setInput("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          👤 Identificación
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mb-5 sm:mb-6 leading-relaxed">
          Ingresa tu nombre o identificador para registrar tus cambios en el inventario
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-800">
              Nombre / ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder="Ej: Juan García, JG001, etc."
              className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 sm:py-3.5 text-sm sm:text-base text-slate-900 placeholder-slate-400 bg-white hover:border-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 transition-colors"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Continuar
          </button>
        </form>

        <p className="mt-5 sm:mt-6 text-xs sm:text-sm text-slate-500 text-center">
          Esto se guardará en tu navegador para próximas sesiones
        </p>
      </div>
    </div>
  );
}
