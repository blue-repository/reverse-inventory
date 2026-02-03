"use client";

interface WizardStep4Props {
  generalShelf: string;
  onGeneralShelfChange: (shelf: string) => void;
  generalDrawer: string;
  onGeneralDrawerChange: (drawer: string) => void;
  generalSection: string;
  onGeneralSectionChange: (section: string) => void;
  generalLocationNotes: string;
  onGeneralLocationNotesChange: (notes: string) => void;
}

export function WizardStep4({
  generalShelf,
  onGeneralShelfChange,
  generalDrawer,
  onGeneralDrawerChange,
  generalSection,
  onGeneralSectionChange,
  generalLocationNotes,
  onGeneralLocationNotesChange,
}: WizardStep4Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4 pb-20">
        <p className="text-sm text-slate-600">
        Define la ubicación predeterminada para los productos. Estos datos son opcionales.
      </p>

      {/* Grid 3 columnas para ubicación */}
      <div className="grid grid-cols-3 gap-3">
        {/* Estantería */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Estantería
          </label>
          <input
            type="text"
            value={generalShelf}
            onChange={(e) => onGeneralShelfChange(e.target.value)}
            placeholder="A, B, C..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Cajón/Nivel */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Cajón/Nivel
          </label>
          <input
            type="text"
            value={generalDrawer}
            onChange={(e) => onGeneralDrawerChange(e.target.value)}
            placeholder="1, 2, 3..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Sección */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Sección
          </label>
          <input
            type="text"
            value={generalSection}
            onChange={(e) => onGeneralSectionChange(e.target.value)}
            placeholder="Izq, Der, Cen..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Notas de ubicación */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Notas de Ubicación
        </label>
        <textarea
          value={generalLocationNotes}
          onChange={(e) => onGeneralLocationNotesChange(e.target.value)}
          placeholder="Detalles específicos, referencias visuales, o instrucciones especiales..."
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">ℹ️ Tip:</span> Esta información sirve para organizar el almacén. 
          Puedes dejar vacío y rellenar por producto en el siguiente paso si prefieres.
        </p>
      </div>
      </div>
    </div>
  );
}
