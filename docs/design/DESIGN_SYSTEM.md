# 🎨 Sistema de Diseño y Temas - Guía Completa

## 📋 Descripción General

La aplicación incluye un completo **sistema de personalización de colores** con temas predefinidos y controles manuales RGB, así como optimizaciones responsive para dispositivos móviles.

---

## 🎨 Sistema de Temas Personalizables

### Características Principales

Sistema completo de personalización de colores para la aplicación con control independiente de 3 secciones principales:
- **Fondo Principal** (`bgMain`) - Fondo de la página
- **Fondo de Tabla** (`bgTable`) - Fondo de la tabla de inventario
- **Fondo de Navbar** (`bgNavbar`) - Barra de navegación

### Cómo Acceder al Sistema de Temas

1. Haz clic en el **icono de usuario** (arriba a la derecha del navbar)
2. Selecciona **"Sistema de Colores"** en el dropdown
3. Elige una sección (Fondo Principal, Tabla, Navbar)
4. Haz clic en un **preset predefinido** o ajusta manualmente con los sliders **RGB**
5. Los cambios se aplican **inmediatamente** en toda la aplicación
6. Se guardan automáticamente en `localStorage`

---

## 🌈 Temas Predefinidos Incluidos

### 1. **Claro** (Predeterminado)
```
Fondo Principal:  Blanco puro (255, 255, 255)
Fondo Tabla:      Slate-50 (248, 250, 252)
Fondo Navbar:     Blanco puro (255, 255, 255)
```
- Tema profesional y limpio
- Alto contraste
- Ideal para oficina durante el día

### 2. **Suave Azul**
```
Fondo Principal:  Alice Blue (240, 248, 255)
Fondo Tabla:      Azul claro (224, 242, 254)
Fondo Navbar:     Slate-900 oscuro (15, 23, 42)
```
- Colores relajantes
- Ideal para reducir fatiga visual
- Contraste azul profesional

### 3. **Suave Gris**
```
Fondo Principal:  Gray-50 (249, 250, 251)
Fondo Tabla:      Gray-100 (243, 244, 246)
Fondo Navbar:     Gray-100 (243, 244, 246)
```
- Tonos neutros
- Muy profesional
- Fácil para la vista

### 4. **Suave Verde**
```
Fondo Principal:  Green-50 (240, 253, 244)
Fondo Tabla:      Green-100 (220, 252, 231)
Fondo Navbar:     Green-600 (5, 150, 105)
```
- Fresco y moderno
- Ideal para ambientes de farmacia
- Colores naturales

### 5. **Modo Oscuro Profesional**
```
Fondo Principal:  Gray-900 (17, 24, 39)
Fondo Tabla:      Slate-800 (30, 41, 59)
Fondo Navbar:     Slate-900 (15, 23, 42)
```
- Tema oscuro para reducir fatiga visual
- Máximo contraste
- Ideal para largas horas de trabajo
- Todas las acciones visibles en colores claros

