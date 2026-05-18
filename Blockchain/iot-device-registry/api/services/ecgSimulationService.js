const crypto = require('crypto');
const { deriveDeviceDefaults } = require('../utils/deviceRegistrationDefaults');
const { buildSigningPayload } = require('../../crypto/nftUtils');

function round(value, decimals = 5) {
  return Number(value.toFixed(decimals));
}

function pseudoRandom(seed) {
  const hash = crypto.createHash('sha256').update(String(seed)).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}

function gaussian(phase, center, width, amplitude) {
  const distance = phase - center;
  return amplitude * Math.exp(-(distance * distance) / (2 * width * width));
}

function classifyRhythm(heartRateBpm) {
  if (heartRateBpm < 60) {
    return 'sinus-bradycardia-pattern';
  }

  if (heartRateBpm > 100) {
    return 'sinus-tachycardia-pattern';
  }

  return 'normal-sinus-rhythm-pattern';
}

function buildDeviceProfile(options = {}) {
  const timestamp = new Date().toISOString();
  const deviceId = options.deviceId || `ecg-esp32-${Date.now()}`;
  const sampleRateHz = Math.max(100, Number(options.sampleRateHz || 250));
  const durationSeconds = Math.max(2, Number(options.durationSeconds || 10));
  const heartRateBpm = Math.max(40, Number(options.heartRateBpm || 78));
  const patientId = options.patientId || `anon-ecg-${deviceId}`;
  const defaults = deriveDeviceDefaults(deviceId);

  return {
    generatedAt: timestamp,
    patientId,
    device: {
      deviceId,
      type: 'iomt-ecg-monitor',
      manufacturer: 'DASHCare Virtual IoMT Lab',
      model: 'ESP32-AD8232-SIM',
      registeredBy: options.registeredBy || 'dashcare-researcher',
      serialNumber: defaults.serialNumber,
      hardwareId: defaults.hardwareId,
      macAddress: defaults.macAddress,
      firmwareVersion: options.firmwareVersion || '1.0.0-sim',
      edgeNode: 'ESP32',
      biosensor: 'AD8232',
      leadConfiguration: options.leadConfiguration || 'Lead-I'
    },
    telemetry: {
      heartRateBpm,
      sampleRateHz,
      durationSeconds,
      rhythm: classifyRhythm(heartRateBpm)
    }
  };
}

function generateRegistrationPayload(profile) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const registrationPayload = {
    deviceId: profile.device.deviceId,
    type: profile.device.type,
    manufacturer: profile.device.manufacturer,
    registeredBy: profile.device.registeredBy,
    publicKey,
    serialNumber: profile.device.serialNumber,
    hardwareId: profile.device.hardwareId,
    macAddress: profile.device.macAddress,
    model: profile.device.model
  };

  registrationPayload.signature = crypto.sign(
    'RSA-SHA256',
    Buffer.from(buildSigningPayload(registrationPayload)),
    privateKey
  ).toString('base64');

  return {
    registrationPayload,
    privateKey
  };
}

function generateWaveform(profile) {
  const { sampleRateHz, durationSeconds, heartRateBpm } = profile.telemetry;
  const totalSamples = sampleRateHz * durationSeconds;
  const beatPeriodSeconds = 60 / heartRateBpm;
  const previewSamples = [];
  const allSamples = [];
  const previewLimit = Math.min(80, totalSamples);

  for (let index = 0; index < totalSamples; index += 1) {
    const t = index / sampleRateHz;
    const beatTime = t % beatPeriodSeconds;
    const phase = beatTime / beatPeriodSeconds;
    const baselineWander = 0.03 * Math.sin(2 * Math.PI * 0.33 * t);
    const deterministicNoise = (pseudoRandom(`${profile.device.deviceId}:${index}`) - 0.5) * 0.02;

    const pWave = gaussian(phase, 0.18, 0.025, 0.12);
    const qWave = gaussian(phase, 0.38, 0.01, -0.15);
    const rWave = gaussian(phase, 0.4, 0.008, 1.15);
    const sWave = gaussian(phase, 0.43, 0.012, -0.25);
    const tWave = gaussian(phase, 0.68, 0.05, 0.35);

    const millivolts = round(baselineWander + deterministicNoise + pWave + qWave + rWave + sWave + tWave);
    allSamples.push(millivolts);

    if (index < previewLimit) {
      previewSamples.push({
        tMs: Math.round(t * 1000),
        mv: millivolts
      });
    }
  }

  const signalHash = crypto.createHash('sha256').update(JSON.stringify(allSamples)).digest('hex');

  return {
    summary: {
      rhythm: profile.telemetry.rhythm,
      heartRateBpm,
      sampleRateHz,
      durationSeconds,
      totalSamples,
      signalHash,
      rrIntervalMs: Math.round(60000 / heartRateBpm),
      leadOffDetected: false
    },
    previewSamples
  };
}

function buildHospitalIntakePayload(profile, waveform) {
  const recordedAt = new Date().toISOString();

  return {
    patientId: profile.patientId,
    consentObtained: true,
    classification: 'cardiac-monitoring',
    sourceSystem: 'esp32-ad8232-edge-simulator',
    observations: {
      modality: 'ecg',
      deviceType: profile.device.type,
      deviceModel: profile.device.model,
      biosensor: profile.device.biosensor,
      controller: profile.device.edgeNode,
      leadConfiguration: profile.device.leadConfiguration,
      recordedAt,
      summary: waveform.summary,
      previewSamples: waveform.previewSamples
    }
  };
}

function createSimulationBundle(options = {}) {
  const profile = buildDeviceProfile(options);
  const { registrationPayload, privateKey } = generateRegistrationPayload(profile);
  const waveform = generateWaveform(profile);
  const hospitalIntakePayload = buildHospitalIntakePayload(profile, waveform);

  return {
    profile,
    registrationPayload,
    privateKey,
    waveform,
    hospitalIntakePayload
  };
}

module.exports = {
  buildDeviceProfile,
  buildHospitalIntakePayload,
  createSimulationBundle,
  generateRegistrationPayload,
  generateWaveform
};
