# 📊 Sistema de Reportes - Guía Completa

## 🎉 Introducción

El sistema de reportes de Bagatela Inventory permite generar reportes detallados de:
- **Egresos (Salidas)**: Productos vendidos, recetados o retirados del inventario
- **Ingresos (Entradas)**: Productos comprados, recibidos o añadidos al inventario

Los reportes se pueden filtrar por rango de fechas, descargar en CSV, imprimir como PDF y contienen toda la información de movimientos con datos de pacientes, prescriptores, lotes y más.

---

## 🚀 Accediendo a los Reportes

1. Haz clic en el botón **"📊 Reportes"** en la barra de navegación superior
2. Se abrirá la página de reportes con opciones de filtrado
3. Selecciona tu tipo de reporte (Egresos o Ingresos)
4. Define el rango de fechas (Desde / Hasta)
5. Haz clic en **"Generar"**

---

## 📋 Generando un Reporte

### Paso 1: Selecciona el tipo de reporte
- **Egresos (Salidas)**: Productos retirados del inventario, vendidos o recetados
- **Ingresos (Entradas)**: Productos comprados o añadidos al inventario

### Paso 2: Selecciona el rango de fechas
- **Desde**: Fecha de inicio del reporte
- **Hasta**: Fecha final del reporte

> ⚠️ Ambas fechas son obligatorias. La fecha de inicio debe ser menor que la fecha de fin.

### Paso 3: Haz clic en "Generar"
El sistema cargará y mostrará todos los registros que coincidan con tu búsqueda.

---

## 📊 Columnas del Reporte de Egresos (Salidas)

| Columna | Descripción |
|---------|-------------|
| **Fecha** | Fecha del movimiento |
| **Hora** | Hora exacta del movimiento |
| **Código** | Código de barras del producto |
| **Producto** | Nombre del producto |
| **Categoría** | Categoría del producto |
| **Especialidad** | Especialidad del producto |
| **Cantidad** | Cantidad de unidades movidas |
| **Unidad** | Unidad de medida |
| **Lote** | Número de lote del producto |
| **Motivo** | Razón del movimiento (venta, regalo, etc.) |
| **Código Receta** | Código de la receta (si es una venta con receta) |
| **Fecha Receta** | Fecha de la receta médica |
| **Paciente** | Nombre del paciente que recibió el producto |
| **Prescriptor** | Médico o profesional que prescribió |
| **Código CIE** | Código CIE de la enfermedad/diagnóstico |
| **Usuario** | Usuario que registró el movimiento |

---

## 📦 Columnas del Reporte de Ingresos (Entradas)

| Columna | Descripción |
|---------|-------------|
| **Fecha** | Fecha del movimiento |
| **Hora** | Hora exacta del movimiento |
| **Código** | Código de barras del producto |
| **Producto** | Nombre del producto |
| **Categoría** | Categoría del producto |
| **Especialidad** | Especialidad del producto |
| **Cantidad** | Cantidad de unidades recibidas |
| **Unidad** | Unidad de medida |
| **Lote** | Número de lote del producto |
| **Fecha Emisión** | Fecha de emisión del documento/factura |
| **Fecha Vencimiento** | Fecha de vencimiento del producto |
| **Motivo** | Razón del ingreso (compra, devolución, etc.) |
| **Ubicación** | Ubicación de almacenamiento (estante, cajón, etc.) |
| **Usuario** | Usuario que registró el movimiento |

---

## 💾 Opciones de Exportación

### Imprimir (🖨️)
- Imprime el reporte en formato de tabla
- Se puede guardar como PDF usando la opción de impresión del navegador
- Incluye los datos del período seleccionado
- Muestra el resumen con estadísticas

### Descargar CSV (📥)
- Descarga el reporte en formato CSV (Excel compatible)
- Usa punto y coma (`;`) como delimitador
- Puede abrirse en Excel, Google Sheets o cualquier aplicación de hoja de cálculo
- Nombre del archivo: `reporte-[tipo]-[fecha].csv`

---

## 📈 Información Resumida

Cada reporte muestra un resumen con:
- **Registros**: Cantidad total de registros en el período
- **Total Cantidad**: Suma total de todas las cantidades
- **Desde**: Fecha de inicio del reporte
- **Hasta**: Fecha final del reporte

---

## 💡 Casos de Uso Prácticos

### Caso 1: Auditoría de Ventas
1. Selecciona "Egresos"
2. Elige el período de un mes
3. Genera el reporte y descárgalo como CSV
4. Analiza las ventas por producto, paciente o prescriptor

### Caso 2: Seguimiento de Compras
1. Selecciona "Ingresos"
2. Elige un período de tiempo específico
3. Genera el reporte
4. Revisa qué productos fueron comprados y en qué cantidades

### Caso 3: Control de Medicamentos Controlados
1. Selecciona "Egresos"
2. Filtra por un rango de fechas
3. Busca registros con código CIE específicos
4. Descarga como CSV para auditoría

