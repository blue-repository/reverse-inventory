# 📚 Documentación Bagatela Inventory - Índice Central

Bienvenido a la documentación completa del **Sistema de Control de Inventario para Farmacias - Bagatela Inventory**.

Esta documentación está organizada en categorías para facilitar el acceso rápido a la información que necesitas.

---

## 📖 Acceso Rápido

### 🚀 Empezar Rápido
**¿Nuevo en el sistema?** Lee primero:
1. [GUÍA DE INICIO RÁPIDO](./guides/QUICK_START.md) - Primeros pasos
2. [REPORTES - GUÍA PARA USUARIOS](./reports/REPORTS_GUIDE.md) - Crear reportes

---

## 📂 Documentación por Categoría

### 🎯 **Features (Características Principales)**
Documentación de las funcionalidades principales del sistema.

| Documento | Descripción |
|-----------|-------------|
| [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md) | Sistema completo de gestión de inventario, movimientos y stock |
| [BARCODE_SCANNER.md](./features/BARCODE_SCANNER.md) | Escaneo QR/código de barras, búsqueda y carrito de productos |
| [MOBILE_WIZARD.md](./features/MOBILE_WIZARD.md) | Interfaz paso a paso (wizard) optimizada para dispositivos móviles |
| [BACKUP_SYSTEM.md](./features/BACKUP_SYSTEM.md) | Descarga de backups completos de la base de datos en CSV |

---

### 📊 **Reports (Sistema de Reportes)**
Documentación sobre generación, exportación e interpretación de reportes.

| Documento | Descripción |
|-----------|-------------|
| [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md) | Guía completa: cómo generar reportes, columnas, casos de uso |

---

### 🎨 **Design (Diseño y Temas)**
Documentación sobre personalización de colores, responsive design y tema oscuro.

| Documento | Descripción |
|-----------|-------------|
| [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md) | Sistema de temas, paleta de colores, modo oscuro, responsive |

---

### ⚙️ **Setup (Configuración e Instalación)**
Documentación técnica sobre instalación y cambios en la base de datos.

| Documento | Descripción |
|-----------|-------------|
| [DATABASE_MIGRATIONS.md](./setup/DATABASE_MIGRATIONS.md) | 🆕 Guía de migraciones PostgreSQL - Cómo setup la BD |
| [DATABASE_STRUCTURE.md](./setup/DATABASE_STRUCTURE.md) | Estructura de tablas, campos, migraciones y cambios |
| [CHANGES.md](./setup/CHANGES.md) | Historial de cambios realizados en el sistema |

---

### 📘 **Guides (Guías Específicas)**
Guías detalladas para tareas específicas.

| Documento | Descripción |
|-----------|-------------|
| [QUICK_START.md](./guides/QUICK_START.md) | Primeros pasos para empezar a usar el sistema |
| [ARCHITECTURE.md](./guides/ARCHITECTURE.md) | Arquitectura del sistema, componentes principales |

---

## 🎯 Guías por Rol

### 👥 Para Usuarios Finales
1. Lee [QUICK_START.md](./guides/QUICK_START.md)
2. Aprende a crear productos en [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md)
3. Usa reportes según [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md)
4. Personaliza temas en [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)

### 👨‍💼 Para Supervisores/Managers
1. Revisa [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md) para entender reportes
2. Lee [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md) para personalización
3. Consulta [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md) para auditoría
4. Revisa [DATABASE_STRUCTURE.md](./setup/DATABASE_STRUCTURE.md) para entender datos

### 👨‍💻 Para Desarrolladores
1. Lee [ARCHITECTURE.md](./guides/ARCHITECTURE.md) - Arquitectura del proyecto
2. Revisa [DATABASE_STRUCTURE.md](./setup/DATABASE_STRUCTURE.md) - Estructura de datos
3. Estudia los features: [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md), [BARCODE_SCANNER.md](./features/BARCODE_SCANNER.md), etc.
4. Consulta [CHANGES.md](./setup/CHANGES.md) - Historial de cambios

---

## 📋 Mapa Completo de Archivos

