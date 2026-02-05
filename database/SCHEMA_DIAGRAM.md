# 🗂️ Database Schema Diagram

## Visual Overview - Bagatela Inventory PostgreSQL Schema

```
╔════════════════════════════════════════════════════════════════════════════╗
║                     BAGATELA INVENTORY DATABASE                            ║
║                          PostgreSQL Schema                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────┐
│                          MASTER TABLES                                   │
└──────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │                      PRODUCTS (Master)                       │
   ├─────────────────────────────────────────────────────────────┤
   │ 🔑 id (PK)                          [INTEGER]               │
   │ 📝 name                             [VARCHAR]               │
   │ 📦 barcode                          [VARCHAR] - UNIQUE      │
   │ 📊 stock (COMPUTED!)                [INTEGER] - Via trigger │
   │ 📈 stock_inicial                    [INTEGER]               │
   │ ⚖️  unit_of_measure                 [VARCHAR]               │
   │ 💊 administration_route             [VARCHAR]               │
   │ 📋 description                      [TEXT]                  │
   │ 📸 image_url                        [VARCHAR]               │
   │ 📅 issue_date                       [DATE]                  │
   │ ⏰ expiration_date                  [DATE]                  │
   │ 📝 notes                            [TEXT]                  │
   │                                                             │
   │ 🕐 created_at (AUTO)                [TIMESTAMP] - Trigger  │
   │ 🔄 updated_at (AUTO)                [TIMESTAMP] - Trigger  │
   │ 🗑️  deleted_at (Soft Delete)        [TIMESTAMP]            │
   │                                                             │
   │ Indexes: name ↓  barcode ↓  active ↓  expiration_date ↓   │
   └─────────────────────────────────────────────────────────────┘
                          ↓         ↓          ↓
        ┌─────────────────┴─────────┴──────────┴─────────┬──────────┐
        │                                                  │          │
        ↓                                                  ↓          ↓
   ┌──────────────────────────┐   ┌──────────────────────────┐  ┌──────────────┐
   │ INVENTORY_MOVEMENTS      │   │ PRODUCT_BATCHES          │  │ PRODUCT_     │
   ├──────────────────────────┤   ├──────────────────────────┤  │ RECIPES      │
   │ 🔑 id (PK)               │   │ 🔑 id (PK)               │  ├──────────────┤
   │ 🔗 product_id (FK)────┐  │   │ 🔗 product_id (FK)──┐   │  │ 🔑 id (PK)   │
   │ 📥 movement_type      │  │   │ 🏷️  batch_number    │   │  │ 🔗 product_id│
   │    (entrada/salida/   │  │   │    (AUTO LOTE-...) │   │  │ 📝 recipe_   │
   │     ajuste)           │  │   │ 📊 stock           │   │  │    code      │
   │ 🔢 quantity (>0)      │  │   │ 📅 issue_date      │   │  │ 📋 recipe_   │
   │ 🎯 reason             │  │   │ ⏰ expiration_date │   │  │    date      │
   │ 📝 notes              │  │   │ 📍 storage_        │   │  │ 👤 patient_  │
   │                       │  │   │    location        │   │  │    name      │
   │ 🕐 created_at (AUTO) │  │   │ 📦 storage_        │   │  │ 👨‍⚕️  prescriber│
   │ 🔄 updated_at (AUTO) │  │   │    drawer          │   │  │    _name     │
   │                       │  │   │ 📂 storage_        │   │  │ 📊 cie_code  │
   │ Indexes:              │  │   │    section         │   │  │ 📝 notes     │
   │   product_id ↓        │  │   │                    │   │  │              │
   │   created_at ↓        │  │   │ 🕐 created_at (A) │   │  │ 🕐 created_at│
   │   movement_type ↓     │  │   │ 🔄 updated_at (A) │   │  │ 🔄 updated_at│
   │   (product, date) ↓   │  │   │ 🗑️  deleted_at     │   │  │ 🗑️  deleted_ │
   │   (type, date) ↓      │  │   │                    │   │  │    at        │
   └──────────────────────────┘   │ Indexes:           │   │  │              │
                                   │   product_id ↓    │   │  │ Indexes:     │
                                   │   batch_number ↓  │   │  │   product_id │
                                   │   expiration_date │   │  │   recipe_code│
                                   │   active ↓        │   │  │   patient_   │
                                   └──────────────────────────┘  │   name       │
                                                               └──────────────┘

        ┌──────────────────────────────────────────┐
        │             USERS (Sistema)              │
        ├──────────────────────────────────────────┤
        │ 🔑 id (PK)                               │
        │ ✉️  email (UNIQUE)                       │
        │ 👤 display_name                          │
        │ 🎭 role (admin/supervisor/operario)      │
        │ ✅ is_active                             │
        │ 👁️ last_login                            │
        │ 🕐 created_at (AUTO)                     │
        │ 🔄 updated_at (AUTO)                     │
        │                                          │
        │ Indexes: email ↓  active ↓               │
        └──────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════════╗
║                              VIEWS (Read-Only)                             ║
╚════════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────────────┐
│ 1. product_stock_summary                                                   │
│    ├─ id, name, barcode, stock_inicial, stock_actual                      │
│    ├─ unit_of_measure, expiration_date                                    │
│    └─ COUNT: total_entradas, total_salidas, total_ajustes, total_movimientos
│                                                                            │
│ 2. product_batches_summary                                                 │
│    ├─ batch_number, product_name, storage_location                        │
│    ├─ issue_date, expiration_date, batch_stock                           │
│    └─ expiration_status (Vigente/Por vencer/Vencido)                     │
│                                                                            │
│ 3. products_expiring_soon                                                  │
│    ├─ Productos vencidos o próximos a vencer (90 días)                  │
│    ├─ dias_para_vencer, urgencia (CRÍTICO/ALERTA/OK)                    │
│    └─ Ordenado por fecha de vencimiento                                  │
│                                                                            │
│ 4. inventory_movements_with_details                                        │
│    ├─ Movimientos con info del producto (JOIN)                           │
│    ├─ product_name, barcode, unit_of_measure                             │
│    ├─ movement_type_label (Entrada 📥 / Salida 📤 / Ajuste ⚙️)           │
│    └─ quantity_sign (-1 para salida, +1 para entrada)                    │
│                                                                            │
│ 5. product_movement_history                                                │
│    ├─ Historial de movimientos POR PRODUCTO                              │
│    ├─ stock_inicial, current_stock, calculated_stock                     │
│    ├─ total_entrada, total_salida, total_ajuste                          │
│    └─ VERIFICA: calculated_stock = current_stock (integridad)            │
│                                                                            │
│ 6. daily_movement_summary                                                  │
│    ├─ Resumen de movimientos POR DÍA                                      │
│    ├─ movement_type, COUNT, SUM(quantity)                                │
│    └─ unique_products (cuántos productos se movieron)                    │
│                                                                            │
│ 7. monthly_movement_report                                                 │
│    ├─ Resumen MENSUAL de movimientos                                      │
│    ├─ movement_type, COUNT, SUM(quantity)                                │
│    └─ active_days (cuántos días hubo movimiento)                         │
│                                                                            │
│ 8. low_stock_products                                                      │
│    ├─ Productos con STOCK < 20% del stock_inicial                        │
│    ├─ stock_percentage, stock_status (CRÍTICO/BAJO/SIN STOCK)           │
│    └─ Para alertas e inventario bajo                                     │
│                                                                            │
│ 9. user_activity_summary                                                   │
│    ├─ Usuarios con su actividad (last_login)                            │
│    ├─ email, display_name, is_active                                     │
│    └─ Ordenado por último acceso                                         │
└────────────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════════╗
║                            TRIGGERS (Automation)                           ║
╚════════════════════════════════════════════════════════════════════════════╝

🕐 TIMESTAMP AUTOMATION (5 triggers)
   ├─ tr_products_updated_at         → AUTO-UPDATE updated_at ON products
   ├─ tr_movements_updated_at        → AUTO-UPDATE updated_at ON movements
   ├─ tr_batches_updated_at          → AUTO-UPDATE updated_at ON batches
   ├─ tr_recipes_updated_at          → AUTO-UPDATE updated_at ON recipes
   └─ tr_users_updated_at            → AUTO-UPDATE updated_at ON users

✓ VALIDATION (2 triggers)
   ├─ tr_products_validate_name      → name ≠ empty
   └─ tr_movements_validate_quantity → quantity > 0

📊 STOCK CALCULATION (3 triggers)
   ├─ tr_movements_insert_update_stock
   │  ├─ INSERT entrada  → products.stock += quantity
   │  ├─ INSERT salida   → products.stock -= quantity
   │  ├─ INSERT ajuste   → products.stock ±= quantity
   │  └─ UPDATE (revert old + apply new)
   │
   └─ tr_movements_delete_stock
      └─ DELETE → REVERSE the operation (stock goes back)

🏷️  BATCH NUMBER AUTO-GENERATION (1 trigger)
    └─ tr_batches_generate_number
       ├─ Format: LOTE-YYYYMMDD-XXXXX (e.g., LOTE-20250115-00001)
       ├─ Uses: seq_batch_number (sequence)
       └─ Generated if batch_number is NULL


╔════════════════════════════════════════════════════════════════════════════╗
║                          INDEXES (Performance)                             ║
╚════════════════════════════════════════════════════════════════════════════╝

🔍 SEARCH OPTIMIZATION
   ├─ idx_products_name              → LIKE 'paracet%'
   ├─ idx_products_barcode           → EXACT barcode = 'BAR-001'
   ├─ idx_product_recipes_code       → recipe_code search
   ├─ idx_product_recipes_patient    → patient_name search
   └─ idx_users_email                → email UNIQUE (also index)

📊 REPORTING OPTIMIZATION
   ├─ idx_movements_product_id       → Fast product history lookup
   ├─ idx_movements_created_at       → Fast date range queries
   ├─ idx_movements_prod_date        → COMPOUND: (product_id, created_at)
   ├─ idx_movements_type_date        → COMPOUND: (movement_type, created_at)
   ├─ idx_batches_product_id         → Batch lookup by product
   └─ idx_batches_expiration         → Find expiring products

🔔 FILTERING OPTIMIZATION
   ├─ idx_products_active            → WHERE deleted_at IS NULL
   ├─ idx_products_expiration        → expiration_date comparison
   ├─ idx_batches_active             → WHERE deleted_at IS NULL
   ├─ idx_batches_expiration         → expiration_date < CURRENT
   └─ idx_users_active               → is_active = true

TOTAL: 21+ strategic indexes across 5 tables


╔════════════════════════════════════════════════════════════════════════════╗
║                            KEY FEATURES                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

✅ AUTO STOCK CALCULATION
   └─ stock = stock_inicial + (entradas - salidas + ajustes)
      Calculated automatically via triggers, never manual insert

✅ SOFT DELETE SUPPORT
   └─ deleted_at field tracks deletion for audit trail
      Recoverable: UPDATE ... SET deleted_at = NULL

✅ CASCADING DELETES
   └─ Deleting a product cascades to:
      ├─ inventory_movements (all records)
      ├─ product_batches (all records)
      └─ product_recipes (all records)

✅ AUDIT TRAIL
   └─ created_at (creation timestamp)
   └─ updated_at (last modification - auto-updated)
   └─ deleted_at (soft delete marker)

✅ AUTO-INCREMENT BATCH NUMBERS
   └─ Format: LOTE-YYYYMMDD-XXXXX
      Unique, sequential, auto-generated

✅ ROLE-BASED USER MANAGEMENT
   └─ Roles: admin, supervisor, operario
      Track: is_active, last_login

✅ BATCH TRACKING
   └─ Stock per batch (separate from product stock)
      Storage location tracking
      Expiration date per batch

✅ RECIPE/PRESCRIPTION TRACKING
   └─ Patient information
      Prescriber information
      CIE diagnostic code


╔════════════════════════════════════════════════════════════════════════════╗
║                            DATA INTEGRITY                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

CONSTRAINTS:
   ✓ PRIMARY KEYS on all tables (id)
   ✓ UNIQUE constraints: barcode (products), email (users)
   ✓ CHECK: stock >= 0, stock_inicial >= 0, quantity > 0
   ✓ FOREIGN KEYS with CASCADE DELETE
   ✓ ENUM: movement_type IN ('entrada', 'salida', 'ajuste')
   ✓ ENUM: role IN ('admin', 'supervisor', 'operario')
   ✓ CHECK: expiration_date >= issue_date

VALIDATION:
   ✓ Triggers validate quantity > 0
   ✓ Triggers validate name not empty
   ✓ Triggers prevent impossible stock values
   ✓ Views auto-exclude soft-deleted records

AUDIT:
   ✓ created_at auto-populated on INSERT
   ✓ updated_at auto-populated on UPDATE
   ✓ deleted_at tracks soft deletes
   ✓ last_login tracks user activity


This schema is:
  ✨ Production-ready
  ⚡ Performance-optimized
  🔒 Data-integrity protected
  📊 Reporting-enabled
  🤖 Highly-automated
  📋 Fully-audited
```

