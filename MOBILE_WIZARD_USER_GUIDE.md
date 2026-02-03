# 📱 Guía de Uso: Wizard Mobile para Movimientos de Inventario

## 🎯 Para Usuarios Finales

### ¿Cuándo aparece el Wizard?

El wizard (formulario de pasos) aparece **automáticamente** cuando:
- ✅ Estás usando un **dispositivo móvil o pantalla pequeña** (< 640px de ancho)
- En computadora o tablet con pantalla grande, verás el formulario grid tradicional

## 📖 Cómo Usar el Wizard

### Paso 1: Configuración ⚙️
**¿Qué hace?** Selecciona el tipo de movimiento y agrega productos

**Actions:**
1. Selecciona el tipo de movimiento:
   - 📥 **Entrada**: Recibir productos (compra, reposición)
   - 📤 **Salida**: Entregar productos (venta, receta)
   - ⚙️ **Ajuste**: Corregir inventario

2. Busca productos:
   - Escribe el nombre o código de barras
   - Selecciona de los resultados
   - O usa botón 📱 Escanear para código de barras

3. ✅ Click "Siguiente" cuando hayas agregado al menos 1 producto

**⚠️ Validaciones:**
- ❌ No puedes seleccionar productos sin stock en Salida
- ❌ No puedes agregar el mismo producto dos veces

---

### Paso 2: Datos Generales 📋
**¿Qué hace?** Especifica por qué haces el movimiento

**Actions:**
1. Selecciona el **Motivo**:
   - **Entrada**: Compra, Devolución de cliente, Reposición, Otro
   - **Salida**: Entrega de receta, Venta, Devolución, Pérdida, Rotura, Expiración, Otro
   - **Ajuste**: Corrección de inventario, Ajuste administrativo, Otro

2. Agrega notas opcionales (hasta 200 caracteres)

3. **Si es Salida + "Entrega de receta"**, aparecerá sección especial:
   - 📄 Código receta
   - 📅 Fecha receta
   - 👤 Nombre del paciente
   - 👨‍⚕️ Prescrito por (médico)
   - 🏥 Código CIE-10 (diagnóstico)
   - 📝 Notas adicionales

**✅ Todos estos campos son opcionales, puedes dejar en blanco**

---

### Paso 3: Datos de Lote (⚡ Solo Entrada)
**¿Qué hace?** Registra información del lote que recibiste

**Actions:**
1. **Número de lote**: 
   - Ingresa manualmente O
   - Click botón ⚡ Generar para formato LOTE-YYYYMMDD-XXX

2. **Fecha de expedición**: Cuando fue creado el lote

3. **Fecha de vencimiento**: ⭐ **REQUERIDO** - No puedes continuar sin esto

**⚠️ Este paso se salta automáticamente si es Salida o Ajuste**

---

### Paso 4: Ubicación (⚡ Solo Entrada)
**¿Qué hace?** Define dónde guardar los productos

**Actions:**
Especifica la ubicación en el almacén:
- **Estantería**: A, B, C, etc.
- **Cajón/Nivel**: 1, 2, 3, etc.
- **Sección**: Izquierda, Derecha, Centro, etc.
- **Notas**: Referencias adicionales

**✅ Todos estos campos son opcionales**

**⚠️ Este paso se salta automáticamente si es Salida o Ajuste**

---

### Paso 5: Resumen 📊
**¿Qué hace?** Revisa y edita detalles antes de guardar

**Vista General:**
- Total de productos: X
- Cantidad total: Y unidades
- Artículos agregados: Z

**Tabla de Productos:**
- Nombre + Stock actual
- Input de cantidad (puedes cambiar)
- Botón ✏️ Editar (abre panel detallado)
- Botón ✕ Remover

**⚠️ Indicadores de Problemas:**
- 🔴 Rojo: Producto sin stock (Salida)
- 🟡 Amarillo: Cantidad > stock disponible (Salida)

---

## ✏️ Panel de Edición Detallada

Al hacer click en **Editar** en un producto del Paso 5, se abre un panel lateral con:

### Básico
- **Cantidad**: Ajusta la cantidad para este producto
- **Motivo individual**: Diferente al motivo general (opcional)
- **Notas**: Específicas para este producto (opcional)

### Lote (solo Entrada)
- **Número de lote**: Diferente al lote general (opcional)
- **Fecha expedición**: Puede variar por producto
- **Fecha vencimiento**: Importante para control
- **Ubicación**: Estantería, Cajón, Sección específica

