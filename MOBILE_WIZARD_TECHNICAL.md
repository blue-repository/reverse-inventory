# 🔧 Especificaciones Técnicas: Mobile Wizard para BulkMovementModal

## Visión General Arquitectónica

```
BulkMovementModal (Componente Principal)
│
├─ Mobile Detection: window.innerWidth < 640px
│
├─ IF isMobile
│  └─ Wizard Layout
│     ├─ WizardStepper
│     ├─ Step Components (1-5)
│     │  ├─ WizardStep1 (Config)
│     │  ├─ WizardStep2 (Datos)
│     │  ├─ WizardStep3 (Lote - Entrada)
│     │  ├─ WizardStep4 (Ubicación - Entrada)
│     │  └─ WizardStep5 (Resumen)
│     │     └─ ProductDetailDrawer (Modal)
│     └─ WizardNavigation
│
└─ ELSE Desktop
   └─ Grid Layout (Original)
```

## Estructura de Estado

### En BulkMovementModal

```tsx
// Estados del formulario (existentes)
const [items, setItems] = useState<BulkMovementItem[]>([]);
const [movementType, setMovementType] = useState<MovementType>("salida");
const [generalReason, setGeneralReason] = useState<string>("");
// ... resto de estados

// Estados del Wizard (nuevos)
const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
const [isMobile, setIsMobile] = useState(false);
const [stepErrors, setStepErrors] = useState<Record<number, string | null>>({
  1: null, 2: null, 3: null, 4: null, 5: null,
});
```

### Flujo de Datos

```
BulkMovementModal (source of truth)
    ↓ props & callbacks
    ├─ WizardStepN (presentational)
    │   ├─ Render UI
    │   └─ Call callbacks (onChange, onAddProduct, etc)
    │
    └─ WizardStep5
        ├─ ProductDetailDrawer
        │   ├─ localData state
        │   └─ onUpdate callback → updateItemData
        └─ onUpdateItemData (productId, Partial<BulkMovementItem>)
```

## Lógica de Validación

### validateStep(step: number): boolean

**Propósito:** Validar requisitos antes de avanzar

**Implementación:**
```tsx
switch (step) {
  case 1: return true; // Siempre válido
  case 2: return true; // Siempre válido
  case 3:
    if (movementType !== "entrada") return true;
    const hasLoteData = generalBatchNumber && generalExpirationDate;
    if (!hasLoteData) {
      setStepErrors(prev => ({ ...prev, [step]: "Mensaje..." }));
      return false;
    }
    return true;
  case 4: return true; // Siempre válido
  case 5:
    if (items.filter(i => i.quantity > 0).length === 0) {
      setStepErrors(prev => ({ ...prev, [step]: "Mensaje..." }));
      return false;
    }
    return true;
}
```

**Nota:** Mantiene paridad con validaciones desktop

---

### getTotalSteps(): number

**Retorna:**
- `5` si `movementType === "entrada"`
- `3` si `movementType === "salida" || "ajuste"`

---

### goToNextStep()

**Lógica:**
1. Valida paso actual
2. Si inválido: establece error, retorna
3. Si válido: busca siguiente paso válido
4. Salta pasos 3-4 automáticamente si no es entrada
5. Actualiza `currentStep`

**Pseudocódigo:**
```tsx
if (validateStep(currentStep)) {
  let nextStep = currentStep + 1;
  while (nextStep <= 5) {
    if (movementType !== "entrada" && (nextStep === 3 || 4)) {
      nextStep++;
    } else {
      break;
    }
  }
  if (nextStep <= 5) setCurrentStep(nextStep);
}
```

---

### goToPreviousStep()

**Similar a goToNextStep pero decrementa**

```tsx
let prevStep = currentStep - 1;
while (prevStep >= 1) {
  if (movementType !== "entrada" && (prevStep === 3 || 4)) {
    prevStep--;
  } else {
    break;
  }
}
if (prevStep >= 1) setCurrentStep(prevStep);
```

---

## Componentes Wizard: Interfaces TypeScript

### BulkMovementItem (Shared Type)

```tsx
type BulkMovementItem = {
  product: Product;
  quantity: number;
  reason: string;
  notes: string;
  useIndividualReason: boolean;
  
  // Para entradas (lote)
  batchNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  shelf?: string;
  drawer?: string;
  section?: string;
  locationNotes?: string;
  
  // Para recetas médicas
  recipeDate?: string;
  recipeCode?: string;
  patientName?: string;
  prescribedBy?: string;
  cieCode?: string;
  recipeNotes?: string;
};
```

