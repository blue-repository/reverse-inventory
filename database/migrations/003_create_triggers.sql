-- ============================================================
-- Migration: 003_create_triggers.sql
-- Descripción: Crea triggers para auditoría y validaciones
-- Dependencias: 000_create_helper_functions.sql, 001_create_tables.sql
-- ============================================================

-- ============================================================
-- Triggers para tabla: products
-- ============================================================

-- Trigger: Actualizar updated_at en products
CREATE TRIGGER tr_products_update_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger: Validar que nombres no estén vacíos
CREATE OR REPLACE FUNCTION validate_product_name()
RETURNS TRIGGER AS $$
BEGIN
  IF TRIM(NEW.name) = '' THEN
    RAISE EXCEPTION 'El nombre del producto no puede estar vacío';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_products_validate_name
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION validate_product_name();

-- ============================================================
-- Triggers para tabla: inventory_movements
-- ============================================================

-- Trigger: Actualizar updated_at en inventory_movements
CREATE TRIGGER tr_movements_update_timestamp
BEFORE UPDATE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger: Validar cantidad positiva en movimientos
CREATE TRIGGER tr_movements_validate_quantity
BEFORE INSERT OR UPDATE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION validate_movement_quantity();

-- Trigger: Actualizar stock del producto en cada movimiento (INSERT)
CREATE OR REPLACE FUNCTION update_product_stock_on_movement_insert()
RETURNS TRIGGER AS $$
DECLARE
  quantity_change INTEGER;
BEGIN
  -- Calcular cambio de stock según tipo de movimiento
  CASE NEW.movement_type
    WHEN 'entrada' THEN
      quantity_change := NEW.quantity;
    WHEN 'salida' THEN
      quantity_change := -NEW.quantity;
    WHEN 'ajuste' THEN
      quantity_change := NEW.quantity;
    ELSE
      quantity_change := 0;
  END CASE;

  -- Actualizar stock del producto
  UPDATE products 
  SET stock = stock + quantity_change
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_movements_update_stock_insert
AFTER INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_movement_insert();

-- Trigger: Actualizar stock del producto al editar movimiento (UPDATE)
CREATE OR REPLACE FUNCTION update_product_stock_on_movement_update()
RETURNS TRIGGER AS $$
DECLARE
  old_quantity_change INTEGER;
  new_quantity_change INTEGER;
BEGIN
  -- Revertir cambio anterior
  CASE OLD.movement_type
    WHEN 'entrada' THEN
      old_quantity_change := OLD.quantity;
    WHEN 'salida' THEN
      old_quantity_change := -OLD.quantity;
    WHEN 'ajuste' THEN
      old_quantity_change := OLD.quantity;
    ELSE
      old_quantity_change := 0;
  END CASE;

  -- Calcular nuevo cambio
  CASE NEW.movement_type
    WHEN 'entrada' THEN
      new_quantity_change := NEW.quantity;
    WHEN 'salida' THEN
      new_quantity_change := -NEW.quantity;
    WHEN 'ajuste' THEN
      new_quantity_change := NEW.quantity;
    ELSE
      new_quantity_change := 0;
  END CASE;

  -- Actualizar stock: revertir anterior y aplicar nuevo
  UPDATE products 
  SET stock = stock - old_quantity_change + new_quantity_change
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_movements_update_stock_update
AFTER UPDATE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_movement_update();

-- Trigger: Restaurar stock al eliminar movimiento (DELETE)
CREATE OR REPLACE FUNCTION update_product_stock_on_movement_delete()
RETURNS TRIGGER AS $$
DECLARE
  quantity_change INTEGER;
BEGIN
  -- Revertir cambio
  CASE OLD.movement_type
    WHEN 'entrada' THEN
      quantity_change := -OLD.quantity;
    WHEN 'salida' THEN
      quantity_change := OLD.quantity;
    WHEN 'ajuste' THEN
      quantity_change := -OLD.quantity;
    ELSE
      quantity_change := 0;
  END CASE;

  -- Actualizar stock
  UPDATE products 
  SET stock = stock + quantity_change
  WHERE id = OLD.product_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_movements_update_stock_delete
AFTER DELETE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_movement_delete();

-- ============================================================
-- Triggers para tabla: product_batches
-- ============================================================

-- Trigger: Actualizar updated_at en product_batches
CREATE TRIGGER tr_batches_update_timestamp
BEFORE UPDATE ON product_batches
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger: Generar número de lote automático si está vacío
CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_number IS NULL OR TRIM(NEW.batch_number) = '' THEN
    NEW.batch_number := 'LOTE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(NEXTVAL('seq_batch_number')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear secuencia para números de lote
CREATE SEQUENCE IF NOT EXISTS seq_batch_number START WITH 1;

CREATE TRIGGER tr_batches_generate_number
BEFORE INSERT ON product_batches
FOR EACH ROW
EXECUTE FUNCTION generate_batch_number();

-- Trigger: Actualizar stock del producto cuando cambia un lote
-- Este trigger suma todos los stocks de los lotes activos y actualiza el producto
CREATE TRIGGER trigger_update_product_stock
AFTER INSERT OR UPDATE OR DELETE ON product_batches
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- ============================================================
-- Triggers para tabla: product_recipes
-- ============================================================

-- Trigger: Actualizar updated_at en product_recipes
CREATE TRIGGER tr_recipes_update_timestamp
BEFORE UPDATE ON product_recipes
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Triggers para tabla: users
-- ============================================================

-- Trigger: Actualizar updated_at en users
CREATE TRIGGER tr_users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Confirmación
-- ============================================================
SELECT 'Triggers creados exitosamente' AS status,
       'Triggers configurados:' AS item,
       ARRAY[
         'tr_products_update_timestamp',
         'tr_products_validate_name',
         'tr_movements_update_timestamp',
         'tr_movements_validate_quantity',
         'tr_movements_update_stock_insert',
         'tr_movements_update_stock_update',
         'tr_movements_update_stock_delete',
         'tr_batches_update_timestamp',
         'tr_batches_generate_number',
         'tr_recipes_update_timestamp',
         'tr_users_update_timestamp'
       ] AS triggers_list;
