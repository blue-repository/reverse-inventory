# 🏗️ Arquitectura del Sistema

## Vista General

Bagatela Inventory es una aplicación web moderna construida con **Next.js 15**, **TypeScript**, **Tailwind CSS** y **Supabase** como base de datos.

---

## 📦 Stack Tecnológico

### Frontend
- **Framework:** Next.js 15 (React Server Components)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **UI Componentes:** Componentes funcionales personalizados
- **Cliente HTTP:** Fetch API + Supabase JS Client

### Backend
- **Runtime:** Node.js (Vercel)
- **Base de Datos:** PostgreSQL (Supabase)
- **API:** REST endpoints (app/api/)
- **Autenticación:** Supabase Auth

### Herramientas
- **Build Tool:** Webpack (Next.js built-in)
- **Linter:** ESLint
- **Formatter:** Prettier
- **Testing:** Jest (opcional)
- **Deployment:** Vercel (recomendado)

---

## 📂 Estructura de Carpetas

```
bagatela-inventory/
├── app/                          # App Next.js (13+ App Router)
│   ├── actions/                  # Server Actions
│   │   └── products.ts           # Acciones para productos
│   │
│   ├── api/                      # API Routes
│   │   ├── backup/               # Endpoints de backup
│   │   ├── reporte/              # Endpoints de reportes (legacy)
│   │   └── reports/              # Endpoints de reportes (nuevo)
│   │       ├── egresos/route.ts  # GET reportes salidas
│   │       └── ingresos/route.ts # GET reportes entradas
│   │
│   ├── components/               # Componentes reutilizables
│   │   ├── ProductsTable.tsx     # Tabla principal (Server)
│   │   ├── ProductsTableClient.tsx  # Tabla (Client)
│   │   ├── ProductForm.tsx       # Formulario de producto
│   │   ├── ProductDetailsModal.tsx  # Detalles del producto
│   │   ├── BarcodeScannerModal.tsx  # Escaneo QR/códigos
│   │   ├── ScanResultsCart.tsx   # Carrito de escaneos
│   │   ├── InventoryMovementModal.tsx  # Registrar movimientos
│   │   ├── InventoryHistoryModal.tsx   # Ver historial
│   │   ├── ReportsModal.tsx      # Modal de reportes (legacy)
│   │   ├── FilterModal.tsx       # Modal de filtros
│   │   ├── DeleteConfirmModal.tsx   # Confirmación eliminar
│   │   ├── UserIdentificationModal.tsx # Identificar usuario
│   │   ├── ImageModal.tsx        # Ver imagen
│   │   ├── Navbar.tsx            # Barra de navegación
│   │   ├── NavbarContent.tsx     # Contenido navbar
│   │   ├── NavbarWrapper.tsx     # Wrapper para tema
│   │   ├── ThemeConfig.tsx       # Configurador de temas
│   │   ├── ThemeWrapper.tsx      # Wrapper tema principal
│   │   ├── ClientTableWrapper.tsx # Wrapper tabla
│   │   ├── UserIndicator.tsx     # Indicador de usuario
│   │   ├── RefreshButton.tsx     # Botón refrescar
│   │   ├── SearchableSelect.tsx  # Select con búsqueda
│   │   └── wizard/               # Componentes Mobile Wizard
│   │       ├── WizardStepper.tsx
│   │       ├── WizardNavigation.tsx
│   │       ├── WizardStep1.tsx
│   │       ├── WizardStep2.tsx
│   │       ├── WizardStep3.tsx
│   │       ├── WizardStep4.tsx
│   │       ├── WizardStep5.tsx
│   │       └── ProductDetailDrawer.tsx
│   │
│   ├── context/                  # Context API
│   │   ├── ThemeContext.tsx      # Contexto de temas
│   │   └── UserContext.tsx       # Contexto de usuario
│   │
│   ├── database/                 # Migraciones SQL
│   │   └── migrations/           # Scripts de BD
│   │
│   ├── lib/                      # Utilidades
│   │   ├── supabase.ts           # Cliente Supabase
│   │   ├── search-utils.ts       # Funciones búsqueda
│   │   └── ... (otras utilidades)
│   │
│   ├── types/                    # Tipos TypeScript
│   │   ├── product.ts            # Tipos de producto
│   │   └── ... (otros tipos)
│   │
│   ├── reports/                  # Página de reportes
│   │   └── page.tsx              # UI reportes
│   │
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Página inicial
│   ├── globals.css               # Estilos globales
│   ├── darkmode.css              # Estilos modo oscuro
│   └── ... (otros archivos)
│
├── database/                     # Documentación BD
│   ├── migrations/               # Scripts SQL
│   └── queries/                  # Queries útiles
│
├── docs/                         # Documentación
│   ├── features/                 # Docs características
│   ├── reports/                  # Docs reportes
│   ├── design/                   # Docs diseño
│   ├── setup/                    # Docs configuración
│   ├── guides/                   # Guías de uso
│   └── README.md                 # Índice central
│
├── public/                       # Archivos estáticos
│   └── ... (imágenes, favicon, etc.)
│
├── types/                        # Tipos globales
│   └── jspdf-autotable.d.ts     # Type definitions
│
├── .env.local                    # Variables de entorno
├── next.config.ts               # Configuración Next.js
├── tsconfig.json                # Configuración TypeScript
├── tailwind.config.ts           # Configuración Tailwind
├── postcss.config.mjs           # Configuración PostCSS
├── eslint.config.mjs            # Configuración ESLint
├── package.json                 # Dependencias
└── README.md                    # README principal
```

