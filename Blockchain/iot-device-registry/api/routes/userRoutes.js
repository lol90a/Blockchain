const express = require('express');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../utils/authUtils');
const { readJsonFile, writeJsonFile } = require('../utils/jsonStore');

const router = express.Router();
const USERS_FILE = 'users.json';

const defaultUsers = [
  {
    id: 1,
    username: 'admin',
    password: '5d215024c5bf56c8e11c25dd4b84a3b2:ed0ba53086cd4e9aade82da138f8b1b66cd48bde1820acebdfd92ff30eaabc3091419dfce47d9b9322a012bea6d28c351171d6b0e31bdeb673e4d3199287bbd5',
    email: 'admin@iotregistry.com',
    firstName: 'Fabric',
    lastName: 'Administrator',
    role: 'admin',
    createdAt: new Date().toISOString(),
    isActive: true,
    lastLogin: null,
    fabricIdentityLabel: 'admin'
  }
];

function loadUsers() {
  return readJsonFile(USERS_FILE, defaultUsers);
}

function saveUsers(users) {
  writeJsonFile(USERS_FILE, users);
}

function sanitizeUser(user) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

const verifyUserToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

router.post('/register', async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const users = loadUsers();
    const existingUser = users.find((user) => user.username === username || user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const newUser = {
      id: users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1,
      username,
      password: await hashPassword(password),
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'user',
      createdAt: new Date().toISOString(),
      isActive: true,
      lastLogin: null
    };

    users.push(newUser);
    saveUsers(users);

    const token = signToken({ id: newUser.id, username: newUser.username, role: newUser.role }, '24h');

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: sanitizeUser(newUser)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = loadUsers();
    const user = users.find((entry) => entry.username === username || entry.email === username);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(400).json({ error: 'Account is deactivated' });
    }

    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    const token = signToken({ id: user.id, username: user.username, role: user.role }, '24h');

    res.json({
      message: 'Login successful!',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile', verifyUserToken, (req, res) => {
  const user = loadUsers().find((entry) => entry.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(sanitizeUser(user));
});

const getAllUsers = () => loadUsers().map(sanitizeUser);

const addUser = async (userData) => {
  const { username, password, email, firstName, lastName, role = 'user', fabricIdentityLabel = null } = userData;

  if (!username || !password || !email) {
    throw new Error('Username, password, and email are required');
  }

  const users = loadUsers();
  const existingUser = users.find((user) => user.username === username || user.email === email);
  if (existingUser) {
    throw new Error('Username or email already exists');
  }

  const newUser = {
    id: users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1,
    username,
    password: await hashPassword(password),
    email,
    firstName: firstName || '',
    lastName: lastName || '',
    role,
    createdAt: new Date().toISOString(),
    isActive: true,
    lastLogin: null,
    fabricIdentityLabel
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
};

const updateUser = async (userId, userData) => {
  const users = loadUsers();
  const userIndex = users.findIndex((user) => user.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  const { username, email, firstName, lastName, role, isActive, fabricIdentityLabel } = userData;

  if (username && username !== users[userIndex].username) {
    const usernameExists = users.find((user) => user.username === username && user.id !== userId);
    if (usernameExists) {
      throw new Error('Username already exists');
    }
  }

  if (email && email !== users[userIndex].email) {
    const emailExists = users.find((user) => user.email === email && user.id !== userId);
    if (emailExists) {
      throw new Error('Email already exists');
    }
  }

  users[userIndex] = {
    ...users[userIndex],
    username: username || users[userIndex].username,
    email: email || users[userIndex].email,
    firstName: firstName ?? users[userIndex].firstName,
    lastName: lastName ?? users[userIndex].lastName,
    role: role || users[userIndex].role,
    isActive: isActive !== undefined ? isActive : users[userIndex].isActive,
    fabricIdentityLabel: fabricIdentityLabel !== undefined ? fabricIdentityLabel : users[userIndex].fabricIdentityLabel,
    updatedAt: new Date().toISOString()
  };

  saveUsers(users);
  return users[userIndex];
};

const deleteUser = (userId) => {
  const users = loadUsers();
  const userIndex = users.findIndex((user) => user.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  users.splice(userIndex, 1);
  saveUsers(users);
  return { message: 'User deleted successfully' };
};

module.exports = { router, getAllUsers, addUser, updateUser, deleteUser, loadUsers };
