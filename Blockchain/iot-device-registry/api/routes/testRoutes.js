const express = require('express');
const router = express.Router();
const { decrypt } = require('../../crypto/aesUtils');

// Test endpoint to decrypt tokens
router.post('/decrypt', (req, res) => {
  try {
    const { encryptedToken } = req.body;
    
    if (!encryptedToken) {
      return res.status(400).json({ error: 'Encrypted token is required' });
    }
    
    const decryptedData = decrypt(encryptedToken);
    res.json({
      message: 'Token decrypted successfully',
      encryptedToken,
      decryptedData: JSON.parse(decryptedData)
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Decryption failed', 
      details: error.message,
      encryptedToken: req.body.encryptedToken 
    });
  }
});

// Test endpoint to encrypt data
router.post('/encrypt', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }
    
    const { encrypt } = require('../../crypto/aesUtils');
    const encryptedData = encrypt(JSON.stringify(data));
    
    res.json({
      message: 'Data encrypted successfully',
      originalData: data,
      encryptedData
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Encryption failed', 
      details: error.message 
    });
  }
});

module.exports = router; 