---

## 🔄 Flujo de Datos

### Flujo Simple (Lectura)

```
User (Browser)
    ↓
React Component
    ↓
Server Action / API Route
    ↓
Supabase Client
    ↓
PostgreSQL Database
    ↓
Response JSON
    ↓
Update State
    ↓
Re-render Component
```

### Flujo Complejo (Mutación)

```
User Actions (Click Button)
    ↓
Event Handler (onClick)
    ↓
Update Local State
    ↓
Call Server Action (async)
    ↓
Server validates data
    ↓
Supabase transaction
    ↓
Database updated
    ↓
Return response
    ↓
Client updates UI
    ↓
Optimistic update visible
```

---

## 🔐 Autenticación y Autorización

### Autenticación
- Usa Supabase Auth
- Soporta email/contraseña
- Sessions manejadas automáticamente
- Tokens JWT en localStorage

### Niveles de Acceso (Future)
- Actualmente todos los usuarios tienen acceso completo
- Se puede implementar roles (admin, supervisor, operario)

---

## 📊 Componentes Principales

### 1. **ProductsTable** (Servidor)
```typescript
// Server Component
async function ProductsTable() {
  const products = await fetchProducts();
  return <ProductsTableClient data={products} />
}
```
- Fetcha datos en el servidor
- Pasa datos a componente cliente

### 2. **ProductsTableClient** (Cliente)
```typescript
// Client Component
"use client";
export function ProductsTableClient({ data }) {
  const [products, setProducts] = useState(data);
  // Renderiza tabla interactiva
}
```
- Interactividad: búsqueda, filtros, paginación
- Event listeners para modales

### 3. **Modales**
- `ProductDetailsModal` - Ver/editar detalles
- `InventoryMovementModal` - Registrar movimientos
- `InventoryHistoryModal` - Ver historial
- `BarcodeScannerModal` - Escanear códigos
- Muchos otros...

Todos son Client Components con estado local.

### 4. **Navbar**
Estructura:
```
[Logo] | [Botones] ... [Notificaciones] [User Dropdown]
```
- Logo clickeable (va a inicio)
- Botones de acción (Nuevo, Movimiento)
- Notificaciones (medicamentos vencidos)
- Dropdown usuario (tema, logout)

### 5. **Sistema de Temas**
```
ThemeContext (Provider)
    ↓
useTheme() hook
    ↓
ThemeWrapper / NavbarWrapper / ClientTableWrapper
    ↓
Aplican colors vía style={{ backgroundColor: ... }}
```

