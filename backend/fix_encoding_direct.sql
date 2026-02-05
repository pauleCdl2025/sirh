-- Script SQL pour corriger directement l'encodage dans la base de données
-- Exécutez ce script avec: psql -U postgres -d rh_portal -f fix_encoding_direct.sql

-- Définir l'encodage UTF-8
SET client_encoding TO 'UTF8';

-- Corrections pour la table effectif
UPDATE effectif 
SET functional_area = REPLACE(functional_area, 'G,n,rale', 'Générale')
WHERE functional_area LIKE '%G,n,rale%';

UPDATE effectif 
SET functional_area = REPLACE(functional_area, 'g,n,rale', 'générale')
WHERE functional_area LIKE '%g,n,rale%';

UPDATE effectif 
SET functional_area = REPLACE(functional_area, 'Direction G,n,rale', 'Direction Générale')
WHERE functional_area LIKE '%Direction G,n,rale%';

UPDATE effectif 
SET functional_area = REPLACE(functional_area, 'Direction g,n,rale', 'Direction générale')
WHERE functional_area LIKE '%Direction g,n,rale%';

-- Corrections pour la table employees
UPDATE employees 
SET functional_area = REPLACE(functional_area, 'G,n,rale', 'Générale')
WHERE functional_area LIKE '%G,n,rale%';

UPDATE employees 
SET functional_area = REPLACE(functional_area, 'g,n,rale', 'générale')
WHERE functional_area LIKE '%g,n,rale%';

UPDATE employees 
SET functional_area = REPLACE(functional_area, 'Direction G,n,rale', 'Direction Générale')
WHERE functional_area LIKE '%Direction G,n,rale%';

UPDATE employees 
SET functional_area = REPLACE(functional_area, 'Direction g,n,rale', 'Direction générale')
WHERE functional_area LIKE '%Direction g,n,rale%';

-- Afficher les résultats
SELECT 'effectif' as table_name, functional_area, COUNT(*) as count 
FROM effectif 
WHERE functional_area LIKE '%G,n,rale%' OR functional_area LIKE '%g,n,rale%'
GROUP BY functional_area;

SELECT 'employees' as table_name, functional_area, COUNT(*) as count 
FROM employees 
WHERE functional_area LIKE '%G,n,rale%' OR functional_area LIKE '%g,n,rale%'
GROUP BY functional_area;

-- Vérifier les corrections
SELECT 'effectif' as table_name, functional_area, COUNT(*) as count 
FROM effectif 
WHERE functional_area LIKE '%Générale%' OR functional_area LIKE '%générale%'
GROUP BY functional_area;

SELECT 'employees' as table_name, functional_area, COUNT(*) as count 
FROM employees 
WHERE functional_area LIKE '%Générale%' OR functional_area LIKE '%générale%'
GROUP BY functional_area;