```
docs/
├── README.md (Este archivo - Índice Central)
│
├── features/
│   ├── INVENTORY_SYSTEM.md       → Sistema de inventario, movimientos, stock
│   ├── BARCODE_SCANNER.md        → Escaneo QR/códigos de barras
│   ├── MOBILE_WIZARD.md          → Interfaz wizard para móviles
│   └── BACKUP_SYSTEM.md          → Backups de base de datos
│
├── reports/
│   └── REPORTS_GUIDE.md          → Guía completa de reportes
│
├── design/
│   └── DESIGN_SYSTEM.md          → Temas, colores, responsive, modo oscuro
│
├── setup/
│   ├── DATABASE_STRUCTURE.md     → Estructura de BD, tablas, campos
│   └── CHANGES.md                → Historial de cambios
│
└── guides/
    ├── README.md                 → Este archivo
    ├── QUICK_START.md            → Primeros pasos
    └── ARCHITECTURE.md           → Arquitectura del sistema
```

---

## 🔍 Buscar por Tema

### 🏪 Gestión de Productos
- Crear/editar productos: [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md)
- Búsqueda rápida: [BARCODE_SCANNER.md](./features/BARCODE_SCANNER.md)
- Escanear códigos: [BARCODE_SCANNER.md](./features/BARCODE_SCANNER.md)

### 📦 Gestión de Inventario
- Registrar movimientos: [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md)
- Entrada/salida/ajuste: [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md)
- Historial de movimientos: [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md)
- Calcular stock: [INVENTORY_SYSTEM.md](./features/INVENTORY_SYSTEM.md)

### 📊 Reportes y Análisis
- Generar reportes: [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md)
- Exportar a CSV/PDF: [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md)
- Auditoría de ventas: [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md)
- Seguimiento de compras: [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md)

### 📱 Dispositivos Móviles
- Interfaz mobile: [MOBILE_WIZARD.md](./features/MOBILE_WIZARD.md)
- Responsive design: [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)
- Escaneo en móvil: [BARCODE_SCANNER.md](./features/BARCODE_SCANNER.md)

### 🎨 Personalización
- Cambiar colores: [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)
- Modo oscuro: [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)
- Temas predefinidos: [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)
- Responsive: [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)

### 💾 Base de Datos
- Estructura de tablas: [DATABASE_STRUCTURE.md](./setup/DATABASE_STRUCTURE.md)
- Crear backups: [BACKUP_SYSTEM.md](./features/BACKUP_SYSTEM.md)
- Restaurar datos: [BACKUP_SYSTEM.md](./features/BACKUP_SYSTEM.md)

### 🏛️ Técnico
- Arquitectura: [ARCHITECTURE.md](./guides/ARCHITECTURE.md)
- Cambios realizados: [CHANGES.md](./setup/CHANGES.md)
- Estructura de BD: [DATABASE_STRUCTURE.md](./setup/DATABASE_STRUCTURE.md)

---

## ❓ Preguntas Comunes

**P: ¿Por dónde empiezo?**  
R: Lee [QUICK_START.md](./guides/QUICK_START.md) primero

**P: ¿Cómo creo un reporte?**  
R: Consulta [REPORTS_GUIDE.md](./reports/REPORTS_GUIDE.md)

**P: ¿Cómo uso el escaneo de códigos?**  
R: Lee [BARCODE_SCANNER.md](./features/BARCODE_SCANNER.md)

**P: ¿Cómo hago backup de mis datos?**  
R: Ve a [BACKUP_SYSTEM.md](./features/BACKUP_SYSTEM.md)

**P: ¿Cómo cambio el tema/color?**  
R: Consulta [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md)

**P: ¿Cómo funciona el sistema internamente?**  
R: Lee [ARCHITECTURE.md](./guides/ARCHITECTURE.md)

---

## 🔗 Enlaces Útiles

- **Proyecto**: Bagatela Inventory System
- **Tecnología**: Next.js 15 + TypeScript + Supabase + Tailwind CSS
- **Base de Datos**: PostgreSQL (Supabase)
- **Navegador Recomendado**: Chrome/Edge/Firefox reciente

---

## 📝 Notas Importantes

- ✅ Toda la documentación está en **español**
- ✅ Los ejemplos son prácticos y están basados en casos reales
- ✅ Hay guías para usuarios, supervisores y desarrolladores
- ✅ La documentación se actualiza regularmente
- ✅ Busca por **tema** usando el índice arriba

---

## 🚀 Próximas Actualizaciones

La documentación se actualiza conforme se agreguen nuevas características. Última actualización: **5 de febrero de 2026**

---

**¿Necesitas ayuda?** Revisa la categoría correspondiente o busca tu pregunta en las secciones de FAQs en cada documento.
