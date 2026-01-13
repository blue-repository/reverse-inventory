"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/app/context/UserContext";

export default function UserIndicator() {
  const { currentUser, setCurrentUser, clearUser, isLoading } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [newName, setNewName] = useState(currentUser || "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar newName cuando cambia currentUser
  useEffect(() => {
    if (currentUser) {
      setNewName(currentUser);
    }
  }, [currentUser]);

  if (!mounted || isLoading || !currentUser) {
    return null;
  }

  const handleChangeName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      setCurrentUser(newName);
      setShowChangeModal(false);
      setShowMenu(false);
    }
  };

  const handleClearUser = () => {
    clearUser();
    setShowMenu(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 transition-colors"
          title="Cambiar usuario"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15a7.488 7.488 0 0 0-5.982 3.725m11.964 0a9 9 0 1 0-11.964 0m11.964 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275m11.964 0A24.255 24.255 0 0 1 12 21"
            />
          </svg>
          <span className="hidden sm:inline truncate max-w-[150px]">{currentUser}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`h-3.5 w-3.5 transition-transform ${showMenu ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
            <button
              onClick={() => {
                setShowChangeModal(true);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg"
            >
              ✏️ Cambiar identificador
            </button>
            <button
              onClick={handleClearUser}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg border-t border-slate-200"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {showChangeModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Cambiar identificador
            </h3>

            <form onSubmit={handleChangeName} className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangeModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