**Paleta Oscura Completa:**
- **Texto Primario**: Slate-100 (#f1f5f9) - Muy legible
- **Texto Secundario**: Slate-300 (#cbd5e1)
- **Bordes**: Slate-700 (#334155)
- **Acentos**: Azul (#3b82f6), Verde (#10b981), Rojo (#ef4444)

---

## 🎛️ Controles Manuales RGB

En la sección "Sistema de Colores" también puedes:

1. **Seleccionar Sección**: Dropdown para elegir qué área personalizar
2. **Sliders RGB**: 3 controles deslizantes (Rojo 0-255, Verde 0-255, Azul 0-255)
3. **Vista Previa**: Cuadro mostrando el color actual
4. **Botón Reset**: Restaurar colores por defecto
5. **Actualización en Tiempo Real**: Cambios inmediatos

---

## 📱 Diseño Responsive

La aplicación está completamente optimizada para dispositivos móviles:

### Breakpoints Tailwind Utilizados
```
sm:  640px    (tablets y móviles grandes)
md:  768px    (tablets)
lg:  1024px   (laptops)
xl:  1280px   (desktops)
```

### Optimizaciones Móviles

#### Barra de Búsqueda
- **Móvil**: Ancho completo, botones empilados
- **Tablet**: Búsqueda más ancha, botones en una fila
- **Desktop**: Layout original

#### Tabla de Productos
- **Móvil**: Columnas ocultas, solo datos esenciales
- **Tablet**: Más columnas visibles
- **Desktop**: Todas las columnas

#### Paginación
- **Móvil**: Compacta, números ocultos
- **Tablet**: Rango de páginas visible
- **Desktop**: Completa con todos los controles

#### Botones
- **Touch Target Mínimo**: 44x44px en móviles
- **Espaciado Responsivo**: Más espacio en móviles
- **Tamaño de Fuente**: Escalado automático

### Touch Targets y Usabilidad
- Botones con altura mínima 40px en móviles
- Touch targets de 44x44px (recomendación WCAG)
- Sin zoom forzado en inputs
- Scroll suave en elementos horizontales

### Tipografía Responsiva
```
Móvil:   Tamaños 12px - 16px
Tablet:  Tamaños 14px - 18px
Desktop: Tamaños 16px - 24px
```

### Espaciado Responsivo
```
Móvil:   px-3 py-2 (espacios compactos)
Tablet:  px-4 py-3
Desktop: px-6 py-4
```

---

## 🏗️ Arquitectura Técnica

### Context Global: `ThemeContext.tsx`
```typescript
interface ThemeContextType {
  colors: {
    bgMain: RGB;
    bgTable: RGB;
    bgNavbar: RGB;
  };
  updateColor(section, r, g, b): void;
  applyPreset(name): void;
  resetToDefault(): void;
}

const useTheme = () => useContext(ThemeContext);
```

### Wrappers de Aplicación

#### ThemeWrapper
- Aplica `bgMain` al contenido principal
- Incluye transición suave

#### NavbarWrapper
- Aplica `bgNavbar` a la barra de navegación

#### ClientTableWrapper
- Aplica `bgTable` a la tabla de inventario

### Persistencia
- Los colores se guardan en `localStorage` bajo la clave `farmacia-theme-colors`
- Se cargan automáticamente al iniciar la aplicación

---

## 🎨 Modo Oscuro Automático

El sistema detecta automáticamente si estás usando un tema oscuro:

1. **Detección de Brillo**: Calcula el brillo relativo del color de fondo
2. **Aplicación Automática**: Si brightness < 128, aplica el tema oscuro
3. **Estilos CSS**: Archivo `app/darkmode.css` cubre todos los componentes
4. **Coherencia**: Textos claros, bordes adaptados, efectos hover visibles

### Elementos Afectados en Modo Oscuro
- ✅ Tabla de inventario (headers oscuros, texto claro)
- ✅ Barra de navegación
- ✅ Contenido principal
- ✅ Inputs y formularios
- ✅ Botones y links
- ✅ Modales y dropdowns
- ✅ Selectores y combobox
- ✅ Badges y tags
- ✅ Scrollbars

---

## 📁 Estructura de Archivos

```
app/
├── context/
│   └── ThemeContext.tsx          ← Context global con presets
├── components/
│   ├── ThemeConfig.tsx           ← UI de personalización
│   ├── ThemeWrapper.tsx          ← Aplica color al contenido principal
│   ├── NavbarWrapper.tsx         ← Aplica color a navbar
│   └── ClientTableWrapper.tsx    ← Aplica color a tabla
├── darkmode.css                  ← Estilos para modo oscuro
├── globals.css                   ← Estilos globales responsivos
├── layout.tsx                    ← ThemeProvider + NavbarWrapper
└── page.tsx                      ← ThemeWrapper + contenido
```

---

## 🧪 Checklist de Optimización Responsive

### ProductsTableClient.tsx
- [x] Barra de búsqueda responsive
- [x] Botones responsivos (altura mínima 40px)
- [x] Tabla con overflow-x-auto optimizado
- [x] Columnas ocultas en breakpoints (md, lg, xl)
- [x] Paginación responsiva
- [x] Iconos adaptativos

### page.tsx
- [x] Padding responsivo
- [x] Títulos adaptativos
- [x] Loading spinner responsivo

### globals.css
- [x] Media queries para móviles
- [x] Touch targets 44x44px
- [x] Prevención de zoom en inputs
- [x] Scroll suave en overflow horizontal

### tailwind.config.ts
- [x] Breakpoints personalizados
- [x] Espaciados adicionales
- [x] Tamaños de fuente personalizados
- [x] Min-height 44px y 48px

---

## 📱 Pruebas Recomendadas

### Teléfonos Pequeños (320px - 374px)
- [ ] Input de búsqueda funcional
- [ ] Botones clickeables sin solape
- [ ] Tabla con scroll horizontal suave
- [ ] Paginación compacta pero usable

### Teléfonos Medianos (375px - 480px)
- [ ] Espaciado adecuado
- [ ] Texto legible sin zoom
- [ ] Acciones de tabla accesibles

### Tablets (481px - 1024px)
- [ ] Layout intermedio funcional
- [ ] Suficientes columnas visibles
- [ ] Paginación clara

### Desktops (1025px+)
- [ ] Layout original sin cambios
- [ ] Todas las funcionalidades disponibles

---

## 🚀 Próximas Mejoras Opcionales

- [ ] Más presets (Ej: Oscuro Azul, Oscuro Púrpura)
- [ ] Detectar preferencia del sistema (prefers-color-scheme)
- [ ] Transiciones más suaves al cambiar temas
- [ ] Crear presets personalizados guardados
- [ ] Editor visual avanzado de colores
- [ ] Exportar/importar configuración de temas

---

**Última actualización:** 5 de febrero de 2026
