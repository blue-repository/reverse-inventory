"use client";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  itemsWithQuantity: number;
  isValid?: boolean;
  error?: string | null;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting,
  itemsWithQuantity,
  isValid = true,
  error,
}: WizardNavigationProps) {
  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  return (
    <div className="flex-shrink-0 border-t border-slate-200 px-3 py-2 bg-slate-100 sticky bottom-0 z-20">
      {/* Error message si existe */}
      {error && (
        <div className="mb-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Botones de navegación */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstStep || isSubmitting}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Atrás
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || itemsWithQuantity === 0 || !isValid}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Guardando...
              </span>
            ) : (
              `Guardar (${itemsWithQuantity})`
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!isValid || isSubmitting}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
