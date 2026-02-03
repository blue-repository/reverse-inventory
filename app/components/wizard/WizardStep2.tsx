"use client";

import { MovementType } from "@/app/types/product";

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Entrega de receta", "Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

interface WizardStep2Props {
  movementType: MovementType;
  generalReason: string;
  onGeneralReasonChange: (reason: string) => void;
  generalNotes: string;
  onGeneralNotesChange: (notes: string) => void;
  // Campos de receta general
  generalRecipeCode: string;
  onGeneralRecipeCodeChange: (code: string) => void;
  generalRecipeDate: string;
  onGeneralRecipeDateChange: (date: string) => void;
  generalPatientName: string;
  onGeneralPatientNameChange: (name: string) => void;
  generalPrescribedBy: string;
  onGeneralPrescribedByChange: (by: string) => void;
  generalCieCode: string;
  onGeneralCieCodeChange: (code: string) => void;
  generalRecipeNotes: string;
  onGeneralRecipeNotesChange: (notes: string) => void;
}

export function WizardStep2({
  movementType,
  generalReason,
  onGeneralReasonChange,
  generalNotes,
  onGeneralNotesChange,
  generalRecipeCode,
  onGeneralRecipeCodeChange,
  generalRecipeDate,
  onGeneralRecipeDateChange,
  generalPatientName,
  onGeneralPatientNameChange,
  generalPrescribedBy,
  onGeneralPrescribedByChange,
  generalCieCode,
  onGeneralCieCodeChange,
  generalRecipeNotes,
  onGeneralRecipeNotesChange,
}: WizardStep2Props) {
  const showRecipeFields = movementType === "salida" && generalReason === "Entrega de receta";

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4 pb-20">
        {/* Motivo general */}
        <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Motivo del movimiento
        </label>
        <select
          value={generalReason}
          onChange={(e) => onGeneralReasonChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">— Selecciona un motivo —</option>
          {MOVEMENT_REASONS[movementType].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Notas generales */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Observaciones generales
        </label>
        <textarea
          value={generalNotes}
          onChange={(e) => onGeneralNotesChange(e.target.value)}
          maxLength={200}
          placeholder="Aplica a todos los productos"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-600">
          {generalNotes.length}/200
        </p>
      </div>

      {/* Campos de receta general (si aplica) */}
      {showRecipeFields && (
        <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
          <p className="text-xs font-semibold text-purple-700 uppercase">💊 Datos de Receta (General)</p>
          
          <input
            type="text"
            value={generalRecipeCode}
            onChange={(e) => onGeneralRecipeCodeChange(e.target.value)}
            placeholder="Código de receta"
            maxLength={50}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />

          <input
            type="date"
            value={generalRecipeDate}
            onChange={(e) => onGeneralRecipeDateChange(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />

          <input
            type="text"
            value={generalPatientName}
            onChange={(e) => onGeneralPatientNameChange(e.target.value)}
            placeholder="Nombre del paciente"
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />

          <input
            type="text"
            value={generalPrescribedBy}
            onChange={(e) => onGeneralPrescribedByChange(e.target.value)}
            placeholder="Médico prescriptor"
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />

          <input
            type="text"
            value={generalCieCode}
            onChange={(e) => onGeneralCieCodeChange(e.target.value)}
            placeholder="Código CIE"
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />

          <textarea
            value={generalRecipeNotes}
            onChange={(e) => onGeneralRecipeNotesChange(e.target.value)}
            placeholder="Notas adicionales de la receta"
            rows={2}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

        {/* Ayuda contextual */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-800">
            <span className="font-semibold">ℹ️ Tip:</span> Los datos aquí se aplicarán como predeterminados. 
            Podrás modificarlos por producto en el paso siguiente.
          </p>
        </div>
      </div>
    </div>
  );
}
