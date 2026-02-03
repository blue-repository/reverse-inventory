# Implementación de Wizard Mobile para BulkMovementModal

## 📋 Resumen Ejecutivo

Se ha implementado exitosamente un sistema de **Stepper/Wizard** completamente funcional para dispositivos móviles (< 640px) en el modal de movimientos de inventario, manteniendo 100% de compatibilidad con la vista desktop original.

## 🎯 Objetivos Cumplidos

✅ **Rediseño Mobile-First**: Interfaz de formulario en pasos secuenciales  
✅ **Detección Automática**: Cambio de layout basado en tamaño de pantalla  
✅ **Validación Inteligente**: Validación por pasos sin pérdida de datos  
✅ **Navegación Fluida**: Botones sticky con navegación atrás/siguiente  
✅ **Compatibilidad Total**: Vista desktop sin cambios, funcionamiento idéntico  

## 📦 Archivos Creados

### Componentes Wizard (`app/components/wizard/`)

#### 1. **WizardStepper.tsx**
- Indicador visual de progreso con círculos numerados
- Muestra paso actual y total
- Color coding: Indigo (activo), Verde (completado), Gris (pendiente)
- Líneas conectoras entre pasos
- Ajusta automáticamente pasos según tipo de movimiento

#### 2. **WizardNavigation.tsx**
- Barra sticky al pie del modal
- Botones: Atrás (deshabilitado en paso 1), Siguiente, Guardar (último paso)
- Muestra contador de artículos con cantidad
- Indicador de estado de envío (spinning loader)
- Display de errores de validación

#### 3. **WizardStep1.tsx** - Configuración
```
Contenido:
├─ Tipo de movimiento: Radio buttons (Entrada/Salida/Ajuste)
├─ Búsqueda de productos: Input con debounce
├─ Resultados en dropdown: Stock, código, estado
├─ Botón Escanear: Abre BarcodeScannerModal
└─ Validaciones: Previene productos duplicados, desactiva sin stock en salida
```

#### 4. **WizardStep2.tsx** - Datos Generales
```
Contenido:
├─ Motivo: Select dinámico por tipo de movimiento
├─ Notas generales: Textarea (200 caracteres)
└─ Sección Receta (Condicional - Salida + "Entrega de receta")
   ├─ Código receta
   ├─ Fecha receta
   ├─ Nombre paciente
   ├─ Prescrito por
   ├─ Código CIE-10
   └─ Notas receta
```

#### 5. **WizardStep3.tsx** - Datos de Lote (Entrada)
```
Contenido:
├─ Número de lote: Input + botón generar (LOTE-YYYYMMDD-XXX)
├─ Fecha de expedición: Date input
├─ Fecha de vencimiento: Date input (requerido, marcado con *)
└─ Info box: Explica que este paso es crítico
```

#### 6. **WizardStep4.tsx** - Ubicación (Entrada)
```
Contenido:
├─ Grid 3 columnas:
│  ├─ Estantería (A, B, C, ...)
│  ├─ Cajón/Nivel (1, 2, 3, ...)
│  └─ Sección (Izq, Der, Cen, ...)
├─ Notas de ubicación: Textarea
└─ Info box: Campos opcionales con placeholders guía
```

#### 7. **WizardStep5.tsx** - Resumen
```
Contenido:
├─ Cards de resumen:
│  ├─ Total de productos
│  ├─ Cantidad total
│  └─ Artículos agregados
├─ Lista de productos:
│  ├─ Nombre y stock actual
│  ├─ Input de cantidad con validación
│  ├─ Botón Editar → ProductDetailDrawer
│  ├─ Botón Remover (✕)
│  └─ Indicadores de alerta (⚠️)
└─ Resumen de motivo y notas globales
```

#### 8. **ProductDetailDrawer.tsx** - Edición Individual
```
Contenido (Modal Portal):
├─ Header: Nombre producto + cierre
├─ Sección Básica:
│  ├─ Cantidad (input)
│  ├─ Motivo individual (select)
│  └─ Notas (textarea)
├─ Sección Lote (Condicional - Entrada):
│  ├─ Número de lote
│  ├─ Fechas (expedición/vencimiento)
│  └─ Ubicación (estantería/cajón/sección)
├─ Sección Receta (Condicional - Salida + Entrega):
│  ├─ Código, fecha, paciente
│  ├─ Médico, CIE, notas
│  └─ Todos con placeholders
└─ Footer: Cancelar/Guardar cambios
```

## 🔧 Modificaciones en BulkMovementModal.tsx

### Agregado:

1. **Detección Mobile (useEffect)**
   ```tsx
   useEffect(() => {
     const handleResize = () => {
       setIsMobile(window.innerWidth < 640);
     };
     // Attach listener...
   }, []);
   ```

2. **Funciones de Validación y Navegación**
   ```tsx
   - validateStep(step): Validación por paso
   - goToNextStep(): Navega adelante con validación
   - goToPreviousStep(): Navega atrás con saltos inteligentes
   - getTotalSteps(): Retorna 5 (entrada) o 3 (salida/ajuste)
   ```

