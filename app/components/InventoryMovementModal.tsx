"use client";

import { useState, useEffect } from "react";
import { Product, MovementType, ProductBatch } from "@/app/types/product";
import { recordMovementsWithBatchHandling, getProductBatches } from "@/app/actions/products";
import { useUser } from "@/app/context/UserContext";

type InventoryMovementModalProps = {
  product: Product;
  onClose: () => void;
  onSuccess?: () => void;
};

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Entrega de receta", "Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

// Componente para secciones colapsables
function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  icon = "📋"
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  icon?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-3 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export default function InventoryMovementModal({
  product,
  onClose,
  onSuccess,
}: InventoryMovementModalProps) {
  const { currentUser } = useUser();
  const [movementType, setMovementType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Campos para lotes (entrada)
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [shelf, setShelf] = useState<string>("");
  const [drawer, setDrawer] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [locationNotes, setLocationNotes] = useState<string>("");
  
  // Campos para receta médica (salida con "Entrega de receta")
  const [recipeCode, setRecipeCode] = useState<string>("");
  const [recipeDate, setRecipeDate] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [prescribedBy, setPrescribedBy] = useState<string>("");
  const [cieCode, setCieCode] = useState<string>("");
  const [recipeNotes, setRecipeNotes] = useState<string>("");
  
  // Campos para selección de lotes en salidas
  const [specifyBatches, setSpecifyBatches] = useState<boolean>(false);
  const [availableBatches, setAvailableBatches] = useState<ProductBatch[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<{batchId: string; quantity: number}[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBatchNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    setBatchNumber(`LOTE-${dateStr}-${random}`);
  };

  // Cargar lotes disponibles cuando es salida
  useEffect(() => {
    if (movementType === "salida") {
      setLoadingBatches(true);
      getProductBatches(product.id).then((result) => {
        const activeBatches = (result.data || []).filter(b => b.stock > 0 && b.is_active);
        setAvailableBatches(activeBatches);
        setLoadingBatches(false);
      });
    } else {
      setAvailableBatches([]);
      setSpecifyBatches(false);
      setSelectedBatches([]);
    }
  }, [movementType, product.id]);

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const reasons = MOVEMENT_REASONS[movementType];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(quantity);
    if (!quantity || qty <= 0) {
      setError("Ingresa una cantidad válida mayor a 0");
      return;
    }

    // Validaciones para salidas con lotes específicos
    if (movementType === "salida" && specifyBatches) {
      if (selectedBatches.length === 0) {
        setError("Debes seleccionar al menos un lote");
        return;
      }
      
      const totalFromBatches = selectedBatches.reduce((sum, s) => sum + s.quantity, 0);
      
      // Si hay 1 lote, debe ser igual al total (no se permite modificación)
      if (availableBatches.length === 1 && totalFromBatches !== qty) {
        setError(`Con un solo lote disponible, se debe retirar toda la cantidad (${qty} unidades) del lote. No se permite modificar.`);
        return;
      }
      
      // Si hay más de 1 lote, debe cuadrar exactamente
      if (availableBatches.length > 1 && totalFromBatches !== qty) {
        setError(`Con múltiples lotes, la cantidad total de los lotes (${totalFromBatches}) debe coincidir con la cantidad a egresar (${qty})`);
        return;
      }
      
      // Validar que todas las cantidades seleccionadas sean mayores a 0
      const hasZeroQuantity = selectedBatches.some(s => s.quantity <= 0);
      if (hasZeroQuantity) {
        setError("Todos los lotes seleccionados deben tener una cantidad mayor a 0");
        return;
      }
    }

    // Validar que hay suficiente stock para salidas (solo si no se especifican lotes)
    if (movementType === "salida" && !specifyBatches && product.stock < qty) {
      setError(`Stock insuficiente. Disponible: ${product.stock}`);
      return;
    }

    // Validaciones para entrada (lote)
    if (movementType === "entrada") {
      if (!batchNumber.trim()) {
        setError("Genera o ingresa el número de lote");
        return;
      }
      if (!expirationDate) {
        setError("Ingresa la fecha de vencimiento");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const isRecipeMovement = movementType === "salida" && reason === "Entrega de receta";

      // Preparar movimiento con manejo de lotes
      const movements = [
        {
          product_id: product.id as string,
          quantity: qty,
          type: movementType,
          reason: reason || undefined,
          notes: notes || undefined,
          recorded_by: currentUser || undefined,
          
          // Datos de receta (solo para entrega de receta)
          is_recipe_movement: isRecipeMovement,
          ...(isRecipeMovement && {
            prescription_group_id: crypto.randomUUID(),
            recipe_code: recipeCode || undefined,
            recipe_date: recipeDate || undefined,
            patient_name: patientName || undefined,
            prescribed_by: prescribedBy || undefined,
            cie_code: cieCode || undefined,
            recipe_notes: recipeNotes || undefined,
          }),

          // Manejo de lotes
          batchHandling: movementType === "entrada" 
            ? {
                batchInfo: {
                  batch_number: batchNumber,
                  issue_date: issueDate,
                  expiration_date: expirationDate,
                  shelf: shelf || undefined,
                  drawer: drawer || undefined,
                  section: section || undefined,
                  location_notes: locationNotes || undefined,
                }
              }
            : (specifyBatches && selectedBatches.length > 0)
              ? { /* Se procesa cada lote por separado en salidas con selección */ }
              : undefined,
        }
      ];

      // Para salidas con lotes específicos seleccionados, registrar por lote
      if (movementType === "salida" && specifyBatches && selectedBatches.length > 0) {
        const successResult = await recordMovementsWithBatchHandling(
          selectedBatches.map(batch => ({
            ...movements[0],
            quantity: batch.quantity,
            batchHandling: {
              batchId: batch.batchId
            }
          }))
        );

        if (!successResult.success) {
          throw new Error(successResult.error || "Error al registrar los movimientos");
        }

        if (successResult.batchIssues?.length) {
          // Mostrar advertencias pero permitir continuar
          console.warn("Advertencias de lotes:", successResult.batchIssues);
        }
      } else {
        // Para entradas y salidas sin lotes específicos
        const result = await recordMovementsWithBatchHandling(movements);

        if (!result.success) {
          throw new Error(result.error || "Error al registrar el movimiento");
        }

        if (result.batchIssues?.length) {
          // Mostrar advertencias pero permitir continuar
          console.warn("Advertencias de lotes:", result.batchIssues);
        }
      }


      // Limpiar formulario
      setQuantity("");
      setReason("");
      setNotes("");
      setBatchNumber("");
      setIssueDate("");
      setExpirationDate("");
      setShelf("");
      setDrawer("");
      setSection("");
      setLocationNotes("");
      setRecipeCode("");
      setRecipeDate("");
      setPatientName("");
      setPrescribedBy("");
      setCieCode("");
      setRecipeNotes("");
      setSpecifyBatches(false);
      setSelectedBatches([]);
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: MovementType) => {
    switch (type) {
      case "entrada":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "salida":
        return "bg-red-100 text-red-800 border-red-200";
      case "ajuste":
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getTypeLabel = (type: MovementType) => {
    switch (type) {
      case "entrada":
        return "Entrada de Stock";
      case "salida":
        return "Salida de Stock";
      case "ajuste":
        return "Ajuste de Inventario";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl my-2 flex flex-col max-h-[90vh] sm:max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fijo */}
        <div className="flex-shrink-0 border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3">
          <button
            onClick={onClose}
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
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Registrar Movimiento
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600">{product.name}</p>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form id="movement-form" onSubmit={handleSubmit} className="flex flex-col p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {(["entrada", "salida", "ajuste"] as MovementType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setMovementType(type);
                    setReason("");
                  }}
                  className={`rounded-lg border-2 px-2 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
                    movementType === type
                      ? getTypeColor(type) + " border-current"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {type === "entrada"
                    ? "📥 Entrada"
                    : type === "salida"
                      ? "📤 Salida"
                      : "⚙️ Ajuste"}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 10"
                className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                required
              />
            </div>

            {/* Campos específicos para ENTRADA (Lote) */}
            {movementType === "entrada" && (
              <>
                <CollapsibleSection title="Información del Lote" icon="📦" defaultOpen={true}>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                        Número de Lote <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          placeholder="Generar o ingresar..."
                          className="flex-1 rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                        <button
                          type="button"
                          onClick={generateBatchNumber}
                          className="rounded-lg bg-blue-600 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                          title="Generar número de lote automático"
                        >
                          Generar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                          Fecha de Expedición
                        </label>
                        <input
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                          Fecha de Vencimiento <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Ubicación del Lote" icon="📍" defaultOpen={false}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600">Estantería</label>
                        <input
                          type="text"
                          value={shelf}
                          onChange={(e) => setShelf(e.target.value)}
                          placeholder="A, B, C..."
                          className="w-full rounded-lg border border-slate-300 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600">Cajón/Nivel</label>
                        <input
                          type="text"
                          value={drawer}
                          onChange={(e) => setDrawer(e.target.value)}
                          placeholder="1, 2, 3..."
                          className="w-full rounded-lg border border-slate-300 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600">Sección</label>
                        <input
                          type="text"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          placeholder="Izq, Der, Cen..."
                          className="w-full rounded-lg border border-slate-300 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                        Notas de Ubicación
                      </label>
                      <textarea
                        value={locationNotes}
                        onChange={(e) => setLocationNotes(e.target.value)}
                        placeholder="Ubicación específica o referencias..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    required
                  >
                    <option value="">Seleccionar motivo...</option>
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                    Notas (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones adicionales..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </>
            )}

            {/* Para SALIDA y AJUSTE */}
            {movementType !== "entrada" && (
              <>
                <div>
                  <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    required
                  >
                    <option value="">Seleccionar motivo...</option>
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campos de receta médica (solo para salidas con "Entrega de receta") */}
                {movementType === "salida" && reason === "Entrega de receta" && (
                  <CollapsibleSection title="Información de Receta Médica" icon="📋" defaultOpen={true}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div>
                          <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                            Código de Receta
                          </label>
                          <input
                            type="text"
                            value={recipeCode}
                            onChange={(e) => setRecipeCode(e.target.value)}
                            placeholder="Ej: REC-2024-001"
                            className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                            Fecha de Receta
                          </label>
                          <input
                            type="date"
                            value={recipeDate}
                            onChange={(e) => setRecipeDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                          Nombre del Paciente
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="Nombre completo del paciente"
                          className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                          Prescrito por (Médico)
                        </label>
                        <input
                          type="text"
                          value={prescribedBy}
                          onChange={(e) => setPrescribedBy(e.target.value)}
                          placeholder="Nombre del médico"
                          className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                          Código CIE
                        </label>
                        <input
                          type="text"
                          value={cieCode}
                          onChange={(e) => setCieCode(e.target.value)}
                          placeholder="Código de diagnóstico CIE-10"
                          className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                          Notas de Receta
                        </label>
                        <textarea
                          value={recipeNotes}
                          onChange={(e) => setRecipeNotes(e.target.value)}
                          placeholder="Observaciones adicionales de la receta..."
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                <div>
                  <label className="mb-1 block text-xs sm:text-sm font-medium text-slate-700">
                    Notas (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Referencia de documento, observaciones..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-600">Stock Inicial</p>
                  <p className="font-semibold text-slate-900">{product.stock_inicial} unidades</p>
                </div>
                <div>
                  <p className="text-slate-600">Stock Actual</p>
                  <p className="font-semibold text-slate-900">{product.stock} unidades</p>
                </div>
              </div>
            </div>

            {/* Información sobre lotes para entradas */}
            {movementType === "entrada" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 sm:p-3 text-xs sm:text-sm">
                <p className="font-semibold text-blue-900 mb-1">📦 Crear nuevo lote</p>
                <p className="text-blue-700">Este ingreso creará un nuevo lote con los datos especificados arriba.</p>
              </div>
            )}

            {/* Especificar lotes para salidas */}
            {movementType === "salida" && availableBatches.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specifyBatches}
                    onChange={(e) => {
                      setSpecifyBatches(e.target.checked);
                      if (e.target.checked && availableBatches.length === 1 && quantity) {
                        // Si hay un solo lote, auto-cargar con la cantidad total (no se puede editar)
                        const qty = parseInt(quantity);
                        if (qty > 0) {
                          setSelectedBatches([{ batchId: availableBatches[0].id, quantity: qty }]);
                        }
                      } else if (!e.target.checked) {
                        setSelectedBatches([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm font-medium text-slate-700">
                    Especificar lotes manualmente
                  </span>
                </label>
                
                {specifyBatches && (
                  <CollapsibleSection title="Seleccionar Lotes" icon="📦" defaultOpen={true}>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 mb-2">
                        Selecciona de qué lote(s) se tomarán los productos:
                      </p>
                      {availableBatches.map((batch) => {
                        const batchSelection = selectedBatches.find(s => s.batchId === batch.id);
                        const isSelected = !!batchSelection;
                        
                        return (
                          <div key={batch.id} className="border border-slate-200 rounded-lg p-2 bg-white">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBatches([...selectedBatches, { batchId: batch.id, quantity: 0 }]);
                                  } else {
                                    setSelectedBatches(selectedBatches.filter(s => s.batchId !== batch.id));
                                  }
                                }}
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-900">{batch.batch_number}</span>
                                  <span className="text-xs text-slate-600">Stock: {batch.stock}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Vence: {new Date(batch.expiration_date).toLocaleDateString("es-EC")}
                                  {batch.shelf && ` • Estante: ${batch.shelf}`}
                                  {batch.drawer && ` • Cajón: ${batch.drawer}`}
                                </div>
                                {isSelected && (
                                  <div className="mt-2">
                                    {availableBatches.length === 1 ? (
                                      <div className="text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
                                        <p className="font-medium text-slate-700 mb-1">Cantidad de este lote:</p>
                                        <p className="text-slate-900 font-semibold">{batchSelection?.quantity || 0} unidades (automático)</p>
                                        <p className="text-slate-500 text-[10px] mt-1">Se retirará toda la cantidad del único lote disponible</p>
                                      </div>
                                    ) : (
                                      <>
                                        <label className="text-[11px] text-slate-600 block mb-1">Cantidad de este lote:</label>
                                        <input
                                          type="number"
                                          min="0"
                                          max={batch.stock}
                                          value={batchSelection?.quantity || 0}
                                          onChange={(e) => {
                                            const newQuantity = parseInt(e.target.value) || 0;
                                            setSelectedBatches(
                                              selectedBatches.map(s => 
                                                s.batchId === batch.id 
                                                  ? { ...s, quantity: Math.min(newQuantity, batch.stock) } 
                                                  : s
                                              )
                                            );
                                          }}
                                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          placeholder="0"
                                        />
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        );
                      })}
                      
                      {selectedBatches.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-700">
                            Total seleccionado: {selectedBatches.reduce((sum, s) => sum + s.quantity, 0)} unidades
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer fijo con botones */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col-reverse sm:flex-row gap-2 justify-end rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="movement-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-lg bg-slate-900 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isSubmitting 
              ? "Procesando..." 
              : movementType === "entrada" 
                ? "Crear Lote" 
                : "Registrar Movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
