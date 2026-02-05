const { Pool } = require('pg');

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rh_portal',
  password: 'Cdl@2025',
  port: 5432,
  options: '-c client_encoding=UTF8'
});

// Fonction pour corriger l'encodage dans toutes les tables
const fixEncodingInAllTables = async () => {
  try {
    console.log('🔧 Début de la correction de l\'encodage...');
    
    // Définir l'encodage UTF-8 pour la session
    await pool.query("SET client_encoding TO 'UTF8';");
    
    // Liste des corrections à effectuer
    const corrections = [
      // Corrections pour functional_area (Direction) - avec différentes variantes
      { table: 'effectif', column: 'functional_area', wrong: 'G,n,rale', correct: 'Générale' },
      { table: 'employees', column: 'functional_area', wrong: 'G,n,rale', correct: 'Générale' },
      { table: 'effectif', column: 'functional_area', wrong: 'g,n,rale', correct: 'générale' },
      { table: 'employees', column: 'functional_area', wrong: 'g,n,rale', correct: 'générale' },
      { table: 'effectif', column: 'functional_area', wrong: 'Direction G,n,rale', correct: 'Direction Générale' },
      { table: 'employees', column: 'functional_area', wrong: 'Direction G,n,rale', correct: 'Direction Générale' },
      { table: 'effectif', column: 'functional_area', wrong: 'Direction g,n,rale', correct: 'Direction générale' },
      { table: 'employees', column: 'functional_area', wrong: 'Direction g,n,rale', correct: 'Direction générale' },
      
      // Corrections pour poste_actuel
      { table: 'effectif', column: 'poste_actuel', wrong: 'Op,rateur', correct: 'Opérateur' },
      { table: 'employees', column: 'poste_actuel', wrong: 'Op,rateur', correct: 'Opérateur' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'secr,taire', correct: 'secrétaire' },
      { table: 'employees', column: 'poste_actuel', wrong: 'secr,taire', correct: 'secrétaire' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'm,dicale', correct: 'médicale' },
      { table: 'employees', column: 'poste_actuel', wrong: 'm,dicale', correct: 'médicale' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'r,nimateur', correct: 'réanimateur' },
      { table: 'employees', column: 'poste_actuel', wrong: 'r,nimateur', correct: 'réanimateur' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'anesthesiste', correct: 'anesthésiste' },
      { table: 'employees', column: 'poste_actuel', wrong: 'anesthesiste', correct: 'anesthésiste' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'sup,rieur', correct: 'supérieur' },
      { table: 'employees', column: 'poste_actuel', wrong: 'sup,rieur', correct: 'supérieur' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'M,decin', correct: 'Médecin' },
      { table: 'employees', column: 'poste_actuel', wrong: 'M,decin', correct: 'Médecin' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'VP-M,decin', correct: 'VP-Médecin' },
      { table: 'employees', column: 'poste_actuel', wrong: 'VP-M,decin', correct: 'VP-Médecin' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'biologie m,dicale', correct: 'biologie médicale' },
      { table: 'employees', column: 'poste_actuel', wrong: 'biologie m,dicale', correct: 'biologie médicale' },
      { table: 'effectif', column: 'poste_actuel', wrong: 'Technicien superieur', correct: 'Technicien supérieur' },
      { table: 'employees', column: 'poste_actuel', wrong: 'Technicien superieur', correct: 'Technicien supérieur' },
      
      // Corrections pour nom_prenom
      { table: 'effectif', column: 'nom_prenom', wrong: 'Agnšs', correct: 'Agnès' },
      { table: 'employees', column: 'nom_prenom', wrong: 'Agnšs', correct: 'Agnès' },
      { table: 'effectif', column: 'nom_prenom', wrong: 'Sosthšne', correct: 'Sosthène' },
      { table: 'employees', column: 'nom_prenom', wrong: 'Sosthšne', correct: 'Sosthène' },
      { table: 'effectif', column: 'nom_prenom', wrong: 'AmakÈ', correct: 'Amakè' },
      { table: 'employees', column: 'nom_prenom', wrong: 'AmakÈ', correct: 'Amakè' },
      { table: 'effectif', column: 'nom_prenom', wrong: 'C,phora', correct: 'Céphora' },
      { table: 'employees', column: 'nom_prenom', wrong: 'C,phora', correct: 'Céphora' },
      
      // Corrections pour statut_marital
      { table: 'effectif', column: 'statut_marital', wrong: 'C,libataire', correct: 'Célibataire' },
      { table: 'employees', column: 'statut_marital', wrong: 'C,libataire', correct: 'Célibataire' },
      { table: 'effectif', column: 'statut_marital', wrong: 'Mari,', correct: 'Marié' },
      { table: 'employees', column: 'statut_marital', wrong: 'Mari,', correct: 'Marié' },
      
      // Corrections pour responsable
      { table: 'effectif', column: 'responsable', wrong: 'M,decin', correct: 'Médecin' },
      { table: 'employees', column: 'responsable', wrong: 'M,decin', correct: 'Médecin' },
      { table: 'effectif', column: 'responsable', wrong: 'Directeur G,n,ral', correct: 'Directeur Général' },
      { table: 'employees', column: 'responsable', wrong: 'Directeur G,n,ral', correct: 'Directeur Général' },
      
      // Corrections génériques pour les virgules qui remplacent é
      // Note: Ces corrections doivent être faites en dernier pour éviter les conflits
    ];
    
    // Exécuter les corrections spécifiques
    for (const correction of corrections) {
      try {
        const query = `
          UPDATE ${correction.table} 
          SET ${correction.column} = REPLACE(${correction.column}, $1, $2)
          WHERE ${correction.column} LIKE $3
        `;
        const likePattern = `%${correction.wrong}%`;
        const result = await pool.query(query, [correction.wrong, correction.correct, likePattern]);
        if (result.rowCount > 0) {
          console.log(`✅ ${correction.table}.${correction.column}: ${result.rowCount} ligne(s) corrigée(s) - "${correction.wrong}" → "${correction.correct}"`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la correction ${correction.table}.${correction.column}:`, error.message);
      }
    }
    
    // Corrections génériques pour les virgules qui remplacent é dans les mots français
    // Cette approche est plus risquée, donc on la fait avec précaution
    const genericCorrections = [
      { pattern: '([A-Za-z]),rateur', replacement: '$1érateur', description: '...érateur' },
      { pattern: '([A-Za-z]),taire', replacement: '$1étaire', description: '...étaire' },
      { pattern: '([A-Za-z]),dicale', replacement: '$1édicale', description: '...édicale' },
      { pattern: '([A-Za-z]),nimateur', replacement: '$1éanimateur', description: '...éanimateur' },
      { pattern: '([A-Za-z]),rieur', replacement: '$1érieur', description: '...érieur' },
      { pattern: '([A-Za-z]),rale', replacement: '$1érale', description: '...érale' },
      { pattern: '([A-Za-z]),decin', replacement: '$1édecin', description: '...édecin' },
    ];
    
    const columnsToFix = ['functional_area', 'poste_actuel', 'nom_prenom', 'responsable', 'statut_marital', 'specialisation', 'niveau_etude'];
    const tablesToFix = ['effectif', 'employees'];
    
    for (const table of tablesToFix) {
      for (const column of columnsToFix) {
        for (const correction of genericCorrections) {
          try {
            // Utiliser une fonction PostgreSQL pour faire le remplacement avec regex
            const query = `
              UPDATE ${table} 
              SET ${column} = REGEXP_REPLACE(${column}, $1, $2, 'g')
              WHERE ${column} ~ $3
            `;
            const regexPattern = correction.pattern;
            const result = await pool.query(query, [regexPattern, correction.replacement, regexPattern]);
            if (result.rowCount > 0) {
              console.log(`✅ ${table}.${column}: ${result.rowCount} ligne(s) corrigée(s) avec pattern "${correction.description}"`);
            }
          } catch (error) {
            // Ignorer les erreurs pour les corrections génériques
            // console.error(`⚠️ Erreur générique ${table}.${column}:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Correction de l\'encodage terminée');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction de l\'encodage:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Exécuter le script
fixEncodingInAllTables()
  .then(() => {
    console.log('🎉 Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
