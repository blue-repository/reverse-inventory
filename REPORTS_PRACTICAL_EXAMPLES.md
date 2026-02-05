# 📊 Ejemplos Prácticos de Uso del Sistema de Reportes

## Ejemplo 1: Auditoria Mensual de Ventas

### Objetivo
El gerente necesita revisar todas las ventas de enero de 2025 para una auditoría.

### Pasos
```
1. Haz clic en "📊 Reportes" en la barra superior
2. Tipo: Selecciona "Egresos (Salidas)"
3. Desde: 2025-01-01
4. Hasta: 2025-01-31
5. Haz clic en "Generar"
```

### Resultado Esperado
```
Se mostrará:
- Tabla con todas las ventas del mes
- Total de 150 registros
- Total de 2,500 unidades vendidas
- Información completa: pacientes, prescriptores, lotes, etc.
```

### Exportación
```
1. Haz clic en "📥 CSV"
2. Se descarga: reporte-egresos-2025-01-31.csv
3. Abre en Excel
4. Filtra por categoría o paciente si necesitas
```

---

## Ejemplo 2: Control de Medicamentos Controlados

### Objetivo
Auditar todos los medicamentos controlados vendidos en el trimestre.

### Pasos
```
1. Ve a Reportes
2. Tipo: "Egresos (Salidas)"
3. Desde: 2024-10-01
4. Hasta: 2024-12-31
5. Genera el reporte
```

### Análisis
```
En la tabla resultante, busca:
- Productos con códigos CIE específicos
- Medicamentos en la categoría "Controlados"
- Pacientes que recibieron múltiples dosis
- Prescriptores autorizados
```

### Uso Posterior
```
- Copia los datos a Excel
- Crea un pivot table por prescriptor
- Revisa patrones de uso
- Cumple con auditoría regulatoria
```

---

## Ejemplo 3: Reconciliación de Inventario

### Objetivo
Verificar que los movimientos de entrada coincidan con las compras realizadas.

### Paso 1: Reporte de Ingresos
```
1. Ve a Reportes
2. Tipo: "Ingresos (Entradas)"
3. Desde: 2025-01-01
4. Hasta: 2025-01-15
5. Genera el reporte
```

### Paso 2: Verificación
```
En el reporte podrás ver:
- Fecha de cada compra
- Productos recibidos
- Cantidad recibida
- Lotes y fechas de vencimiento
- Ubicación en almacén
```

### Paso 3: Validación
```
Compara con:
- Facturas de proveedores
- Órdenes de compra
- Stock actual en inventario
- Ubicaciones reportadas
```

---

## Ejemplo 4: Seguimiento de Vencimiento

### Objetivo
Identificar productos que están próximos a vencer.

### Paso 1: Obtener Ingresos Recientes
```
1. Ve a Reportes
2. Tipo: "Ingresos (Entradas)"
3. Desde: 2024-01-01
4. Hasta: Hoy
5. Genera el reporte
```

### Paso 2: Filtrar por Fecha de Vencimiento
```
En Excel (después de descargar):
1. Abre el CSV descargado
2. Filtra la columna "Fecha Vencimiento"
3. Ordena ascendente
4. Busca fechas próximas a hoy (en próximos 3 meses)
```

### Paso 3: Acción
```
Productos a vencer:
- Acelera venta de estos
- Notifica al personal de ventas
- Planifica promociones
- Documenta lo vendido después
```

---

## Ejemplo 5: Reporte de Devoluciones y Ajustes

### Objetivo
Rastrear todas las devoluciones de clientes en un período.

### Pasos
```
1. Ve a Reportes
2. Tipo: "Egresos (Salidas)"
3. Desde: 2025-01-01
4. Hasta: 2025-01-31
5. Genera el reporte
6. En Excel, filtra por:
   - Motivo = "Devolución"
   - O Motivo = "Ajuste"
```

### Análisis
```
Podrás ver:
- Qué productos se devolvieron
- Cuáles fueron los motivos
- Cuántas unidades
- En qué fechas
- Quién registró la devolución
```

### Insight
```
- Identifica productos problemáticos
- Calcula tasa de devolución
- Detecta patrones de defectos
- Comunica con proveedores
```

---

## Ejemplo 6: Reportería para Junta Directiva

### Objetivo
Crear un resumen ejecutivo con datos de movimientos para presentar.

### Paso 1: Generar Reportes
```
Reporte 1 - Egresos:
- Desde: 2024-01-01
- Hasta: 2024-12-31
- Descarga como CSV

Reporte 2 - Ingresos:
- Desde: 2024-01-01
- Hasta: 2024-12-31
- Descarga como CSV
```

### Paso 2: Crear Análisis en Excel
```
Con ambos CSV:
1. Crea una hoja de "Resumen"
2. Pivot table de Egresos por categoría
3. Pivot table de Ingresos por proveedor
4. Gráficos de tendencias
5. Comparativa mensual
```

### Paso 3: Presentación
```
Muestra a la junta:
- Total de ventas (egresos)
- Total de compras (ingresos)
- Categorías más vendidas
- Productos de mayor movimiento
- Análisis de rentabilidad
```

---

## Ejemplo 7: Validación de Recetas Médicas

### Objetivo
Auditar que todas las ventas con receta fueron registradas correctamente.

### Pasos
```
1. Ve a Reportes
2. Tipo: "Egresos (Salidas)"
3. Desde: 2025-01-15
4. Hasta: 2025-01-31
5. Genera el reporte
```

