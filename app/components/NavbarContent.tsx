"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/app/context/UserContext";
import { useNotifications } from "@/app/hooks/useNotifications";
import { NotificationItem } from "@/app/components/NotificationItem";
import { ExpiringProductNotification } from "@/app/types/notification";
import ProductDetailsModal from "@/app/components/ProductDetailsModal";
import { getProduct } from "@/app/actions/products";
import ThemeConfig from "@/app/components/ThemeConfig";

export default function NavbarContent() {
  const { currentUser, clearUser, setCurrentUser } = useUser();
  const { 
    notifications,
    unreadCount, 
    criticalCount, 
    isCheckingExpiringProducts,
    error,
    markAsRead,
    dismiss,
    triggerExpiringProductsCheck 
  } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUser || "");
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [highlightedBatchId, setHighlightedBatchId] = useState<string | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
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

  const handleNotificationItemClick = async (notification: ExpiringProductNotification) => {
    setIsLoadingProduct(true);
    try {
      const product = await getProduct(notification.product_id);
      if (product.data) {
        setSelectedProduct(product.data);
        setHighlightedBatchId(notification.batch_id || null);
        setShowProductDetails(true);
        setShowNotifications(false);
      }
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setIsLoadingProduct(false);
    }
  };

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

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      const response = await fetch("/api/backup");
      
      if (!response.ok) {
        throw new Error("Error al descargar el backup");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bagatela-backup-completo-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert("✅ Backup descargado exitosamente.\n\nEl archivo contiene todas tus tablas en formato CSV (delimitado por ;).\n\nGuárdalo en un lugar seguro.");
    } catch (error) {
      console.error("Error al descargar backup:", error);
      alert("❌ Error al descargar el backup. Intenta nuevamente.");
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  return (
    <>
      <div className="mx-auto px-4 sm:px-6 max-w-[100%] py-3 sm:py-4 grid grid-cols-[1fr_auto] items-center gap-4">
      {/* Left: Empty */}
      <div></div>

      {/* Right: Notifications & User Menu */}
      <div className="flex items-center gap-2">
        {/* Backup Button */}
        <button
          onClick={handleDownloadBackup}
          disabled={isDownloadingBackup}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Descargar backup de la base de datos"
        >
          {isDownloadingBackup ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          )}
        </button>

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
            
            {/* Badge con el contador */}
            {unreadCount > 0 && (
              <span
                className={`absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 rounded-full ${
                  criticalCount > 0
                    ? "bg-red-600"
                    : "bg-blue-600"
                }`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[90vw] rounded-lg border border-slate-200 bg-white shadow-lg z-50">
              <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
                <button
                  onClick={() => triggerExpiringProductsCheck()}
                  disabled={isCheckingExpiringProducts}
                  className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Actualizar notificaciones"
                  aria-label="Actualizar notificaciones"
                >
                  <svg
                    className={isCheckingExpiringProducts ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    {/* <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-5.992m19.942-2.586a2.25 2.25 0 00-2.25-2.25h-15a2.25 2.25 0 00-2.25 2.25m19.5 0a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25m16.5 5.294a2.25 2.25 0 00-2.25 2.25v3.192c0 .683-.307 1.329-.844 1.779m11.844-8.269a2.25 2.25 0 00-2.25-2.25h-15a2.25 2.25 0 00-2.25 2.25m19.5 0a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25m16.5-5.292a2.25 2.25 0 00-2.25 2.25v3.192a2.25 2.25 0 01-.844 1.779m0-5.971V9.348"
                    /> */}
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" 
                    />
                  </svg>
                </button>
              </div>

              {/* Error message if any */}
              {error && (
                <div className="border-b border-red-200 bg-red-50 px-4 py-2 flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-red-600 font-medium">Error</p>
                    <p className="text-xs text-red-500 break-words">{error}</p>
                  </div>
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-8 w-8 mx-auto mb-2 text-slate-300"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-xs text-slate-500">No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="px-3 py-3 space-y-2">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={markAsRead}
                        onDismiss={dismiss}
                        onItemClick={handleNotificationItemClick}
                      />
                    ))}
                  </div>
                )}
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

    {/* Product Details Modal - Triggered from Notification */}
    {showProductDetails && selectedProduct && (
      <ProductDetailsModal
        product={selectedProduct}
        onClose={() => {
          setShowProductDetails(false);
          setSelectedProduct(null);
          setHighlightedBatchId(null);
        }}
        onEdit={() => {}}
        highlightedBatchId={highlightedBatchId}
      />
    )}
    </>
  );
}
