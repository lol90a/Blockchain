const connectFabric = require('../utils/connectFabric');
const { submitTransactionWithDetails } = require('../utils/fabricTxUtils');

function normalizeLedgerArray(payload) {
  const parsed = JSON.parse(payload);
  if (!Array.isArray(parsed)) {
    return parsed;
  }

  return parsed.map((item) => item.Record || item);
}

function mergeLedgerProof(device, txDetails, operation) {
  const ledgerProof = {
    ...(device.ledgerProof || {}),
    lastOperation: operation
  };

  if (operation === 'register') {
    ledgerProof.registrationTxId = txDetails.transactionId;
    ledgerProof.registrationBlockNumber = txDetails.blockNumber;
    ledgerProof.registrationTimestamp = txDetails.timestamp;
  }

  if (operation === 'activate' || operation === 'deactivate') {
    ledgerProof.lastStatusTxId = txDetails.transactionId;
    ledgerProof.lastStatusBlockNumber = txDetails.blockNumber;
    ledgerProof.lastStatusTimestamp = txDetails.timestamp;
  }

  if (operation === 'update') {
    ledgerProof.lastUpdateTxId = txDetails.transactionId;
    ledgerProof.lastUpdateBlockNumber = txDetails.blockNumber;
    ledgerProof.lastUpdateTimestamp = txDetails.timestamp;
  }

  if (operation === 'telemetry') {
    ledgerProof.lastTelemetryTxId = txDetails.transactionId;
    ledgerProof.lastTelemetryBlockNumber = txDetails.blockNumber;
    ledgerProof.lastTelemetryTimestamp = txDetails.timestamp;
  }

  if (operation === 'mint-nft') {
    ledgerProof.nftMintTxId = txDetails.transactionId;
    ledgerProof.nftMintBlockNumber = txDetails.blockNumber;
    ledgerProof.nftMintTimestamp = txDetails.timestamp;
  }

  return ledgerProof;
}

function mergeNftIdentity(device, txDetails) {
  if (!device.nftIdentity) {
    return null;
  }

  return {
    ...device.nftIdentity,
    blockchainData: {
      ...(device.nftIdentity.blockchainData || {}),
      transactionHash: txDetails.transactionId,
      blockNumber: txDetails.blockNumber,
      network: process.env.CHANNEL_NAME,
      status: txDetails.commitStatus,
      mintedAt: txDetails.timestamp,
      mintTxId: txDetails.transactionId,
      mintBlockNumber: txDetails.blockNumber
    }
  };
}

async function persistLedgerProof(contract, deviceId, ledgerProof, nftIdentity) {
  await contract.submitTransaction(
    'recordLedgerProof',
    deviceId,
    JSON.stringify(ledgerProof || {}),
    nftIdentity ? JSON.stringify(nftIdentity) : ''
  );
}

async function getPersistedDevice(contract, deviceId) {
  const result = await contract.evaluateTransaction('getDevice', deviceId);
  return JSON.stringify(JSON.parse(result.toString()));
}

exports.registerDevice = async (deviceId, type, manufacturer, registeredBy, publicKey, nftIdentity = null, serialNumber, hardwareId, macAddress, model) => {
  const { contract, gateway, network } = await connectFabric();
  const txDetails = await submitTransactionWithDetails(
    contract,
    network,
    'registerDevice',
    [deviceId, type, manufacturer, registeredBy, publicKey, serialNumber, hardwareId, macAddress, model || '', nftIdentity ? JSON.stringify(nftIdentity) : '']
  );

  let device = JSON.parse(txDetails.payload);
  let mergedLedgerProof = mergeLedgerProof(device, txDetails, 'register');
  device.ledgerProof = mergedLedgerProof;

  if (nftIdentity) {
    const mintDetails = await submitTransactionWithDetails(
      contract,
      network,
      'mintDeviceNFT',
      [deviceId, JSON.stringify(nftIdentity), registeredBy || device.registeredBy || deviceId]
    );

    const mintPayload = JSON.parse(mintDetails.payload);
    device = mintPayload.device;
    mergedLedgerProof = mergeLedgerProof(
      { ...device, ledgerProof: mergedLedgerProof },
      mintDetails,
      'mint-nft'
    );
    device.ledgerProof = mergedLedgerProof;
    device.nftIdentity = mergeNftIdentity(device, mintDetails);
  }

  await persistLedgerProof(contract, deviceId, device.ledgerProof, device.nftIdentity || null);
  const persisted = await getPersistedDevice(contract, deviceId);
  await gateway.disconnect();
  return persisted;
};

exports.getDevice = async (deviceId) => {
  const { contract, gateway } = await connectFabric();
  const result = await contract.evaluateTransaction('getDevice', deviceId);
  await gateway.disconnect();
  return result.toString();
};

exports.getAllDevices = async () => {
  const { contract, gateway } = await connectFabric();
  const result = await contract.evaluateTransaction('getAllDevices');
  await gateway.disconnect();
  return JSON.stringify(normalizeLedgerArray(result.toString()));
};

