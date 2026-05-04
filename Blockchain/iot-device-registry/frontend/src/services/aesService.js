import axios from 'axios';
import { apiUrl } from '../config/api';

class AESService {
  // Encrypt sensitive data automatically
  static async encryptData(data) {
    try {
      const response = await axios.post(apiUrl('/test/encrypt'), { data });
      return response.data.encryptedData;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data automatically
  static async decryptData(encryptedToken) {
    try {
      const response = await axios.post(apiUrl('/test/decrypt'), { encryptedToken });
      return response.data.decryptedData;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Encrypt device data for registration
  static async encryptDeviceData(deviceData) {
    const sensitiveFields = {
      publicKey: deviceData.publicKey,
      serialNumber: deviceData.serialNumber,
      hardwareId: deviceData.hardwareId,
      macAddress: deviceData.macAddress
    };

    const encryptedData = { ...deviceData };

    // Encrypt sensitive fields
    for (const [field, value] of Object.entries(sensitiveFields)) {
      if (value) {
        try {
          console.log(`[AES] Encrypting field: ${field} | Value:`, value);
          const encrypted = await this.encryptData({ [field]: value });
          console.log(`[AES] Encrypted ${field}:`, encrypted);
          encryptedData[field] = encrypted;
        } catch (error) {
          console.warn(`[AES] Failed to encrypt ${field}:`, error);
          // Keep original value if encryption fails
        }
      }
    }

    console.log('[AES] Final encrypted data to send:', encryptedData);
    return encryptedData;
  }

  // Decrypt device data for display
  static async decryptDeviceData(deviceData) {
    const sensitiveFields = ['publicKey', 'serialNumber', 'hardwareId', 'macAddress'];
    const decryptedData = { ...deviceData };

    for (const field of sensitiveFields) {
      if (deviceData[field] && typeof deviceData[field] === 'string' && deviceData[field].includes(':')) {
        try {
          const decrypted = await this.decryptData(deviceData[field]);
          decryptedData[field] = decrypted[field] || deviceData[field];
        } catch (error) {
          console.warn(`Failed to decrypt ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decryptedData;
  }

  // Check if data is encrypted (contains colon separator)
  static isEncrypted(data) {
    return typeof data === 'string' && data.includes(':') && data.length > 32;
  }

  // Get encryption status for display
  static getEncryptionStatus(data) {
    if (this.isEncrypted(data)) {
      return '🔐 Encrypted';
    }
    return '🔓 Plain Text';
  }
}

export default AESService;
