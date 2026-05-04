import React from 'react';
import './LandingPage.css';

const LandingPage = ({ onUserLogin, onAdminLogin }) => {
  return (
    <div className="landing-container">
      <div className="landing-card">
        <div className="landing-header">
          <h1>IoT Device Registry</h1>
          <p>Hyperledger Fabric Blockchain Management System</p>
        </div>

        <div className="landing-content">
          <div className="welcome-section">
            <h2>Welcome</h2>
            <p>Choose how you want to access the platform.</p>
          </div>

          <div className="auth-options">
            <div className="auth-option">
              <div className="auth-icon">User</div>
              <h3>User Access</h3>
              <p>Register or sign in to manage your devices.</p>
              <button className="auth-btn user-btn" onClick={onUserLogin}>
                User Login / Register
              </button>
            </div>

            <div className="auth-option">
              <div className="auth-icon">Admin</div>
              <h3>Admin Access</h3>
              <p>Use admin credentials to access the dashboard.</p>
              <button className="auth-btn admin-btn" onClick={onAdminLogin}>
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
