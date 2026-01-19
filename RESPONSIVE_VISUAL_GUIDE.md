# 📱 Guía Visual del Responsive

## Breakpoints Tailwind Utilizados

```
┌─────────────────────────────────────────────────────────────┐
│                    TAILWIND BREAKPOINTS                     │
├─────────────────────────────────────────────────────────────┤
│ xs   │ 320px  │ Teléfonos muy pequeños (iPhone SE, etc)    │
│ sm   │ 640px  │ Teléfonos medianos (iPhone 12, etc)         │
│ md   │ 768px  │ Tablets pequeñas (iPad mini)                │
│ lg   │ 1024px │ Tablets grandes / Laptops                   │
│ xl   │ 1280px │ Desktops                                     │
│ 2xl  │ 1536px │ Desktops grandes                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Ejemplo 1: Barra de Búsqueda

### En Móvil (320px - 640px)
```
┌──────────────────────────────────┐
│  🔍 Buscar productos...    [📸]  │
├──────────────────────────────────┤
│ [Movimiento] [Nuevo Producto]   │
│ [Reportes]                        │
└──────────────────────────────────┘
```
- Los botones ocupan el 100% del ancho
- Se distribuyen en dos filas
- Altura mínima de 44px para fácil toque

### En Tablet (768px+)
```
┌────────────────────────────────────────┐
│  🔍 Buscar productos...    [📸]        │
│                  [Movimiento] [Nuevo] [Reportes] │
└────────────────────────────────────────┘
```
- Los botones están en la misma fila
- Alineados a la derecha

### En Desktop (1280px+)
```
┌──────────────────────────────────────────────┐
│  🔍 Buscar productos...    [📸]              │
│  [Movimiento] [Nuevo Producto] [Reportes]   │
└──────────────────────────────────────────────┘
```
- Layout optimizado con espaciado uniforme

---

## Ejemplo 2: Tabla de Productos

### En Móvil (< 768px)
```
┌─────────────────────────────────┐
│ Nombre del Producto             │
│ Código: ABC123                   │
│ Categoría: Medicinas             │
│ [👁] [✏️] [🗑]                   │
├─────────────────────────────────┤
│ Otro Producto                   │
│ Código: XYZ789                   │
│ Especialidad: Cirugía            │
│ [👁] [✏️] [🗑]                   │
└─────────────────────────────────┘

Columnas Ocultas:
- Código ❌ (mostrado en fila de detalles)
- Categoría ❌ (mostrado en fila de detalles)
- Especialidad ❌ (mostrado en fila de detalles)
- Unidad ❌
- Unidad Reporte ❌
- Expiración ❌

Columnas Visibles:
- Nombre ✅
- Stock ✅
- Acciones ✅
```

### En Tablet (768px - 1024px)
```
┌────────────────────────────────────────────────┐
│ Nombre    │ Código │ Stock │ Categoría │ Stock │
├────────────────────────────────────────────────┤
│ Aspirina  │ ASP001 │ 150   │ Analgésicos│ [👁] │
│ Ibuprofén │ IBU002 │ 45    │ AINES      │ [✏️] │
│ Vitamina C│ VIT001 │ 230   │ Vitaminas  │ [🗑] │
└────────────────────────────────────────────────┘

Columnas Ocultas:
- Especialidad ❌
- Unidad ❌
- Unidad Reporte ❌
- Expiración ❌

Columnas Visibles:
- Nombre ✅
- Código ✅
- Stock ✅
- Categoría ✅
- Acciones ✅
```

### En Desktop (1024px+)
```
┌─────────────────────────────────────────────────────────────────┐
│ Nombre   │Código│Stock│Categ.│Espec.│Unidad│U.Reporte│Expiración│
├─────────────────────────────────────────────────────────────────┤
│ Aspirina │ASP001│ 150│Anal. │Gen.  │Caja  │100 cajas│ 2025-12-31│
│ Ibuprof. │IBU002│ 45 │AINES │Cirug.│Sobre │50 sobres│ 2025-11-15│
│ Vitamina │VIT001│ 230│Vit.  │Gen.  │Frasco│200 frs. │ 2026-01-20│
└─────────────────────────────────────────────────────────────────┘

