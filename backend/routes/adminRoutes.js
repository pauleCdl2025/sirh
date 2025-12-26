const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Route pour obtenir les statistiques globales des deux portails
  router.get('/stats/overview', async (req, res) => {
    try {
      console.log('📊 Récupération des statistiques admin...');

      // Statistiques des utilisateurs RH
      let rhUsersStats = {
        total_users: 0,
        admins: 0,
        rh_users: 0
      };
      try {
        // Vérifier si la table users existe
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          );
        `);
        
        if (tableCheck.rows[0]?.exists) {
          const rhUsersQuery = `
            SELECT 
              COUNT(*) as total_rh_users,
              COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
              COUNT(CASE WHEN role = 'rh' THEN 1 END) as total_rh
            FROM users
          `;
          const rhUsersResult = await pool.query(rhUsersQuery);
          if (rhUsersResult.rows.length > 0) {
            rhUsersStats = {
              total_users: parseInt(rhUsersResult.rows[0]?.total_rh_users) || 0,
              admins: parseInt(rhUsersResult.rows[0]?.total_admins) || 0,
              rh_users: parseInt(rhUsersResult.rows[0]?.total_rh) || 0
            };
          }
        } else {
          console.log('⚠️ Table users n\'existe pas');
        }
      } catch (err) {
        console.log('⚠️ Erreur lors de la récupération des utilisateurs RH:', err.message);
      }

      // Statistiques des employés
      let employeesStats = {
        total_employees: 0,
        active: 0,
        inactive: 0,
        cdi: 0,
        cdd: 0,
        interns: 0
      };
      try {
        const employeesQuery = `
          SELECT 
            COUNT(*) as total_employees,
            COUNT(CASE WHEN type_contrat = 'CDI' THEN 1 END) as cdi_count,
            COUNT(CASE WHEN type_contrat = 'CDD' THEN 1 END) as cdd_count,
            COUNT(CASE WHEN type_contrat = 'Stage' OR type_contrat = 'stage PNPE' THEN 1 END) as interns_count,
            COUNT(CASE WHEN statut_employe = 'Actif' THEN 1 END) as active_employees,
            COUNT(CASE WHEN statut_employe = 'Inactif' THEN 1 END) as inactive_employees
          FROM employees
        `;
        const employeesResult = await pool.query(employeesQuery);
        if (employeesResult.rows.length > 0) {
          employeesStats = {
            total_employees: parseInt(employeesResult.rows[0]?.total_employees) || 0,
            active: parseInt(employeesResult.rows[0]?.active_employees) || 0,
            inactive: parseInt(employeesResult.rows[0]?.inactive_employees) || 0,
            cdi: parseInt(employeesResult.rows[0]?.cdi_count) || 0,
            cdd: parseInt(employeesResult.rows[0]?.cdd_count) || 0,
            interns: parseInt(employeesResult.rows[0]?.interns_count) || 0
          };
        }
      } catch (err) {
        console.log('⚠️ Erreur lors de la récupération des statistiques employés:', err.message);
      }

      // Statistiques des contrats expirant bientôt
      let expiringContracts = 0;
      try {
        const expiringContractsQuery = `
          SELECT COUNT(*) as expiring_soon
          FROM employees
          WHERE date_fin_contrat IS NOT NULL 
            AND date_fin_contrat BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            AND (type_contrat != 'CDI' OR type_contrat IS NULL)
        `;
        const expiringContractsResult = await pool.query(expiringContractsQuery);
        expiringContracts = parseInt(expiringContractsResult.rows[0]?.expiring_soon) || 0;
      } catch (err) {
        console.log('⚠️ Erreur lors de la récupération des contrats expirant:', err.message);
      }

      // Statistiques des demandes d'employés
      let employeeRequestsStats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      };
      try {
        const requestsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
          FROM employee_requests
        `;
        const requestsResult = await pool.query(requestsQuery);
        if (requestsResult.rows.length > 0) {
          employeeRequestsStats = {
            total: parseInt(requestsResult.rows[0].total) || 0,
            pending: parseInt(requestsResult.rows[0].pending) || 0,
            approved: parseInt(requestsResult.rows[0].approved) || 0,
            rejected: parseInt(requestsResult.rows[0].rejected) || 0
          };
        }
      } catch (err) {
        console.log('⚠️ Table employee_requests non disponible:', err.message);
      }

      // Statistiques des absences
      let absencesStats = {
        total: 0,
        this_month: 0
      };
      try {
        const absencesQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN date_debut >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month
          FROM absence
        `;
        const absencesResult = await pool.query(absencesQuery);
        if (absencesResult.rows.length > 0) {
          absencesStats = {
            total: parseInt(absencesResult.rows[0].total) || 0,
            this_month: parseInt(absencesResult.rows[0].this_month) || 0
          };
        }
      } catch (err) {
        console.log('⚠️ Table absence non disponible:', err.message);
      }

      // Statistiques des visites médicales
      let medicalVisitsStats = {
        total: 0,
        overdue: 0,
        upcoming_30_days: 0
      };
      try {
        const today = new Date().toISOString().split('T')[0];
        const medicalVisitsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN date_prochaine_visite < $1::date AND statut = 'À venir' THEN 1 END) as overdue,
            COUNT(CASE WHEN date_prochaine_visite >= $1::date AND date_prochaine_visite <= ($1::date + INTERVAL '30 days') AND statut = 'À venir' THEN 1 END) as upcoming_30_days
          FROM visites_medicales
        `;
        const medicalVisitsResult = await pool.query(medicalVisitsQuery, [today]);
        if (medicalVisitsResult.rows.length > 0) {
          medicalVisitsStats = {
            total: parseInt(medicalVisitsResult.rows[0].total) || 0,
            overdue: parseInt(medicalVisitsResult.rows[0].overdue) || 0,
            upcoming_30_days: parseInt(medicalVisitsResult.rows[0].upcoming_30_days) || 0
          };
        }
      } catch (err) {
        console.log('⚠️ Table visites_medicales non disponible:', err.message);
      }

      // Répartition par département
      let departmentDistribution = [];
      try {
        const departmentDistributionQuery = `
          SELECT 
            COALESCE(functional_area, 'Non spécifié') as department,
            COUNT(*) as count
          FROM employees
          WHERE functional_area IS NOT NULL AND functional_area != ''
          GROUP BY functional_area
          ORDER BY count DESC
          LIMIT 10
        `;
        const departmentResult = await pool.query(departmentDistributionQuery);
        departmentDistribution = departmentResult.rows.map(row => ({
          name: row.department,
          count: parseInt(row.count) || 0
        }));
      } catch (err) {
        console.log('⚠️ Erreur lors de la récupération de la répartition par département:', err.message);
      }

      // Répartition par entité
      let entityDistribution = [];
      try {
        const entityDistributionQuery = `
          SELECT 
            COALESCE(entity, 'Non spécifié') as entity,
            COUNT(*) as count
          FROM employees
          WHERE entity IS NOT NULL AND entity != ''
          GROUP BY entity
          ORDER BY count DESC
          LIMIT 10
        `;
        const entityResult = await pool.query(entityDistributionQuery);
        entityDistribution = entityResult.rows.map(row => ({
          name: row.entity,
          count: parseInt(row.count) || 0
        }));
      } catch (err) {
        console.log('⚠️ Erreur lors de la récupération de la répartition par entité:', err.message);
      }

      // Activité récente (derniers 7 jours)
      let recentActivity = {
        new_employees: 0,
        new_users: 0
      };
      try {
        const recentActivityQuery = `
          SELECT 
            'employees' as type,
            COUNT(*) as count
          FROM employees
          WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')
          UNION ALL
          SELECT 
            'users' as type,
            COUNT(*) as count
          FROM users
          WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')
        `;
        const recentActivityResult = await pool.query(recentActivityQuery);
        recentActivity = {
          new_employees: parseInt(recentActivityResult.rows.find(r => r.type === 'employees')?.count) || 0,
          new_users: parseInt(recentActivityResult.rows.find(r => r.type === 'users')?.count) || 0
        };
      } catch (err) {
        console.log('⚠️ Erreur lors de la récupération de l\'activité récente:', err.message);
      }

      const stats = {
        rh_portal: rhUsersStats,
        employee_portal: employeesStats,
        alerts: {
          expiring_contracts: expiringContracts,
          medical_visits_overdue: medicalVisitsStats.overdue,
          medical_visits_upcoming: medicalVisitsStats.upcoming_30_days
        },
        requests: employeeRequestsStats,
        absences: absencesStats,
        medical_visits: medicalVisitsStats,
        distributions: {
          departments: departmentDistribution,
          entities: entityDistribution
        },
        recent_activity: recentActivity
      };

      console.log('✅ Statistiques admin récupérées avec succès');
      res.json(stats);
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des statistiques admin:', err);
      res.status(500).json({ 
        error: 'Failed to fetch admin statistics', 
        details: err.message 
      });
    }
  });

  // Route pour obtenir les utilisateurs RH
  router.get('/users/rh', async (req, res) => {
    try {
      const query = `
        SELECT 
          id,
          email,
          nom_prenom,
          role,
          created_at,
          last_login
        FROM users
        WHERE role IN ('admin', 'rh')
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching RH users:', err);
      res.status(500).json({ error: 'Failed to fetch RH users', details: err.message });
    }
  });

  // Route pour obtenir les employés actifs
  router.get('/employees/active', async (req, res) => {
    try {
      const query = `
        SELECT 
          id,
          matricule,
          nom_prenom,
          email,
          poste_actuel,
          functional_area,
          entity,
          type_contrat,
          date_entree,
          statut_employe
        FROM employees
        WHERE statut_employe = 'Actif'
        ORDER BY nom_prenom ASC
        LIMIT 100
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching active employees:', err);
      res.status(500).json({ error: 'Failed to fetch active employees', details: err.message });
    }
  });

  return router;
};

