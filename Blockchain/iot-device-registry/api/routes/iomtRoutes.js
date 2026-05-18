const express = require('express');
const {
  buildDeviceProfile,
  buildHospitalIntakePayload,
  createSimulationBundle,
  generateWaveform
} = require('../services/ecgSimulationService');

const router = express.Router();

function readOptions(query = {}) {
  return {
    deviceId: query.deviceId,
    patientId: query.patientId,
    registeredBy: query.registeredBy,
    firmwareVersion: query.firmwareVersion,
    leadConfiguration: query.leadConfiguration,
    sampleRateHz: query.sampleRateHz,
    durationSeconds: query.durationSeconds,
    heartRateBpm: query.heartRateBpm
  };
}

router.get('/ecg/profile', (req, res) => {
  const profile = buildDeviceProfile(readOptions(req.query));
  res.json(profile);
});

router.get('/ecg/waveform', (req, res) => {
  const profile = buildDeviceProfile(readOptions(req.query));
  const waveform = generateWaveform(profile);
  res.json({
    profile,
    waveform
  });
});

router.get('/ecg/intake-payload', (req, res) => {
  const profile = buildDeviceProfile(readOptions(req.query));
  const waveform = generateWaveform(profile);
  const hospitalIntakePayload = buildHospitalIntakePayload(profile, waveform);

  res.json({
    profile,
    hospitalIntakePayload
  });
});

router.get('/ecg/demo-bundle', (req, res) => {
  const bundle = createSimulationBundle(readOptions(req.query));
  res.json({
    profile: bundle.profile,
    registrationPayload: bundle.registrationPayload,
    waveform: bundle.waveform,
    hospitalIntakePayload: bundle.hospitalIntakePayload
  });
});

module.exports = router;
