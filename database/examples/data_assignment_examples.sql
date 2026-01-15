-- =====================================================
-- EJEMPLOS Y DATOS DE PRUEBA
-- =====================================================

-- NOTA: Ejecuta primero la migración principal antes de estos ejemplos

-- =====================================================
-- 1. ASIGNAR CATEGORÍAS A PRODUCTOS EXISTENTES
-- =====================================================

-- Ejemplo: Si tienes un producto llamado "Paracetamol"
-- UPDATE products 
-- SET category_id = (SELECT id FROM product_categories WHERE name = 'Medicamentos')
-- WHERE name = 'Paracetamol';

-- Ejemplo: Asignar múltiples productos a Medicamentos
-- UPDATE products 
-- SET category_id = (SELECT id FROM product_categories WHERE name = 'Medicamentos')
-- WHERE name ILIKE '%ibuprofen%' OR name ILIKE '%amoxicilina%';

-- Ejemplo: Asignar múltiples productos a Dispositivos Médicos
-- UPDATE products 
-- SET category_id = (SELECT id FROM product_categories WHERE name = 'Dispositivos Médicos')
-- WHERE name ILIKE '%gasa%' OR name ILIKE '%venda%' OR name ILIKE '%jeringas%';

-- =====================================================
-- 2. ASIGNAR ESPECIALIDADES A DISPOSITIVOS MÉDICOS
-- =====================================================

-- Ejemplo: Asignar especialidad "Cirugía" a producto con nombre LIKE "quirúrgico"
-- UPDATE products 
-- SET specialty_id = (SELECT id FROM medical_specialties WHERE name = 'Cirugía')
-- WHERE category_id = (SELECT id FROM product_categories WHERE name = 'Dispositivos Médicos')
-- AND name ILIKE '%quirúrgico%';

-- Ejemplo: Asignar "Enfermería" a productos específicos
-- UPDATE products 
-- SET specialty_id = (SELECT id FROM medical_specialties WHERE name = 'Enfermería')
-- WHERE id IN (
--   SELECT id FROM products 
--   WHERE category_id = (SELECT id FROM product_categories WHERE name = 'Dispositivos Médicos')
--   AND name ILIKE '%gasa%' OR name ILIKE '%venda%'
-- );

-- =====================================================
-- 3. ASIGNAR UNIDADES DE REPORTE
-- =====================================================

-- Ejemplo: Para medicamentos, usar la unidad de medida actual
-- UPDATE products 
-- SET reporting_unit = unit_of_measure
-- WHERE category_id = (SELECT id FROM product_categories WHERE name = 'Medicamentos');

-- Ejemplo: Para dispositivos, asignar "Caja" como unidad de reporte estándar
-- UPDATE products 
-- SET reporting_unit = 'Caja'
-- WHERE category_id = (SELECT id FROM product_categories WHERE name = 'Dispositivos Médicos');

-- =====================================================
-- 4. VERIFICACIONES Y VALIDACIONES
-- =====================================================

-- Ver productos SIN categoría asignada (para completar)
SELECT id, name, unit_of_measure 
FROM products 
WHERE category_id IS NULL
ORDER BY name;

-- Ver dispositivos médicos sin especialidad
SELECT 
  p.id,
  p.name,
  pc.name as categoria
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
WHERE pc.name = 'Dispositivos Médicos' AND p.specialty_id IS NULL
ORDER BY p.name;

-- Ver dispositivos médicos con especialidad asignada
SELECT 
  p.id,
  p.name,
  pc.name as categoria,
  ms.name as especialidad
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN medical_specialties ms ON p.specialty_id = ms.id
WHERE pc.name = 'Dispositivos Médicos'
ORDER BY ms.name, p.name;

-- Contar productos por categoría
SELECT 
  pc.name as categoria,
  COUNT(p.id) as total,
  COUNT(DISTINCT CASE WHEN p.specialty_id IS NOT NULL THEN 1 END) as con_especialidad
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
GROUP BY pc.id, pc.name
ORDER BY total DESC;

-- =====================================================
-- 5. QUERIES PARA BACKEND
-- =====================================================

-- Obtener todas las categorías (para dropdown)
-- SELECT id, name FROM product_categories ORDER BY name;

-- Obtener especialidades (para dropdown)
-- SELECT id, name FROM medical_specialties ORDER BY name;

-- Obtener unidades de medida según categoría
-- SELECT id, name 
-- FROM units_of_measure 
-- WHERE category = 'medicamentos'  -- O 'dispositivos_medicos'
-- ORDER BY name;

-- Obtener un producto con toda su información
-- SELECT 
--   p.*,
--   pc.name as category_name,
--   ms.name as specialty_name,
--   json_build_object(
--     'id', u.id,
--     'name', u.name,
--     'category', u.category
--   ) as unit_of_measure_info
-- FROM products p
-- LEFT JOIN product_categories pc ON p.category_id = pc.id
-- LEFT JOIN medical_specialties ms ON p.specialty_id = ms.id
-- LEFT JOIN units_of_measure u ON p.unit_of_measure = u.name
-- WHERE p.id = 'product_id';

-- =====================================================
-- 6. OPERACIONES DE MANTENIMIENTO
-- =====================================================

-- Limpiar unidades de reporte vacías
-- UPDATE products 
-- SET reporting_unit = unit_of_measure
-- WHERE reporting_unit IS NULL;

-- Copiar valores de unit_of_measure a reporting_unit para medicamentos
-- UPDATE products 
-- SET reporting_unit = unit_of_measure
-- WHERE category_id = (SELECT id FROM product_categories WHERE name = 'Medicamentos')
-- AND reporting_unit IS NULL;

-- Cambiar todas las especialidades de un producto
-- UPDATE products 
-- SET specialty_id = (SELECT id FROM medical_specialties WHERE name = 'Uso General')
-- WHERE category_id = (SELECT id FROM product_categories WHERE name = 'Dispositivos Médicos')
-- AND specialty_id IS NULL;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- 1. Todos los ejemplos están comentados. Descomenta solo los que necesites.
-- 2. Reemplaza 'product_id' con el ID real del producto
-- 3. Reemplaza 'medicamentos' o 'dispositivos_medicos' según corresponda
-- 4. Prueba en una copia de datos antes de ejecutar UPDATE masivos
-- 5. Mantén un backup antes de cambios importantes

-- =====================================================
