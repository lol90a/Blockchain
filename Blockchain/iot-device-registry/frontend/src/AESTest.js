import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from './config/api';

export default function AESTest() {
  const [input, setInput] = useState('');
  const [encrypted, setEncrypted] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [error, setError] = useState('');

  const handleEncrypt = async () => {
    setError('');
    setDecrypted('');
    try {
      const res = await axios.post(apiUrl('/test/encrypt'), { data: { test: input } });
      setEncrypted(res.data.encryptedData);
    } catch (err) {
      setError('Encryption failed: ' + err.message);
    }
  };

  const handleDecrypt = async () => {
    setError('');
    try {
      const res = await axios.post(apiUrl('/test/decrypt'), { encryptedToken: encrypted });
      setDecrypted(res.data.decryptedData.test);
    } catch (err) {
      setError('Decryption failed: ' + err.message);
    }
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h2>🔐 AES Encryption Test</h2>
      <p style={{ color: '#666', marginBottom: 15 }}>
        Test AES-256-CBC encryption and decryption for secure data transmission
      </p>
      
      <div style={{ marginBottom: 15 }}>
        <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
          Enter text to encrypt:
        </label>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter your secret message here..."
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
      
      <button 
        className="btn" 
        onClick={handleEncrypt}
        disabled={!input.trim()}
        style={{ marginRight: 10 }}
      >
        🔒 Encrypt
      </button>
      
      {encrypted && (
        <>
          <div style={{ marginTop: 15, padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <strong>🔐 Encrypted Data:</strong>
            <pre style={{ 
              wordBreak: 'break-all', 
              whiteSpace: 'pre-wrap',
              backgroundColor: '#e9ecef',
              padding: '10px',
              borderRadius: '4px',
              marginTop: '5px'
            }}>
              {encrypted}
            </pre>
          </div>
          <button 
            className="btn" 
            onClick={handleDecrypt}
            style={{ marginTop: 10 }}
          >
            🔓 Decrypt
          </button>
        </>
      )}
      
      {decrypted && (
        <div style={{ 
          marginTop: 15, 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          borderRadius: '4px',
          border: '1px solid #c3e6cb'
        }}>
          <strong>✅ Decrypted Result:</strong> 
          <div style={{ marginTop: 5, fontWeight: 'bold', color: '#155724' }}>
            "{decrypted}"
          </div>
        </div>
      )}
      
      {error && (
        <div className="alert alert-error" style={{ marginTop: 15 }}>
          ❌ {error}
        </div>
      )}
      
      <div style={{ marginTop: 20, fontSize: '12px', color: '#666' }}>
        <strong>Test Examples:</strong>
        <ul style={{ marginTop: 5 }}>
          <li>"Hello World!" - Basic text</li>
          <li>"My secret password: 123456" - Sensitive data</li>
          <li>"Device ID: SENSOR-001, Status: Active" - Device info</li>
          <li>"{'{'}"key": "value", "timestamp": "2025-07-14"{'}'}" - JSON data</li>
        </ul>
      </div>
    </div>
  );
} 
