import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './UserManagement.css';
import { apiUrl } from '../config/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(apiUrl('/admin/users'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (editingUser) {
        const updateData = { ...formData };
        delete updateData.password;
        await axios.put(apiUrl(`/admin/users/${editingUser.id}`), updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('User updated successfully!');
      } else {
        await axios.post(apiUrl('/admin/users'), formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('User created successfully!');
      }

      setFormData({ username: '', password: '', email: '', role: 'user' });
      setShowAddForm(false);
      setEditingUser(null);
      loadUsers();
      setError('');
    } catch (err) {
      setError('Failed to save user: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email,
      role: user.role
    });
    setShowAddForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(apiUrl(`/admin/users/${userId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('User deleted successfully!');
      loadUsers();
      setError('');
    } catch (err) {
      setError('Failed to delete user: ' + (err.response?.data?.error || err.message));
    }
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', email: '', role: 'user' });
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <button className="add-user-btn" onClick={() => setShowAddForm(true)}>
          Add New User
        </button>
      </div>

      {message && <div className="success-message" onClick={() => setMessage('')}>{message}</div>}
      {error && <div className="error-message" onClick={() => setError('')}>{error}</div>}

      {showAddForm && (
        <div className="user-form-container">
          <div className="user-form-card">
            <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input id="username" name="username" value={formData.username} onChange={handleInputChange} required />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input id="password" type="password" name="password" value={formData.password} onChange={handleInputChange} required />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select id="role" name="role" value={formData.role} onChange={handleInputChange}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
                <button type="button" className="cancel-btn" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-list">
        <h3>Current Users ({users.length})</h3>
        {loading ? (
          <div className="loading">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="no-users">No users found.</div>
        ) : (
          <div className="users-grid">
            {users.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-header">
                  <h4>{user.username}</h4>
                  <span className={`role-badge role-${user.role}`}>{user.role}</span>
                </div>
                <div className="user-details">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Status:</strong> <span className={user.isActive ? 'status-active' : 'status-inactive'}>{user.isActive ? 'Active' : 'Inactive'}</span></p>
                  <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="user-actions">
                  <button className="edit-btn" onClick={() => handleEdit(user)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(user.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