exports.activateDevice = async (deviceId) => {
  const { contract, gateway, network } = await connectFabric();
  const txDetails = await submitTransactionWithDetails(contract, network, 'activateDevice', [deviceId]);
  const device = JSON.parse(txDetails.payload);
  const ledgerProof = mergeLedgerProof(device, txDetails, 'activate');
  await persistLedgerProof(contract, deviceId, ledgerProof, device.nftIdentity || null);
  const persisted = await getPersistedDevice(contract, deviceId);
  await gateway.disconnect();
  return persisted;
};

exports.verifyDeviceStatus = async (deviceId, identityLabel = 'appUser') => {
  const { contract, gateway } = await connectFabric(identityLabel);
  const result = await contract.evaluateTransaction('verifyDevice', deviceId);
  await gateway.disconnect();
  return result.toString();
};

exports.deactivateDevice = async (deviceId) => {
  const { contract, gateway, network } = await connectFabric();
  const txDetails = await submitTransactionWithDetails(contract, network, 'deactivateDevice', [deviceId]);
  const device = JSON.parse(txDetails.payload);
  const ledgerProof = mergeLedgerProof(device, txDetails, 'deactivate');
  await persistLedgerProof(contract, deviceId, ledgerProof, device.nftIdentity || null);
  const persisted = await getPersistedDevice(contract, deviceId);
  await gateway.disconnect();
  return persisted;
};

exports.revokeDevice = async (deviceId, revokedBy, reason, identityLabel = 'appUser') => {
  const { contract, gateway, network } = await connectFabric(identityLabel);
  const txDetails = await submitTransactionWithDetails(contract, network, 'revokeDevice', [deviceId, revokedBy || '', reason || '']);
  const device = JSON.parse(txDetails.payload);
  const ledgerProof = mergeLedgerProof(device, txDetails, 'deactivate');
  await persistLedgerProof(contract, deviceId, ledgerProof, device.nftIdentity || null);
  const persisted = await getPersistedDevice(contract, deviceId);
  await gateway.disconnect();
  return persisted;
};

exports.removeDevice = async (deviceId) => {
  const { contract, gateway, network } = await connectFabric();
  const txDetails = await submitTransactionWithDetails(contract, network, 'removeDevice', [deviceId]);
  await gateway.disconnect();
  return JSON.stringify({
    ...JSON.parse(txDetails.payload),
    ledgerProof: {
      removalTxId: txDetails.transactionId,
      removalBlockNumber: txDetails.blockNumber,
      removalTimestamp: txDetails.timestamp
    }
  });
};

exports.updateDevice = async (deviceId, type, manufacturer, publicKey, model) => {
  const { contract, gateway, network } = await connectFabric();
  const txDetails = await submitTransactionWithDetails(contract, network, 'updateDevice', [deviceId, type || '', manufacturer || '', publicKey || '', model || '']);
  const device = JSON.parse(txDetails.payload);
  const ledgerProof = mergeLedgerProof(device, txDetails, 'update');
  await persistLedgerProof(contract, deviceId, ledgerProof, device.nftIdentity || null);
  const persisted = await getPersistedDevice(contract, deviceId);
  await gateway.disconnect();
  return persisted;
};

exports.recordTelemetryEvent = async (deviceId, telemetry, submittedBy = 'hospital-edge-gateway') => {
  const { contract, gateway, network } = await connectFabric();
  const txDetails = await submitTransactionWithDetails(
    contract,
    network,
    'recordDeviceTelemetry',
    [deviceId, JSON.stringify(telemetry || {}), submittedBy || '']
  );
  const device = JSON.parse(txDetails.payload);
  const ledgerProof = mergeLedgerProof(device, txDetails, 'telemetry');
  await persistLedgerProof(contract, deviceId, ledgerProof, device.nftIdentity || null);
  const persisted = await getPersistedDevice(contract, deviceId);
  await gateway.disconnect();
  return persisted;
};

exports.getDevicesByStatus = async (status) => {
  const { contract, gateway } = await connectFabric();
  const result = await contract.evaluateTransaction('getDevicesByStatus', status);
  await gateway.disconnect();
  return JSON.stringify(normalizeLedgerArray(result.toString()));
};

exports.getDevicesByType = async (type) => {
  const { contract, gateway } = await connectFabric();
  const result = await contract.evaluateTransaction('getDevicesByType', type);
  await gateway.disconnect();
  return JSON.stringify(normalizeLedgerArray(result.toString()));
};

exports.getDeviceStatus = async (deviceId, identityLabel = 'appUser') => {
  const { contract, gateway } = await connectFabric(identityLabel);
  const result = await contract.evaluateTransaction('getDeviceStatus', deviceId);
  await gateway.disconnect();
  return result.toString();
};

exports.getDeviceHistory = async (deviceId) => {
  const { contract, gateway } = await connectFabric();
  const result = await contract.evaluateTransaction('getDeviceHistory', deviceId);
  await gateway.disconnect();
  return result.toString();
};

exports.getDeviceNFTAsset = async (deviceId) => {
  const { contract, gateway } = await connectFabric();
  const result = await contract.evaluateTransaction('getDeviceNFTAsset', deviceId);
  await gateway.disconnect();
  return result.toString();
};
