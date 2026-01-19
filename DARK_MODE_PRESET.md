# Preset de Tema Oscuro Profesional

## Descripción General

Se ha añadido un nuevo preset completo llamado **"Modo Oscuro Profesional"** que transforma toda la interfaz de usuario con colores oscuros cuidadosamente seleccionados para maximizar la legibilidad y reducir la fatiga visual.

## Colores del Preset

```
bgMain (Fondo Principal):   rgb(17, 24, 39)    - Gris muy oscuro (casi negro)
bgTable (Fondo Tabla):      rgb(30, 41, 59)    - Gris-azulado oscuro
bgNavbar (Fondo Navbar):    rgb(15, 23, 42)    - Azul-gris muy oscuro
```

### Paleta Completa de Colores Oscuros

El sistema incluye una paleta completa de colores para el modo oscuro:

#### Fondos
- **Primario**: `#111827` (Gray 900) - Fondo principal de la página
- **Secundario**: `#1e293b` (Slate 800) - Fondos secundarios y cajas
- **Terciario**: `#0f172a` (Slate 900) - Navbar y componentes oscuros

#### Texto
- **Primario**: `#f1f5f9` (Slate 100) - Texto principal, muy legible
- **Secundario**: `#cbd5e1` (Slate 300) - Texto secundario
- **Terciario**: `#94a3b8` (Slate 400) - Texto tenue, placeholders

#### Bordes
- **Primario**: `#334155` (Slate 700) - Bordes principales
- **Secundario**: `#475569` (Slate 600) - Bordes secundarios

#### Acentos (Colores de Acción)
- **Azul**: `#3b82f6` (Blue 500) - Botones primarios, enlaces
- **Verde**: `#10b981` (Emerald 500) - Acciones exitosas, confirmaciones
- **Rojo**: `#ef4444` (Red 500) - Acciones peligrosas, errores
- **Amarillo**: `#f59e0b` (Amber 500) - Advertencias

#### Estados
- **Hover Light**: `#334155` - Efecto hover en elementos
- **Hover Lighter**: `#475569` - Efecto hover en elementos más claros

## Elementos Estilizados

### ✅ Tabla de Inventario
- Headers con fondo oscuro y texto claro
- Filas alternas para mejor legibilidad
- Hover effect que resalta las filas
- Bordes sutiles en colores adecuados
- Texto totalmente legible

### ✅ Barra de Navegación
- Fondo oscuro profesional
- Botones con colores de acción claros
- Menú desplegable de usuario con estilos oscuros
- Iconos y texto con contraste adecuado

### ✅ Contenido Principal
- Fondo neutral oscuro
- Todo el texto en colores claros
- Bordes sutiles pero visibles

### ✅ Componentes de Entrada
- Inputs con fondo oscuro
- Texto claro en inputs
- Focus ring en azul para mejor UX
- Placeholders en color tenue

### ✅ Botones
- **Primarios**: Azul brillante sobre fondo oscuro
- **Secundarios**: Bordes visibles con hover effect
- **Peligrosos**: Rojo claro para acciones críticas
- **De éxito**: Verde para confirmaciones

### ✅ Modales y Dropdowns
- Fondos oscuros coherentes
- Bordes definidos
- Sombras mejoradas para modo oscuro
- Transiciones suaves

### ✅ Selectores (Combobox)
- Fondo oscuro con texto claro
- Opciones legibles
- Hover effects visibles

### ✅ Badges y Tags
- Fondos con opacidad para modo oscuro
- Textos en colores de acento
- Contraste suficiente

### ✅ Scrollbar
- Scrollbar oscuro que se integra con el tema
- Color diferenciado en hover

### ✅ Efectos Visuales
- Sombras mejoradas para modo oscuro (más profundas)
- Transiciones suaves entre estados
- Focus rings visibles en azul
- Disabled states con opacidad reducida

## Cómo Usar

### Para el Usuario
1. Haz clic en el ícono de usuario (arriba a la derecha del navbar)
2. Selecciona "Sistema de Colores"
3. En la sección de "Temas predefinidos", haz clic en "Modo Oscuro Profesional"
4. ¡El tema se aplicará inmediatamente a toda la interfaz!
5. Los cambios se guardan automáticamente

### Cambio Automático de Estilos
El sistema detecta automáticamente si estás usando un tema oscuro (comparando el brillo del color de fondo) y:
- Aplica la clase CSS `dark-mode` a los elementos relevantes
- Cambia todos los colores de texto a colores claros
- Ajusta bordes, sombras y efectos hover
- Modifica la apariencia de inputs, botones y dropdowns

## Características Técnicas

### Detección Automática
El sistema usa la fórmula de brillo relativo para detectar si un color es oscuro:
```
brightness = (R * 299 + G * 587 + B * 114) / 1000
if brightness < 128 → Es un tema oscuro
```

### Archivo CSS
- **Archivo**: `app/darkmode.css`
- **Selectores**: Usa la clase `.dark-mode` para aplicar estilos
- **Importado en**: `app/layout.tsx`
- **Variables CSS**: Define variables reutilizables para colores

### Componentes Afectados
- `ThemeWrapper` - Detecta tema oscuro y aplica clase
- `NavbarWrapper` - Aplica tema oscuro al navbar
- `ClientTableWrapper` - Aplica tema oscuro a la tabla
- Sistema global - El `dark-mode.css` cubre todos los elementos

## Verificación Visual

El preset ha sido diseñado para:
✓ Máxima legibilidad (contraste WCAG AA mínimo)
✓ Reducción de fatiga visual
✓ Coherencia visual en toda la interfaz
✓ Distinciones claras entre elementos interactivos
✓ Efectos hover visibles en todos los elementos
✓ Colores de acción distintivos
✓ Integración perfecta con el sistema existente

## Archivos Modificados

1. **`app/context/ThemeContext.tsx`**
   - Añadido nuevo preset "Modo Oscuro Profesional"

2. **`app/darkmode.css`** (NUEVO)
   - Estilos completos para modo oscuro
   - Variables CSS con paleta de colores
   - Cobertura de todos los componentes

3. **`app/layout.tsx`**
   - Importación de `darkmode.css`

4. **`app/components/ThemeWrapper.tsx`**
   - Detección automática de tema oscuro
   - Aplicación de clase `dark-mode`

5. **`app/components/NavbarWrapper.tsx`**
   - Detección automática de tema oscuro
   - Aplicación de clase `dark-mode`

6. **`app/components/ClientTableWrapper.tsx`**
   - Detección automática de tema oscuro
   - Aplicación de clase `dark-mode`

## Próximas Mejoras Opcionales

Si deseas mejoras adicionales, considera:
- Añadir transiciones más suaves al cambiar temas
- Crear más presets (Ej: "Modo Oscuro Azul", "Modo Oscuro Púrpura")
- Detectar preferencia del sistema (prefers-color-scheme)
- Guardar preferencia de usuario en localStorage
- Crear presets personalizados adicionales

---

**Creado**: 17 de enero de 2026  
**Estado**: ✅ Listo para usar
