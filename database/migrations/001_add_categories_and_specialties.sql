-- =====================================================
-- MIGRACIÓN: Agregar Categorización a Productos
-- Fecha: 15 de enero de 2026
-- Objetivo: Simplificar agregando campos directamente a products
-- =====================================================

-- Agregar columnas directamente a la tabla products
-- Sin tablas separadas, manteniendo el sistema simple

ALTER TABLE products ADD COLUMN category VARCHAR(50);
ALTER TABLE products ADD COLUMN specialty VARCHAR(100);
ALTER TABLE products ADD COLUMN unit_of_measure VARCHAR(50);
ALTER TABLE products ADD COLUMN reporting_unit VARCHAR(50);

-- Agregar comentarios para documentación
COMMENT ON COLUMN products.category IS 'Categoría del producto: Medicamentos o Dispositivos Médicos';
COMMENT ON COLUMN products.specialty IS 'Especialidad médica asociada (Enfermería, Cirugía, Traumatología, etc.). Solo aplica para Dispositivos Médicos';
COMMENT ON COLUMN products.unit_of_measure IS 'Unidad de medida del producto (Comprimidos, Cápsulas, Rollo, Paquete, etc.)';
COMMENT ON COLUMN products.reporting_unit IS 'Unidad para reportes y conteos. Puede ser diferente a unit_of_measure';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