### Caso 4: Reporte para Junta Directiva
1. Genera reportes de Egresos e Ingresos para un período determinado
2. Descarga ambos en CSV
3. Combina los datos en un análisis más completo
4. Presenta a la junta directiva

### Caso 5: Conciliación de Inventario
1. Genera un reporte de Egresos para el mes
2. Genera un reporte de Ingresos para el mes
3. Descarga ambos como CSV
4. Calcula: Inventario Inicial + Ingresos - Egresos = Inventario Final

---

## ⚙️ Características Técnicas

### API Endpoints

**Reporte de Egresos:**
```
GET /api/reports/egresos?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
```

**Reporte de Ingresos:**
```
GET /api/reports/ingresos?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
```

### Respuesta de la API

```json
{
  "data": [
    {
      "id": "uuid",
      "fecha": "17/01/2025",
      "hora": "14:30:45",
      "codigo": "123456",
      "producto": "Paracetamol 500mg",
      "cantidad": 10,
      "lote": "LOTE-20250110-001",
      "motivo": "Venta",
      "paciente": "Juan Pérez",
      "prescriptor": "Dr. García",
      "usuario": "usuario@example.com"
    }
  ],
  "summary": {
    "totalRecords": 150,
    "totalQuantity": 1500,
    "fromDate": "2025-01-01",
    "toDate": "2025-01-31"
  }
}
```

---

## ✅ Ventajas del Sistema de Reportes

✅ **Reportes en tiempo real** basados en datos actuales
✅ **Rango de fechas flexible** para cualquier período
✅ **Exportación a CSV** para análisis en Excel
✅ **Impresión directa** desde el navegador
✅ **Información completa** de cada movimiento
✅ **Resúmenes automáticos** de cantidades y registros
✅ **Interfaz intuitiva** fácil de usar
✅ **Sin límite de registros** puedes descargar miles
✅ **Datos de auditoría** completos con usuario y timestamp

---

## 🔒 Consideraciones de Privacidad

Los reportes incluyen información sensible:
- Nombres de pacientes
- Códigos CIE (diagnósticos)
- Información de prescriptores

Asegúrate de:
- Guardar los reportes en un lugar seguro
- Cumplir con regulaciones de privacidad de salud
- No compartir reportes sin autorización
- Cumplir LGPD/HIPAA si es aplicable
- Auditar quién descarga los reportes
- Mantener un registro de auditoría de acceso

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo cambiar las columnas del reporte?**
R: Actualmente no, pero puedes descargar como CSV y editar en Excel.

**P: ¿Hay límite de registros?**
R: Los reportes pueden contener miles de registros. Se cargan todos los que coincidan con el período.

**P: ¿Puedo programar reportes automáticos?**
R: No en esta versión, pero puedes generar manualmente cuando lo necesites.

**P: ¿Los reportes incluyen movimientos de ajuste?**
R: No, solo incluyen Egresos (salidas) e Ingresos (entradas) según lo seleccionado.

**P: ¿Qué pasa si no hay datos en el período?**
R: El reporte mostrará "No hay registros para el período seleccionado".

**P: ¿Puedo filtrar por producto específico?**
R: Actualmente se filtran por rango de fechas. Puedes descargar como CSV y filtrar en Excel.

**P: ¿Qué formato es el CSV?**
R: Punto y coma (;) como delimitador, UTF-8 encoding, compatible con Excel.

---

## 📞 Solución de Problemas

Si tienes problemas con los reportes:

1. **Verifica que las fechas sean válidas** (formato YYYY-MM-DD)
2. **Asegúrate de que existen registros** en el período seleccionado
3. **Intenta generar un reporte** para un período más amplio
4. **Revisa la consola del navegador** (F12) para mensajes de error
5. **Intenta limpiar el caché** del navegador
6. **Reinicia tu sesión** si persisten los errores

---

## 📁 Archivos Implementados

### Frontend
- `app/reports/page.tsx` - Interfaz de reportes (442 líneas)

### Backend APIs
- `app/api/reports/egresos/route.ts` - API para reportes de salidas
- `app/api/reports/ingresos/route.ts` - API para reportes de entradas

### Documentación
- REPORTS_GUIDE.md - Esta guía completa
- SYSTEM_REPORTS_IMPLEMENTATION.md - Documentación técnica para desarrolladores

---

## 🚀 Próximas Mejoras Opcionales

- [ ] Filtro por producto específico
- [ ] Filtro por usuario
- [ ] Gráficas y visualizaciones
- [ ] Reportes programados
- [ ] Envío por email
- [ ] Exportación a múltiples formatos
- [ ] Comparativa entre períodos
- [ ] Análisis de tendencias
- [ ] Alertas automáticas de stock bajo

---

**Última actualización:** 5 de febrero de 2026