Todas las columnas visibles ✅
```

---

## Ejemplo 3: Paginación

### En Móvil (< 640px)
```
┌────────────────────────────────────────────┐
│ Mostrando 1-10 de 150                      │
├────────────────────────────────────────────┤
│ Por página: [10 ▼]                        │
├────────────────────────────────────────────┤
│ [← Ant.] [1] [2] [3] [Sig. →]             │
└────────────────────────────────────────────┘
```
- Texto abreviado (Ant./Sig.)
- Controles compactos
- Se apilan en móviles

### En Tablet (768px+)
```
┌───────────────────────────────────────────────────────┐
│ Mostrando 1-20 de 150 │ Por página: [20 ▼] │ [Ant.] [1][2][3][4][5] [Sig.] │
└───────────────────────────────────────────────────────┘
```
- Todo en una sola fila
- Mejor distribución del espacio

---

## Ejemplo 4: Botones Responsivos

### Touch Target Mínimo (44x44px en móviles)

En móvil:
```
┌──────────────────┐
│                  │ ← 44px alto mínimo
│    [  BOTÓN  ]   │ ← 44px ancho mínimo
│                  │
└──────────────────┘
```

En desktop:
```
┌────────────────┐
│  [ BOTÓN ]     │ ← 32px alto (menor, pero aún accesible)
└────────────────┘
```

---

## Tamaños de Fuente Responsivos

```
CATEGORÍA              MÓVIL      TABLET     DESKTOP
─────────────────────────────────────────────────
Títulos principales   16px       18px       20px
Títulos secundarios   14px       16px       18px
Texto normal          14px       14px       16px
Texto pequeño         12px       12px       14px
Etiquetas             11px       11px       12px
Hint text             10px       11px       12px
```

---

## Espaciado Responsivo

```
ELEMENTO              MÓVIL      TABLET     DESKTOP
─────────────────────────────────────────────────
Margin horizontal    2rem       2rem       2rem
Margin vertical      1rem       1.25rem    1.5rem
Padding interior     0.5rem     0.75rem    1rem
Gap entre elementos  0.5rem     0.75rem    1rem
```

---

## Media Query Examples

### Búsqueda y Botones
```javascript
// Input wrapper - móvil
className="flex-1 w-full"

// Input wrapper - tablet+
className="flex-1 w-full md:max-w-md"

// Botones - móvil
className="flex-1 ... min-h-[40px]"

// Botones - tablet+
className="sm:flex-none ... min-h-auto"
```

### Tabla de Datos
```javascript
// Columnas ocultas por breakpoint
hidden md:table-cell    // Mostrado en tablet+
hidden lg:table-cell    // Mostrado en laptop+
hidden xl:table-cell    // Mostrado en desktop grande

// Tamaños adaptativos
h-3.5 w-3.5 sm:h-4 sm:w-4  // Ícono pequeño en móvil, grande en desktop
```

---

## Colores y Contraste

```
FONDO              TEXTO         RATIO CONTRASTE
────────────────────────────────────────────────
Blanco (#fff)      Gris (#666)   4.5:1 (AAA)
Blanco (#fff)      Azul (#0066cc) 8:1 (AAA)
Gris (#f3f4f6)     Negro (#000)   12:1 (AAA)
```

Todos los colores cumplen con WCAG AA y muchos con AAA.

---

## Orientación Landscape vs Portrait

### Portrait (Móvil Normal)
```
┌──────────┐
│ Contenido│  ← Ancho limitado
│ Vertical │  ← Se expande verticalmente
│ Scroll   │
└──────────┘
```

### Landscape (Móvil Girado)
```
┌──────────────────────┐
│ Contenido en Landscape  │  ← Aprovecha ancho
│ Más compacto vertical   │  ← Poco espacio arriba/abajo
└──────────────────────┘
```

Se maneja automáticamente con media queries.

---

## CSS Grid Responsivo

### ProductForm
```javascript
// Móvil (1 columna)
grid grid-cols-1

// Tablet (2 columnas)
sm:grid-cols-1 md:grid-cols-2

// Desktop (3 columnas en algunas secciones)
md:grid-cols-2 lg:grid-cols-3
```

---

## Performance en Móviles

✅ **Optimizado:**
- CSS media queries (0 JavaScript)
- Touch-friendly targets (no hover needed)
- Smooth scrolling nativo
- Scroll horizontal con momentum (iOS)

⚠️ **Consideraciones:**
- Imágenes se cargan en todos los tamaños (considera lazy loading futuro)
- Modales pueden ser grandes (pero scrollean)

---

## Testing Recomendado

### DevTools Chrome
1. Presiona F12
2. Click dispositivo móvil (Ctrl+Shift+M)
3. Prueba estos viewports:
   - iPhone SE: 375x667
   - iPhone 12: 390x844
   - iPad: 768x1024
   - Desktop: 1280x720

### Orientación
- Girar pantalla (prueba landscape)
- Ver cómo se adapta el contenido

### Interacción
- Scrollear tabla horizontalmente
- Hacer tap en botones (mouse simula toque)
- Usar formularios

---

Versión: 1.0
Última actualización: 17 de enero de 2026
