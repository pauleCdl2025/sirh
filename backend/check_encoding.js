const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rh_portal',
  password: 'Cdl@2025',
  port: 5432,
  options: '-c client_encoding=UTF8'
});

async function checkAndFix() {
  try {
    console.log('🔍 Vérification des données mal encodées...\n');
    
    // Vérifier dans employees (chercher les caractères Unicode ‚)
    const employeesBad = await pool.query(`
      SELECT functional_area, COUNT(*) as count 
      FROM employees 
      WHERE functional_area LIKE '%G‚n‚rale%' OR functional_area LIKE '%g‚n‚rale%'
         OR functional_area LIKE '%G,n,rale%' OR functional_area LIKE '%g,n,rale%'
      GROUP BY functional_area
    `);
    
    console.log('📊 Données mal encodées dans employees:');
    if (employeesBad.rows.length > 0) {
      employeesBad.rows.forEach(row => {
        console.log(`  - "${row.functional_area}": ${row.count} occurrence(s)`);
      });
    } else {
      console.log('  ✅ Aucune donnée mal encodée trouvée');
    }
    
    // Vérifier dans effectif (chercher les caractères Unicode ‚)
    const effectifBad = await pool.query(`
      SELECT functional_area, COUNT(*) as count 
      FROM effectif 
      WHERE functional_area LIKE '%G‚n‚rale%' OR functional_area LIKE '%g‚n‚rale%'
         OR functional_area LIKE '%G,n,rale%' OR functional_area LIKE '%g,n,rale%'
      GROUP BY functional_area
    `);
    
    console.log('\n📊 Données mal encodées dans effectif:');
    if (effectifBad.rows.length > 0) {
      effectifBad.rows.forEach(row => {
        console.log(`  - "${row.functional_area}": ${row.count} occurrence(s)`);
      });
    } else {
      console.log('  ✅ Aucune donnée mal encodée trouvée');
    }
    
    // Corriger les données
    console.log('\n🔧 Correction des données...\n');
    
    const corrections = [
      // Corrections pour les virgules Unicode (‚) qui remplacent é
      { table: 'effectif', pattern: 'G‚n‚rale', replacement: 'Générale' },
      { table: 'effectif', pattern: 'g‚n‚rale', replacement: 'générale' },
      { table: 'effectif', pattern: 'Direction G‚n‚rale', replacement: 'Direction Générale' },
      { table: 'effectif', pattern: 'Direction g‚n‚rale', replacement: 'Direction générale' },
      { table: 'employees', pattern: 'G‚n‚rale', replacement: 'Générale' },
      { table: 'employees', pattern: 'g‚n‚rale', replacement: 'générale' },
      { table: 'employees', pattern: 'Direction G‚n‚rale', replacement: 'Direction Générale' },
      { table: 'employees', pattern: 'Direction g‚n‚rale', replacement: 'Direction générale' },
      // Corrections pour les virgules normales aussi (au cas où)
      { table: 'effectif', pattern: 'G,n,rale', replacement: 'Générale' },
      { table: 'effectif', pattern: 'g,n,rale', replacement: 'générale' },
      { table: 'effectif', pattern: 'Direction G,n,rale', replacement: 'Direction Générale' },
      { table: 'effectif', pattern: 'Direction g,n,rale', replacement: 'Direction générale' },
      { table: 'employees', pattern: 'G,n,rale', replacement: 'Générale' },
      { table: 'employees', pattern: 'g,n,rale', replacement: 'générale' },
      { table: 'employees', pattern: 'Direction G,n,rale', replacement: 'Direction Générale' },
      { table: 'employees', pattern: 'Direction g,n,rale', replacement: 'Direction générale' },
    ];
    
    for (const correction of corrections) {
      const result = await pool.query(`
        UPDATE ${correction.table} 
        SET functional_area = REPLACE(functional_area, $1, $2)
        WHERE functional_area LIKE $3
      `, [correction.pattern, correction.replacement, `%${correction.pattern}%`]);
      
      if (result.rowCount > 0) {
        console.log(`✅ ${correction.table}.functional_area: ${result.rowCount} ligne(s) corrigée(s) - "${correction.pattern}" → "${correction.replacement}"`);
      }
    }
    
    // Vérifier après correction
    console.log('\n🔍 Vérification après correction...\n');
    
    const employeesAfter = await pool.query(`
      SELECT functional_area, COUNT(*) as count 
      FROM employees 
      WHERE functional_area LIKE '%Générale%' OR functional_area LIKE '%générale%'
      GROUP BY functional_area
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('📊 Données corrigées dans employees:');
    employeesAfter.rows.forEach(row => {
      console.log(`  - "${row.functional_area}": ${row.count} occurrence(s)`);
    });
    
    const effectifAfter = await pool.query(`
      SELECT functional_area, COUNT(*) as count 
      FROM effectif 
      WHERE functional_area LIKE '%Générale%' OR functional_area LIKE '%générale%'
      GROUP BY functional_area
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Données corrigées dans effectif:');
    effectifAfter.rows.forEach(row => {
      console.log(`  - "${row.functional_area}": ${row.count} occurrence(s)`);
    });
    
    console.log('\n✅ Vérification terminée');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkAndFix();
