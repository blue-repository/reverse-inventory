# Sistema de Temas Personalizables

## 📋 Descripción General

Sistema completo de personalización de colores para la aplicación con control independiente de 3 secciones principales:
- **Fondo Principal** (`bgMain`) - Fondo de la página
- **Fondo de Tabla** (`bgTable`) - Fondo de la tabla de inventario
- **Fondo de Navbar** (`bgNavbar`) - Fondo de la barra de navegación

## 🏗️ Arquitectura

### Context: `app/context/ThemeContext.tsx`
- **Estados**: 3 colores independientes (bgMain, bgTable, bgNavbar), cada uno con R, G, B (0-255)
- **Presets**: 4 temas predefinidos
  1. **Claro** - Blanco puro y neutrales
  2. **Suave Azul** - Azules suaves
  3. **Suave Gris** - Grises suaves
  4. **Suave Verde** - Verdes suaves
- **Persistencia**: localStorage (`farmacia-theme-colors`)
- **Funciones principales**:
  - `useTheme()` - Hook para acceder al contexto
  - `updateColor(section, r, g, b)` - Actualizar color específico
  - `applyPreset(name)` - Aplicar preset completo
  - `resetToDefault()` - Restaurar colores por defecto
  - `rgbToString(r, g, b)` - Utilidad para convertir RGB a string CSS

### Wrappers: Aplicación de Colores

#### `ThemeWrapper` (`page.tsx`)
```tsx
<ThemeWrapper>
  <div>Contenido con bgMain color</div>
</ThemeWrapper>
```
- Aplica `colors.bgMain` al contenido principal
- Incluye transición suave (`transition-colors duration-300`)

#### `NavbarWrapper` (`layout.tsx`)
```tsx
<NavbarWrapper />  // Envuelve navbar con bgNavbar color
```
- Aplica `colors.bgNavbar` a la barra de navegación
- Estructura: `<header>` → `<NavbarContent />`

#### `ClientTableWrapper` (`ProductsTable.tsx`)
```tsx
<ClientTableWrapper>
  <ProductsTableClient {...props} />
</ClientTableWrapper>
```
- Aplica `colors.bgTable` a la tabla de inventario
- Mantiene toda la funcionalidad de la tabla

### Componente UI: `app/components/ThemeConfig.tsx`

Ubicación: Dropdown del usuario en navbar → entre "Renombrar usuario" y "Cerrar sesión"

**Características**:
- 🎯 **Selector de Sección**: Dropdown para elegir qué sección personalizar
- 🎨 **Presets**: Muestra 4 presets con vista previa de color
- 🎚️ **Sliders RGB**: Controles deslizantes para cada canal (R, G, B)
- 📊 **Vista Previa**: Cuadro mostrando el color actual
- 🔄 **Botón Reset**: Restaurar colores por defecto
- ⏱️ **Actualización en Tiempo Real**: Cambios inmediatos en toda la aplicación

## 📁 Estructura de Archivos

```
app/
├── context/
│   └── ThemeContext.tsx          ← Context global con presets
├── components/
│   ├── ThemeWrapper.tsx          ← Aplica color al contenido principal
│   ├── ThemeConfig.tsx           ← UI de personalización en dropdown
│   ├── NavbarWrapper.tsx         ← Aplica color a navbar
│   ├── NavbarContent.tsx         ← Contenido del navbar (refactorizado)
│   ├── ClientTableWrapper.tsx    ← Aplica color a tabla
│   └── ProductsTable.tsx         ← Tabla que usa wrapper
├── layout.tsx                     ← ThemeProvider + NavbarWrapper
└── page.tsx                       ← ThemeWrapper + contenido
```

## 🎨 Paleta de Colores Predefinida

### Claro
```
bgMain:    { r: 255, g: 255, b: 255 }  // Blanco
bgTable:   { r: 248, g: 250, b: 252 }  // Slate-50
bgNavbar:  { r: 255, g: 255, b: 255 }  // Blanco
```

### Suave Azul
```
bgMain:    { r: 240, g: 248, b: 255 }  // Alice blue
bgTable:   { r: 224, g: 242, b: 254 }  // Azul claro
bgNavbar:  { r: 15,  g: 23,  b: 42  }  // Slate-900 oscuro
```

### Suave Gris
```
bgMain:    { r: 249, g: 250, b: 251 }  // Gray-50
bgTable:   { r: 243, g: 244, b: 246 }  // Gray-100
bgNavbar:  { r: 243, g: 244, b: 246 }  // Gray-100
```

### Suave Verde
```
bgMain:    { r: 240, g: 253, b: 244 }  // Green-50
bgTable:   { r: 220, g: 252, b: 231 }  // Green-100
bgNavbar:  { r: 5,   g: 150, b: 105 }  // Green-600
```

## 💾 Persistencia

Los colores se guardan automáticamente en localStorage bajo la clave `farmacia-theme-colors`:

```json
{
  "bgMain": { "r": 255, "g": 255, "b": 255 },
  "bgTable": { "r": 248, "g": 250, "b": 252 },
  "bgNavbar": { "r": 255, "g": 255, "b": 255 }
}
```

Se cargan automáticamente al iniciar la aplicación.

## 🔧 Cómo Usar

### Para el Usuario
1. Hacer clic en el icono de usuario (arriba derecha del navbar)
2. Seleccionar "Sistema de Colores" en el dropdown
3. Elegir una sección (Fondo Principal, Tabla, Navbar)
4. Hacer clic en un preset o ajustar con los sliders RGB
5. Los cambios se aplican inmediatamente en toda la app
6. Se guardan automáticamente en localStorage

### Para Desarrolladores

Acceder al contexto de tema:
```tsx
"use client";
import { useTheme } from "@/app/context/ThemeContext";

function MyComponent() {
  const { colors, updateColor, applyPreset, resetToDefault } = useTheme();
  
  // Usar colors.bgMain, colors.bgTable, colors.bgNavbar
  // Cada uno tiene { r: 0-255, g: 0-255, b: 0-255 }
}
```

Convertir RGB a CSS:
```tsx
import { rgbToString } from "@/app/context/ThemeContext";

const cssColor = rgbToString(255, 100, 50);  // "rgb(255, 100, 50)"
```

## 🎯 Integraciones Actuales

✅ **Integrado**: Fondo principal, tabla, navbar
⏳ **Pendiente**: Aplicar colores a modales y componentes secundarios

## 📝 Notas Técnicas

- Todos los cambios se aplican con transición suave (`duration-300`)
- El sistema usa CSS-in-JS con `style={{ backgroundColor: ... }}`
- Los presets son inmutables y cargados desde el contexto
- localStorage se usa para persistencia entre sesiones
- Cada wrapper es responsable de aplicar solo su color correspondiente

## 🐛 Troubleshooting

**Los colores no se guardan**: Verificar que localStorage no está deshabilitado en el navegador

**Los cambios no se aplican**: Asegurarse de que el componente está dentro de `<ThemeProvider>`

**Presets no funcionan**: Verificar que se está usando `useTheme()` dentro de un componente cliente (`"use client"`)