### Validación
```
Revisa cada fila:
- ¿Tiene "Código Receta"? (no es "-")
- ¿Tiene "Paciente"? (no es "-")
- ¿Tiene "Prescriptor"? (nombre válido)
- ¿Tiene "Código CIE"? (diagnóstico registrado)
- ¿La cantidad es correcta?
```

### Correcciones
```
Si encuentra registros incompletos:
1. Nota el ID del registro
2. Vuelve a la tabla de movimientos principal
3. Edita/completa la información
4. Regenera el reporte después
```

---

## Ejemplo 8: Impresión para Documentación Física

### Objetivo
Imprimir un reporte para guardar en archivo físico o enviar por correo.

### Pasos
```
1. Genera el reporte en pantalla
2. Verifica que los datos sean correctos
3. Haz clic en "🖨️ Imprimir"
4. En el cuadro de impresión, selecciona:
   - "Guardar como PDF" (recomendado)
   - O selecciona una impresora física
5. Guarda con nombre: "Reporte-Egresos-Enero-2025.pdf"
```

### Resultado
```
PDF con:
- Título y fecha de generación
- Tabla completa con todos los datos
- Resumen en la parte superior
- Formateado para lectura
- Listo para archivar o enviar
```

---

## Ejemplo 9: Análisis de Vendedor por Período

### Objetivo
Evaluar el desempeño de vendedores en un período específico.

### Paso 1: Obtener Reporte
```
1. Ve a Reportes
2. Tipo: "Egresos (Salidas)"
3. Desde: 2025-01-01
4. Hasta: 2025-01-31
5. Descarga como CSV
```

### Paso 2: Análisis en Excel
```
Con el CSV:
1. Filtra por columna "Usuario"
2. Crea pivot table Usuario vs Total Cantidad
3. Crea pivot table Usuario vs Total Registros
4. Calcula promedio por transacción
5. Identifica el vendedor top del mes
```

### Paso 3: Reconocimiento
```
Resultados:
- Juan: 500 unidades, 50 transacciones (Mejor vendedor)
- María: 350 unidades, 60 transacciones
- Pedro: 200 unidades, 25 transacciones
```

---

## Ejemplo 10: Rastreo de Lotes Específicos

### Objetivo
Seguir la distribución de un lote específico de medicamentos.

### Pasos
```
1. Supón que recibiste Lote "LOTE-2025-001"
2. Ve a Reportes
3. Tipo: "Egresos (Salidas)"
4. Desde: Fecha de recepción
5. Hasta: Hoy
6. Descarga como CSV
```

### Búsqueda
```
En Excel:
1. Usa Ctrl+F para buscar "LOTE-2025-001"
2. Encontrarás todas las ventas
3. Verás: pacientes, fechas, cantidades
4. Valida que se usó correctamente
5. Confirma que no hay stock remanente
```

### Resultado
```
"LOTE-2025-001"
├─ Recibido: 1000 unidades
├─ Vendido a Paciente A: 100 unidades (15/01/2025)
├─ Vendido a Paciente B: 150 unidades (17/01/2025)
├─ Vendido a Paciente C: 50 unidades (18/01/2025)
├─ Devuelto: 20 unidades (20/01/2025)
└─ Balance: Verificar en inventario

Total vendido: 300 unidades
Restante: 700 unidades (validar en BD)
```

---

## 🎯 Resumen de Casos de Uso

| Caso | Tipo Reporte | Filtro | Acción Típica |
|------|--------------|--------|---------------|
| Auditoría de ventas | Egresos | Rango mensual | Descargar CSV |
| Control medicamentos | Egresos | Período + Código CIE | Análisis regulatorio |
| Reconciliación | Ingresos | Semana específica | Validar con facturas |
| Vencimientos | Ingresos | Todo el historial | Filtrar por fecha vence |
| Devoluciones | Egresos | Rango + Motivo | Análisis de calidad |
| Junta directiva | Ambos | Período anual | Crear gráficos |
| Validación recetas | Egresos | Rango semanal | Verificar completitud |
| Impresión física | Cualquiera | Período específico | PDF para archivo |
| Análisis vendedor | Egresos | Mes | Pivot table por usuario |
| Rastreo lotes | Egresos | Largo plazo | Búsqueda por lote |

---

## 💡 Tips Útiles

✅ **Genera reportes regularmente** - No esperes a emergencias
✅ **Descarga respaldos** - Guarda CSV como backup
✅ **Usa Excel para análisis avanzado** - Los reportes son el punto de partida
✅ **Filtra en Excel** - Aprovecha los filtros nativos
✅ **Crea pivot tables** - Agrupa datos por categorías
✅ **Guarda reportes importantes** - Mantén histórico de auditorías
✅ **Comunica resultados** - Comparte hallazgos con el equipo
✅ **Actualiza reportes periódicamente** - Los datos cambian diariamente

---

## 📞 Soporte y Troubleshooting

**Problema:** "Genero el reporte pero aparece vacío"
```
Solución:
1. Verifica que existan registros en el período
2. Intenta un período más amplio (ej: todo el mes)
3. Revisa la consola (F12) para errores
```

**Problema:** "El CSV no abre bien en Excel"
```
Solución:
1. Excel reconoce ; como delimitador automáticamente
2. Si no, usa: Datos → Texto a Columnas
3. Selecciona "Punto y coma" como delimitador
```

**Problema:** "Quiero solo ciertos datos"
```
Solución:
1. Descarga el CSV completo
2. Abre en Excel
3. Filtra las columnas que necesitas
4. Copia solo esos datos
5. O usa formulas SUMAR.SI para cálculos específicos
```

---

**¡Los reportes son tu herramienta más poderosa para análisis de datos!**
