require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { securityHeaders } = require('./utils/securityMiddleware');
const { getComplianceProfile } = require('./services/complianceService');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

// Middleware
app.use(cors());
app.use(securityHeaders);
app.use(express.json());

// Routes
app.use('/api/devices', require('./routes/deviceRoutes'));
app.use('/api/gateway', require('./routes/gatewayRoutes'));
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/users', require('./routes/userRoutes').router);
app.use('/api/hospital', require('./routes/hospitalRoutes'));
app.get('/api/compliance', (req, res) => res.json(getComplianceProfile()));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'IoT Device Registry is running',
    mode: 'Fabric Mode',
    couchdbEnabled: String(process.env.FABRIC_STATE_DB || 'leveldb').toLowerCase() === 'couchdb',
    hospitalIntegrationEnabled: true,
    ipfsApiConfigured: Boolean(process.env.IPFS_API_URL),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log('📊 Mode: Fabric Mode');
  console.log(`🔐 AES Encryption: ${process.env.AES_SECRET ? 'Enabled' : 'Disabled'}`);
});
