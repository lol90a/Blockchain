const express = require('express');
const { verifyPassword, signToken, verifyToken } = require('../utils/authUtils');
const { getAllUsers, addUser, updateUser, deleteUser, loadUsers } = require('./userRoutes');
const {
  requireWalletIdentity,
  getIdentitySummary,
  adminIdentityIsRequired,
  connectionProfileExists
} = require('../utils/fabricIdentityUtils');

const router = express.Router();

const verifyAdminToken = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    if (adminIdentityIsRequired()) {
      await requireWalletIdentity(decoded.fabricIdentityLabel || 'admin');
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid token.' });
  }
};

function findAdminByUsername(username) {
  return loadUsers().find((entry) => entry.username === username && entry.role === 'admin');
}

router.get('/fabric-status', async (req, res) => {
  const summary = await getIdentitySummary('admin');
  res.json({
    adminIdentityRequired: adminIdentityIsRequired(),
    connectionProfileExists: connectionProfileExists(),
    adminIdentity: summary
  });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = findAdminByUsername(username);

    if (!admin) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await verifyPassword(password, admin.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (adminIdentityIsRequired()) {
      await requireWalletIdentity(admin.fabricIdentityLabel || 'admin');
    }

    const fabricIdentity = await getIdentitySummary(admin.fabricIdentityLabel || 'admin');
    const token = signToken(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        fabricIdentityLabel: admin.fabricIdentityLabel || 'admin'
      },
      '24h'
    );

    res.json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        email: admin.email,
        fabricIdentity
      }
    });
  } catch (error) {
    const statusCode = error.code === 'FABRIC_IDENTITY_MISSING' ? 503 : 500;
    res.status(statusCode).json({
      error: error.code === 'FABRIC_IDENTITY_MISSING'
        ? 'Fabric admin identity is missing. Run ./scripts/start-fabric-stack.sh or node blockchain/scripts/enrollAdmin.js first.'
        : 'Server error'
    });
  }
});

router.get('/users', verifyAdminToken, (req, res) => {
  try {
    res.json(getAllUsers());
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users', verifyAdminToken, async (req, res) => {
  try {
    const newUser = await addUser(req.body);
    const { password, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    const updatedUser = await updateUser(parseInt(req.params.id, 10), req.body);
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/users/:id', verifyAdminToken, (req, res) => {
  try {
    res.json(deleteUser(parseInt(req.params.id, 10)));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
