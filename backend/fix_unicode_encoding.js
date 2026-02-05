const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rh_portal',
  password: 'Cdl@2025',
  port: 5432,
  options: '-c client_encoding=UTF8'
});

async function fixUnicodeEncoding() {
  try {
    console.log('🔧 Correction des caractères Unicode mal encodés...\n');
    
    // Le caractère Unicode ‚ (U+201A) qui remplace é
    const badChar = String.fromCharCode(0x201A); // ‚
    const goodChar = 'é';
    
    console.log(`Caractère à remplacer: "${badChar}" (U+201A)`);
    console.log(`Par: "${goodChar}"\n`);
    
    // Corriger dans employees
    const result1 = await pool.query(`
      UPDATE employees 
      SET functional_area = REPLACE(functional_area, $1, $2)
      WHERE functional_area LIKE $3
    `, [`G${badChar}n${badChar}rale`, `G${goodChar}n${goodChar}rale`, `%G${badChar}n${badChar}rale%`]);
    
    console.log(`✅ employees: ${result1.rowCount} ligne(s) corrigée(s)`);
    
    // Corriger dans effectif
    const result2 = await pool.query(`
      UPDATE effectif 
      SET functional_area = REPLACE(functional_area, $1, $2)
      WHERE functional_area LIKE $3
    `, [`G${badChar}n${badChar}rale`, `G${goodChar}n${goodChar}rale`, `%G${badChar}n${badChar}rale%`]);
    
    console.log(`✅ effectif: ${result2.rowCount} ligne(s) corrigée(s)`);
    
    // Corriger aussi "Direction G‚n‚rale"
    const result3 = await pool.query(`
      UPDATE employees 
      SET functional_area = REPLACE(functional_area, $1, $2)
      WHERE functional_area LIKE $3
    `, [`Direction G${badChar}n${badChar}rale`, `Direction G${goodChar}n${goodChar}rale`, `%Direction G${badChar}n${badChar}rale%`]);
    
    console.log(`✅ employees (Direction): ${result3.rowCount} ligne(s) corrigée(s)`);
    
    const result4 = await pool.query(`
      UPDATE effectif 
      SET functional_area = REPLACE(functional_area, $1, $2)
      WHERE functional_area LIKE $3
    `, [`Direction G${badChar}n${badChar}rale`, `Direction G${goodChar}n${goodChar}rale`, `%Direction G${badChar}n${badChar}rale%`]);
    
    console.log(`✅ effectif (Direction): ${result4.rowCount} ligne(s) corrigée(s)`);
    
    // Vérifier les résultats
    console.log('\n🔍 Vérification après correction...\n');
    
    const check1 = await pool.query(`
      SELECT functional_area, COUNT(*) as count 
      FROM employees 
      WHERE functional_area LIKE '%Générale%'
      GROUP BY functional_area
    `);
    
    console.log('📊 employees avec "Générale":');
    check1.rows.forEach(row => {
      console.log(`  - "${row.functional_area}": ${row.count} occurrence(s)`);
    });
    
    const check2 = await pool.query(`
      SELECT functional_area, COUNT(*) as count 
      FROM effectif 
      WHERE functional_area LIKE '%Générale%'
      GROUP BY functional_area
    `);
    
    console.log('\n📊 effectif avec "Générale":');
    check2.rows.forEach(row => {
      console.log(`  - "${row.functional_area}": ${row.count} occurrence(s)`);
    });
    
    console.log('\n✅ Correction terminée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

fixUnicodeEncoding();
