"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Product, MovementType, ProductBatch } from "@/app/types/product";
import { recordMovementsWithBatchHandling, searchProducts, getProductBatches } from "@/app/actions/products";
import { useUser } from "@/app/context/UserContext";
import { containsNormalized } from "@/app/lib/search-utils";
import BarcodeScannerModal from "@/app/components/BarcodeScannerModal";
import { WizardStepper } from "@/app/components/wizard/WizardStepper";
import { WizardNavigation } from "@/app/components/wizard/WizardNavigation";
import { WizardStep1 } from "@/app/components/wizard/WizardStep1";
import { WizardStep2 } from "@/app/components/wizard/WizardStep2";
import { WizardStep3 } from "@/app/components/wizard/WizardStep3";
import { WizardStep4 } from "@/app/components/wizard/WizardStep4";
import { WizardStep5 } from "@/app/components/wizard/WizardStep5";

// Componente para secciones colapsables
function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  icon = "📋",
  badge
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  icon?: string;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-300 hover:bg-gray-400 transition-colors"
      >
        <span className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span>{icon}</span>
          {title}
          {badge && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              {badge}
            </span>
          )}
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
        <div className="p-3 bg-white border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

type BulkMovementItem = {
  product: Product;
  quantity: number | "";
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
  // Campos de receta médica (solo para salidas con "Entrega de receta")
  recipeDate?: string; // Disponible para todos los movimientos
  recipeCode?: string;
  patientName?: string;
  prescribedBy?: string;
  cieCode?: string;
  recipeNotes?: string;
  // Campos para selección de lotes en salidas
  specifyBatches?: boolean;
  availableBatches?: ProductBatch[];
  selectedBatches?: {batchId: string; quantity: number}[];
  loadingBatches?: boolean;
};

type BulkMovementModalProps = {
  products: Product[];
  onClose: () => void;
  onSuccess?: () => void;
};

const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  entrada: ["Compra", "Devolución de cliente", "Reposición", "Otro"],
  salida: ["Entrega de receta", "Venta", "Devolución a proveedor", "Pérdida", "Rotura", "Expiración", "Otro"],
  ajuste: ["Corrección de inventario", "Ajuste administrativo", "Otro"],
};

