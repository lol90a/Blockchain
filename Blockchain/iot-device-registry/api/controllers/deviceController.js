const crypto = require('crypto');
const deviceService = require('../services/deviceService');
const { encrypt } = require('../../crypto/aesUtils');
const { createChallenge, consumeChallenge } = require('../utils/deviceChallengeStore');
const { createDeviceNFT, getNFTMetadata, verifyDigitalSignature, verifyNFTIdentity } = require('../../crypto/nftUtils');
const { withDeviceDefaults } = require('../utils/deviceRegistrationDefaults');
const { getIdentitySummary } = require('../utils/fabricIdentityUtils');

const maybeDecryptField = (value, fieldName) => {
  if (typeof value !== 'string') {
    return value;
  }

  const parts = value.split(':');
  const looksEncrypted =
    parts.length === 2 &&
    parts[0].length === 32 &&
    /^[0-9a-f]+$/i.test(parts[0]) &&
    /^[0-9a-f]+$/i.test(parts[1]);

  if (!looksEncrypted) {
    return value;
  }

  const aesUtils = require('../../crypto/aesUtils');
  const decrypted = JSON.parse(aesUtils.decrypt(value));
  return decrypted[fieldName] || value;
};

function getDecryptedDeviceFields(body) {
  return {
    publicKey: maybeDecryptField(body.publicKey, 'publicKey'),
    serialNumber: maybeDecryptField(body.serialNumber, 'serialNumber'),
    hardwareId: maybeDecryptField(body.hardwareId, 'hardwareId'),
    macAddress: maybeDecryptField(body.macAddress, 'macAddress')
  };
}

