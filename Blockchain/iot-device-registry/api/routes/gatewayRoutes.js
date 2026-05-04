const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

router.post('/register', deviceController.registerDevice);
router.get('/verify/:deviceId', deviceController.gatewayVerifyDevice);
router.post('/revoke/:deviceId', deviceController.gatewayRevokeDevice);
router.get('/status/:deviceId', deviceController.gatewayGetDeviceStatus);
router.get('/identity', deviceController.gatewayIdentityStatus);

module.exports = router;
