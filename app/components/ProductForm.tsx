"use client";

import { useState } from "react";
import { Product, UNITS_OF_MEASURE } from "@/app/types/product";
import { createProduct, updateProduct } from "@/app/actions/products";
import BarcodeScannerModal from "./BarcodeScannerModal";
import SearchableSelect from "./SearchableSelect";
import { useUser } from "@/app/context/UserContext";
import { supabase } from "@/app/lib/conections/supabase";

// Unidades para Dispositivos Médicos y Reportes
const DEVICE_UNITS = [
  "Rollo",
  "Paquete",
  "Caja",
  "Par",
  "Galón",
  "Litro",
  "Mililitro",
  "Gramo",
  "Kilogramo",
  "Metro",
  "Centímetro",
  "Unidad",
  "Docena",
  "Tubo",
  "Frasco",
  "Botella",
  "Jeringa",
  "Ampolleta",
  "Vial",
  "Sobre",
];

// Especialidades médicas
const SPECIALTIES = [
  "Enfermería",
  "Cirugía",
  "Traumatología",
  "Enfermería/Laboratorio clínico y microbiología",
  "Anestesiología / Cuidados intensivos",
  "Ginecología / Obstetricia",
  "Central de esterilización",
  "Atención Pre-hospitalaria",
  "Uso General",
  "Enfermería/Terapia respiratoria",
  "Especialidades quirúrgicas",
];

// Vías de administración
const ADMINISTRATION_ROUTES = [
  "Oral",
  "Sublingual",
  "Intravenosa",
  "Intramuscular",
  "Subcutánea",
  "Tópica",
  "Oftálmica",
  "Ótica",
  "Nasal",
  "Inhalatoria",
  "Rectal",
  "Vaginal",
  "Transdérmica",
  "Epidural",
  "Intratecal",
];

