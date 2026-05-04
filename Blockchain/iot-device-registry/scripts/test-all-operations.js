const axios = require('axios');
const crypto = require('crypto');
const { deriveDeviceDefaults } = require('../api/utils/deviceRegistrationDefaults');
const { buildSigningPayload } = require('../crypto/nftUtils');

async function main() {
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000/api';
  const deviceId = `smoke-${Date.now()}`;
  const defaults = deriveDeviceDefaults(deviceId);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const registrationPayload = {
    deviceId,
    type: 'sensor',
    manufacturer: 'Smoke Test Labs',
    registeredBy: 'smoke-test',
    publicKey,
    serialNumber: defaults.serialNumber,
    hardwareId: defaults.hardwareId,
    macAddress: defaults.macAddress,
    model: 'SIM-01'
  };

  const signature = crypto.sign(
    'RSA-SHA256',
    Buffer.from(buildSigningPayload(registrationPayload)),
    privateKey
  ).toString('base64');

  registrationPayload.signature = signature;

  console.log(`Registering ${deviceId}...`);
  const registerResponse = await axios.post(`${apiBase}/devices/register`, registrationPayload);
  console.log(`Registered with tx ${registerResponse.data.data.ledgerProof?.registrationTxId || 'n/a'}`);
  console.log(`Registration block: ${registerResponse.data.data.ledgerProof?.registrationBlockNumber || 'n/a'}`);

  const verifyResponse = await axios.get(`${apiBase}/devices/${deviceId}/nft/verify`);
  console.log(`Verification valid: ${verifyResponse.data.verificationResult.valid}`);
  console.log(`Verification reason: ${verifyResponse.data.verificationResult.reason}`);

  if (!verifyResponse.data.verificationResult.valid) {
    throw new Error(`Verification failed for ${deviceId}`);
  }

  const metadataResponse = await axios.get(`${apiBase}/devices/${deviceId}/nft/metadata`);
  console.log(`Mint tx: ${metadataResponse.data.ledgerProof?.nftMintTxId || 'n/a'}`);
  console.log(`Mint block: ${metadataResponse.data.ledgerProof?.nftMintBlockNumber || 'n/a'}`);

  const gatewayVerify = await axios.get(`${apiBase}/gateway/verify/${deviceId}`);
  console.log(`Gateway verify status: ${gatewayVerify.data.status}`);

  const gatewayStatus = await axios.get(`${apiBase}/gateway/status/${deviceId}`);
  console.log(`Gateway status active: ${gatewayStatus.data.isActive}`);

  const hospitalIntakeResponse = await axios.post(`${apiBase}/hospital/intake/${deviceId}`, {
    patientId: `anon-${deviceId}`,
    consentObtained: true,
    classification: 'clinical',
    sourceSystem: 'smoke-test-hospital',
    observations: {
      heartRate: 78,
      oxygenSaturation: 98
    }
  });
  console.log(`Hospital intake stored with receipt ${hospitalIntakeResponse.data.data.storageReceipt.cid}`);

  const revokeResponse = await axios.post(`${apiBase}/gateway/revoke/${deviceId}`, {
    revokedBy: 'smoke-test',
    reason: 'validation'
  });
  console.log(`Gateway revoke status: ${revokeResponse.data.data.status}`);

  const postRevokeVerify = await axios.get(`${apiBase}/gateway/verify/${deviceId}`);
  console.log(`Gateway verify after revoke: ${postRevokeVerify.data.verified}`);

  const historyResponse = await axios.get(`${apiBase}/devices/${deviceId}/history`);
  console.log(`History entries: ${historyResponse.data.length}`);

  await axios.delete(`${apiBase}/devices/${deviceId}`);
  console.log(`Removed ${deviceId}`);
}

main().catch((error) => {
  const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
  console.error(details);
  process.exit(1);
});
