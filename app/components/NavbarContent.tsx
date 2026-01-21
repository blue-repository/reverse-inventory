"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/app/context/UserContext";
import ThemeConfig from "@/app/components/ThemeConfig";

export default function NavbarContent() {
  const { currentUser, clearUser, setCurrentUser } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUser || "");
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showUserMenu || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu, showNotifications]);

  const handleLogout = () => {
    clearUser();
    setShowUserMenu(false);
  };

  const handleRename = () => {
    if (newUsername.trim()) {
      setCurrentUser(newUsername.trim());
      setRenameMode(false);
      setShowUserMenu(false);
    }
  };

  return (
    <div className="mx-auto px-4 sm:px-6 max-w-[100%] py-3 sm:py-4 grid grid-cols-[1fr_auto] items-center gap-4">
      {/* Left: Empty */}
      <div></div>

      {/* Right: Notifications & User Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications Bell */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700"
            title="Notificaciones"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-8 w-8 mx-auto mb-2 text-slate-300"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-slate-500">No hay notificaciones</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Button - Circular with Icon */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700"
            title={`Menú de usuario: ${currentUser}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 sm:w-72 rounded-lg border border-slate-200 bg-white shadow-lg max-h-[90vh] overflow-y-auto z-50 flex flex-col">
              {/* User Info - Sticky */}
              <div className="border-b border-slate-200 px-4 py-3 flex-shrink-0">
                <p className="text-xs text-slate-500">Usuario actual</p>
                <p className="font-semibold text-slate-900 break-all text-sm">{currentUser}</p>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1">
                {/* Rename Mode */}
                {renameMode ? (
                  <div className="px-4 py-3 border-b border-slate-200">
                    <label className="block text-xs text-slate-600 mb-2">
                      Nuevo nombre de usuario
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename();
                        if (e.key === "Escape") setRenameMode(false);
                      }}
                      autoFocus
                      className="w-full px-2 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      placeholder={currentUser || ""}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRename}
                        className="flex-1 rounded px-2 py-1.5 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setRenameMode(false);
                          setNewUsername(currentUser || "");
                        }}
                        className="flex-1 rounded px-2 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Options */}
                    <button
                      onClick={() => {
                        setRenameMode(true);
                        setNewUsername(currentUser || "");
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 border-b border-slate-200"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-4 w-4 flex-shrink-0"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Renombrar usuario
                    </button>

                    {/* Theme Configuration */}
                    <ThemeConfig />
                  </>
                )}
              </div>

              {/* Logout - Sticky at Bottom */}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-slate-200 flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4 flex-shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