---

## 🎯 Typical Data Flow

```
1. INSERT Product
   └─ products.created_at = NOW (auto)
   └─ products.stock = stock_inicial (auto via trigger)

2. INSERT Batch for Product
   └─ product_batches.batch_number = LOTE-20250115-00001 (auto)
   └─ product_batches.created_at = NOW (auto)

3. Register Movement (Entrada)
   └─ INSERT INTO inventory_movements (product_id, 'entrada', 50, 'Compra')
   └─ TRIGGER: products.stock += 50
   └─ TRIGGER: updated_at = NOW on both tables

4. Register Movement (Salida)
   └─ INSERT INTO inventory_movements (product_id, 'salida', 10, 'Dispensación')
   └─ TRIGGER: products.stock -= 10
   └─ TRIGGER: updated_at = NOW on both tables

5. Query Stock Summary
   └─ SELECT * FROM product_stock_summary
   └─ Shows: current_stock, total_entradas, total_salidas, total_movements

6. Alert on Expiration
   └─ SELECT * FROM products_expiring_soon
   └─ Shows: Products expiring in 90 days or less

7. Soft Delete Product
   └─ UPDATE products SET deleted_at = NOW WHERE id = 1
   └─ Product is "deleted" but recoverable
   └─ Automatically excluded from views

8. Recover Deleted Product
   └─ UPDATE products SET deleted_at = NULL WHERE id = 1
   └─ Product is active again
```

---

**Total**: 5 Tables | 21+ Indexes | 11 Triggers | 9 Views | Full Audit Trail
**Status**: Production-Ready | PostgreSQL 15+ | Supabase Compatible
