# 📸 Sistema de Escaneo de Códigos QR y Códigos de Barras

## 🎯 Características

Tu aplicación ahora tiene un sistema completo de escaneo de códigos QR y códigos de barras directamente desde la cámara del dispositivo (iOS, Android, Windows, Mac, etc.).

### ✅ Funcionalidades Implementadas

1. **Escaneo en Tiempo Real** ⚡
   - Detección instantánea de códigos QR y códigos de barras
   - Sin necesidad de botón de captura
   - Debounce inteligente para evitar duplicados

2. **Soporte de Múltiples Formatos**
   - ✅ Códigos QR estándar
   - ✅ Código de Barras (CODE_128, CODE_39, UPC_A, EAN_13)
   - ✅ Cualquier formato soportado por html5-qrcode

3. **Carrito de Escaneos** 🛒
   - Mantiene un registro de productos escaneados
   - Vista previa con imágenes
   - Stock actual visible
   - Botón para remover productos
   - Limpiar todo en un click

4. **Búsqueda Instantánea**
   - Cada escaneo busca automáticamente en la BD
   - Resultado visible en tiempo real
   - Indicador de búsqueda (spinner)
   - Mensaje de error si no existe

5. **Integración Fluida**
   - Desde el escáner puedes seleccionar un producto
   - Abre automáticamente los detalles del producto
   - Opción de registrar movimiento desde el producto

---

## 🚀 Cómo Usar

### **Método 1: Escaneo Simple (Búsqueda Rápida)**

1. Click en botón **"📸 Escanear"** (púrpura) en la barra superior
2. Permite acceso a la cámara
3. Apunta a un código QR o código de barras
4. El sistema automáticamente:
   - Detecta el código
   - Busca el producto
   - Muestra el resultado en el carrito
5. Puedes:
   - **Seleccionar:** Abre los detalles del producto
   - **Remover:** Saca del carrito
   - **Limpiar:** Vacía todo el carrito
   - **Seguir escaneando:** El escáner se mantiene activo

---

### **Método 2: Movimiento Rápido Escaneado**

1. Click en **"📸 Escanear"**
2. Escanea el producto
3. Click en **"Seleccionar"** en el carrito
4. **Automáticamente** se abre con:
   - Producto preseleccionado
   - Campo de búsqueda bloqueado (ya tiene el producto)
   - Listo para ingresar cantidad, motivo y registrar

---

### **Método 3: Escanear en Movimiento Rápido**

1. Click en **"Movimiento Rápido"** (azul)
2. Busca un producto digitando o:
   - Abre el escáner integrado (más adelante)
3. Escanea y selecciona

---

## 🎨 Interfaz del Escáner

### Barra Superior
```
[Buscar...] [📸 Escanear] [Movimiento Rápido] [+ Nuevo]
            (Púrpura)      (Azul)              (Negro)
```

### Modal de Escaneo

**Lado Izquierdo (Desktop) / Arriba (Mobile):**
- Vista en vivo de la cámara
- Cuadro indicador para apuntar
- Botón de linterna (si el dispositivo la soporta)
- Indicadores de estado:
  - 🔄 Buscando producto
  - ✅ Producto agregado
  - ❌ No encontrado

**Lado Derecho (Desktop) / Abajo (Mobile):**
- 🛒 Carrito de escaneos
- Lista de productos escaneados
- Información de stock
- Código de barras truncado
- Botón "Seleccionar" para usar el producto

---

## 📊 Estados del Escáner

### 🔄 Escaneando
- Busca activamente códigos
- LED de cámara activo

### 🔍 Buscando Producto
- Código detectado
- Consultando base de datos
- Spinner animado
- Muestra el código que busca

### ✅ Éxito
- Producto encontrado
- Agregado al carrito
- Confirmación visual con icono ✓

### ❌ Error
- Código no encontrado
- Mensaje: "Producto no encontrado: [CÓDIGO]"
- Puedes seguir escaneando

---

## 🛡️ Características de Seguridad

1. **Debounce:** Evita múltiples escaneos del mismo código
2. **Validación:** Solo busca códigos válidos y no vacíos
3. **Duplicados:** No agrega el mismo código dos veces en una sesión
4. **Timeout:** Reintentos automáticos si falla la búsqueda

---

## 📱 Compatibilidad

✅ **iOS** (Safari)
✅ **Android** (Chrome, Firefox, Samsung Internet)
✅ **Windows** (Chrome, Edge, Firefox)
✅ **macOS** (Chrome, Safari, Firefox)

Requiere:
- Navegador moderno con soporte a `getUserMedia`
- Permiso para acceder a la cámara
- HTTPS en producción (recomendado)

---

## ⚙️ Configuración Técnica

### Librería Utilizada
- **html5-qrcode** - Ligera, eficiente, sin dependencias pesadas
- Escaneo en tiempo real a 10 FPS
- Caja de escaneo de 250x250px (ajustable)

### Búsqueda de Productos
```typescript
// Por código de barras exacto
searchProductByBarcode(barcode: string)

// Por nombre/barcode/descripción
searchProducts(query: string)
```

---

## 🎯 Flujo Completo: Ejemplo Real

**Escenario: Venta Rápida**

```
1. Usuario abre app
   ↓
2. Click "📸 Escanear"
   ↓
3. Apunta a código de barras de producto
   ↓
4. Sistema detecta: "7501234567890"
   ↓
5. Busca en BD → Encuentra "Paracetamol 500mg"
   ↓
6. Muestra en carrito con stock (50 unidades)
   ↓
7. Usuario puede:
   a) Click "Seleccionar"
      → Abre detalles del producto
      → Puede editar o ver movimientos
   
   b) Seguir escaneando
      → Escanea otro producto
      → Se agrega al carrito
      → Carrito ahora tiene 2 productos
   
   c) Remover
      → Saca del carrito
```

---

## 🚀 Mejoras Futuras (Opcionales)

- [ ] Guardar productos frecuentes
- [ ] Historial de escaneos
- [ ] Modo carrito (múltiples productos, procesamiento batch)
- [ ] Etiquetas de precio
- [ ] Integración con lector Bluetooth externo
- [ ] Exportar carrito a archivo
- [ ] Modo offline
- [ ] Notificaciones de stock bajo

---

## 🐛 Solución de Problemas

### No funciona la cámara
- Verifica permisos en el navegador
- Intenta recargar la página
- Prueba en HTTPS (obligatorio en algunos navegadores)
- Algunos navegadores pueden bloquear acceso a cámara

### Escanea pero no encuentra productos
- Verifica que el código de barras esté registrado en la BD
- Asegúrate que el código sea exacto
- Algunos códigos pueden estar dañados o incompletos

### Muy lento o falla frecuentemente
- Verifica conexión a internet
- Intenta con mejor iluminación
- Limpia la cámara del dispositivo
- Cierra otras aplicaciones

---

## 📞 Soporte Técnico

Función principal: `searchProductByBarcode(barcode)`
- Busca por coincidencia exacta
- Retorna: `{ data: Product | null, error: string | null }`

Componentes:
- `BarcodeScannerModal` - Modal principal con escáner
- `ScanResultsCart` - Carrito de resultados
- Integraciones en `ProductsTableClient`

