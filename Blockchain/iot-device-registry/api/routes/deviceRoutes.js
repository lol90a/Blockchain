const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Device registration
router.post('/register', deviceController.registerDevice);

// Device retrieval
router.get('/', deviceController.getAllDevices);
router.get('/status/:status', deviceController.getDevicesByStatus);
router.get('/type/:type', deviceController.getDevicesByType);

// Device status management
router.post('/:deviceId/activate', deviceController.activateDevice);
router.post('/:deviceId/deactivate', deviceController.deactivateDevice);
router.post('/:deviceId/challenge', deviceController.createDeviceChallenge);
router.post('/:deviceId/prove', deviceController.proveDeviceIdentity);
router.post('/:deviceId/signature/verify', deviceController.verifyDeviceSignature);

// Device management
router.put('/:deviceId', deviceController.updateDevice);
router.delete('/:deviceId', deviceController.removeDevice);

// NFT-specific routes
router.get('/:deviceId/nft/verify', deviceController.verifyDeviceNFT);
router.get('/:deviceId/nft/metadata', deviceController.getDeviceNFTMetadata);
router.get('/:deviceId/history', deviceController.getDeviceHistory);
router.get('/:deviceId', deviceController.getDevice);

module.exports = router;
