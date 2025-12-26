import axios from 'axios';
import { employeeService } from './api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Instance axios pour les requêtes d'authentification
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Service d'authentification unifié pour RH et Employés
 */
class UnifiedAuthService {
  /**
   * Détecte le type d'utilisateur basé sur l'identifiant
   * @param {string} identifier - Email ou matricule
   * @returns {'rh'|'employee'|null}
   */
  detectUserType(identifier) {
    if (!identifier || !identifier.trim()) {
      return null;
    }

    // Si c'est un email (contient @), c'est un utilisateur RH
    if (identifier.includes('@')) {
      return 'rh';
    }

    // Si c'est un matricule (format CDL-YYYY-XXXX), c'est un employé
    const matriculeRegex = /^CDL-\d{4}-\d{4}$/i;
    if (matriculeRegex.test(identifier.trim())) {
      return 'employee';
    }

    return null;
  }

  /**
   * Valide le format d'un email
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Valide le format d'un matricule
   * @param {string} matricule 
   * @returns {boolean}
   */
  isValidMatricule(matricule) {
    const matriculeRegex = /^CDL-\d{4}-\d{4}$/i;
    return matriculeRegex.test(matricule.trim());
  }

  /**
   * Authentifie un utilisateur RH
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async loginRH(email, password) {
    try {
      console.log('🔐 loginRH appelé avec:', { email, passwordLength: password?.length });
      
      // Identifiants de test (à remplacer par l'API réelle)
      const validCredentials = {
        'rh@centre-diagnostic.com': 'Rh@2025CDL',
        'admin@centrediagnostic.ga': 'Admin@2025CDL',
        'test@test.com': 'test123'
      };

      // Normaliser l'email (trim et lowercase pour la comparaison)
      const normalizedEmail = email.trim().toLowerCase();
      console.log('📧 Email normalisé:', normalizedEmail);
      console.log('🔑 Mot de passe reçu:', password);
      console.log('🔑 Mot de passe attendu:', validCredentials[normalizedEmail]);

      // Essayer d'abord avec les identifiants de test
      if (validCredentials[normalizedEmail] === password) {
        console.log('✅ Identifiants valides (test)');
        return {
          success: true,
          user: {
            id: email.trim(), // Utiliser l'email comme ID pour les utilisateurs RH
            email: email.trim(),
            name: 'Admin RH',
            role: 'admin',
            nom: 'Admin',
            prenom: 'RH',
            poste: 'Administration',
            fonction: 'Administrateur RH'
          }
        };
      } else {
        console.log('❌ Identifiants de test invalides');
      }

      // Essayer avec l'API réelle
      try {
        const response = await authApi.post('/auth/login', {
          email: email.trim(),
          password: password
        });

        if (response.data && response.data.user) {
          // S'assurer que l'utilisateur a un ID (utiliser l'email si pas d'ID)
          const user = response.data.user;
          if (!user.id) {
            user.id = user.email || email;
          }
          
          return {
            success: true,
            user: user,
            token: response.data.token
          };
        } else {
          return {
            success: false,
            error: response.data?.message || 'Identifiants incorrects'
          };
        }
      } catch (apiError) {
        // Si l'API échoue, retourner une erreur
        if (apiError.response?.status === 401) {
          return {
            success: false,
            error: apiError.response.data?.message || 'Identifiants incorrects'
          };
        }
        throw apiError;
      }
    } catch (error) {
      console.error('Erreur lors de la connexion RH:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Une erreur est survenue lors de la connexion'
      };
    }
  }

  /**
   * Authentifie un employé
   * @param {string} matricule 
   * @param {string} password 
   * @returns {Promise<{success: boolean, employee?: object, error?: string}>}
   */
  async loginEmployee(matricule, password) {
    try {
      // Normaliser le matricule (majuscules)
      const normalizedMatricule = matricule.trim().toUpperCase();

      // Utiliser le service employé existant
      const response = await employeeService.authenticate(normalizedMatricule, password);

      if (response && response.success) {
        return {
          success: true,
          employee: response.employee
        };
      } else {
        return {
          success: false,
          error: response?.message || 'Matricule ou mot de passe incorrect'
        };
      }
    } catch (error) {
      console.error('Erreur lors de la connexion employé:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Matricule ou mot de passe incorrect'
      };
    }
  }