export default function BulkMovementModal({ products, onClose, onSuccess }: BulkMovementModalProps) {
  const { currentUser } = useUser();
  const [movementType, setMovementType] = useState<MovementType>("salida");
  const [items, setItems] = useState<BulkMovementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Product[]>(products);
  const [isSearching, setIsSearching] = useState(false);
  const [generalReason, setGeneralReason] = useState<string>("");
  const [generalNotes, setGeneralNotes] = useState<string>("");
  // Campos generales para lotes (entrada)
  const [generalBatchNumber, setGeneralBatchNumber] = useState<string>("");
  const [generalIssueDate, setGeneralIssueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [generalExpirationDate, setGeneralExpirationDate] = useState<string>("");
  const [generalShelf, setGeneralShelf] = useState<string>("");
  const [generalDrawer, setGeneralDrawer] = useState<string>("");
  const [generalSection, setGeneralSection] = useState<string>("");
  const [generalLocationNotes, setGeneralLocationNotes] = useState<string>("");
  // Campos generales para receta (salida)
  const [generalRecipeCode, setGeneralRecipeCode] = useState<string>("");
  const [generalRecipeDate, setGeneralRecipeDate] = useState<string>("");
  const [generalPatientName, setGeneralPatientName] = useState<string>("");
  const [generalPrescribedBy, setGeneralPrescribedBy] = useState<string>("");
  const [generalCieCode, setGeneralCieCode] = useState<string>("");
  const [generalRecipeNotes, setGeneralRecipeNotes] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemsWithWarning, setItemsWithWarning] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Estados del Wizard (mobile)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isMobile, setIsMobile] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  });

  // Refs y estados para dropdown
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filtrar productos basados en búsqueda
  const filteredProducts = searchResults.filter(
    (p) =>
      !items.find((item) => item.product.id === p.id) &&
      (containsNormalized(p.name, searchQuery) ||
        (p.barcode && containsNormalized(p.barcode, searchQuery)))
  );

  // Calcular posición del dropdown (responde a scroll/resize)
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (!searchInputRef.current || !searchQuery) {
        setDropdownPosition(null);
        return;
      }

      const rect = searchInputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownEstimatedHeight = 260; // px aprox
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const top = placeAbove
        ? Math.max(8, rect.top - dropdownEstimatedHeight - 6)
        : rect.bottom + 6;

      setDropdownPosition({
        top,
        left: rect.left,
        width: Math.max(rect.width, 320), // mínimo 320px para mobile
      });
    };

    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [searchQuery, isSearching]);

  // Búsqueda remota cuando se escribe en el buscador
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const term = searchQuery.trim();

    // Con pocos caracteres, mostrar los productos ya cargados (paginados)
    if (term.length < 2) {
      setSearchResults(products);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await searchProducts(term, 1, 50);
        setSearchResults(data || []);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, products]);

  // Cargar lotes disponibles para cada producto cuando es salida
  useEffect(() => {
    if (movementType === "salida") {
      // Cargar lotes para cada producto en la lista
      items.forEach(async (item) => {
        if (!item.loadingBatches && !item.availableBatches) {
          // Marcar como cargando
          setItems((prev) =>
            prev.map((i) =>
              i.product.id === item.product.id
                ? { ...i, loadingBatches: true }
                : i
            )
          );

          try {
            const result = await getProductBatches(item.product.id);
            const activeBatches = (result.data || []).filter(
              (b) => b.stock > 0 && b.is_active
            );

            setItems((prev) =>
              prev.map((i) =>
                i.product.id === item.product.id
                  ? {
                      ...i,
                      availableBatches: activeBatches,
                      loadingBatches: false,
                    }
                  : i
              )
            );
          } catch (error) {
            console.error("Error loading batches:", error);
            setItems((prev) =>
              prev.map((i) =>
                i.product.id === item.product.id
                  ? { ...i, loadingBatches: false }
                  : i
              )
            );
          }
        }
      });
    } else {
      // Limpiar datos de lotes si no es salida
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          specifyBatches: false,
          availableBatches: undefined,
          selectedBatches: undefined,
          loadingBatches: false,
        }))
      );
    }
  }, [movementType, items.length]);

  // Validar items cuando cambia el tipo de movimiento
  const validateItemsForMovementType = (type: MovementType, currentItems: BulkMovementItem[]) => {
    const warnings = new Set<string>();
    
    if (type === "salida") {
      // En salida, no se puede vender productos sin stock
      currentItems.forEach((item) => {
        // Producto sin stock
        if (item.product.stock === 0) {
          warnings.add(item.product.id);
        }
        // Cantidad mayor al stock disponible
        else if (item.quantity !== "" && item.quantity > item.product.stock) {
          warnings.add(item.product.id);
        }
      });
    }
    
    setItemsWithWarning(warnings);
    return warnings;
  };

  // Agregar producto al escanear
  const handleProductScanned = (product: Product) => {
    setItems((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev;
      }
      return [
        ...prev,
        {
          product,
          quantity: "",
          reason: "",
          notes: "",
           useIndividualReason: false,
          batchNumber: "",
          issueDate: new Date().toISOString().split("T")[0],
          expirationDate: "",
          shelf: "",
          drawer: "",
          section: "",
          locationNotes: "",
          recipeDate: "",
          recipeCode: "",
          patientName: "",
          prescribedBy: "",
          cieCode: "",
          recipeNotes: "",
          specifyBatches: false,
          availableBatches: undefined,
          selectedBatches: [],
          loadingBatches: false,
        },
      ];
    });
    setShowScanner(false);
  };

  // Agregar producto desde búsqueda
  const addProduct = (product: Product) => {
    setItems((prev) => [
      ...prev,
      {
        product,
        quantity: "",
        reason: "",
        notes: "",
        useIndividualReason: false,
        batchNumber: "",
        issueDate: new Date().toISOString().split("T")[0],
        expirationDate: "",
        shelf: "",
        drawer: "",
        section: "",
        locationNotes: "",
        recipeDate: "",
        recipeCode: "",
        patientName: "",
        prescribedBy: "",
        cieCode: "",
        recipeNotes: "",
        specifyBatches: false,
        availableBatches: undefined,
        selectedBatches: [],
        loadingBatches: false,
      },
    ]);
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Remover producto de la lista
  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Actualizar cantidad
  const updateItemQuantity = (productId: string, quantity: number | "") => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = quantity === "" ? "" : Math.max(0, quantity);
          
          // Si es único lote y specifyBatches está activo, actualizar automáticamente selectedBatches
          if (
            movementType === "salida" &&
            item.specifyBatches &&
            item.availableBatches &&
            item.availableBatches.length === 1 &&
            newQuantity !== "" &&
            newQuantity > 0
          ) {
            return {
              ...item,
              quantity: newQuantity,
              selectedBatches: [{ batchId: item.availableBatches[0].id, quantity: newQuantity }]
            };
          }
          
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
    
    // Revalidar advertencias después de cambiar cantidad
    if (movementType === "salida") {
      validateItemsForMovementType(movementType, items);
    }
  };

  // Actualizar motivo
  const updateItemReason = (productId: string, reason: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, reason } : item
      )
    );
  };

   // Alternar uso de motivo individual
   const toggleIndividualReason = (productId: string) => {
     setItems((prev) =>
       prev.map((item) =>
         item.product.id === productId 
           ? { ...item, useIndividualReason: !item.useIndividualReason, reason: !item.useIndividualReason ? item.reason : "" } 
           : item
       )
     );
   };

  // Actualizar código de receta
  const updateItemRecipeCode = (productId: string, recipeCode: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, recipeCode } : item
      )
    );
  };

  // Actualizar notas
  const updateItemNotes = (productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

  // Generar batch number para producto individual
  const generateBatchNumber = (productId: string) => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const batchNumber = `LOTE-${dateStr}-${random}`;

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, batchNumber } : item
      )
    );
  };

  // Generar batch number general
  const generateGeneralBatchNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const batchNumber = `LOTE-${dateStr}-${random}`;
    setGeneralBatchNumber(batchNumber);
  };

  // Actualizar campos de receta
  const updateItemRecipeDate = (productId: string, recipeDate: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, recipeDate } : item
      )
    );
  };

  const updateItemPatientName = (productId: string, patientName: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, patientName } : item
      )
    );
  };

  const updateItemPrescribedBy = (productId: string, prescribedBy: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, prescribedBy } : item
      )
    );
  };

  const updateItemCieCode = (productId: string, cieCode: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, cieCode } : item
      )
    );
  };

  const updateItemRecipeNotes = (productId: string, recipeNotes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, recipeNotes } : item
      )
    );
  };

  // Actualizar campos de lote para items individuales
  const updateItemBatchNumber = (productId: string, batchNumber: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, batchNumber } : item
      )
    );
  };

  const updateItemExpirationDate = (productId: string, expirationDate: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, expirationDate } : item
      )
    );
  };

  const updateItemIssueDate = (productId: string, issueDate: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, issueDate } : item
      )
    );
  };

  const updateItemShelf = (productId: string, shelf: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, shelf } : item
      )
    );
  };

  const updateItemDrawer = (productId: string, drawer: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, drawer } : item
      )
    );
  };

  const updateItemSection = (productId: string, section: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, section } : item
      )
    );
  };

  const updateItemLocationNotes = (productId: string, locationNotes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, locationNotes } : item
      )
    );
  };

  // Función genérica para actualizar datos de items
  const updateItemData = (productId: string, data: Partial<BulkMovementItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, ...data } : item
      )
    );
  };

  // Funciones para manejar selección de lotes
  const toggleSpecifyBatches = (productId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newSpecifyBatches = !item.specifyBatches;
          
          // Si se activa y hay un solo lote, auto-cargar con la cantidad total
          if (newSpecifyBatches && item.availableBatches && item.availableBatches.length === 1 && item.quantity !== "") {
            const qty = typeof item.quantity === "string" ? 0 : item.quantity;
            if (qty > 0) {
              return {
                ...item,
                specifyBatches: newSpecifyBatches,
                selectedBatches: [{ batchId: item.availableBatches[0].id, quantity: qty }]
              };
            }
          }
          
          // Si se desactiva, limpiar selecciones
          return {
            ...item,
            specifyBatches: newSpecifyBatches,
            selectedBatches: newSpecifyBatches ? item.selectedBatches : []
          };
        }
        return item;
      })
    );
  };

  const updateBatchQuantity = (productId: string, batchId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const selectedBatches = item.selectedBatches || [];
          const exists = selectedBatches.find(s => s.batchId === batchId);
          
          if (exists) {
            return {
              ...item,
              selectedBatches: selectedBatches.map(s =>
                s.batchId === batchId ? { ...s, quantity } : s
              )
            };
          } else {
            if (quantity > 0) {
              return {
                ...item,
                selectedBatches: [...selectedBatches, { batchId, quantity }]
              };
            }
          }
        }
        return item;
      })
    );
  };

  const removeBatchSelection = (productId: string, batchId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            selectedBatches: (item.selectedBatches || []).filter(s => s.batchId !== batchId)
          };
        }
        return item;
      })
    );
  };

  // Guardar movimientos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      setError("Usuario no identificado");
      return;
    }

    // Validar que al menos un producto tenga cantidad
    const hasQuantities = items.some((item) => item.quantity !== "" && item.quantity > 0);
    if (!hasQuantities) {
      setError("Debe ingresar al menos una cantidad");
      return;
    }

    // Validar que no haya items con advertencia
    if (itemsWithWarning.size > 0) {
      setError("Hay productos con problemas de stock. Por favor remuevalos o cambie el tipo de movimiento.");
      return;
    }

    // Para entradas, validar que tengan datos de lote
    if (movementType === "entrada") {
      const invalidEntries = items.filter((item) => {
        if (item.quantity === "" || item.quantity === 0) return false;
        
        // Determinar qué valores usar: individuales o generales
        const batchNumber = item.batchNumber || generalBatchNumber;
        const expirationDate = item.expirationDate || generalExpirationDate;
        
        // Validar que ambos tengan valor
        return !batchNumber || !expirationDate;
      });
      
      if (invalidEntries.length > 0) {
        setError(
          "Todos los ingresos deben tener número de lote y fecha de vencimiento"
        );
        return;
      }
    }

    // Motivo requerido cuando se habilita motivo individual
    const missingIndividualReasons = items.some(
      (item) => item.quantity !== "" && item.quantity > 0 && item.useIndividualReason && !(item.reason && item.reason.trim())
    );
    if (missingIndividualReasons) {
      setError("Debes seleccionar un motivo para cada producto con motivo individual habilitado");
      return;
    }

    // Validaciones para salidas con lotes específicos
    if (movementType === "salida") {
      for (const item of items) {
        if (item.quantity === "" || item.quantity === 0) continue;
        
        if (item.specifyBatches && item.selectedBatches) {
          if (item.selectedBatches.length === 0) {
            setError(`Debes seleccionar al menos un lote para ${item.product.name}`);
            return;
          }
          
          const totalFromBatches = item.selectedBatches.reduce((sum, s) => sum + s.quantity, 0);
          const qty = typeof item.quantity === "string" ? 0 : item.quantity;
          
          // Si hay 1 lote, debe ser igual al total
          if (item.availableBatches && item.availableBatches.length === 1 && totalFromBatches !== qty) {
            setError(`Con un solo lote disponible para ${item.product.name}, se debe retirar toda la cantidad (${qty} unidades) del lote.`);
            return;
          }
          
          // Si hay más de 1 lote, debe cuadrar exactamente
          if (item.availableBatches && item.availableBatches.length > 1 && totalFromBatches !== qty) {
            setError(`Para ${item.product.name}, la cantidad total de los lotes (${totalFromBatches}) debe coincidir con la cantidad a egresar (${qty})`);
            return;
          }
          
          // Validar que todas las cantidades sean mayores a 0
          const hasZeroQuantity = item.selectedBatches.some(s => s.quantity <= 0);
          if (hasZeroQuantity) {
            setError(`Para ${item.product.name}, todos los lotes seleccionados deben tener una cantidad mayor a 0`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Generar UUIDs
      const movementGroupId = crypto.randomUUID();
      const generalPrescriptionGroupId = crypto.randomUUID();
      const movementDate = new Date().toISOString();

      // Procesar cada movimiento
      const movements = items
        .filter((item) => item.quantity !== "" && item.quantity > 0)
        .map((item) => {
           const itemReason = (item.useIndividualReason && item.reason) ? item.reason : (generalReason || "Sin especificar");
          const isRecipeMovement = itemReason === "Entrega de receta";
          // Si el producto tiene motivo individual "Entrega de receta", generar ID único
           const hasIndividualReason = item.useIndividualReason && item.reason && item.reason.trim() !== "";
          const prescriptionGroupId = isRecipeMovement && hasIndividualReason 
            ? crypto.randomUUID() 
            : generalPrescriptionGroupId;
          
          return {
            product_id: item.product.id,
            quantity: typeof item.quantity === "string" ? 0 : item.quantity,
            type: movementType as MovementType,
            reason: itemReason,
            notes: item.notes || generalNotes || "",
            user_id: currentUser || "Sistema",
            // Campos automáticos
            movement_group_id: movementGroupId,
            movement_date: movementDate,
            is_recipe_movement: isRecipeMovement,
            // Datos de lote para entradas (usa valores individuales o generales como fallback)
            batch_number: movementType === "entrada" ? (item.batchNumber || generalBatchNumber || undefined) : undefined,
            issue_date: movementType === "entrada" ? (item.issueDate || generalIssueDate || undefined) : undefined,
            expiration_date: movementType === "entrada" ? (item.expirationDate || generalExpirationDate || undefined) : undefined,
            shelf: movementType === "entrada" ? (item.shelf || generalShelf || undefined) : undefined,
            drawer: movementType === "entrada" ? (item.drawer || generalDrawer || undefined) : undefined,
            section: movementType === "entrada" ? (item.section || generalSection || undefined) : undefined,
            location_notes: movementType === "entrada" ? (item.locationNotes || generalLocationNotes || undefined) : undefined,
            // Campos de receta médica (solo para salidas con "Entrega de receta")
            prescription_group_id: isRecipeMovement ? prescriptionGroupId : undefined,
            recipe_code: isRecipeMovement ? (item.recipeCode || generalRecipeCode || undefined) : undefined,
            recipe_date: isRecipeMovement ? (item.recipeDate || generalRecipeDate || undefined) : undefined,
            patient_name: isRecipeMovement ? (item.patientName || generalPatientName || "") : undefined,
            prescribed_by: isRecipeMovement ? (item.prescribedBy || generalPrescribedBy || "") : undefined,
            cie_code: isRecipeMovement ? (item.cieCode || generalCieCode || "") : undefined,
            recipe_notes: isRecipeMovement ? (item.recipeNotes || generalRecipeNotes || "") : undefined,
            // Lotes específicos para salidas
            specific_batches: (movementType === "salida" && item.specifyBatches && item.selectedBatches && item.selectedBatches.length > 0) 
              ? item.selectedBatches 
              : undefined,
          };
        });

      // Procesar movimientos usando función centralizada
      if (movementType === "salida") {
        // Para salidas: procesar lote por lote si se especificaron, o todo junto
        const salidaMovements: any[] = [];
        const salidaItems = items.filter((item) => item.quantity !== "" && item.quantity > 0);

        for (const item of salidaItems) {
          const qty = typeof item.quantity === "string" ? 0 : item.quantity;
          const itemReason = (item.useIndividualReason && item.reason)
            ? item.reason
            : (generalReason || "Sin especificar");
          const isRecipeMovement = itemReason === "Entrega de receta";
          const hasIndividualReason = item.useIndividualReason && item.reason && item.reason.trim() !== "";
          const prescriptionGroupId = isRecipeMovement && hasIndividualReason 
            ? crypto.randomUUID() 
            : generalPrescriptionGroupId;

          // Si hay lotes específicos seleccionados, crear un movimiento por lote
          if (item.specifyBatches && item.selectedBatches && item.selectedBatches.length > 0) {
            for (const selectedBatch of item.selectedBatches) {
              salidaMovements.push({
                product_id: item.product.id,
                quantity: selectedBatch.quantity,
                type: movementType,
                reason: itemReason,
                notes: item.notes || generalNotes || "",
                recorded_by: currentUser || "Sistema",
                movement_group_id: movementGroupId,
                movement_date: movementDate,
                is_recipe_movement: isRecipeMovement,
                ...(isRecipeMovement && {
                  prescription_group_id: prescriptionGroupId,
                  recipe_code: item.recipeCode || generalRecipeCode || undefined,
                  recipe_date: item.recipeDate || generalRecipeDate || undefined,
                  patient_name: item.patientName || generalPatientName || undefined,
                  prescribed_by: item.prescribedBy || generalPrescribedBy || undefined,
                  cie_code: item.cieCode || generalCieCode || undefined,
                  recipe_notes: item.recipeNotes || generalRecipeNotes || undefined,
                }),
                batchHandling: {
                  batchId: selectedBatch.batchId
                }
              });
            }
          } else {
            // Sin lotes específicos: procesar cantidad total
            salidaMovements.push({
              product_id: item.product.id,
              quantity: qty,
              type: movementType,
              reason: itemReason,
              notes: item.notes || generalNotes || "",
              recorded_by: currentUser || "Sistema",
              movement_group_id: movementGroupId,
              movement_date: movementDate,
              is_recipe_movement: isRecipeMovement,
              ...(isRecipeMovement && {
                prescription_group_id: prescriptionGroupId,
                recipe_code: item.recipeCode || generalRecipeCode || undefined,
                recipe_date: item.recipeDate || generalRecipeDate || undefined,
                patient_name: item.patientName || generalPatientName || undefined,
                prescribed_by: item.prescribedBy || generalPrescribedBy || undefined,
                cie_code: item.cieCode || generalCieCode || undefined,
                recipe_notes: item.recipeNotes || generalRecipeNotes || undefined,
              }),
            });
          }
        }

        if (salidaMovements.length > 0) {
          const result = await recordMovementsWithBatchHandling(salidaMovements);
          if (!result.success) {
            throw new Error(result.error || "Error al registrar movimientos de salida");
          }
          if (result.batchIssues?.length) {
            console.warn("Advertencias de lotes:", result.batchIssues);
          }
        }
      } else {
        // Para entradas y ajustes: convertir a formato centralizado
        if (movements.length > 0) {
          const formattedMovements = movements.map(mov => ({
            ...mov,
            batchHandling: movementType === "entrada" && mov.batch_number
              ? {
                  batchInfo: {
                    batch_number: mov.batch_number,
                    issue_date: mov.issue_date,
                    expiration_date: mov.expiration_date,
                    shelf: mov.shelf,
                    drawer: mov.drawer,
                    section: mov.section,
                    location_notes: mov.location_notes,
                  }
                }
              : undefined,
          }));

          const result = await recordMovementsWithBatchHandling(formattedMovements);
          if (!result.success) {
            throw new Error(result.error || "Error al registrar movimientos");
          }
          if (result.batchIssues?.length) {
            console.warn("Advertencias de lotes:", result.batchIssues);
          }
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar movimientos");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detectar clics fuera del modal (solo si no hay scanner abierto)
  useEffect(() => {
    if (showScanner) return; // No cerrar si el scanner está abierto
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Si hay dropdown abierto y se hace clic fuera de él, cerrarlo
      if (dropdownRef.current && !dropdownRef.current.contains(target) && searchQuery) {
        setSearchQuery("");
        return;
      }
      
      // Si se hace clic fuera del modal Y fuera del dropdown, cerrar el modal
      if (
        modalRef.current && 
        !modalRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC para cerrar el dropdown primero
      if (event.key === "Escape" && searchQuery) {
        setSearchQuery("");
        return;
      }
      // ESC para cerrar el modal
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, showScanner, searchQuery]);

  const itemsWithQuantity = items.filter((item) => item.quantity !== "" && item.quantity > 0);

  // Detectar clics fuera del modal (solo si no hay scanner abierto)
  useEffect(() => {
    if (showScanner) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (dropdownRef.current && !dropdownRef.current.contains(target) && searchQuery) {
        setSearchQuery("");
        return;
      }
      
      if (
        modalRef.current && 
        !modalRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && searchQuery) {
        setSearchQuery("");
        return;
      }
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, showScanner, searchQuery]);

  // Detectar dispositivo móvil
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize(); // Inicial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Validar paso del wizard
  const validateStep = (step: number): boolean => {
    setStepErrors(prev => ({ ...prev, [step]: null }));

    switch (step) {
      case 1:
        return true;
      
      case 2:
        return true;
      
      case 3:
        if (movementType !== "entrada") return true;
        const hasLoteData = generalBatchNumber && generalExpirationDate;
        if (!hasLoteData) {
          setStepErrors(prev => ({ ...prev, [step]: "Debes ingresar número de lote y fecha de vencimiento" }));
          return false;
        }
        return true;
      
      case 4:
        return true;
      
      case 5:
        if (items.filter(i => i.quantity !== "" && i.quantity > 0).length === 0) {
          setStepErrors(prev => ({ ...prev, [step]: "Agrega al menos un producto con cantidad" }));
          return false;
        }
        return true;
    }
    return true;
  };

  // Navegación del wizard
  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      let nextStep = currentStep + 1;
      while (nextStep <= 5) {
        if (movementType !== "entrada" && (nextStep === 3 || nextStep === 4)) {
          nextStep++;
        } else {
          break;
        }
      }
      if (nextStep <= 5) {
        setCurrentStep(nextStep as 1 | 2 | 3 | 4 | 5);
      }
    }
  };

  const goToPreviousStep = () => {
    let prevStep = currentStep - 1;
    while (prevStep >= 1) {
      if (movementType !== "entrada" && (prevStep === 3 || prevStep === 4)) {
        prevStep--;
      } else {
        break;
      }
    }
    if (prevStep >= 1) {
      setCurrentStep(prevStep as 1 | 2 | 3 | 4 | 5);
    }
  };

  const getTotalSteps = (): number => {
    if (movementType === "entrada") return 5;
    return 3;
  };

  return (
    <>
      {/* MOBILE WIZARD VIEW */}
      {isMobile && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-0 sm:p-4 overflow-y-auto">
          <div
            ref={modalRef}
            className="w-full max-w-7xl bg-slate-100 sm:rounded-2xl shadow-2xl flex flex-col h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh] overflow-hidden sm:my-4"
          >
            {/* Stepper Header */}
            <WizardStepper 
              currentStep={currentStep} 
              totalSteps={getTotalSteps()}
            />

            {/* Contenido del paso actual */}
            <form onSubmit={handleSubmit} className="flex flex-col h-full flex-1">
              <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
                {currentStep === 1 && (
                  <WizardStep1
                    movementType={movementType}
                    onMovementTypeChange={(type) => {
                      setMovementType(type);
                      validateItemsForMovementType(type, items);
                    }}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    isSearching={isSearching}
                    filteredProducts={filteredProducts}
                    onAddProduct={addProduct}
                    onShowScanner={() => setShowScanner(true)}
                    itemIds={new Set(items.map(item => item.product.id))}
                    items={items}
                    onRemoveItem={removeItem}
                  />
                )}

                {currentStep === 2 && (
                  <WizardStep2
                    movementType={movementType}
                    generalReason={generalReason}
                    onGeneralReasonChange={setGeneralReason}
                    generalNotes={generalNotes}
                    onGeneralNotesChange={setGeneralNotes}
                    generalRecipeCode={generalRecipeCode}
                    onGeneralRecipeCodeChange={setGeneralRecipeCode}
                    generalRecipeDate={generalRecipeDate}
                    onGeneralRecipeDateChange={setGeneralRecipeDate}
                    generalPatientName={generalPatientName}
                    onGeneralPatientNameChange={setGeneralPatientName}
                    generalPrescribedBy={generalPrescribedBy}
                    onGeneralPrescribedByChange={setGeneralPrescribedBy}
                    generalCieCode={generalCieCode}
                    onGeneralCieCodeChange={setGeneralCieCode}
                    generalRecipeNotes={generalRecipeNotes}
                    onGeneralRecipeNotesChange={setGeneralRecipeNotes}
                  />
                )}

                {currentStep === 3 && movementType === "entrada" && (
                  <WizardStep3
                    generalBatchNumber={generalBatchNumber}
                    onGeneralBatchNumberChange={setGeneralBatchNumber}
                    onGenerateBatchNumber={generateGeneralBatchNumber}
                    generalIssueDate={generalIssueDate}
                    onGeneralIssueDateChange={setGeneralIssueDate}
                    generalExpirationDate={generalExpirationDate}
                    onGeneralExpirationDateChange={setGeneralExpirationDate}
                  />
                )}

                {currentStep === 4 && movementType === "entrada" && (
                  <WizardStep4
                    generalShelf={generalShelf}
                    onGeneralShelfChange={setGeneralShelf}
                    generalDrawer={generalDrawer}
                    onGeneralDrawerChange={setGeneralDrawer}
                    generalSection={generalSection}
                    onGeneralSectionChange={setGeneralSection}
                    generalLocationNotes={generalLocationNotes}
                    onGeneralLocationNotesChange={setGeneralLocationNotes}
                  />
                )}

                {((currentStep === 5) || (currentStep === 3 && movementType !== "entrada")) && (
                  <WizardStep5
                    items={items}
                    movementType={movementType}
                    generalReason={generalReason}
                    generalNotes={generalNotes}
                    onUpdateItemQuantity={updateItemQuantity}
                    onRemoveItem={removeItem}
                    onUpdateItemData={updateItemData}
                    itemsWithWarning={itemsWithWarning}
                    onToggleSpecifyBatches={toggleSpecifyBatches}
                    onUpdateBatchQuantity={updateBatchQuantity}
                    onRemoveBatchSelection={removeBatchSelection}
                  />
                )}
              </div>

              {/* Navegación sticky */}
              <WizardNavigation
                currentStep={currentStep}
                totalSteps={getTotalSteps()}
                onNext={goToNextStep}
                onPrevious={goToPreviousStep}
                onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                isSubmitting={isSubmitting}
                itemsWithQuantity={itemsWithQuantity.length}
                isValid={!stepErrors[currentStep]}
                error={stepErrors[currentStep]}
              />
            </form>
          </div>
        </div>
      )}

      {/* DESKTOP GRID VIEW */}
      {!isMobile && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-0 sm:p-4 overflow-y-auto">
          <div
            ref={modalRef}
            className="w-full max-w-7xl bg-slate-100 sm:rounded-2xl shadow-2xl flex flex-col h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh] overflow-hidden sm:my-4"
          >
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header fijo */}
          <div className="flex-shrink-0 border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-100 sticky top-0 z-10 sm:static">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Movimiento de Inventario</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Gestiona múltiples productos</p>
          </div>

          {error && (
            <div className="mx-4 sm:mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-hidden bg-slate-50 px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          
          {/* COLUMNA IZQUIERDA - CONFIGURACIÓN */}
          <div className="lg:col-span-1 space-y-3 overflow-y-auto pr-1 max-h-full">
            <CollapsibleSection title="Configuración" icon="⚙️" defaultOpen={true}>
              <div className="space-y-3">
                {/* Tipo de movimiento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Tipo de movimiento
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(["entrada", "salida", "ajuste"] as const).map((type) => (
                      <label key={type} className="cursor-pointer flex-1 min-w-[80px]">
                        <input
                          type="radio"
                          name="movementType"
                          value={type}
                          checked={movementType === type}
                          onChange={(e) => {
                            const newType = e.target.value as MovementType;
                            setMovementType(newType);
                            validateItemsForMovementType(newType, items);
                          }}
                          className="hidden"
                        />
                        <span
                          className={`block text-center px-2 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                            movementType === type
                              ? "bg-indigo-100 text-indigo-700 border-indigo-500"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {type === "entrada" ? "📥" : type === "salida" ? "📤" : "⚙️"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Búsqueda */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Buscar producto
                  </label>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nombre o código"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <div className="h-3 w-3 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Botón escanear */}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4.5h14.25M3 9h14.25M3 13.5h14.25" />
                  </svg>
                  Escanear
                </button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Datos Generales" icon="📋" defaultOpen={true}>
              <div className="space-y-2.5">
                {/* Motivo general */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Motivo general
                  </label>
                  <select
                    value={generalReason}
                    onChange={(e) => setGeneralReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">— Sin motivo general —</option>
                    {MOVEMENT_REASONS[movementType].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Observación general */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Observación general
                  </label>
                  <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    maxLength={200}
                    placeholder="Aplica a todos"
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Información del Lote General - Para ENTRADA */}
            {movementType === "entrada" && (
              <CollapsibleSection title="Información del Lote (General)" icon="📦" defaultOpen={false}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Número de Lote (Usar como predeterminado)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generalBatchNumber}
                        onChange={(e) => setGeneralBatchNumber(e.target.value)}
                        placeholder="Generar o ingresar..."
                        className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={generateGeneralBatchNumber}
                        className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition-colors"
                        title="Generar número de lote aleatorio"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Fecha de Expedición
                      </label>
                      <input
                        type="date"
                        value={generalIssueDate}
                        onChange={(e) => setGeneralIssueDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Fecha de Vencimiento (Usar como predeterminada)
                      </label>
                      <input
                        type="date"
                        value={generalExpirationDate}
                        onChange={(e) => setGeneralExpirationDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Ubicación del Lote General - Para ENTRADA */}
            {movementType === "entrada" && (
              <CollapsibleSection title="Ubicación del Lote (General)" icon="📍" defaultOpen={false}>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Estantería</label>
                      <input
                        type="text"
                        value={generalShelf}
                        onChange={(e) => setGeneralShelf(e.target.value)}
                        placeholder="A, B, C..."
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Cajón/Nivel</label>
                      <input
                        type="text"
                        value={generalDrawer}
                        onChange={(e) => setGeneralDrawer(e.target.value)}
                        placeholder="1, 2, 3..."
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Sección</label>
                      <input
                        type="text"
                        value={generalSection}
                        onChange={(e) => setGeneralSection(e.target.value)}
                        placeholder="Izq, Der, Cen..."
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Notas de Ubicación
                    </label>
                    <textarea
                      value={generalLocationNotes}
                      onChange={(e) => setGeneralLocationNotes(e.target.value)}
                      placeholder="Ubicación específica o referencias..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Receta médica general */}
            {movementType === "salida" && generalReason === "Entrega de receta" && (
              <CollapsibleSection title="Receta General" icon="💊" defaultOpen={false}>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={generalRecipeCode}
                    onChange={(e) => setGeneralRecipeCode(e.target.value)}
                    placeholder="Código de receta"
                    maxLength={50}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="date"
                    value={generalRecipeDate}
                    onChange={(e) => setGeneralRecipeDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                    placeholder="Fecha"
                  />
                  <input
                    type="text"
                    value={generalPatientName}
                    onChange={(e) => setGeneralPatientName(e.target.value)}
                    placeholder="Paciente"
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={generalPrescribedBy}
                    onChange={(e) => setGeneralPrescribedBy(e.target.value)}
                    placeholder="Médico"
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={generalCieCode}
                    onChange={(e) => setGeneralCieCode(e.target.value)}
                    placeholder="Código CIE"
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
              </CollapsibleSection>
            )}
          </div>

          {/* COLUMNA DERECHA - PRODUCTOS */}
          <div className="lg:col-span-3 overflow-y-auto pr-1 max-h-full">
            <CollapsibleSection 
              title="Productos seleccionados" 
              icon="📦" 
              defaultOpen={true}
              badge={items.length > 0 ? `${items.length}` : undefined}
            >
              <div className="space-y-2.5 max-h-full overflow-y-auto pr-1">

              {items.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center">
                  <p className="text-xs text-slate-600">Busca o escanea productos</p>
                </div>
              ) : (
                items.map((item) => {
                  const hasWarning = itemsWithWarning.has(item.product.id);
                  const warningMessage = 
                    item.product.stock === 0 
                      ? "Stock = 0"
                      : item.quantity !== "" && item.quantity > item.product.stock
                      ? `Cant. > Stock`
                      : null;
                   const itemReason = item.useIndividualReason && item.reason ? item.reason : (generalReason || "");
                   const showRecipeFields = movementType === "salida" && item.useIndividualReason && item.reason === "Entrega de receta";
                   const hasIndividualRecipe = item.useIndividualReason && item.reason === "Entrega de receta";
                  
                  return (
                  <div
                    key={item.product.id}
                    className={`rounded-lg border p-2.5 space-y-2 ${
                      hasWarning ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {/* Campos simplificados */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-slate-600">Stock: {item.product.stock}</span>
                      {hasWarning && <span className="text-red-600">⚠️</span>}
                      {hasIndividualRecipe && (
                        <span className="text-purple-600 font-semibold" title="Este producto generará una receta médica separada">📋</span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleIndividualReason(item.product.id)}
                        className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                          item.useIndividualReason
                            ? "border-purple-500 text-purple-700 bg-purple-50 hover:bg-purple-100"
                            : "border-slate-300 text-slate-600 bg-white hover:bg-slate-50"
                        }`}
                        title="Habilita un motivo específico para este producto"
                      >
                        <span className="text-[12px]">✏️</span>
                        <span>{item.useIndividualReason ? "Motivo general" : "Motivo individual"}</span>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.product.id, e.target.value === "" ? "" : parseInt(e.target.value))}
                        placeholder="Cantidad"
                        className="rounded border px-2 py-1 text-xs"
                      />
                      <select
                        value={item.useIndividualReason ? item.reason : ""}
                        onChange={(e) => updateItemReason(item.product.id, e.target.value)}
                        disabled={!item.useIndividualReason}
                        required={item.useIndividualReason}
                        className={`rounded border px-2 py-1 text-xs ${
                          !item.useIndividualReason ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""
                        }`}
                        title={item.useIndividualReason ? "Selecciona motivo para este producto" : "Usará motivo general"}
                      >
                        <option value="">{item.useIndividualReason ? "Motivo" : "General"}</option>
                        {MOVEMENT_REASONS[movementType].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* Campos de receta médica individual */}
                    {showRecipeFields && (
                      <div className="border-t border-slate-200 pt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-slate-600 uppercase">Datos de Receta</p>
                          {hasIndividualRecipe && (
                            <p className="text-[9px] text-purple-600 font-medium">⚠️ Receta separada</p>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.recipeCode}
                          onChange={(e) => updateItemRecipeCode(item.product.id, e.target.value)}
                          placeholder="Código de receta"
                          maxLength={50}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={item.recipeDate}
                            onChange={(e) => updateItemRecipeDate(item.product.id, e.target.value)}
                            placeholder="Fecha receta"
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            value={item.patientName}
                            onChange={(e) => updateItemPatientName(item.product.id, e.target.value)}
                            placeholder="Paciente"
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.prescribedBy}
                            onChange={(e) => updateItemPrescribedBy(item.product.id, e.target.value)}
                            placeholder="Médico"
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            value={item.cieCode}
                            onChange={(e) => updateItemCieCode(item.product.id, e.target.value)}
                            placeholder="Código CIE"
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </div>
                        <textarea
                          value={item.recipeNotes}
                          onChange={(e) => updateItemRecipeNotes(item.product.id, e.target.value)}
                          placeholder="Notas de receta"
                          rows={2}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                      </div>
                    )}

                    {/* Campos de lote individual para ENTRADA */}
                    {movementType === "entrada" && item.useIndividualReason && (
                      <div className="border-t border-slate-200 pt-2 space-y-2">
                        <p className="text-[10px] font-semibold text-slate-600 uppercase">Datos de Lote Individual</p>
                        
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Número de Lote</label>
                            <input
                              type="text"
                              value={item.batchNumber || ""}
                              onChange={(e) => updateItemBatchNumber(item.product.id, e.target.value)}
                              placeholder="O usar general"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => generateBatchNumber(item.product.id)}
                            className="rounded bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition-colors"
                            title="Generar número de lote aleatorio"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Expedición</label>
                            <input
                              type="date"
                              value={item.issueDate || generalIssueDate}
                              onChange={(e) => updateItemIssueDate(item.product.id, e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Vencimiento</label>
                            <input
                              type="date"
                              value={item.expirationDate || generalExpirationDate}
                              onChange={(e) => updateItemExpirationDate(item.product.id, e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Estantería</label>
                            <input
                              type="text"
                              value={item.shelf || ""}
                              onChange={(e) => updateItemShelf(item.product.id, e.target.value)}
                              placeholder="A, B..."
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cajón/Nivel</label>
                            <input
                              type="text"
                              value={item.drawer || ""}
                              onChange={(e) => updateItemDrawer(item.product.id, e.target.value)}
                              placeholder="1, 2..."
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sección</label>
                            <input
                              type="text"
                              value={item.section || ""}
                              onChange={(e) => updateItemSection(item.product.id, e.target.value)}
                              placeholder="Izq..."
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notas Ubicación</label>
                          <textarea
                            value={item.locationNotes || ""}
                            onChange={(e) => updateItemLocationNotes(item.product.id, e.target.value)}
                            placeholder="Referencias específicas"
                            rows={1}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Selección de lotes para SALIDA */}
                    {movementType === "salida" && item.availableBatches && item.availableBatches.length > 0 && (
                      <div className="border-t border-slate-200 pt-2 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.specifyBatches || false}
                            onChange={() => toggleSpecifyBatches(item.product.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-semibold text-slate-700">
                            Especificar lotes manualmente
                          </span>
                        </label>
                        
                        {item.specifyBatches && (
                          <div className="space-y-1.5 bg-white p-2 rounded border border-slate-200">
                            <p className="text-[10px] text-slate-600 mb-1.5">
                              Selecciona de qué lotes tomar los productos:
                            </p>
                            {item.availableBatches.map((batch) => {
                              const selectedBatch = item.selectedBatches?.find(s => s.batchId === batch.id);
                              const isSelected = !!selectedBatch;
                              const selectedQty = selectedBatch?.quantity;
                              const isOnlyBatch = item.availableBatches?.length === 1;
                              
                              return (
                                <div
                                  key={batch.id}
                                  className={`border rounded p-1.5 ${
                                    isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className="flex-1">
                                      <p className="text-[10px] font-semibold text-slate-700">
                                        {batch.batch_number}
                                      </p>
                                      <p className="text-[9px] text-slate-600">
                                        Vence: {batch.expiration_date} | Stock: {batch.stock}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={batch.stock}
                                      value={selectedQty ?? ""}
                                      onChange={(e) => {
                                        const qty = parseInt(e.target.value) || 0;
                                        if (qty > 0) {
                                          updateBatchQuantity(item.product.id, batch.id, qty);
                                        } else {
                                          removeBatchSelection(item.product.id, batch.id);
                                        }
                                      }}
                                      placeholder="Cantidad"
                                      className="flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                                      disabled={isOnlyBatch}
                                      title={isOnlyBatch ? "Con un solo lote, se usa la cantidad total del producto" : ""}
                                    />
                                    {!isOnlyBatch && isSelected && (
                                      <button
                                        type="button"
                                        onClick={() => removeBatchSelection(item.product.id, batch.id)}
                                        className="text-red-600 hover:text-red-800 p-0.5"
                                        title="Quitar este lote"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                  
                                  {isOnlyBatch && (
                                    <p className="text-[9px] text-blue-600 mt-0.5">
                                      ℹ️ Único lote - usa cantidad del producto
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                            
                            {item.selectedBatches && item.selectedBatches.length > 0 && (
                              <div className="border-t border-slate-200 pt-1.5 mt-1.5">
                                <p className="text-[10px] font-semibold text-slate-700">
                                  Total de lotes: {item.selectedBatches.reduce((sum, s) => sum + s.quantity, 0)} unidades
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="text-xs text-red-600"
                    >
                      Quitar
                    </button>
                  </div>
                  );
                })
              )}
              </div>
            </CollapsibleSection>
          </div>
          </div>
          </div>

          {/* Footer SIEMPRE VISIBLE */}
          <div className="flex-shrink-0 border-t border-slate-200 px-4 sm:px-6 py-3 bg-slate-100 sticky bottom-0 z-10 sm:static">
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || itemsWithQuantity.length === 0}
                className="px-6 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : `Guardar (${itemsWithQuantity.length})`}
              </button>
            </div>
          </div>
          </form>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          mode="product"
          onClose={() => setShowScanner(false)}
          onSelectProduct={(product) => {
            handleProductScanned(product);
            setShowScanner(false);
          }}
        />
      )}

      {/* Dropdown de resultados en Portal */}
      {mounted && dropdownPosition && searchQuery && createPortal(
        <>
          {!isSearching && filteredProducts.length > 0 && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999
              }}
              className="bg-white border border-slate-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
            >
              {filteredProducts.slice(0, 10).map((product) => {
                const isDisabled = movementType === "salida" && product.stock === 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      !isDisabled && addProduct(product);
                    }}
                    disabled={isDisabled}
                    className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-100 last:border-b-0 ${
                      isDisabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "hover:bg-indigo-50 cursor-pointer transition-colors"
                    }`}
                  >
                    <p className="font-medium text-slate-900 mb-0.5">{product.name}</p>
                    <p className="text-xs text-slate-600">Stock: {product.stock} | {product.barcode || "N/A"}</p>
                  </button>
                );
              })}
            </div>
          )}
          {isSearching && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999
              }}
              className="bg-white border border-slate-300 rounded-lg shadow-2xl p-3"
            >
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                Buscando...
              </p>
            </div>
          )}
          {!isSearching && filteredProducts.length === 0 && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999
              }}
              className="bg-white border border-slate-300 rounded-lg shadow-2xl p-3"
            >
              <p className="text-xs text-slate-600">No hay productos</p>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}
