"use client";

import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScannerState } from "html5-qrcode";
import { Product } from "@/app/types/product";
import { searchProductByBarcode } from "@/app/actions/products";
import ScanResultsCart from "./ScanResultsCart";

type BarcodeScannerModalProps = {
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
};

export default function BarcodeScannerModal({
  onClose,
  onSelectProduct,
}: BarcodeScannerModalProps) {
  const [scannedProducts, setScannedProducts] = useState<Product[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannedCodesRef = useRef<Set<string>>(new Set());
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isScanning || !scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
    };
  }, [isScanning]);

  const initializeScanner = () => {
    try {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777777,
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scannerRef.current.render(onScanSuccess, onScanError);
      setIsScanning(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al inicializar el escáner";
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    const now = Date.now();
    // Debounce: evitar múltiples escaneos del mismo código en menos de 500ms
    if (now - lastScanTimeRef.current < 500) {
      return;
    }

    // Evitar duplicados en la misma sesión
    if (scannedCodesRef.current.has(decodedText)) {
      return;
    }

    lastScanTimeRef.current = now;
    setLastScannedCode(decodedText);
    setIsSearching(true);
    setError(null);

    try {
      const result = await searchProductByBarcode(decodedText);

      if (result.data) {
        scannedCodesRef.current.add(decodedText);
        setScannedProducts((prev) => {
          // Evitar duplicados en el carrito
          const exists = prev.some((p) => p.id === result.data.id);
          if (exists) {
            return prev;
          }
          return [...prev, result.data];
        });
      } else {
        setError(`Producto no encontrado: ${decodedText}`);
      }
    } catch (err) {
      setError("Error al buscar el producto");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const onScanError = (error: string) => {
    // Ignorar errores de "no code found" que son normales
    if (!error.includes("No MultiFormat Readers were able to detect the code")) {
      console.debug("Scan error:", error);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setScannedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleSelectFromCart = (product: Product) => {
    onSelectProduct?.(product);
    handleClose();
  };

  const handleClearAll = () => {
    setScannedProducts([]);
    scannedCodesRef.current.clear();
  };

  const handleClose = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-2 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl my-4 sm:my-8 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-slate-900 p-1.5 sm:p-2 text-white hover:bg-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4 sm:h-5 sm:w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 pr-8">
            📸 Escanear Código de Barras / QR
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Escanea productos para agregarlos rápidamente al carrito
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-3 sm:p-4 md:p-6">
          {/* Área del Escáner */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 overflow-hidden">
              {isScanning ? (
                <div id="qr-reader" className="w-full" />
              ) : (
                <div className="flex items-center justify-center h-96 flex-col gap-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-16 w-16 text-slate-300"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.141.175C2.697 7.46 2 8.108 2 8.832v4.342c0 .724.697 1.373 2.045 1.627.384.063.761.12 1.141.175.305.041.612.078.927.078.315 0 .622-.037.927-.078.38-.055.757-.112 1.141-.175C7.303 15.54 8 16.188 8 16.912v-4.342c0-.724-.697-1.373-2.045-1.627a24.029 24.029 0 00-1.128-.175M6.827 6.175L3.6 4.08m0 0c.56-.175 1.135-.297 1.741-.297 2.126 0 3.99 1.077 5.18 2.701M3.6 4.08L3.48 3.897m0 0A3.26 3.26 0 015.023 3c2.126 0 3.99 1.077 5.18 2.701m0 0A3.256 3.256 0 017.662 6.172m0 0l2.626 1.087m0 0a3.26 3.26 0 10 5.18 2.701 3.26 3.26 0 00-5.18-2.7m0 0l2.627-1.087m0 0A3.26 3.26 0 1015.988 9c-1.071 0-2.088-.292-2.961-.808m0 0a3.26 3.26 0 00-5.197-2.191A3.26 3.26 0 107.661 6.172M5 19.5a3 3 0 015.997.001"
                    />
                  </svg>
                  <p className="text-slate-500 text-sm">Escáner no disponible</p>
                  <button
                    onClick={() => setIsScanning(true)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* Estado del Escaneo */}
            <div className="mt-4 space-y-2">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-800">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4 inline mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 1.677A9.75 9.75 0 1120.053 6.555m0 0A9.75 9.75 0 012.697 16.427"
                    />
                  </svg>
                  {error}
                </div>
              )}

              {isSearching && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-blue-800 flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-blue-800 rounded-full"></div>
                  Buscando: <span className="font-mono font-semibold">{lastScannedCode}</span>
                </div>
              )}

              {lastScannedCode && !isSearching && !error && scannedProducts.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  ✓ Producto agregado
                </div>
              )}
            </div>
          </div>

          {/* Carrito de Escaneos */}
          <ScanResultsCart
            products={scannedProducts}
            onRemove={handleRemoveProduct}
            onSelect={handleSelectFromCart}
            onClearAll={handleClearAll}
            disabled={!onSelectProduct}
          />
        </div>

        {/* Botón de Cierre */}
        <div className="border-t border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <button
            onClick={handleClose}
            className="w-full rounded-lg border border-slate-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
