-- =====================================================
-- CONSULTAS ÚTILES PARA GESTIÓN DE CATEGORÍAS Y ESPECIALIDADES
-- =====================================================

-- 1. VER TODAS LAS CATEGORÍAS
SELECT id, name, description FROM product_categories ORDER BY name;

-- 2. VER TODAS LAS ESPECIALIDADES
SELECT id, name FROM medical_specialties ORDER BY name;

-- 3. VER UNIDADES DE MEDIDA POR CATEGORÍA
SELECT id, name, category FROM units_of_measure ORDER BY category, name;

-- 4. UNIDADES SOLO PARA MEDICAMENTOS
SELECT id, name FROM units_of_measure WHERE category = 'medicamentos' ORDER BY name;

-- 5. UNIDADES SOLO PARA DISPOSITIVOS MÉDICOS
SELECT id, name FROM units_of_measure WHERE category = 'dispositivos_medicos' ORDER BY name;

-- =====================================================

-- 6. VER PRODUCTOS CON SUS CATEGORÍAS Y ESPECIALIDADES
SELECT 
  p.id,
  p.name,
  pc.name as categoria,
  ms.name as especialidad,
  p.unit_of_measure,
  p.reporting_unit
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN medical_specialties ms ON p.specialty_id = ms.id
ORDER BY p.name;

-- 7. VER PRODUCTOS SIN CATEGORÍA ASIGNADA (DESPUÉS DE MIGRACIÓN)
SELECT id, name FROM products WHERE category_id IS NULL;

-- 8. CONTAR PRODUCTOS POR CATEGORÍA
SELECT 
  pc.name as categoria,
  COUNT(p.id) as total_productos
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
GROUP BY pc.id, pc.name
ORDER BY total_productos DESC;

-- =====================================================

-- 9. VALIDAR INTEGRIDAD - Especialidades asignadas a medicamentos (error)
SELECT 
  p.id,
  p.name,
  pc.name as categoria,
  ms.name as especialidad
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN medical_specialties ms ON p.specialty_id = ms.id
WHERE ms.id IS NOT NULL AND pc.name != 'Dispositivos Médicos';

-- 10. VALIDAR INTEGRIDAD - Dispositivos médicos sin especialidad
SELECT 
  p.id,
  p.name,
  pc.name as categoria,
  CASE WHEN ms.id IS NULL THEN 'SIN ESPECIALIDAD' ELSE ms.name END as especialidad
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN medical_specialties ms ON p.specialty_id = ms.id
WHERE pc.name = 'Dispositivos Médicos' AND ms.id IS NULL;

-- =====================================================

-- NOTAS IMPORTANTES:
-- 1. Ejecuta primero el archivo de migración: 001_add_categories_and_specialties.sql
-- 2. Después puedes asignar categorías a los productos existentes
-- 3. Los productos nuevos REQUIEREN una categoría
-- 4. Las especialidades son opcionales pero recomendadas para dispositivos médicos
-- 5. Las unidades de medida están separadas por categoría en la tabla units_of_measure

-- EJEMPLO DE UPDATE PARA ASIGNAR CATEGORÍAS A PRODUCTOS EXISTENTES:
-- UPDATE products 
-- SET category_id = (SELECT id FROM product_categories WHERE name = 'Medicamentos')
-- WHERE id IN (SELECT id FROM products WHERE category_id IS NULL)
-- LIMIT 10; -- Reemplaza con los IDs específicos de medicamentos

-- =====================================================