exports.registerDevice = async (req, res) => {
  try {
    const hydratedBody = withDeviceDefaults(req.body);
    const { deviceId, type, manufacturer, registeredBy, publicKey, serialNumber, hardwareId, macAddress, model, signature } = hydratedBody;
    const decrypted = getDecryptedDeviceFields(hydratedBody);

    const nftIdentity = createDeviceNFT(
      {
        deviceId,
        type,
        manufacturer,
        serialNumber: decrypted.serialNumber,
        hardwareId: decrypted.hardwareId,
        macAddress: decrypted.macAddress,
        model
      },
      {
        publicKey: decrypted.publicKey,
        signature
      }
    );

    const result = await deviceService.registerDevice(
      deviceId,
      type,
      manufacturer,
      registeredBy,
      publicKey,
      nftIdentity,
      decrypted.serialNumber,
      decrypted.hardwareId,
      decrypted.macAddress,
      model
    );

    const deviceData = JSON.parse(result);
    const encryptedPayload = encrypt(JSON.stringify({ deviceId, type, nftToken: deviceData.nftIdentity?.nftToken || nftIdentity.nftToken }));

    res.status(201).json({
      message: 'Device registered successfully on Hyperledger Fabric with a real cryptographic device identity',
      data: deviceData,
      token: encryptedPayload,
      nftMetadata: getNFTMetadata(deviceData.nftIdentity || nftIdentity)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDevice = async (req, res) => {
  try {
    const device = await deviceService.getDevice(req.params.deviceId);
    res.status(200).json(JSON.parse(device));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.getAllDevices = async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.status(200).json(JSON.parse(devices));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.activateDevice = async (req, res) => {
  try {
    const result = await deviceService.activateDevice(req.params.deviceId);
    res.status(200).json({
      message: 'Device activated successfully',
      data: JSON.parse(result)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deactivateDevice = async (req, res) => {
  try {
    const result = await deviceService.deactivateDevice(req.params.deviceId);
    res.status(200).json({
      message: 'Device deactivated successfully',
      data: JSON.parse(result)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeDevice = async (req, res) => {
  try {
    const result = await deviceService.removeDevice(req.params.deviceId);
    res.status(200).json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const { type, manufacturer, publicKey, model } = req.body;
    const result = await deviceService.updateDevice(req.params.deviceId, type, manufacturer, publicKey, model);
    res.status(200).json({
      message: 'Device updated successfully',
      data: JSON.parse(result)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDevicesByStatus = async (req, res) => {
  try {
    const devices = await deviceService.getDevicesByStatus(req.params.status);
    res.status(200).json(JSON.parse(devices));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDevicesByType = async (req, res) => {
  try {
    const devices = await deviceService.getDevicesByType(req.params.type);
    res.status(200).json(JSON.parse(devices));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyDeviceNFT = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.getDevice(deviceId);
    const deviceData = JSON.parse(device);

    if (!deviceData.nftIdentity) {
      return res.status(404).json({ error: 'No device identity found for this device' });
    }

    const decryptedPublicKey = maybeDecryptField(deviceData.publicKey, 'publicKey');
    const verificationResult = verifyNFTIdentity(
      deviceData.nftIdentity,
      {
        deviceId: deviceData.deviceId,
        type: deviceData.type,
        manufacturer: deviceData.manufacturer,
        serialNumber: deviceData.nftIdentity.metadata.serialNumber,
        hardwareId: deviceData.nftIdentity.metadata.hardwareId,
        macAddress: deviceData.nftIdentity.metadata.macAddress,
        model: deviceData.nftIdentity.metadata.model
      },
      decryptedPublicKey
    );

    res.status(200).json({
      deviceId,
      deviceStatus: deviceData.status,
      ledgerProof: deviceData.ledgerProof || null,
      nftAsset: JSON.parse(await deviceService.getDeviceNFTAsset(deviceId)),
      verificationResult,
      nftMetadata: getNFTMetadata(deviceData.nftIdentity)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDeviceNFTMetadata = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.getDevice(deviceId);
    const deviceData = JSON.parse(device);

    if (!deviceData.nftIdentity) {
      return res.status(404).json({ error: 'No device identity found for this device' });
    }

    res.status(200).json({
      deviceId,
      ledgerProof: deviceData.ledgerProof || null,
      nftAsset: JSON.parse(await deviceService.getDeviceNFTAsset(deviceId)),
      nftMetadata: getNFTMetadata(deviceData.nftIdentity),
      nftIdentity: deviceData.nftIdentity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDeviceHistory = async (req, res) => {
  try {
    const history = await deviceService.getDeviceHistory(req.params.deviceId);
    res.status(200).json(JSON.parse(history));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDeviceChallenge = async (req, res) => {
  try {
    const device = await deviceService.getDevice(req.params.deviceId);
    const deviceData = JSON.parse(device);
    const challenge = createChallenge(deviceData.deviceId);

    res.status(200).json({
      deviceId: deviceData.deviceId,
      nonce: challenge.nonce,
      expiresAt: new Date(challenge.expiresAt).toISOString(),
      status: deviceData.status
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.proveDeviceIdentity = async (req, res) => {
  try {
    const { signature } = req.body;
    const challenge = consumeChallenge(req.params.deviceId);
    if (!challenge) {
      return res.status(400).json({ error: 'No active challenge for this device. Request a new challenge first.' });
    }

    const device = await deviceService.getDevice(req.params.deviceId);
    const deviceData = JSON.parse(device);
    const decryptedPublicKey = maybeDecryptField(deviceData.publicKey, 'publicKey');
    const verified = crypto.verify(
      'RSA-SHA256',
      Buffer.from(challenge.nonce),
      decryptedPublicKey,
      Buffer.from(signature, 'base64')
    );

    res.status(200).json({
      deviceId: deviceData.deviceId,
      identityVerified: verified,
      deviceStatus: deviceData.status,
      isActive: deviceData.status === 'active',
      ledgerProof: deviceData.ledgerProof || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyDeviceSignature = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { signature, deviceData } = req.body;
    const device = await deviceService.getDevice(deviceId);
    const storedDevice = JSON.parse(device);
    const decryptedPublicKey = maybeDecryptField(storedDevice.publicKey, 'publicKey');
    const valid = verifyDigitalSignature(deviceData, signature, decryptedPublicKey);

    res.status(200).json({
      deviceId,
      valid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.gatewayVerifyDevice = async (req, res) => {
  try {
    const deviceStatus = JSON.parse(await deviceService.verifyDeviceStatus(req.params.deviceId, 'gatewayUser'));
    res.status(200).json(deviceStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.gatewayRevokeDevice = async (req, res) => {
  try {
    const { revokedBy, reason } = req.body || {};
    const result = await deviceService.revokeDevice(req.params.deviceId, revokedBy, reason, 'gatewayUser');
    res.status(200).json({
      message: 'Device revoked successfully',
      data: JSON.parse(result)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.gatewayGetDeviceStatus = async (req, res) => {
  try {
    const result = await deviceService.getDeviceStatus(req.params.deviceId, 'gatewayUser');
    res.status(200).json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.gatewayIdentityStatus = async (req, res) => {
  try {
    const summary = await getIdentitySummary('gatewayUser');
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
