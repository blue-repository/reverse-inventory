-- ============================================================
-- Migration: 000_create_helper_functions.sql
-- Descripción: Crea funciones helper para triggers
-- ============================================================

-- Función para actualizar automáticamente el campo updated_at
-- Se usa en todos los triggers de actualización
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para validar que quantity sea positivo en inventory_movements
CREATE OR REPLACE FUNCTION validate_movement_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el stock del producto basado en la suma de lotes
-- Se ejecuta cuando se inserta, actualiza o elimina un lote (product_batches)
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  total_batch_stock INTEGER;
BEGIN
  -- Calcular el stock total de todos los lotes activos del producto
  SELECT COALESCE(SUM(stock), 0) INTO total_batch_stock
  FROM product_batches
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    AND is_active = true;
  
  -- Actualizar el stock del producto
  UPDATE products
  SET stock = total_batch_stock,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Confirmación
SELECT 'Funciones helper creadas exitosamente' AS status;
