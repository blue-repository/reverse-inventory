# Sistema de Backup de Base de Datos

## 📋 Descripción

Este sistema te permite descargar un respaldo completo de tu base de datos Supabase con un solo clic. El backup incluye todas tus tablas en formato CSV delimitado por punto y coma (`;`).

## 🎯 ¿Por qué necesitas esto?

Supabase Free tiene limitaciones:
- No permite exportaciones directas completas
- Las consultas están limitadas a 1000 registros
- Riesgo de pérdida de datos sin respaldo

Este sistema **soluciona todos esos problemas** usando paginación automática para descargar TODOS tus datos.

## 🚀 Cómo usar

### Descargar Backup

1. **Haz clic en el ícono de base de datos** (🗄️) en la barra de navegación superior (al lado del ícono de notificaciones)
2. El sistema descargará automáticamente un archivo CSV con todas tus tablas
3. **Guarda este archivo en un lugar seguro** (Google Drive, Dropbox, disco externo, etc.)

### Frecuencia recomendada

- **Diario**: Si haces muchos cambios
- **Semanal**: Para uso normal
- **Mensual**: Como mínimo

## 📦 ¿Qué incluye el backup?

El archivo CSV descargado contiene **3 tablas principales**:

1. **products** - Todos tus productos
2. **product_batches** - Lotes de productos
3. **inventory_movements** - Movimientos de inventario

Cada tabla está claramente separada y etiquetada en el archivo.

## 🔧 Características Técnicas

### Manejo de limitaciones de Supabase

- ✅ **Paginación automática**: Descarga en bloques de 1000 registros
- ✅ **Sin límites**: Obtiene TODOS los datos, sin importar cuántos sean
- ✅ **Ordenado**: Los datos se descargan en orden de creación

### Formato del archivo

- **Delimitador**: Punto y coma (`;`)
- **Codificación**: UTF-8
- **Escape**: Los valores con caracteres especiales se envuelven en comillas
- **Compatibilidad**: Excel, Google Sheets, PostgreSQL, MySQL, etc.

## 📥 Cómo restaurar tus datos

### Opción 1: Restaurar en Supabase

1. Ve a tu proyecto en Supabase
2. Abre el **Table Editor**
3. Selecciona la tabla que quieres restaurar
4. Haz clic en **"Import data from CSV"**
5. En el archivo descargado:
   - Copia la sección de la tabla que necesitas (desde los headers hasta el final de esa tabla)
   - Pégalo en un nuevo archivo .csv
6. Configura:
   - **Delimiter**: Punto y coma (`;`)
   - **Encoding**: UTF-8
7. Haz clic en **"Import"**

⚠️ **IMPORTANTE**: Importa en este orden debido a dependencias:
1. `products` (primero)
2. `product_batches` (segundo)
3. `inventory_movements` (tercero)

### Opción 2: Restaurar en PostgreSQL directo

Si tienes acceso directo a PostgreSQL:

```sql
-- Primero: products
COPY products FROM '/ruta/al/archivo-products.csv' 
DELIMITER ';' CSV HEADER;

-- Segundo: product_batches
COPY product_batches FROM '/ruta/al/archivo-batches.csv' 
DELIMITER ';' CSV HEADER;

-- Tercero: inventory_movements
COPY inventory_movements FROM '/ruta/al/archivo-movements.csv' 
DELIMITER ';' CSV HEADER;
```

### Opción 3: Excel o Google Sheets

1. Abre el archivo CSV en Excel o Google Sheets
2. El delimitador es punto y coma (`;`)
3. Usa "Datos > Texto en columnas" en Excel
4. O "Archivo > Importar" en Google Sheets

## 🔍 Verificar el backup

Después de descargar, abre el archivo y verifica:

- ✅ Las tres tablas están presentes
- ✅ Los encabezados tienen los nombres de las columnas
- ✅ Los datos se ven correctos
- ✅ El número de registros coincide con tu base de datos

## 🆘 Solución de problemas

### "Error al descargar el backup"

- Verifica tu conexión a internet
- Asegúrate de que Supabase esté funcionando
- Revisa la consola del navegador para más detalles

### "El archivo se ve corrupto"

- Abre el archivo con un editor de texto (no Excel)
- Verifica que la codificación sea UTF-8
- Asegúrate de no haber modificado el archivo después de descargarlo

### "Faltan registros"

- El sistema usa paginación automática
- Verifica los logs en la consola del servidor
- Intenta descargar nuevamente

## 💡 Consejos

1. **Descarga backups regularmente**: No esperes a tener un problema
2. **Guarda múltiples copias**: En diferentes lugares (cloud + local)
3. **Verifica tus backups**: Abre el archivo ocasionalmente para verificar que funciona
4. **Nombra tus archivos**: El sistema ya incluye la fecha, no cambies el nombre
5. **Mantén un historial**: Guarda los últimos 3-5 backups

## 📊 Estructura del archivo

```
BACKUP BAGATELA INVENTORY - 2026-02-04
=================================================

RESUMEN DEL BACKUP:
- products: XXX registros
- product_batches: XXX registros  
- inventory_movements: XXX registros

==================================================
TABLA: PRODUCTS
==================================================
id;name;barcode;description;stock;...
[datos de productos]

==================================================
TABLA: PRODUCT_BATCHES
==================================================
id;product_id;batch_number;stock;...
[datos de lotes]

==================================================
TABLA: INVENTORY_MOVEMENTS
==================================================
id;product_id;movement_type;quantity;...
[datos de movimientos]

==================================================
INSTRUCCIONES DE RESTAURACIÓN
==================================================
[Instrucciones detalladas]
```

## 🔐 Seguridad

- El backup **NO incluye contraseñas** (no hay en el schema)
- Los archivos se descargan directamente a tu computadora
- **No se envía nada a terceros**
- Es tu responsabilidad guardar el archivo de forma segura

## 📝 Notas adicionales

- El backup incluye registros eliminados (`deleted_at` no es NULL)
- Las fechas están en formato ISO 8601
- Los UUIDs se preservan para mantener las relaciones
- El sistema es completamente automático, no requiere configuración

---

**¿Necesitas ayuda?** Revisa los logs en la consola del navegador (F12) para más detalles sobre cualquier error.