---

### WizardStepper Props

```tsx
interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}
```

**Comportamiento:**
- Renderiza círculos 1...totalSteps
- Círculo actual: Verde (completado) o Indigo (activo)
- Líneas conectoras con transiciones

---

### WizardNavigation Props

```tsx
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
```

**Comportamiento:**
- Atrás: Deshabilitado si `currentStep === 1`
- Siguiente: Habilitado si `isValid`
- Guardar: Solo en `currentStep === totalSteps`

---

### WizardStep1Props

```tsx
interface WizardStep1Props {
  movementType: MovementType;
  onMovementTypeChange: (type: MovementType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearching: boolean;
  filteredProducts: Product[];
  onAddProduct: (product: Product) => void;
  onShowScanner: () => void;
  itemIds: Set<string>;
}
```

---

### WizardStep2Props

```tsx
interface WizardStep2Props {
  movementType: MovementType;
  generalReason: string;
  onGeneralReasonChange: (reason: string) => void;
  generalNotes: string;
  onGeneralNotesChange: (notes: string) => void;
  // Campos receta
  generalRecipeCode: string;
  onGeneralRecipeCodeChange: (code: string) => void;
  // ... resto de campos receta
}
```

---

### WizardStep5Props

```tsx
interface WizardStep5Props {
  items: BulkMovementItem[];
  movementType: MovementType;
  generalReason: string;
  generalNotes: string;
  onUpdateItemQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateItemData: (productId: string, data: Partial<BulkMovementItem>) => void;
  itemsWithWarning: Set<string>;
}
```

---

### ProductDetailDrawer Props

```tsx
interface ProductDetailDrawerProps {
  item: BulkMovementItem;
  movementType: MovementType;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<BulkMovementItem>) => void;
}
```

**Nota:** Usa `createPortal` para renderizar fuera del DOM tree

---

## Manejo de Eventos

### Entrada de Usuario → Cambios de Estado

```
Cambio en Input/Select
  ↓
Callback (onChange)
  ↓
BulkMovementModal actualiza estado
  ↓
Componente re-renderiza con nuevos props
  ↓
Cambio visible en UI
```

**Ejemplo:**
```tsx
// En WizardStep2
<select 
  value={generalReason}
  onChange={(e) => onGeneralReasonChange(e.target.value)}
>
```

---

### Navegación de Pasos

```
Click "Siguiente"
  ↓
WizardNavigation → onNext()
  ↓
goToNextStep() en BulkMovementModal
  ↓
validateStep(currentStep)
  ├─ Si VÁLIDO: setCurrentStep(next)
  └─ Si INVÁLIDO: setStepErrors[currentStep]
  ↓
Componente re-renderiza con nuevo currentStep
  ↓
Aparece WizardStepN correspondiente
```

---

## Detección de Dispositivo Móvil

### useEffect de Detección

```tsx
useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 640);
  };
  
  handleResize(); // Inicial
  window.addEventListener("resize", handleResize);
  
  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

**Breakpoint:** 640px = Tailwind `sm:` breakpoint

**Triggers:**
- Mount inicial
- Resize del viewport
- Rotación en mobile (cuenta como resize)

---

## Renderizado Condicional

### En Return Principal

```tsx
return (
  <>
    {isMobile && (
      <div className="...modal-container">
        <WizardStepper />
        <form>
          {currentStep === 1 && <WizardStep1 />}
          {currentStep === 2 && <WizardStep2 />}
          {currentStep === 3 && movementType === "entrada" && <WizardStep3 />}
          {currentStep === 4 && movementType === "entrada" && <WizardStep4 />}
          {currentStep === 5 && <WizardStep5 />}
          <WizardNavigation />
        </form>
      </div>
    )}
    
    {!isMobile && (
      // Grid layout original sin cambios
    )}
  </>
);
```

---

## Manejo de Datos Especiales

### ProductDetailDrawer - Estado Local

```tsx
const [localData, setLocalData] = useState<Partial<BulkMovementItem>>({
  quantity: item.quantity,
  reason: item.reason,
  // ... otros campos
});

// Cambios locales sin afectar parent
const handleChange = (field, value) => {
  setLocalData(prev => ({
    ...prev,
    [field]: value
  }));
};

