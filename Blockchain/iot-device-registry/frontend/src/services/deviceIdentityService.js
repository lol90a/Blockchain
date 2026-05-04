function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToPem(base64, label) {
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function buildStableDeviceData(deviceData = {}) {
  return {
    deviceId: deviceData.deviceId,
    manufacturer: deviceData.manufacturer,
    type: deviceData.type || deviceData.deviceType,
    serialNumber: deviceData.serialNumber,
    hardwareId: deviceData.hardwareId,
    macAddress: deviceData.macAddress,
    model: deviceData.model || null,
    version: '1.0'
  };
}

function downloadTextFile(fileName, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

class DeviceIdentityService {
  static async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );

    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
      publicKeyPem: base64ToPem(arrayBufferToBase64(publicKeyBuffer), 'PUBLIC KEY'),
      privateKeyPem: base64ToPem(arrayBufferToBase64(privateKeyBuffer), 'PRIVATE KEY')
    };
  }

  static async signDeviceData(deviceData, privateKeyPem) {
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(privateKeyPem),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    const payload = new TextEncoder().encode(JSON.stringify(buildStableDeviceData(deviceData)));
    const signature = await window.crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, payload);
    return arrayBufferToBase64(signature);
  }

  static async createSignedIdentity(deviceData) {
    const keys = await this.generateKeyPair();
    const signature = await this.signDeviceData(deviceData, keys.privateKeyPem);
    return {
      publicKey: keys.publicKeyPem,
      privateKeyPem: keys.privateKeyPem,
      signature
    };
  }

  static downloadPrivateKey(deviceId, privateKeyPem) {
    downloadTextFile(`${deviceId || 'device'}-private-key.pem`, privateKeyPem);
  }
}

export default DeviceIdentityService;
