"use client";

interface WizardStep3Props {
  generalBatchNumber: string;
  onGeneralBatchNumberChange: (number: string) => void;
  onGenerateBatchNumber: () => void;
  generalIssueDate: string;
  onGeneralIssueDateChange: (date: string) => void;
  generalExpirationDate: string;
  onGeneralExpirationDateChange: (date: string) => void;
}

export function WizardStep3({
  generalBatchNumber,
  onGeneralBatchNumberChange,
  onGenerateBatchNumber,
  generalIssueDate,
  onGeneralIssueDateChange,
  generalExpirationDate,
  onGeneralExpirationDateChange,
}: WizardStep3Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4 pb-20">
        <p className="text-sm text-slate-600">
        Configura los datos de lote que se aplicarán como predeterminados a todos los productos.
      </p>

      {/* Número de Lote */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Número de Lote
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={generalBatchNumber}
            onChange={(e) => onGeneralBatchNumberChange(e.target.value)}
            placeholder="LOTE-YYYYMMDD-XXX"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={onGenerateBatchNumber}
            className="rounded-lg bg-blue-600 px-3 py-2.5 text-white hover:bg-blue-700 transition-colors"
            title="Generar número de lote aleatorio"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-600">Generar automático o ingresar manualmente</p>
      </div>

      {/* Fecha de Expedición */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Fecha de Expedición
        </label>
        <input
          type="date"
          value={generalIssueDate}
          onChange={(e) => onGeneralIssueDateChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Fecha de Vencimiento */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Fecha de Vencimiento <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={generalExpirationDate}
          onChange={(e) => onGeneralExpirationDateChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-600">Requerida para todos los ingresos</p>
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs text-amber-800">
          <span className="font-semibold">⚠️ Importante:</span> Debes ingresar al menos la fecha de vencimiento 
          para poder continuar.
        </p>
      </div>
      </div>
    </div>
  );
}
