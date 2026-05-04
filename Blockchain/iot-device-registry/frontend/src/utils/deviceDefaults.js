function shortHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(16).padStart(12, '0');
}

function formatMacFromHash(hash) {
  const base = hash.padEnd(12, '0').slice(0, 12);
  const pairs = base.match(/.{1,2}/g) || [];

  if (pairs.length === 0) {
    return '';
  }

  const firstByte = parseInt(pairs[0], 16);
  pairs[0] = ((firstByte | 0x02) & 0xfe).toString(16).padStart(2, '0');
  return pairs.join(':').toUpperCase();
}

export function deriveDeviceDefaults(deviceId = '') {
  const trimmedId = (deviceId || '').trim();
  const hash = shortHash(trimmedId || 'device');

  return {
    serialNumber: `SN-${trimmedId || hash.slice(0, 8).toUpperCase()}`,
    hardwareId: `HW-${hash.slice(0, 12).toUpperCase()}`,
    macAddress: formatMacFromHash(hash)
  };
}

export function withDeviceDefaults(deviceData = {}) {
  const defaults = deriveDeviceDefaults(deviceData.deviceId);

  return {
    ...deviceData,
    serialNumber: deviceData.serialNumber || defaults.serialNumber,
    hardwareId: deviceData.hardwareId || defaults.hardwareId,
    macAddress: deviceData.macAddress || defaults.macAddress
  };
}
