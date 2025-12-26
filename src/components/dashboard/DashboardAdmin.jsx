import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import '../../styles/DashboardAdmin.css';
import { 
  FaUsers, 
  FaUserTie, 
  FaBriefcase, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaTimesCircle,
  FaChartBar,
  FaBuilding,
  FaCalendarTimes,
  FaStethoscope,
  FaFileContract,
  FaUserPlus,
  FaUserShield
} from 'react-icons/fa';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Vérifier l'authentification admin
  useEffect(() => {
    const adminUser = sessionStorage.getItem('adminUser');
    if (!adminUser) {
      navigate('/admin-login');
    }
  }, [navigate]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      // En cas d'erreur, afficher un message mais ne pas bloquer l'interface
      setError('Impossible de charger les statistiques. Veuillez réessayer.');
      // Continuer avec des données par défaut pour permettre l'utilisation du portail
      setStats({
        rh_portal: { total_users: 0, admins: 0, rh_users: 0 },
        employee_portal: { total_employees: 0, active: 0, inactive: 0, cdi: 0, cdd: 0, interns: 0 },
        alerts: { expiring_contracts: 0, medical_visits_overdue: 0, medical_visits_upcoming: 0 },
        requests: { pending: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-error">
        <FaExclamationTriangle className="error-icon" />
        <h3>Erreur</h3>
        <p>{error}</p>
        <button onClick={fetchStats} className="retry-button">
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-dashboard-error">
        <p>Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div className="admin-dashboard-title-section">
          <h1>
            <FaUserShield className="title-icon" />
            Dashboard Administrateur
          </h1>
          <p>Gestion des portails RH et Employé</p>
        </div>
        <div className="admin-dashboard-actions">
          <button onClick={fetchStats} className="refresh-button">
            <FaChartBar /> Actualiser
          </button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="admin-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Vue d'ensemble
        </button>
        <button 
          className={activeTab === 'rh-portal' ? 'active' : ''}
          onClick={() => setActiveTab('rh-portal')}
        >
          Portail RH
        </button>
        <button 
          className={activeTab === 'employee-portal' ? 'active' : ''}
          onClick={() => setActiveTab('employee-portal')}
        >
          Portail Employé
        </button>
        <button 
          className={activeTab === 'alerts' ? 'active' : ''}
          onClick={() => setActiveTab('alerts')}
        >
          Alertes
        </button>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'overview' && (
        <div className="admin-dashboard-content">
          {/* Cartes de statistiques principales */}
          <div className="admin-stats-grid">
            {/* Portail RH */}
            <div className="admin-stat-card rh-portal">
              <div className="stat-card-header">
                <FaUserTie className="stat-icon" />
                <h3>Portail RH</h3>
              </div>
              <div className="stat-card-body">
                <div className="stat-main-value">{stats.rh_portal.total_users}</div>
                <div className="stat-label">Utilisateurs RH</div>
                <div className="stat-details">
                  <span className="stat-detail-item">
                    <FaUserShield /> {stats.rh_portal.admins} Admin(s)
                  </span>
                  <span className="stat-detail-item">
                    <FaUserTie /> {stats.rh_portal.rh_users} RH
                  </span>
                </div>
              </div>
              <div className="stat-card-footer">
                <button 
                  onClick={() => window.open('/employees', '_blank')} 
                  className="stat-link-button"
                >
                  Gérer les utilisateurs →
                </button>
              </div>
            </div>

            {/* Portail Employé */}
            <div className="admin-stat-card employee-portal">
              <div className="stat-card-header">
                <FaUsers className="stat-icon" />
                <h3>Portail Employé</h3>
              </div>
              <div className="stat-card-body">
                <div className="stat-main-value">{stats.employee_portal.total_employees}</div>
                <div className="stat-label">Employés</div>
                <div className="stat-details">
                  <span className="stat-detail-item success">
                    <FaCheckCircle /> {stats.employee_portal.active} Actif(s)
                  </span>
                  <span className="stat-detail-item warning">
                    <FaTimesCircle /> {stats.employee_portal.inactive} Inactif(s)
                  </span>
                </div>
              </div>
              <div className="stat-card-footer">
                <button 
                  onClick={() => window.open('/employees', '_blank')} 
                  className="stat-link-button"
                >
                  Gérer les employés →
                </button>
              </div>
            </div>

            {/* Contrats */}
            <div className="admin-stat-card contracts">
              <div className="stat-card-header">
                <FaFileContract className="stat-icon" />
                <h3>Contrats</h3>
              </div>
              <div className="stat-card-body">
                <div className="stat-main-value">{stats.employee_portal.cdi + stats.employee_portal.cdd}</div>
                <div className="stat-label">Contrats actifs</div>
                <div className="stat-details">
                  <span className="stat-detail-item">
                    CDI: {stats.employee_portal.cdi}
                  </span>
                  <span className="stat-detail-item">
                    CDD: {stats.employee_portal.cdd}
                  </span>
                  <span className="stat-detail-item">
                    Stagiaires: {stats.employee_portal.interns}
                  </span>
                </div>
              </div>
              <div className="stat-card-footer">
                <button 
                  onClick={() => window.open('/contrats', '_blank')} 
                  className="stat-link-button"
                >
                  Gérer les contrats →
                </button>
              </div>
            </div>

            {/* Alertes */}
            <div className="admin-stat-card alerts">
              <div className="stat-card-header">
                <FaExclamationTriangle className="stat-icon" />
                <h3>Alertes</h3>
              </div>
              <div className="stat-card-body">
                <div className="stat-main-value alert-value">
                  {stats.alerts.expiring_contracts + stats.alerts.medical_visits_overdue}
                </div>
                <div className="stat-label">Alertes actives</div>
                <div className="stat-details">
                  {stats.alerts.expiring_contracts > 0 && (
                    <span className="stat-detail-item alert">
                      <FaFileContract /> {stats.alerts.expiring_contracts} Contrat(s) expirant
                    </span>
                  )}
                  {stats.alerts.medical_visits_overdue > 0 && (
                    <span className="stat-detail-item alert">
                      <FaStethoscope /> {stats.alerts.medical_visits_overdue} Visite(s) en retard
                    </span>
                  )}
                </div>
              </div>
              <div className="stat-card-footer">
                <button 
                  onClick={() => window.open('/medical-visits', '_blank')} 
                  className="stat-link-button"
                >
                  Voir les alertes →
                </button>
              </div>
            </div>
          </div>

          {/* Graphiques de répartition */}
          <div className="admin-charts-section">
            <div className="admin-chart-card">
              <h3>
                <FaBuilding /> Répartition par Département
              </h3>
              <div className="chart-list">
                {stats.distributions.departments.slice(0, 5).map((dept, index) => (
                  <div key={index} className="chart-item">
                    <div className="chart-item-label">{dept.name}</div>
                    <div className="chart-item-bar">
                      <div 
                        className="chart-item-fill" 
                        style={{ width: `${(dept.count / stats.employee_portal.total_employees) * 100}%` }}
                      ></div>
                    </div>
                    <div className="chart-item-value">{dept.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-chart-card">
              <h3>
                <FaBuilding /> Répartition par Entité
              </h3>
              <div className="chart-list">
                {stats.distributions.entities.slice(0, 5).map((entity, index) => (
                  <div key={index} className="chart-item">
                    <div className="chart-item-label">{entity.name}</div>
                    <div className="chart-item-bar">
                      <div 
                        className="chart-item-fill" 
                        style={{ width: `${(entity.count / stats.employee_portal.total_employees) * 100}%` }}
                      ></div>
                    </div>
                    <div className="chart-item-value">{entity.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activité récente */}
          <div className="admin-activity-section">
            <h3>
              <FaChartBar /> Activité Récente (7 derniers jours)
            </h3>
            <div className="activity-cards">
              <div className="activity-card">
                <FaUserPlus className="activity-icon" />
                <div className="activity-value">{stats.recent_activity.new_employees}</div>
                <div className="activity-label">Nouveaux employés</div>
              </div>
              <div className="activity-card">
                <FaUserShield className="activity-icon" />
                <div className="activity-value">{stats.recent_activity.new_users}</div>
                <div className="activity-label">Nouveaux utilisateurs RH</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rh-portal' && (
        <div className="admin-dashboard-content">
          <div className="portal-details">
            <h2>Gestion du Portail RH</h2>
            <div className="portal-stats-grid">
              <div className="portal-stat-item">
                <FaUserShield />
                <div className="portal-stat-value">{stats.rh_portal.admins}</div>
                <div className="portal-stat-label">Administrateurs</div>
              </div>
              <div className="portal-stat-item">
                <FaUserTie />
                <div className="portal-stat-value">{stats.rh_portal.rh_users}</div>
                <div className="portal-stat-label">Utilisateurs RH</div>
              </div>
              <div className="portal-stat-item">
                <FaUsers />
                <div className="portal-stat-value">{stats.rh_portal.total_users}</div>
                <div className="portal-stat-label">Total utilisateurs</div>
              </div>
            </div>
            <div className="portal-actions">
              <button 
                onClick={() => window.open('/employees', '_blank')} 
                className="portal-action-button"
              >
                <FaUserTie /> Gérer les utilisateurs RH
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employee-portal' && (
        <div className="admin-dashboard-content">
          <div className="portal-details">
            <h2>Gestion du Portail Employé</h2>
            <div className="portal-stats-grid">
              <div className="portal-stat-item">
                <FaUsers />
                <div className="portal-stat-value">{stats.employee_portal.total_employees}</div>
                <div className="portal-stat-label">Total employés</div>
              </div>
              <div className="portal-stat-item success">
                <FaCheckCircle />
                <div className="portal-stat-value">{stats.employee_portal.active}</div>
                <div className="portal-stat-label">Employés actifs</div>
              </div>
              <div className="portal-stat-item warning">
                <FaTimesCircle />
                <div className="portal-stat-value">{stats.employee_portal.inactive}</div>
                <div className="portal-stat-label">Employés inactifs</div>
              </div>
              <div className="portal-stat-item">
                <FaFileContract />
                <div className="portal-stat-value">{stats.employee_portal.cdi}</div>
                <div className="portal-stat-label">CDI</div>
              </div>
              <div className="portal-stat-item">
                <FaBriefcase />
                <div className="portal-stat-value">{stats.employee_portal.cdd}</div>
                <div className="portal-stat-label">CDD</div>
              </div>
              <div className="portal-stat-item">
                <FaUserPlus />
                <div className="portal-stat-value">{stats.employee_portal.interns}</div>
                <div className="portal-stat-label">Stagiaires</div>
              </div>
            </div>
            <div className="portal-actions">
              <button 
                onClick={() => window.open('/employees', '_blank')} 
                className="portal-action-button"
              >
                <FaUsers /> Gérer les employés
              </button>
              <button 
                onClick={() => window.open('/contrats', '_blank')} 
                className="portal-action-button"
              >
                <FaFileContract /> Gérer les contrats
              </button>
              <button 
                onClick={() => window.open('/onboarding', '_blank')} 
                className="portal-action-button"
              >
                <FaUserPlus /> Nouvel employé
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="admin-dashboard-content">
          <div className="alerts-section">
            <h2>Alertes et Notifications</h2>
            <div className="alerts-grid">
              {stats.alerts.expiring_contracts > 0 && (
                <div className="alert-card warning">
                  <FaFileContract className="alert-icon" />
                  <div className="alert-content">
                    <h3>Contrats expirant bientôt</h3>
                    <div className="alert-value">{stats.alerts.expiring_contracts}</div>
                    <p>Contrats expirant dans les 30 prochains jours</p>
                    <button 
                      onClick={() => window.open('/contrats', '_blank')} 
                      className="alert-link-button"
                    >
                      Voir les contrats →
                    </button>
                  </div>
                </div>
              )}
              {stats.alerts.medical_visits_overdue > 0 && (
                <div className="alert-card danger">
                  <FaStethoscope className="alert-icon" />
                  <div className="alert-content">
                    <h3>Visites médicales en retard</h3>
                    <div className="alert-value">{stats.alerts.medical_visits_overdue}</div>
                    <p>Visites médicales nécessitant une attention</p>
                    <button 
                      onClick={() => window.open('/medical-visits', '_blank')} 
                      className="alert-link-button"
                    >
                      Voir les visites →
                    </button>
                  </div>
                </div>
              )}
              {stats.alerts.medical_visits_upcoming > 0 && (
                <div className="alert-card info">
                  <FaCalendarTimes className="alert-icon" />
                  <div className="alert-content">
                    <h3>Visites médicales à venir</h3>
                    <div className="alert-value">{stats.alerts.medical_visits_upcoming}</div>
                    <p>Visites médicales dans les 30 prochains jours</p>
                    <button 
                      onClick={() => window.open('/medical-visits', '_blank')} 
                      className="alert-link-button"
                    >
                      Planifier →
                    </button>
                  </div>
                </div>
              )}
              {stats.requests.pending > 0 && (
                <div className="alert-card warning">
                  <FaExclamationTriangle className="alert-icon" />
                  <div className="alert-content">
                    <h3>Demandes en attente</h3>
                    <div className="alert-value">{stats.requests.pending}</div>
                    <p>Demandes d'employés nécessitant une action</p>
                    <button 
                      onClick={() => window.open('/employee-requests', '_blank')} 
                      className="alert-link-button"
                    >
                      Traiter les demandes →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;

