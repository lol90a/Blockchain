const crypto = require('crypto');

function shortHash(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function formatMacFromHash(hash) {
  const pairs = hash
    .slice(0, 12)
    .match(/.{1,2}/g) || [];

  if (pairs.length === 0) {
    return '';
  }

  // Mark as a locally administered unicast address.
  const firstByte = parseInt(pairs[0], 16);
  pairs[0] = ((firstByte | 0x02) & 0xfe).toString(16).padStart(2, '0');
  return pairs.join(':').toUpperCase();
}

function deriveDeviceDefaults(deviceId = '') {
  const normalizedId = (deviceId || '').trim();
  const hash = shortHash(normalizedId || 'device');

  return {
    serialNumber: `SN-${normalizedId || hash.slice(0, 8).toUpperCase()}`,
    hardwareId: `HW-${hash.slice(0, 12).toUpperCase()}`,
    macAddress: formatMacFromHash(hash)
  };
}

function withDeviceDefaults(payload = {}) {
  const defaults = deriveDeviceDefaults(payload.deviceId);

  return {
    ...payload,
    serialNumber: payload.serialNumber || defaults.serialNumber,
    hardwareId: payload.hardwareId || defaults.hardwareId,
    macAddress: payload.macAddress || defaults.macAddress
  };
}

module.exports = {
  deriveDeviceDefaults,
  withDeviceDefaults
};