---

## 🔄 Server Actions vs API Routes

### Server Actions (Preferido)
```typescript
// Archivo: app/actions/products.ts
"use server"

export async function createProduct(formData: FormData) {
  // Validación en servidor
  // BD update
  // Revalidate cache
  // Return resultado
}
```

**Ventajas:**
- No requiere URL explícita
- Seguro por defecto (Tokens CSRF automáticos)
- Type-safe
- Reutilizable desde Server/Client

### API Routes (Legacy)
```typescript
// Archivo: app/api/reports/egresos/route.ts
export async function GET(request: NextRequest) {
  // Query params
  // BD query
  // Return JSON
}
```

**Ventajas:**
- Útil para webhooks
- CORS configurables
- Compatible con herramientas externas

---

## 🎨 Renderizado en Cliente vs Servidor

### Server Components (Next.js 13+)
```typescript
// Renderiza en servidor
async function Page() {
  const data = await fetch(...);
  return <div>{data}</div>
}
```
- Ideal para datos
- Sin JS en cliente
- Más seguro

### Client Components
```typescript
"use client"
import { useState } from 'react';

export function Button() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>
    {count}
  </button>
}
```
- Interactividad
- Event listeners
- Hooks (useState, useEffect, etc)

---

## 📱 Responsive Design

### Breakpoints (Tailwind)
```
xs: < 640px  (móvil pequeño)
sm: 640px    (móvil)
md: 768px    (tablet)
lg: 1024px   (laptop)
xl: 1280px   (desktop)
```

### Estrategia Mobile-First
```
Por defecto: estilos móviles
sm: sobrescribe para tablet+
md: sobrescribe para tablet grande+
lg: sobrescribe para laptop+
```

---

## 🎯 Flujo de Usuario (Ejemplo: Crear Producto)

```
1. Usuario abre la app
   ↓
2. ProductsTable (Server) fetcha productos
   ↓
3. ProductsTableClient muestra tabla
   ↓
4. Usuario hace click en "+ Nuevo"
   ↓
5. Abre ProductForm Modal
   ↓
6. Usuario completa formulario
   ↓
7. Submit → createProduct (Server Action)
   ↓
8. Server valida datos
   ↓
9. Server inserta en BD
   ↓
10. Revalidate cache
   ↓
11. Cierra modal
   ↓
12. Actualiza tabla
```

---

## 🔌 Integraciones Externas

### Supabase
- Base de datos PostgreSQL
- Autenticación
- Storage (imágenes)
- Realtime (opcional)

### librerías NPM principales
- `@supabase/supabase-js` - Cliente Supabase
- `html5-qrcode` - Escaneo QR
- `jspdf` y `jspdf-autotable` - Generación PDF
- `tailwindcss` - Estilos
- `typescript` - Tipado

---

## 🚀 Deploy

### Recomendado: Vercel
```
git push → Vercel webhook
         ↓
Build: npm run build
     ↓
Deploy automático
     ↓
Live en URL
```

**Variables de entorno requeridas:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🔒 Seguridad

### Frontend
- Validación de inputs
- CSRF tokens automáticos
- XSS prevention (React escapa HTML)

### Backend (Server Actions)
- Validación de datos
- RLS en Supabase
- Autenticación requerida
- Rate limiting (configurar en Vercel)

### Base de Datos
- Conexiones HTTPS
- Contraseñas fuertes
- Backup automático (Supabase)
- Logs de acceso

---

## 📈 Escalabilidad

### Actuales
- Soporta miles de productos
- Decenas de millones de movimientos
- Cientos de usuarios concurrentes

### Futuro
- Implementar caché (Redis)
- CDN para imágenes
- Database replication
- Load balancing

---

## 🧪 Testing (Futuro)

Estructura recomendada:
```
tests/
├── unit/
│   └── search-utils.test.ts
├── integration/
│   └── products.test.ts
└── e2e/
    └── flow.test.ts
```

---

**Última actualización:** 5 de febrero de 2026
