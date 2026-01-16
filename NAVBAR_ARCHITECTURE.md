# Navbar Architecture - Bagatela Inventory System

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NAVBAR (Sticky)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [💊]                  │                                                │
│  Farmacia Bagatela     │  [Nuevo] [Movimiento]  ...  [🔔] [↻] [👤]    │
│  Sistema de Inventario │                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Responsive Breakpoints:
  - Mobile (< 640px):      [Logo Icon] ... [Campana] [Refresh] [User Icon]
  - Tablet (640px - 767px): [Logo Icon] [Logo Text] ... [Campana] [Refresh] [User Full]
  - Desktop (> 768px):     [Logo] [—] [Buttons] ... [Campana] [Refresh] [User Full]
```

## Component Breakdown

### 1. Logo Section (min-w-fit)
```
┌──────────────────┐
│ [💊] Farmacia    │
│     Bagatela     │
│     Sistema      │
└──────────────────┘

- Icon: h-8 w-8, bg-blue-600, rounded-lg
- Text hidden on xs (< 640px)
- Always visible on sm+ (≥ 640px)
```

### 2. Separator (hidden on sm)
```
────────────────────
(h-6 w-px bg-slate-200)
Visible only on sm+
```

### 3. Action Buttons (hidden on < md)
```
┌──────────────────┐  ┌────────────────┐
│ [+] Nuevo        │  │ [📋] Movimiento│
│ (Blue Fill)      │  │ (Border)       │
└──────────────────┘  └────────────────┘

Visible only on md+ (≥ 768px)
Includes onClick callbacks
```

### 4. Right Section (ml-auto)
```
┌──────┐  ┌──────┐  ┌─────────────────────┐  ┌──────┐
│ [🔔] │  │ [↻]  │  │ [👤] 1206855593     │  │ [👤] │
│ Bell │  │Refresh│  │ (sm+)               │  │(mob) │
└──────┘  └──────┘  └─────────────────────┘  └──────┘

- Notification Bell: dropdown con notificaciones
- Refresh Button: recarga la página
- User Button: información del usuario
```

## Notification Dropdown

```
┌─────────────────────────────────────┐
│ Notificaciones                  [×] │
├─────────────────────────────────────┤
│                                     │
│  ● Medicamentos por vencer          │
│    3 lotes próximos a expirar       │
│    en los próximos 30 días          │
│    Hace 2 horas                     │
│                                     │
│ [Más notificaciones...]             │
└─────────────────────────────────────┘

Features:
- Click outside to close
- Badge (ámbar) cuando hay notificaciones
- Hover effect on notifications
- Scroll si hay muchas
```

## Color Scheme

```
White Background:     #FFFFFF
Borders:             #E2E8F0 (slate-200)
Headers:             #F1F5F9 (slate-50)
Text Primary:        #1E293B (slate-900)
Text Secondary:      #64748B (slate-600)
Primary Action:      #2563EB (blue-600)
Primary Hover:       #1D4ED8 (blue-700)
Badge Notification:  #F59E0B (amber-500)
```

## Spacing

```
Navbar Padding:     px-4 sm:px-6 py-3
Button Gap:         gap-1.5 to gap-2
Logo to Separator:  gap-2.5
Section Gaps:       ml-auto for right alignment
```

## Transitions

```
All buttons:        transition-colors (200ms)
Hover States:       hover:bg-slate-50 or hover:bg-blue-700
Active States:      cursor-pointer, opacity changes
Dropdown:           Instant open/close (no animation yet)
```

## Responsive Strategy

### Mobile Priority (< 640px)
- Logo icon only
- User icon only
- Buttons hidden
- Separator hidden
- Flex row with gap-1.5

### Tablet (640px - 767px)
- Logo icon + text
- Buttons still hidden
- User full (icon + text)
- Separator visible

### Desktop (≥ 768px)
- Full logo with text
- Action buttons visible
- Separator visible
- User full

## Future Enhancements

1. **Notifications**
   - Real-time badge count from database
   - Sound notification on new alert
   - Mark as read functionality
   - Archive old notifications

2. **User Menu**
   - Dropdown with profile options
   - Logout functionality
   - Settings link
   - Help/Support link

3. **Search Bar** (optional for desktop)
   - Quick product search
   - Keyboard shortcut (Cmd+K or Ctrl+K)
   - Command palette style

4. **Mobile Menu**
   - Hamburger menu for mobile
   - Slide-out navigation drawer
   - All buttons accessible on mobile

5. **Notifications Types**
   - Stock warnings
   - Expiring products
   - System updates
   - User mentions

## Implementation Files

```
app/
  ├── components/
  │   ├── Navbar.tsx (NEW - Main navbar component)
  │   ├── RefreshButton.tsx (Existing, used in navbar)
  │   └── ProductsTableClient.tsx (Simplified, buttons removed)
  └── page.tsx (Updated to use <Navbar />)
```

## Usage Example

```tsx
import Navbar from "@/app/components/Navbar";

export default function App() {
  const handleNewProduct = () => {
    // Open product form
  };

  const handleMovement = () => {
    // Open movement modal
  };

  return (
    <div>
      <Navbar 
        onNewProduct={handleNewProduct}
        onMovement={handleMovement}
        notificationCount={3}
      />
      {/* Your page content */}
    </div>
  );
}
```

---

**Created**: 16 de enero de 2026
**Status**: Production Ready
