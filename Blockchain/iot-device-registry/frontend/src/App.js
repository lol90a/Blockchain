import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import AESTest from './AESTest';
import NFTDisplay from './NFTDisplay';
import AESService from './services/aesService';
import DeviceIdentityService from './services/deviceIdentityService';
import AdminLogin from './components/AdminLogin';
import UserManagement from './components/UserManagement';
import UserLogin from './components/UserLogin';
import UserRegistration from './components/UserRegistration';
import LandingPage from './components/LandingPage';
import EncryptedDataViewer from './components/EncryptedDataViewer';
import { apiUrl } from './config/api';
import { deriveDeviceDefaults, withDeviceDefaults } from './utils/deviceDefaults';

const DEVICE_TYPE_EXPLANATIONS = {
  sensor: 'Collects data from the environment.',
  actuator: 'Performs actions in response to commands.',
  gateway: 'Connects other devices to the wider network.',
  controller: 'Coordinates or manages device operations.'
};

const DASHBOARD_OPERATIONS = [
  'registerDevice',
  'mintDeviceNFT',
  'verifyDevice',
  'revokeDevice'
];

const NETWORK_FACTS = [
  { label: 'Channel', value: 'mychannel' },
  { label: 'Organizations', value: 'Org1, Org2' },
  { label: 'Peers', value: 'peer0.org1, peer0.org2' },
  { label: 'Orderer', value: 'orderer.example.com' }
];