3. **Renderizado Condicional**
   ```tsx
   if (isMobile) {
     return <MobileWizardLayout />;
   }
   return <DesktopGridLayout />; // Original, sin cambios
   ```

## 🎮 Flujo de Navegación

### Para Entrada (5 pasos):
```
Paso 1 (Config) 
  ↓ (Siguiente)
Paso 2 (Datos)
  ↓
Paso 3 (Lote) ← Validación: número + vencimiento requeridos
  ↓
Paso 4 (Ubicación)
  ↓
Paso 5 (Resumen) → Guardar
```

### Para Salida/Ajuste (3 pasos):
```
Paso 1 (Config)
  ↓
Paso 2 (Datos)
  ↓ (Los pasos 3-4 se saltan automáticamente)
Paso 5 (Resumen) → Guardar
```

## ✅ Validaciones Implementadas

| Paso | Validación | Mensaje |
|------|-----------|---------|
| 1 | Siempre válido | - |
| 2 | Siempre válido | - |
| 3 | Entrada: Batch + Vencimiento | "Debes ingresar número de lote y fecha de vencimiento" |
| 4 | Siempre válido | - |
| 5 | Al menos 1 producto con cantidad | "Agrega al menos un producto con cantidad" |

## 🔍 Características Especiales

### Validación de Stock
- **Entrada**: Acepta cualquier cantidad
- **Salida**: Marca con ⚠️ si cantidad > stock disponible
- **Salida**: Desactiva productos sin stock en dropdown

### Manejo de Recetas Médicas
- **Condicional**: Solo aparece en Salida + "Entrega de receta"
- **Ubicación**: Paso 2 (general) + Step5 Drawer (individual)
- **Uso**: Puede haber receta general o individual por producto

### Edición Individual en Step5
- Drawer modal para editar detalles específicos del producto
- Acceso a todas las opciones de lote, ubicación, receta
- Guardado sin cerrar el drawer
- Cancelar descarta cambios locales

## 🎨 Responsive Design

### Mobile (< 640px)
- Wizard de 5 pasos (entrada) / 3 pasos (salida-ajuste)
- Un paso por pantalla para reducir scrolling
- Botones full-width
- Tipografía escalada
- Layout vertical optimizado

### Desktop (≥ 640px)
- Grid layout original (4 columnas)
- Todas las secciones visibles simultáneamente
- Collapse/expand para cada sección
- Scrolling dentro del modal

## 🧪 Testing Recomendado

1. **Mobile Detection**
   ```
   - Abierto en móvil físico o DevTools (width < 640px)
   - Verificar cambio de layout dinámico
   ```

2. **Flujo Entrada**
   ```
   - Seleccionar Entrada → 5 pasos visibles
   - Validar obligatoriedad de Lote en Paso 3
   - Verificar datos persisten entre pasos
   ```

3. **Flujo Salida**
   ```
   - Seleccionar Salida → 3 pasos visibles
   - Saltar automáticamente pasos 3-4
   - Validar receta condicional en Paso 2
   ```

4. **Edición Individual**
   ```
   - Click en Editar en Step5
   - Modificar campos en drawer
   - Verificar cambios se guardan
   ```

5. **Validaciones**
   ```
   - Intenta siguiente sin datos requeridos
   - Verificar mensajes de error en nav bar
   - Previe de navegar con datos incompletos
   ```

## 📊 Estadísticas

- **Líneas de código creadas**: ~2000 (8 componentes)
- **Archivos creados**: 8
- **Compatibilidad TypeScript**: 100% (sin errores)
- **Compilación**: Exitosa (next build)
- **Compatibilidad con desktop**: 100% (sin cambios)

## 🚀 Próximos Pasos Opcionales

1. **Animaciones**
   - Transición suave entre pasos
   - Entrada/salida de componentes

2. **Persistencia**
   - Guardar borrador en localStorage
   - Recuperar en próxima sesión

3. **UX Mejorada**
   - Progreso visual en barra superior
   - Breadcrumbs de pasos completados
   - Indicador de campos requeridos

4. **Testing**
   - Pruebas unitarias (Jest)
   - Pruebas E2E (Cypress/Playwright)
   - Coverage de validaciones

## 📝 Notas de Desarrollo

- **Breakpoint Mobile**: 640px (equivalente a Tailwind `sm:`)
- **Tipos Compartidos**: BulkMovementItem definido en el componente principal
- **Estado**: Manejado en BulkMovementModal, props pasados a wizard components
- **Validación**: Ocurre antes de navegar, no en submit
- **Datos**: No se pierden durante navegación (state persistente)

## ✨ Conclusión

La implementación del wizard mobile proporciona una **experiencia de usuario significativamente mejorada en smartphones**, eliminando la necesidad de scrolling excesivo y organizando la información en pasos manejables, mientras mantiene la funcionalidad completa de la vista desktop sin compromisos.

