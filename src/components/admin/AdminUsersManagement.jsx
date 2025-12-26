import React, { useState, useEffect } from 'react';
import '../../styles/AdminUsersManagement.css';
import { FaUsers, FaUserPlus, FaEdit, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';

const AdminUsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // TODO: Appel API pour récupérer les utilisateurs
      // const response = await adminService.getUsers();
      // setUsers(response.data);
      
      // Données de démonstration
      setTimeout(() => {
        setUsers([
          { id: 1, email: 'rh@centre-diagnostic.com', role: 'rh', name: 'RH User', status: 'active' },
          { id: 2, email: 'admin@centrediagnostic.ga', role: 'admin', name: 'Admin User', status: 'active' },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="admin-users-management">
      <div className="admin-page-header">
        <h1>
          <FaUsers /> Gestion des Utilisateurs
        </h1>
        <button className="btn-primary">
          <FaUserPlus /> Ajouter un utilisateur
        </button>
      </div>

      <div className="admin-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <FaFilter />
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateur</option>
            <option value="rh">RH</option>
            <option value="employee">Employé</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Chargement...</div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.name || '-'}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon" title="Modifier">
                      <FaEdit />
                    </button>
                    <button className="btn-icon btn-danger" title="Supprimer">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManagement;