const formatDisplayTime = (value) => {
  if (!value) {
    return 'Not recorded';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
};

const truncateMiddle = (value, start = 10, end = 6) => {
  if (!value) {
    return 'Not recorded';
  }

  const stringValue = String(value);
  if (stringValue.length <= start + end + 3) {
    return stringValue;
  }

  return `${stringValue.slice(0, start)}...${stringValue.slice(-end)}`;
};

const buildTransactionRows = (devices, deviceHistory) => {
  const rows = [];

  devices.forEach((device) => {
    const registrationTx = device.ledgerProof?.registrationTxId;
    if (registrationTx) {
      rows.push({
        id: `${device.deviceId}-register`,
        txId: registrationTx,
        functionName: 'register',
        status: device.status || 'active',
        block: device.ledgerProof?.registrationBlockNumber,
        timestamp: device.ledgerProof?.registrationTimestamp || device.timestamp
      });
    }

    const mintTx = device.ledgerProof?.nftMintTxId || device.nftIdentity?.blockchainData?.mintTxId;
    if (mintTx) {
      rows.push({
        id: `${device.deviceId}-mint`,
        txId: mintTx,
        functionName: 'mintNFT',
        status: device.nftIdentity?.blockchainData?.status || 'minted',
        block: device.nftIdentity?.blockchainData?.blockNumber,
        timestamp: device.nftIdentity?.blockchainData?.mintedAt || device.ledgerProof?.nftMintTimestamp
      });
    }
  });

  deviceHistory.forEach((entry, index) => {
    rows.push({
      id: `history-${entry.txId || index}`,
      txId: entry.txId,
      functionName: entry.operation || 'update',
      status: entry.isDelete ? 'deleted' : entry.value?.status || 'valid',
      block: entry.value?.nftIdentity?.blockchainData?.blockNumber || entry.value?.ledgerProof?.registrationBlockNumber,
      timestamp: entry.timestamp
    });
  });

  return rows
    .filter((row) => row.txId)
    .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
    .filter((row, index, allRows) => allRows.findIndex((candidate) => candidate.txId === row.txId) === index)
    .slice(0, 6);
};

const buildBlockRows = (devices, deviceHistory) => {
  const blockMap = new Map();

  const registerBlock = (blockNumber, timestamp) => {
    const normalized = blockNumber ?? 'Pending';
    const existing = blockMap.get(normalized) || {
      blockNumber: normalized,
      timestamp,
      txCount: 0
    };

    existing.timestamp = existing.timestamp || timestamp;
    existing.txCount += 1;
    blockMap.set(normalized, existing);
  };

  devices.forEach((device) => {
    registerBlock(device.ledgerProof?.registrationBlockNumber, device.ledgerProof?.registrationTimestamp || device.timestamp);
    if (device.ledgerProof?.nftMintTxId || device.nftIdentity?.blockchainData?.mintTxId) {
      registerBlock(device.nftIdentity?.blockchainData?.blockNumber, device.nftIdentity?.blockchainData?.mintedAt || device.ledgerProof?.nftMintTimestamp);
    }
  });

  deviceHistory.forEach((entry) => {
    registerBlock(
      entry.value?.nftIdentity?.blockchainData?.blockNumber || entry.value?.ledgerProof?.registrationBlockNumber,
      entry.timestamp
    );
  });

  return Array.from(blockMap.values())
    .sort((left, right) => {
      const leftBlock = Number(left.blockNumber);
      const rightBlock = Number(right.blockNumber);
      if (Number.isNaN(leftBlock) && Number.isNaN(rightBlock)) {
        return new Date(right.timestamp || 0) - new Date(left.timestamp || 0);
      }
      if (Number.isNaN(leftBlock)) {
        return 1;
      }
      if (Number.isNaN(rightBlock)) {
        return -1;
      }
      return rightBlock - leftBlock;
    })
    .slice(0, 6);
};

function App() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fabricStatus, setFabricStatus] = useState('checking');
  const [formData, setFormData] = useState({
    deviceId: '',
    type: 'sensor',
    manufacturer: '',
    registeredBy: '',
    publicKey: '',
    serialNumber: '',
    hardwareId: '',
    macAddress: '',
    model: ''
  });
  const [updateFormData, setUpdateFormData] = useState({
    deviceType: '',
    manufacturer: '',
    publicKey: ''
  });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [currentView, setCurrentView] = useState('auth');
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [devicePrivateKey, setDevicePrivateKey] = useState('');
  const [identityReady, setIdentityReady] = useState(false);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    checkFabricStatus();
    loadDevices();
    checkAdminSession();
    checkUserSession();
  }, []);

  const checkAdminSession = () => {
    const token = localStorage.getItem('adminToken');
    const storedAdminUser = localStorage.getItem('adminUser');
    if (token && storedAdminUser) {
      try {
        const parsedAdminUser = JSON.parse(storedAdminUser);
        setAdminUser(parsedAdminUser);
        setCurrentView('devices');
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      } catch (sessionError) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
  };

  const checkUserSession = () => {
    const token = localStorage.getItem('userToken');
    const storedUser = localStorage.getItem('userData');
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setCurrentView('devices');
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      } catch (sessionError) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
  };

  const handleAdminLogin = (userData) => {
    setAdminUser(userData);
    setCurrentView('devices');
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    setCurrentView('auth');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    delete axios.defaults.headers.common.Authorization;
  };

  const handleUserLogin = (userData) => {
    setUser(userData);
    setCurrentView('devices');
  };

  const handleUserRegistration = (userData) => {
    setUser(userData);
    setCurrentView('devices');
  };

  const handleUserLogout = () => {
    setUser(null);
    setCurrentView('auth');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    delete axios.defaults.headers.common.Authorization;
  };

  const checkFabricStatus = async () => {
    try {
      const healthUrl = apiUrl('/devices').replace(/\/api\/devices$/, '/health');
      const response = await axios.get(healthUrl);
      setFabricStatus(response.data.mode === 'Fabric Mode' ? 'fabric' : 'mock');
    } catch (requestError) {
      setFabricStatus('mock');
    }
  };

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(apiUrl('/devices'));
      const decryptedDevices = await Promise.all(
        response.data.map(async (device) => {
          try {
            return await AESService.decryptDeviceData(device);
          } catch (decryptionError) {
            return device;
          }
        })
      );
      setDevices(decryptedDevices);
      setError('');
    } catch (requestError) {
      setError('Failed to load devices: ' + requestError.message);
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

  const handleUpdateInputChange = (event) => {
    setUpdateFormData({
      ...updateFormData,
      [event.target.name]: event.target.value
    });
  };

  const registerDevice = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const effectiveFormData = withDeviceDefaults(formData);

      let publicKeyToUse = formData.publicKey;
      let privateKeyToUse = devicePrivateKey;
      let signature;

      if (!publicKeyToUse || !privateKeyToUse) {
        const identity = await DeviceIdentityService.createSignedIdentity(effectiveFormData);
        publicKeyToUse = identity.publicKey;
        privateKeyToUse = identity.privateKeyPem;
        signature = identity.signature;
        DeviceIdentityService.downloadPrivateKey(effectiveFormData.deviceId, privateKeyToUse);
        setDevicePrivateKey(privateKeyToUse);
        setIdentityReady(true);
      } else {
        signature = await DeviceIdentityService.signDeviceData(effectiveFormData, privateKeyToUse);
      }

      const encryptedData = await AESService.encryptDeviceData({
        ...effectiveFormData,
        publicKey: publicKeyToUse,
        signature
      });
      await axios.post(apiUrl('/devices/register'), encryptedData);
      setMessage('Device registered successfully on Fabric with an auto-generated device identity and real commit metadata.');
      setFormData({
        deviceId: '',
        type: 'sensor',
        manufacturer: '',
        registeredBy: '',
        publicKey: '',
        serialNumber: '',
        hardwareId: '',
        macAddress: '',
        model: ''
      });
      setDevicePrivateKey('');
      setIdentityReady(false);
      loadDevices();
      setError('');
    } catch (requestError) {
      setError('Failed to register device: ' + requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDeviceIdentity = async () => {
    try {
      const identity = await DeviceIdentityService.generateKeyPair();
      setFormData((current) => ({
        ...current,
        publicKey: identity.publicKeyPem
      }));
      setDevicePrivateKey(identity.privateKeyPem);
      setIdentityReady(true);
      if (formData.deviceId) {
        DeviceIdentityService.downloadPrivateKey(formData.deviceId, identity.privateKeyPem);
      }
      setMessage('A real RSA keypair was generated in the browser. The private key has been downloaded once.');
      setError('');
    } catch (requestError) {
      setError('Failed to generate device identity: ' + requestError.message);
    }
  };

  const getDevice = async (deviceId) => {
    try {
      const response = await axios.get(apiUrl(`/devices/${deviceId}`));
      const deviceObj = response.data.data || response.data;
      const decryptedDevice = await AESService.decryptDeviceData(deviceObj);
      setSelectedDevice(decryptedDevice);
      setDeviceHistory([]);
      setHistoryError('');
      setHistoryLoaded(false);
      loadDeviceHistory(deviceId);
      setError('');
    } catch (requestError) {
      setError('Failed to get device: ' + requestError.message);
    }
  };

  const loadDeviceHistory = async (deviceId) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await axios.get(apiUrl(`/devices/${deviceId}/history`));
      setDeviceHistory(response.data);
      setHistoryLoaded(true);
      setError('');
    } catch (requestError) {
      const message = requestError.response?.data?.error || requestError.message;
      setHistoryError(`Failed to load audit history: ${message}`);
      setDeviceHistory([]);
      setHistoryLoaded(false);
      setError('');
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportDeviceHistory = () => {
    if (!selectedDevice?.deviceId || deviceHistory.length === 0) {
      setError('Load device history before exporting it.');
      return;
    }

    const blob = new Blob([JSON.stringify(deviceHistory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDevice.deviceId}-audit-history.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Device audit history exported successfully.');
  };

  const updateDevice = async (deviceId) => {
    setLoading(true);
    try {
      const encryptedData = await AESService.encryptDeviceData(updateFormData);
      await axios.put(apiUrl(`/devices/${deviceId}`), encryptedData);
      setMessage('Device updated successfully with automatic encryption!');
      setUpdateFormData({ deviceType: '', manufacturer: '', publicKey: '' });
      loadDevices();
      setError('');
    } catch (requestError) {
      setError('Failed to update device: ' + requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const activateDevice = async (deviceId) => {
    try {
      await axios.post(apiUrl(`/devices/${deviceId}/activate`));
      setMessage('Device activated successfully!');
      loadDevices();
      setError('');
    } catch (requestError) {
      setError('Failed to activate device: ' + requestError.message);
    }
  };

  const deactivateDevice = async (deviceId) => {
    try {
      await axios.post(apiUrl(`/devices/${deviceId}/deactivate`));
      setMessage('Device deactivated successfully!');
      loadDevices();
      setError('');
    } catch (requestError) {
      setError('Failed to deactivate device: ' + requestError.message);
    }
  };

  const revokeDevice = async (deviceId) => {
    const reason = window.prompt('Enter a revocation reason for this device:', 'security incident');
    if (reason === null) {
      return;
    }

    try {
      await axios.post(apiUrl(`/gateway/revoke/${deviceId}`), {
        revokedBy: adminUser?.username || user?.username || 'ui-user',
        reason: reason.trim() || 'security incident'
      });
      setMessage('Device revoked successfully!');
      loadDevices();
      setError('');
    } catch (requestError) {
      setError('Failed to revoke device: ' + requestError.message);
    }
  };

  const deleteDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to delete this device?')) {
      return;
    }

    try {
      await axios.delete(apiUrl(`/devices/${deviceId}`));
      setMessage('Device deleted successfully!');
      loadDevices();
      setError('');
    } catch (requestError) {
      setError('Failed to delete device: ' + requestError.message);
    }
  };

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const activeDevices = devices.filter((device) => device.status === 'active').length;
  const revokedDevices = devices.filter((device) => device.status === 'revoked').length;
  const nftDevices = devices.filter((device) => device.nftIdentity?.blockchainData?.tokenId).length;
  const blockRows = buildBlockRows(devices, deviceHistory);
  const transactionRows = buildTransactionRows(devices, deviceHistory);
  const selectedLedgerProof = selectedDevice?.ledgerProof || {};
  const selectedNftData = selectedDevice?.nftIdentity?.blockchainData || {};
  const totalBlocks = blockRows.filter((row) => row.blockNumber !== 'Pending').length;
  const totalTransactions = transactionRows.length;
  const selectedPublicKeyHash = selectedDevice?.publicKey
    ? `${selectedDevice.publicKey.slice(0, 24)}...`
    : 'Not recorded';

  if (currentView === 'auth') {
    return <LandingPage onUserLogin={() => setCurrentView('user-auth')} onAdminLogin={() => setCurrentView('admin-login')} />;
  }

  if (currentView === 'user-auth') {
    if (authView === 'register') {
      return <UserRegistration onRegistrationSuccess={handleUserRegistration} onSwitchToLogin={() => setAuthView('login')} onBack={() => setCurrentView('auth')} />;
    }
    return <UserLogin onLoginSuccess={handleUserLogin} onSwitchToRegistration={() => setAuthView('register')} onBack={() => setCurrentView('auth')} />;
  }

  if (currentView === 'admin-login') {
    return <AdminLogin onLoginSuccess={handleAdminLogin} onBack={() => setCurrentView('auth')} />;
  }

  if (currentView === 'user-management' && adminUser) {
    return (
      <div className="App">
        <div className="header">
          <h1>IoT Device Registry</h1>
          <p>Hyperledger Fabric Blockchain Management</p>
          <div className="admin-nav">
            <button onClick={() => setCurrentView('devices')} className="nav-btn">Devices</button>
            <button onClick={() => setCurrentView('user-management')} className="nav-btn active">Users</button>
            <button onClick={() => setCurrentView('encrypted-data')} className="nav-btn">Encrypted Data</button>
            <button onClick={handleAdminLogout} className="nav-btn logout">Logout ({adminUser.username})</button>
          </div>
        </div>
        <UserManagement />
      </div>
    );
  }

  if (currentView === 'encrypted-data' && adminUser) {
    return (
      <div className="App">
        <div className="header">
          <h1>IoT Device Registry</h1>
          <p>Hyperledger Fabric Blockchain Management</p>
          <div className="admin-nav">
            <button onClick={() => setCurrentView('devices')} className="nav-btn">Devices</button>
            <button onClick={() => setCurrentView('user-management')} className="nav-btn">Users</button>
            <button onClick={() => setCurrentView('encrypted-data')} className="nav-btn active">Encrypted Data</button>
            <button onClick={handleAdminLogout} className="nav-btn logout">Logout ({adminUser.username})</button>
          </div>
        </div>
        <EncryptedDataViewer />
      </div>
    );
  }

  return (
    <div className="App">
      <div className="header">
        <h1>IoT Device Registry</h1>
        <p>Hyperledger Fabric Blockchain Management</p>
        <div className="admin-nav">
          {adminUser ? (
            <>
              <button onClick={() => setCurrentView('devices')} className="nav-btn active">Devices</button>
              <button onClick={() => setCurrentView('user-management')} className="nav-btn">Users</button>
              <button onClick={() => setCurrentView('encrypted-data')} className="nav-btn">Encrypted Data</button>
              <button onClick={handleAdminLogout} className="nav-btn logout">Logout ({adminUser.username})</button>
            </>
          ) : user ? (
            <>
              <button onClick={() => setCurrentView('devices')} className="nav-btn active">Devices</button>
              <button onClick={handleUserLogout} className="nav-btn logout">Logout ({user.username})</button>
            </>
          ) : (
            <button onClick={() => setCurrentView('auth')} className="nav-btn home">Home</button>
          )}
        </div>
      </div>

      <div className="container">
        {fabricStatus === 'fabric' && <div className="fabric-status">Connected to Hyperledger Fabric Network</div>}
        {fabricStatus === 'mock' && <div className="mock-status">Backend is reachable, but it is not reporting Fabric Mode.</div>}

        <div className="encryption-banner">
          <strong>Automatic AES Encryption Enabled</strong>
          <small>Sensitive fields are automatically encrypted before storage and decrypted for display.</small>
        </div>

        {message && (
          <div className="alert alert-success">
            {message}
            <button onClick={clearMessages}>x</button>
          </div>
        )}
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={clearMessages}>x</button>
          </div>
        )}

        <div className="dashboard-report card">
          <div className="report-strip">
            <span>[ Total Blocks ] {totalBlocks}</span>
            <span>[ Total Tx ] {totalTransactions}</span>
            <span>[ Devices ] {devices.length}</span>
            <span>[ NFT Tokens ] {nftDevices}</span>
            <span>[ Active ] {activeDevices}</span>
            <span>[ Revoked ] {revokedDevices}</span>
          </div>

          <div className="report-grid">
            <section className="report-panel">
              <h3>Recent Blocks</h3>
              <div className="report-table">
                <div className="report-table-head">
                  <span>Block No</span>
                  <span>Time</span>
                  <span>Tx Count</span>
                </div>
                {blockRows.length > 0 ? (
                  blockRows.map((row) => (
                    <div key={`${row.blockNumber}-${row.timestamp || 'time'}`} className="report-table-row">
                      <span>{row.blockNumber}</span>
                      <span>{formatDisplayTime(row.timestamp)}</span>
                      <span>{row.txCount}</span>
                    </div>
                  ))
                ) : (
                  <div className="report-empty">No block records available yet.</div>
                )}
              </div>
            </section>

            <section className="report-panel">
              <h3>Recent Transactions</h3>
              <div className="report-table">
                <div className="report-table-head report-table-head-wide">
                  <span>Tx ID</span>
                  <span>Function</span>
                  <span>Status</span>
                  <span>Block</span>
                </div>
                {transactionRows.length > 0 ? (
                  transactionRows.map((row) => (
                    <div key={row.id} className="report-table-row report-table-row-wide">
                      <span>{truncateMiddle(row.txId, 12, 8)}</span>
                      <span>{row.functionName}</span>
                      <span>{row.status}</span>
                      <span>{row.block ?? 'Pending'}</span>
                    </div>
                  ))
                ) : (
                  <div className="report-empty">No transaction records available yet.</div>
                )}
              </div>
            </section>
          </div>

          <div className="report-grid">
            <section className="report-panel">
              <h3>On-Chain Device Record</h3>
              <div className="report-kv">
                <div><span>Device ID</span><strong>{selectedDevice?.deviceId || 'Select a device below'}</strong></div>
                <div><span>Status</span><strong>{selectedDevice?.status || 'Not selected'}</strong></div>
                <div><span>Registered On</span><strong>{formatDisplayTime(selectedDevice?.timestamp || selectedLedgerProof.registrationTimestamp)}</strong></div>
                <div><span>Key Hash</span><strong>{selectedPublicKeyHash}</strong></div>
              </div>
            </section>

            <section className="report-panel">
              <h3>NFT Token Record</h3>
              <div className="report-kv">
                <div><span>Token ID</span><strong>{selectedNftData.tokenId || 'Not minted yet'}</strong></div>
                <div><span>Linked Device</span><strong>{selectedDevice?.deviceId || 'Not selected'}</strong></div>
                <div><span>Mint Tx</span><strong>{truncateMiddle(selectedNftData.mintTxId || selectedLedgerProof.nftMintTxId, 12, 8)}</strong></div>
                <div><span>Block Number</span><strong>{selectedNftData.blockNumber ?? 'Pending'}</strong></div>
              </div>
            </section>
          </div>

          <div className="report-grid">
            <section className="report-panel">
              <h3>Chaincode Activity</h3>
              <div className="report-list">
                {DASHBOARD_OPERATIONS.map((operation) => (
                  <div key={operation}>{operation}</div>
                ))}
              </div>
            </section>

            <section className="report-panel">
              <h3>Network Information</h3>
              <div className="report-kv">
                {NETWORK_FACTS.map((fact) => (
                  <div key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </div>
                ))}
                <div>
                  <span>Mode</span>
                  <strong>{fabricStatus === 'fabric' ? 'Fabric Connected' : 'Backend Reachable / Fabric Not Reported'}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="card">
          <h2>Register New Device</h2>
          <form onSubmit={registerDevice}>
            <div className="form-group">
              <label>Device ID:</label>
              <input type="text" name="deviceId" value={formData.deviceId} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Device Type:</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="sensor">Sensor</option>
                <option value="actuator">Actuator</option>
                <option value="gateway">Gateway</option>
                <option value="controller">Controller</option>
              </select>
              <small>{DEVICE_TYPE_EXPLANATIONS[formData.type]}</small>
            </div>
            <div className="form-group">
              <label>Manufacturer:</label>
              <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Registered By:</label>
              <input type="text" name="registeredBy" value={formData.registeredBy} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Public Key:</label>
              <textarea name="publicKey" value={formData.publicKey} onChange={handleInputChange} rows="4" placeholder="Generated automatically for real registration" />
              <button type="button" className="btn" onClick={generateDeviceIdentity} style={{ marginTop: '8px' }}>
                Generate Real Device Keypair
              </button>
              {identityReady && <small>Private key generated locally in the browser and downloaded once. Keep it on the device only.</small>}
            </div>
            <div className="form-group">
              <label>Serial Number:</label>
              <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} placeholder={deriveDeviceDefaults(formData.deviceId).serialNumber} />
              <small>Leave blank to auto-generate `SN-{`deviceId`}`.</small>
            </div>
            <div className="form-group">
              <label>Hardware ID:</label>
              <input type="text" name="hardwareId" value={formData.hardwareId} onChange={handleInputChange} placeholder={deriveDeviceDefaults(formData.deviceId).hardwareId} />
              <small>Leave blank to auto-generate a deterministic software hardware ID.</small>
            </div>
            <div className="form-group">
              <label>MAC Address:</label>
              <input type="text" name="macAddress" value={formData.macAddress} onChange={handleInputChange} placeholder={deriveDeviceDefaults(formData.deviceId).macAddress} />
              <small>Leave blank to generate a deterministic locally administered MAC-like identifier for testing.</small>
            </div>
            <div className="form-group">
              <label>Model:</label>
              <input type="text" name="model" value={formData.model} onChange={handleInputChange} />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? 'Registering...' : 'Register Device'}</button>
          </form>
        </div>

        <div className="card">
          <h2>Update Device</h2>
          <div className="form-group">
            <label>Device ID to Update:</label>
            <input type="text" placeholder="Enter device ID" onChange={(event) => setSelectedDevice({ deviceId: event.target.value })} />
          </div>
          <div className="form-group">
            <label>New Device Type:</label>
            <input type="text" name="deviceType" value={updateFormData.deviceType} onChange={handleUpdateInputChange} />
          </div>
          <div className="form-group">
            <label>Manufacturer:</label>
            <input type="text" name="manufacturer" value={updateFormData.manufacturer} onChange={handleUpdateInputChange} />
          </div>
          <div className="form-group">
            <label>Public Key:</label>
            <input type="text" name="publicKey" value={updateFormData.publicKey} onChange={handleUpdateInputChange} />
          </div>
          <button onClick={() => updateDevice(selectedDevice?.deviceId)} className="btn" disabled={!selectedDevice?.deviceId || loading}>
            {loading ? 'Updating...' : 'Update Device'}
          </button>
        </div>

        <div className="card">
          <h2>Registered Devices ({devices.length})</h2>
          <button onClick={loadDevices} className="btn" disabled={loading}>{loading ? 'Loading...' : 'Refresh Devices'}</button>

          {loading ? (
            <div className="loading">Loading devices...</div>
          ) : devices.length === 0 ? (
            <div className="loading">No devices registered yet.</div>
          ) : (
            <div className="device-list">
              {devices.map((device) => (
                <div key={device.deviceId} className="device-card">
                  <h3>{device.deviceId}</h3>
                  <div className="device-info"><strong>Status:</strong> <span className={device.status === 'active' ? 'status-active' : 'status-inactive'}>{device.status}</span></div>
                  <div className="device-info"><strong>Timestamp:</strong> {new Date(device.timestamp).toLocaleString()}</div>
                  {device.type && <div className="device-info"><strong>Type:</strong> {device.type}</div>}
                  {device.manufacturer && <div className="device-info"><strong>Manufacturer:</strong> {device.manufacturer}</div>}
                  {device.registeredBy && <div className="device-info"><strong>Registered By:</strong> {device.registeredBy}</div>}
                  <div className="device-actions">
                    <button onClick={() => getDevice(device.deviceId)} className="btn">View Details</button>
                    <button onClick={() => activateDevice(device.deviceId)} className="btn btn-success">Activate</button>
                    <button onClick={() => deactivateDevice(device.deviceId)} className="btn">Deactivate</button>
                    <button onClick={() => revokeDevice(device.deviceId)} className="btn">Revoke</button>
                    <button onClick={() => deleteDevice(device.deviceId)} className="btn btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedDevice && selectedDevice.deviceId && (
          <div className="card">
            <h2>Device Details</h2>
            <pre className="device-json">{JSON.stringify(selectedDevice, null, 2)}</pre>
            <div className="device-actions">
              <button onClick={() => loadDeviceHistory(selectedDevice.deviceId)} className="btn" disabled={historyLoading}>
                {historyLoading ? 'Loading History...' : 'View Audit Log'}
              </button>
              <button onClick={exportDeviceHistory} className="btn" disabled={deviceHistory.length === 0}>
                Export Audit Log
              </button>
            </div>
            {historyError && <div className="alert alert-error">{historyError}</div>}
            {historyLoading && <div className="loading">Loading audit history...</div>}
            {!historyLoading && historyLoaded && deviceHistory.length === 0 && (
              <div className="loading">No audit history was returned for this device yet.</div>
            )}
            {deviceHistory.length > 0 && (
              <>
                <h3>Audit History</h3>
                <pre className="device-json">{JSON.stringify(deviceHistory, null, 2)}</pre>
              </>
            )}
            <button onClick={() => setSelectedDevice(null)} className="btn">Close Details</button>
            <NFTDisplay deviceId={selectedDevice.deviceId} nftIdentity={selectedDevice.nftIdentity || {}} showMissingMessage={!selectedDevice.nftIdentity} />
          </div>
        )}

        <AESTest />
      </div>
    </div>
  );
}

export default App;