type ProductFormProps = {
  product?: Product;
  onClose: () => void;
};

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const { currentUser } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barcodeValue, setBarcodeValue] = useState<string>(product?.barcode || "");
  const [showScanner, setShowScanner] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || "");
  const [imageLoading, setImageLoading] = useState(true);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(product?.category || "");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(product?.specialty || "");
  const [selectedUnitOfMeasure, setSelectedUnitOfMeasure] = useState<string>(product?.unit_of_measure || "");
  const [selectedReportingUnit, setSelectedReportingUnit] = useState<string>(product?.reporting_unit || "");
  const [selectedAdminRoute, setSelectedAdminRoute] = useState<string>(product?.administration_route || "");

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const toWebp = async (file: File) => {
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    // Limitar tamaño para peso ligero
    const maxSize = 1280;
    const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el contexto del canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.75)
    );
    if (!blob) throw new Error("No se pudo convertir la imagen a WebP");
    return blob;
  };

  const uploadImage = async (file: File) => {
    const bucket = "bagatela-inventory-bucket";
    const webpBlob = await toWebp(file);
    const fileName = `${crypto.randomUUID()}.webp`;
    const path = product ? `products/${product.id}/${fileName}` : `temp/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, webpBlob, { upsert: true, contentType: "image/webp" });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    // Si el bucket es privado, crea URL firmada; si es público, esto seguirá funcionando
    const { data: signed, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 año

    if (!signError && signed?.signedUrl) {
      return signed.signedUrl;
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  };

  const extractPathFromUrl = (url: string) => {
    if (!url) return null;
    const bucket = "bagatela-inventory-bucket";
    const bucketIndex = url.indexOf(bucket);
    if (bucketIndex === -1) return null;
    const startIndex = bucketIndex + bucket.length + 1; // +1 para el /
    const path = url.substring(startIndex);
    // Remover query params si existen (para URLs firmadas)
    return path.split("?")[0];
  };

  const deleteOldImage = async (imageUrl: string | null | undefined) => {
    if (!imageUrl) return;
    const path = extractPathFromUrl(imageUrl);
    if (!path) return;
    
    try {
      await supabase.storage.from("bagatela-inventory-bucket").remove([path]);
    } catch (err) {
      // Ignorar errores de eliminación (archivo podría no existir ya)
      console.warn("No se pudo eliminar imagen anterior:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      let finalImageUrl = product?.image_url || "";

      // Si hay una imagen marcada para eliminar, eliminarla del bucket
      if (imageToDelete) {
        await deleteOldImage(imageToDelete);
        finalImageUrl = "";
      }

      if (imageFile) {
        // Si estamos editando y hay una imagen anterior distinta, eliminarla
        if (product && product.image_url && product.image_url !== imagePreview && !imageToDelete) {
          await deleteOldImage(product.image_url);
        }
        finalImageUrl = await uploadImage(imageFile);
      }

      formData.set("image_url", finalImageUrl);

      const result = product
        ? await updateProduct(product.id, formData, currentUser || undefined)
        : await createProduct(formData, currentUser || undefined);

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Error al guardar el producto");
      }
    } catch (err: any) {
      setError(err?.message || "Error al subir la imagen");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl my-4 sm:my-8 max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white rounded-t-xl">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {/* Nombre */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              defaultValue={product?.name}
              required
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {/* Código de barras */}
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Código de Barras
            </label>
            <div className="relative">
              <input
                type="text"
                name="barcode"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pr-12 sm:pr-14 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800"
                aria-label="Escanear código"
              >
                📸
              </button>
            </div>
          </div>

          {/* Stock */}
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Stock <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="stock"
              defaultValue={product?.stock || 0}
              min="0"
              required
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {/* Categoría */}
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Seleccionar...</option>
              <option value="Medicamentos">Medicamentos</option>
              <option value="Dispositivos Médicos">Dispositivos Médicos</option>
            </select>
          </div>

          {/* Especialidad (solo para Dispositivos Médicos) */}
          {selectedCategory === "Dispositivos Médicos" && (
            <div className="sm:col-span-1">
              <SearchableSelect
                name="specialty"
                value={selectedSpecialty}
                onChange={setSelectedSpecialty}
                options={SPECIALTIES}
                placeholder="Seleccionar especialidad..."
                label="Especialidad"
              />
            </div>
          )}

          {/* Unidad de medida */}
          <div className="sm:col-span-1">
            <SearchableSelect
              name="unit_of_measure"
              value={selectedUnitOfMeasure}
              onChange={setSelectedUnitOfMeasure}
              options={selectedCategory === "Dispositivos Médicos" ? DEVICE_UNITS : UNITS_OF_MEASURE}
              placeholder="Seleccionar unidad..."
              label="Unidad de Medida"
            />
          </div>

          {/* Unidad de Reporte */}
          <div className="sm:col-span-1">
            <SearchableSelect
              name="reporting_unit"
              value={selectedReportingUnit}
              onChange={setSelectedReportingUnit}
              options={selectedCategory === "Dispositivos Médicos" ? DEVICE_UNITS : DEVICE_UNITS}
              placeholder="Seleccionar unidad..."
              label="Unidad de Reporte"
            />
          </div>

          {/* Vía de administración (solo para Medicamentos) */}
          {selectedCategory === "Medicamentos" && (
            <div className="sm:col-span-1">
              <SearchableSelect
                name="administration_route"
                value={selectedAdminRoute}
                onChange={setSelectedAdminRoute}
                options={ADMINISTRATION_ROUTES}
                placeholder="Seleccionar vía..."
                label="Vía de Administración"
              />
            </div>
          )}

          {/* Descripción */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Descripción
            </label>
            <textarea
              name="description"
              defaultValue={product?.description || ""}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {/* Fecha de expedición */}
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Fecha de Expedición
            </label>
            <input
              type="date"
              name="issue_date"
              defaultValue={product?.issue_date || ""}
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {/* Fecha de expiración */}
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Fecha de Expiración
            </label>
            <input
              type="date"
              name="expiration_date"
              defaultValue={product?.expiration_date || ""}
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {/* Imagen del producto */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Imagen del producto
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-4 text-xs sm:text-sm text-slate-600 hover:border-slate-400 cursor-pointer">
                  <input
                    type="file"
                    name="image_file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                      setImageLoading(true);
                    }}
                  />
                  <span className="font-semibold text-slate-700">Seleccionar o tomar foto</span>
                  <span className="text-[11px] text-slate-500">Se convertirá a WebP ligera</span>
                </label>
              </div>
              {imagePreview && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                  {imageLoading && (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="animate-spin">
                        <svg className="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="h-full w-full object-contain"
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                    style={{ display: imageLoading ? "none" : "block" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // Si hay una imagen del producto original, marcarla para eliminación
                      if (product?.image_url && imagePreview === product.image_url) {
                        setImageToDelete(product.image_url);
                      }
                      setImageFile(null);
                      setImagePreview("");
                      setImageLoading(true);
                    }}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 hover:bg-red-600 text-white p-1 shadow-md transition-colors"
                    title="Eliminar imagen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Ubicación */}
          <div className="md:col-span-2 border-t border-slate-200 pt-3 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3">Ubicación</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              {/* Estantería */}
              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Estantería
                </label>
                <input
                  type="text"
                  name="shelf"
                  defaultValue={product?.shelf || ""}
                  placeholder="Ej: A, B, C"
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Cajón */}
              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Cajón/Nivel
                </label>
                <input
                  type="text"
                  name="drawer"
                  defaultValue={product?.drawer || ""}
                  placeholder="Ej: 1, 2, 3"
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Sección */}
              <div>
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Sección
                </label>
                <input
                  type="text"
                  name="section"
                  defaultValue={product?.section || ""}
                  placeholder="Ej: Izq, Der"
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Notas de ubicación */}
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                  Notas de Ubicación
                </label>
                <textarea
                  name="location_notes"
                  defaultValue={product?.location_notes || ""}
                  rows={2}
                  placeholder="Detalles adicionales sobre la ubicación..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
              Notas / Observaciones
            </label>
            <textarea
              name="notes"
              defaultValue={product?.notes || ""}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-200 pt-3 sm:pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-lg bg-slate-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
      </div>
      
      {/* Scanner Modal - Renderizado a nivel superior */}
      {showScanner && (
        <BarcodeScannerModal
          mode="code"
          onClose={() => setShowScanner(false)}
          onCodeScanned={(code) => {
            setBarcodeValue(code);
            setShowScanner(false);
          }}
        />
      )}
    </div>
  );
}
