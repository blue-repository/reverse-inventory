"use client";

interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function WizardStepper({ 
  currentStep, 
  totalSteps = 5,
  labels = ["Config", "Datos", "Lote", "Ubicación", "Resumen"]
}: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-200">
      {/* Indicador visual de pasos */}
      <div className="flex items-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          
          return (
            <div key={i} className="flex items-center">
              {/* Círculo del paso */}
              <div 
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${isActive 
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2' 
                    : isDone 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                  }
                `}
                title={labels[i]}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>

              {/* Línea conectora */}
              {i < totalSteps - 1 && (
                <div 
                  className={`w-3 h-0.5 mx-1 transition-colors ${
                    isDone ? 'bg-green-500' : 'bg-gray-300'
                  }`} 
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Texto "Paso X de Y" */}
      <span className="text-xs font-semibold text-slate-600 whitespace-nowrap ml-2">
        Paso {currentStep}/{totalSteps}
      </span>
    </div>
  );
}
