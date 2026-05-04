import React, { useState } from 'react';
import axios from 'axios';
import './UserRegistration.css';
import { apiUrl } from '../config/api';

const UserRegistration = ({ onRegistrationSuccess, onSwitchToLogin, onBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(apiUrl('/users/register'), {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName
      });

      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      axios.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
      onRegistrationSuccess(response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Make sure the backend server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-registration-container">
      <div className="user-registration-card">
        <div className="user-registration-header">
          <h2>Create Account</h2>
          <p>Join the IoT Device Registry</p>
        </div>

        <form onSubmit={handleSubmit} className="user-registration-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" value={formData.username} onChange={handleInputChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" value={formData.password} onChange={handleInputChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input id="confirmPassword" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="registration-footer">
          <p>Already have an account?</p>
          <button type="button" className="switch-to-login-btn" onClick={onSwitchToLogin}>
            Login Here
          </button>
        </div>

        <button type="button" className="back-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
};

export default UserRegistration;
