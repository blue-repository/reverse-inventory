-- ============================================================
-- Migration: 008_allow_negative_product_stock.sql
-- Descripcion: Permite stock negativo en products para egresos forzados
-- ============================================================

-- El stock actual puede quedar negativo por decision operativa.
-- Se conserva la validacion de stock_inicial >= 0.
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_stock_check;

COMMENT ON COLUMN products.stock IS 'Stock actual del producto (puede ser negativo por egresos forzados)';

-- Confirmacion
SELECT
  'Constraint products_stock_check removido correctamente' AS status;
