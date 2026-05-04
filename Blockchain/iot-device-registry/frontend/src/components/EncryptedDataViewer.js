import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './EncryptedDataViewer.css';
import { apiUrl } from '../config/api';

const EncryptedDataViewer = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDecrypted, setShowDecrypted] = useState({});
  const [encryptionKey, setEncryptionKey] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(apiUrl('/devices'));
      setDevices(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load devices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEncryptedFields = (device) => {
    const fieldsToCheck = ['publicKey', 'serialNumber', 'hardwareId', 'macAddress'];
    return fieldsToCheck
      .filter((field) => device[field] && device[field] !== '')
      .map((field) => ({
        field,
        encryptedValue: device[field],
        isEncrypted: typeof device[field] === 'string' && device[field].length > 20
      }));
  };

  return (
    <div className="encrypted-data-viewer">
      <div className="viewer-header">
        <h2>AES Encrypted Data Viewer</h2>
        <p>Admins can review device fields that are stored as encrypted values.</p>
      </div>

      <div className="encryption-key-section">
        <div className="key-input-group">
          <label htmlFor="encryptionKey">Encryption Key:</label>
          <input
            type="password"
            id="encryptionKey"
            value={encryptionKey}
            onChange={(event) => setEncryptionKey(event.target.value)}
            placeholder="Enter AES encryption key"
            className="key-input"
          />
          <button className="set-key-btn" onClick={() => setError('')}>Set Key</button>
        </div>
        <p className="key-info">This view highlights encrypted-looking fields and basic device encryption stats.</p>
      </div>

      {error && <div className="error-message" onClick={() => setError('')}>{error}</div>}

      {loading ? (
        <div className="loading">Loading encrypted data...</div>
      ) : devices.length === 0 ? (
        <div className="no-data">No devices found.</div>
      ) : (
        <div className="devices-grid">
          {devices.map((device) => {
            const encryptedFields = getEncryptedFields(device);
            return (
              <div key={device.deviceId} className="device-card">
                <div className="device-header">
                  <h3>{device.deviceId}</h3>
                  <span className={`status-badge ${device.status}`}>{device.status}</span>
                </div>

                <div className="device-info">
                  <p><strong>Type:</strong> {device.type}</p>
                  <p><strong>Manufacturer:</strong> {device.manufacturer}</p>
                  <p><strong>Model:</strong> {device.model || 'N/A'}</p>
                </div>

                {encryptedFields.length > 0 ? (
                  <div className="encrypted-section">
                    <h4>Encrypted Fields ({encryptedFields.length})</h4>
                    {encryptedFields.map(({ field, encryptedValue, isEncrypted }) => (
                      <div key={field} className="encrypted-field">
                        <div className="field-header">
                          <span className="field-name">{field}</span>
                          <span className={`encryption-indicator ${isEncrypted ? 'encrypted' : 'plain'}`}>
                            {isEncrypted ? 'Encrypted' : 'Plain Text'}
                          </span>
                        </div>
                        <div className="field-value">
                          <div className="encrypted-value">
                            <strong>Stored Value:</strong>
                            <code>{encryptedValue}</code>
                          </div>
                          {showDecrypted[device.deviceId] && encryptionKey && (
                            <div className="decrypted-value">
                              <strong>Note:</strong>
                              <code>Detailed field decryption is handled through the AES test endpoints.</code>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      className="decrypt-btn"
                      onClick={() =>
                        setShowDecrypted((previous) => ({
                          ...previous,
                          [device.deviceId]: !previous[device.deviceId]
                        }))
                      }
                      disabled={!encryptionKey}
                    >
                      {showDecrypted[device.deviceId] ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                ) : (
                  <div className="no-encrypted-data">No encrypted fields found for this device.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="encryption-stats">
        <h3>Encryption Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{devices.length}</span>
            <span className="stat-label">Total Devices</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{devices.filter((device) => getEncryptedFields(device).length > 0).length}</span>
            <span className="stat-label">Devices With Encrypted Data</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{devices.reduce((total, device) => total + getEncryptedFields(device).length, 0)}</span>
            <span className="stat-label">Total Encrypted Fields</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptedDataViewer;
