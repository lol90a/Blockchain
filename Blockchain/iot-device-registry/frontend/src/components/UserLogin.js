import React, { useState } from 'react';
import axios from 'axios';
import './UserLogin.css';
import { apiUrl } from '../config/api';

const UserLogin = ({ onLoginSuccess, onSwitchToRegistration, onBack }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(apiUrl('/users/login'), formData);
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      axios.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
      onLoginSuccess(response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Make sure the backend server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      <div className="user-login-card">
        <div className="user-login-header">
          <h2>User Login</h2>
          <p>Welcome back to IoT Device Registry</p>
        </div>

        <form onSubmit={handleSubmit} className="user-login-form">
          <div className="form-group">
            <label htmlFor="username">Username or Email</label>
            <input id="username" name="username" value={formData.username} onChange={handleInputChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" value={formData.password} onChange={handleInputChange} required />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account?</p>
          <button type="button" className="switch-to-register-btn" onClick={onSwitchToRegistration}>
            Create Account
          </button>
        </div>

        <button type="button" className="back-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
};

export default UserLogin;