// Guardar: callback al parent
const handleSave = () => {
  onUpdate(localData);
  onClose();
};
```

---

### Edición de Receta Médica

**Condicionales:**
1. **Visible en Step2 si:**
   - `movementType === "salida"`
   - AND `generalReason === "Entrega de receta"`

2. **Editable en Drawer si:**
   - `movementType === "salida"`
   - AND `item.reason === "Entrega de receta"`

**Campos:**
- `recipeCode`, `recipeDate`, `patientName`
- `prescribedBy`, `cieCode`, `recipeNotes`

---

### Manejo de Lotes

**Step3 (Entrada):**
- Genera: `LOTE-YYYYMMDD-XXX`
- Requiere: `generalBatchNumber` + `generalExpirationDate`

**En ProductDetailDrawer:**
- Permite sobrescribir batch individual
- Mantiene relación con batch general

---

## Integración con Funciones Existentes

### updateItemData (Nueva Función)

```tsx
const updateItemData = (productId: string, data: Partial<BulkMovementItem>) => {
  setItems((prev) =>
    prev.map((item) =>
      item.product.id === productId 
        ? { ...item, ...data } 
        : item
    )
  );
};
```

**Usada por:**
- ProductDetailDrawer.onUpdate
- Permite cambios de múltiples campos simultáneamente

---

### Funciones Existentes Reutilizadas

```
updateItemQuantity()     ← WizardStep5, Drawer
removeItem()             ← WizardStep5
addProduct()             ← WizardStep1
handleProductScanned()   ← WizardStep1 (Scanner)
generateGeneralBatchNumber() ← WizardStep3
handleSubmit()           ← WizardNavigation (Guardar)
validateItemsForMovementType() ← WizardStep1 (cambio tipo)
```

---

## Performance & Optimización

### Re-renders Minimizados

- Components son `React.FC` sin useless re-renders
- Props son específicas para cada Step
- No se pasan funciones inline (creadas en parent)

### Recomendaciones

1. **Memoización (futura):**
   ```tsx
   export const WizardStep1 = React.memo(({ ... }: Props) => {
     // Evita re-renders si props no cambian
   });
   ```

2. **useCallback (futura):**
   ```tsx
   const onAddProduct = useCallback(
     (product: Product) => { /* ... */ },
     [items] // Depende de items
   );
   ```

---

## Testing

### Test Básicos Recomendados

```typescript
describe("WizardStep1", () => {
  test("debería renderizar opciones de tipo movimiento", () => {
    // render(<WizardStep1 {...props} />)
    // expect(screen.getByText("Entrada"))
  });
  
  test("debería llamar onAddProduct al agregar", () => {
    // userEvent.click(addButton)
    // expect(onAddProduct).toHaveBeenCalledWith(product)
  });
});

describe("validateStep", () => {
  test("debería requerir batch + vencimiento en Step3", () => {
    // expect(validateStep(3, "entrada", {batch: "", exp: ""})).toBe(false)
  });
});
```

---

## Errores Conocidos & Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| Modal no detecta mobile | Listeners no attached | Verificar useEffect de resize |
| Datos se pierden al navegar | State en Step component | Mover todo a BulkMovementModal |
| Drawer no aparece | z-index incorrecto | Portal en body, z-index 9999 |
| Validación no bloquea | setStepErrors no usado | Revisar isValid prop en Navigation |

---

## Deployment Checklist

- [ ] Compilación sin errores (`npm run build`)
- [ ] TypeScript sin warnings (`npx tsc --noEmit`)
- [ ] ESLint limpio (`npm run lint`)
- [ ] Tested en mobile real (<640px)
- [ ] Tested en desktop (>640px)
- [ ] Rotating device actualiza layout
- [ ] Todos los pasos validan correctamente
- [ ] Datos persisten entre navegación
- [ ] Drawer abre/cierra correctamente
- [ ] Submit guarda en BD

---

## Versión & Historial

- **v1.0** (Jan 2025): Implementación inicial
  - 8 componentes wizard
  - Detección mobile automática
  - Validación por pasos
  - Edición individual en drawer

---

## Contacto & Soporte

Para preguntas técnicas sobre la implementación, referirse a:
- `MOBILE_WIZARD_IMPLEMENTATION.md` - Detalles de implementación
- `MOBILE_WIZARD_USER_GUIDE.md` - Guía de usuario
- Código fuente comentado en `app/components/wizard/*`