### Receta Médica (solo Salida + "Entrega receta")
- **Código receta**: Identificador único
- **Fecha**: Cuándo se emitió
- **Paciente**: Nombre completo
- **Médico**: Quien prescribió
- **CIE-10**: Código de diagnóstico
- **Notas**: Instrucciones especiales

**✅ Botones:**
- **Cancelar**: Descarta cambios
- **Guardar cambios**: Aplicar solo para este producto

---

## 🔄 Navegación Entre Pasos

### Botones Disponibles

**Atrás** ← 
- Regresa al paso anterior
- ❌ Deshabilitado en Paso 1
- Mantiene todos los datos

**Siguiente** →
- Avanza al siguiente paso
- ✅ Valida que cumplas requisitos
- Si hay error, muestra mensaje rojo

**Guardar** (Último paso)
- Solo visible en Paso 5
- Registra el movimiento en la base de datos
- Cierra el modal automáticamente

---

## ⚠️ Mensajes de Error Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Debes ingresar número de lote y fecha de vencimiento" | Paso 3: Datos incompletos | Rellena ambos campos |
| "Agrega al menos un producto con cantidad" | Paso 5: Sin artículos | Vuelve a Paso 1 y agrega productos |
| "Hay productos con problemas de stock" | Cantidad > stock en Salida | Ajusta cantidades |
| "Debes seleccionar un motivo" | Paso 2: Motivo vacío | Selecciona una opción |

---

## 💡 Consejos de Uso

✅ **HACER:**
- Usa el escaneo de códigos de barras para agilizar
- Edita productos individuales en el resumen si tienen datos especiales
- Revisa bien el Paso 5 antes de guardar
- Ten a mano códigos de recetas si es Entrega de receta

❌ **EVITAR:**
- No borres productos si te equivocas, usa el botón ✕ en resumen
- No necesitas llenar campos opcionales si no aplican
- No cambies entre movimiento tipo en medio de un lote

---

## 🆘 ¿Necesitas Ayuda?

### En el Paso 1
- Usa Escanear si tienes código de barras
- Busca por nombre parcial (ej: "para" en lugar de "paracetamol")
- Si no aparece producto, quizás está inactivo

### En el Paso 3 (Entrada)
- Botón ⚡ genera automáticamente un número válido
- Fecha vencimiento es OBLIGATORIA para control farmacéutico
- Guarda la información del proveedor en notas

### En el Paso 5
- El panel de edición permite customizar por producto
- Recuerda guardar los cambios antes de continuar
- Puedes remover productos con ✕ si te equivocaste

---

## 📱 Vista Desktop vs Móvil

### En Computadora/Tablet Grande (≥ 640px):
- Grid con 4 columnas
- Todas las secciones visibles
- Scroll dentro del modal
- Mismo formulario tradicional

### En Móvil/Pantalla Pequeña (< 640px):
- Wizard de pasos
- Un tema por pantalla
- Menos scrolling
- Botones grandes para tacto

⚠️ Cambia automáticamente al girar el dispositivo

---

## 🎬 Ejemplo de Flujo Completo

**Escenario:** Registrar entrada de medicamentos (compra)

```
1. Paso 1 - Config:
   ✓ Selecciona "Entrada"
   ✓ Busca "Ibuprofeno"
   ✓ Agrega 100 unidades
   ✓ Click Siguiente

2. Paso 2 - Datos:
   ✓ Motivo: "Compra"
   ✓ Notas: "Proveedor ABC, factura #123"
   ✓ Click Siguiente

3. Paso 3 - Lote:
   ✓ Genera número lote: LOTE-20240115-542
   ✓ Fecha expedición: 2024-01-15
   ✓ Fecha vencimiento: 2026-01-15
   ✓ Click Siguiente

4. Paso 4 - Ubicación:
   ✓ Estantería: C
   ✓ Cajón: 2
   ✓ Sección: Der
   ✓ Notas: "Arriba de todo"
   ✓ Click Siguiente

5. Paso 5 - Resumen:
   ✓ Revisa: 1 producto, 100 cantidad
   ✓ Todo correcto
   ✓ Click GUARDAR
   ✓ ✅ Éxito - Inventario actualizado
```

---

**Última actualización**: Enero 2025  
**Versión**: 1.0  
**Soporte**: Contacta al equipo de desarrollo
