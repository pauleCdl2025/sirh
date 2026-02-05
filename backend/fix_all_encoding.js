const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rh_portal',
  password: 'Cdl@2025',
  port: 5432,
  options: '-c client_encoding=UTF8'
});

async function fixAllEncoding() {
  try {
    console.log('🔧 Correction complète de l\'encodage dans toute la base de données...\n');
    
    // Le caractère Unicode problématique
    const badChar = String.fromCharCode(0x201A); // ‚
    const goodChar = 'é';
    
    // Liste de tous les champs à corriger
    const fieldsToFix = [
      'nom_prenom',
      'poste_actuel',
      'functional_area',
      'responsable',
      'statut_marital',
      'specialisation',
      'niveau_etude',
      'nationalite',
      'statut_employe',
      'type_contrat',
      'entity',
      'adresse',
      'lieu'
    ];
    
    const tables = ['employees', 'effectif'];
    
    let totalFixed = 0;
    
    for (const table of tables) {
      console.log(`\n📊 Correction de la table ${table}...`);
      
      for (const field of fieldsToFix) {
        // Remplacer le caractère Unicode ‚ par é
        const result1 = await pool.query(`
          UPDATE ${table} 
          SET ${field} = REPLACE(${field}, $1, $2)
          WHERE ${field} IS NOT NULL AND ${field} LIKE $3
        `, [badChar, goodChar, `%${badChar}%`]);
        
        if (result1.rowCount > 0) {
          console.log(`  ✅ ${field}: ${result1.rowCount} ligne(s) corrigée(s)`);
          totalFixed += result1.rowCount;
        }
        
        // Corriger aussi les virgules normales qui remplacent é dans les mots français
        const corrections = [
          { pattern: 'C,libataire', replacement: 'Célibataire' },
          { pattern: 'Mari,', replacement: 'Marié' },
          { pattern: 'G,n,rale', replacement: 'Générale' },
          { pattern: 'g,n,rale', replacement: 'générale' },
          { pattern: 'Direction G,n,rale', replacement: 'Direction Générale' },
          { pattern: 'Direction g,n,rale', replacement: 'Direction générale' },
          { pattern: 'M,decin', replacement: 'Médecin' },
          { pattern: 'Op,rateur', replacement: 'Opérateur' },
          { pattern: 'secr,taire', replacement: 'secrétaire' },
          { pattern: 'm,dicale', replacement: 'médicale' },
          { pattern: 'r,nimateur', replacement: 'réanimateur' },
          { pattern: 'sup,rieur', replacement: 'supérieur' },
          { pattern: 'anesthesiste', replacement: 'anesthésiste' },
          { pattern: 'biologie m,dicale', replacement: 'biologie médicale' },
        ];
        
        for (const correction of corrections) {
          const result = await pool.query(`
            UPDATE ${table} 
            SET ${field} = REPLACE(${field}, $1, $2)
            WHERE ${field} IS NOT NULL AND ${field} LIKE $3
          `, [correction.pattern, correction.replacement, `%${correction.pattern}%`]);
          
          if (result.rowCount > 0) {
            console.log(`  ✅ ${field} (${correction.pattern}): ${result.rowCount} ligne(s) corrigée(s)`);
            totalFixed += result.rowCount;
          }
        }
      }
    }
    
    console.log(`\n✅ Correction terminée ! Total: ${totalFixed} ligne(s) corrigée(s)`);
    
    // Vérification finale
    console.log('\n🔍 Vérification finale...\n');
    
    const check = await pool.query(`
      SELECT 
        'employees' as table_name,
        COUNT(*) FILTER (WHERE statut_marital LIKE '%C,libataire%' OR statut_marital LIKE '%C‚libataire%') as bad_statut_marital,
        COUNT(*) FILTER (WHERE functional_area LIKE '%G,n,rale%' OR functional_area LIKE '%G‚n‚rale%') as bad_functional_area
      FROM employees
      UNION ALL
      SELECT 
        'effectif' as table_name,
        COUNT(*) FILTER (WHERE statut_marital LIKE '%C,libataire%' OR statut_marital LIKE '%C‚libataire%') as bad_statut_marital,
        COUNT(*) FILTER (WHERE functional_area LIKE '%G,n,rale%' OR functional_area LIKE '%G‚n‚rale%') as bad_functional_area
      FROM effectif
    `);
    
    check.rows.forEach(row => {
      console.log(`📊 ${row.table_name}:`);
      console.log(`  - statut_marital mal encodé: ${row.bad_statut_marital}`);
      console.log(`  - functional_area mal encodé: ${row.bad_functional_area}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

fixAllEncoding();