  /**
   * Authentifie un utilisateur (RH ou Employé) de manière unifiée
   * @param {string} identifier - Email ou matricule
   * @param {string} password 
   * @returns {Promise<{success: boolean, user?: object, employee?: object, userType?: string, error?: string}>}
   */
  async login(identifier, password) {
    try {
      // Détecter le type d'utilisateur
      const userType = this.detectUserType(identifier);

      if (!userType) {
        return {
          success: false,
          error: 'Format invalide. Utilisez votre email (RH) ou votre matricule (Employé)'
        };
      }

      // Valider le format
      if (userType === 'rh' && !this.isValidEmail(identifier)) {
        return {
          success: false,
          error: 'Format d\'email invalide'
        };
      }

      if (userType === 'employee' && !this.isValidMatricule(identifier)) {
        return {
          success: false,
          error: 'Format de matricule invalide (attendu: CDL-YYYY-XXXX)'
        };
      }

      // Authentifier selon le type
      if (userType === 'rh') {
        const result = await this.loginRH(identifier.trim(), password);
        return {
          ...result,
          userType: 'rh'
        };
      } else {
        const result = await this.loginEmployee(identifier.trim(), password);
        return {
          ...result,
          userType: 'employee'
        };
      }
    } catch (error) {
      console.error('Erreur lors de l\'authentification unifiée:', error);
      return {
        success: false,
        error: 'Une erreur est survenue lors de la connexion'
      };
    }
  }

  /**
   * Déconnecte l'utilisateur actuel
   * @param {string} userType - 'rh' ou 'employee'
   */
  logout(userType) {
    if (userType === 'rh') {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      localStorage.removeItem('rememberedUser');
    } else if (userType === 'employee') {
      sessionStorage.removeItem('employeeUser');
      localStorage.removeItem('rememberedEmployee');
    }
  }

  /**
   * Vérifie si un utilisateur est connecté
   * @returns {{isAuthenticated: boolean, userType?: string, user?: object}}
   */
  isAuthenticated() {
    const rhUser = sessionStorage.getItem('user');
    const employeeUser = sessionStorage.getItem('employeeUser');

    if (rhUser) {
      try {
        return {
          isAuthenticated: true,
          userType: 'rh',
          user: JSON.parse(rhUser)
        };
      } catch (e) {
        return { isAuthenticated: false };
      }
    }

    if (employeeUser) {
      try {
        return {
          isAuthenticated: true,
          userType: 'employee',
          user: JSON.parse(employeeUser)
        };
      } catch (e) {
        return { isAuthenticated: false };
      }
    }

    return { isAuthenticated: false };
  }

  /**
   * Récupère l'utilisateur actuellement connecté
   * @returns {object|null}
   */
  getCurrentUser() {
    const auth = this.isAuthenticated();
    return auth.isAuthenticated ? auth.user : null;
  }

  /**
   * Sauvegarde les identifiants pour "Se souvenir de moi"
   * @param {string} identifier 
   * @param {string} userType 
   */
  rememberUser(identifier, userType) {
    if (userType === 'rh') {
      localStorage.setItem('rememberedUser', identifier);
    } else if (userType === 'employee') {
      localStorage.setItem('rememberedEmployee', identifier);
    }
  }

  /**
   * Récupère l'identifiant mémorisé
   * @returns {{identifier?: string, userType?: string}}
   */
  getRememberedUser() {
    const rememberedUser = localStorage.getItem('rememberedUser');
    const rememberedEmployee = localStorage.getItem('rememberedEmployee');

    if (rememberedUser) {
      return {
        identifier: rememberedUser,
        userType: 'rh'
      };
    }

    if (rememberedEmployee) {
      return {
        identifier: rememberedEmployee,
        userType: 'employee'
      };
    }

    return {};
  }
}

// Exporter une instance unique du service
const unifiedAuthService = new UnifiedAuthService();
export default unifiedAuthService;

