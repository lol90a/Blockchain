const axios = require('axios');
const { createSimulationBundle } = require('../api/services/ecgSimulationService');

async function main() {
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000/api';
  const deviceId = process.env.ECG_DEVICE_ID || `ecg-esp32-${Date.now()}`;
  const patientId = process.env.ECG_PATIENT_ID || `anon-patient-${deviceId}`;

  const simulation = createSimulationBundle({
    deviceId,
    patientId,
    heartRateBpm: process.env.ECG_HEART_RATE_BPM,
    sampleRateHz: process.env.ECG_SAMPLE_RATE_HZ,
    durationSeconds: process.env.ECG_DURATION_SECONDS,
    registeredBy: process.env.ECG_REGISTERED_BY || 'dashcare-supervisor-demo'
  });

  await axios.get(`${apiBase.replace(/\/api$/, '')}/health`);

  console.log(`Registering simulated IoMT ECG device ${deviceId}...`);
  const registerResponse = await axios.post(`${apiBase}/devices/register`, simulation.registrationPayload);
  console.log(`Registration tx: ${registerResponse.data.data.ledgerProof?.registrationTxId || 'n/a'}`);
  console.log(`NFT mint tx: ${registerResponse.data.data.ledgerProof?.nftMintTxId || 'n/a'}`);

  const gatewayVerify = await axios.get(`${apiBase}/gateway/verify/${deviceId}`);
  console.log(`Gateway verification: ${gatewayVerify.data.verified}`);

  const telemetryResponse = await axios.post(`${apiBase}/devices/${deviceId}/telemetry`, {
    ...simulation.hospitalIntakePayload.observations,
    submittedBy: 'esp32-ad8232-edge-simulator'
  });
  console.log(`Telemetry tx: ${telemetryResponse.data.data.ledgerProof?.lastTelemetryTxId || 'n/a'}`);

  const intakeResponse = await axios.post(
    `${apiBase}/hospital/intake/${deviceId}`,
    simulation.hospitalIntakePayload
  );
  console.log(`Hospital intake receipt: ${intakeResponse.data.data.id}`);
  console.log(`Archived bundle CID: ${intakeResponse.data.data.storageReceipt.cid}`);

  const historyResponse = await axios.get(`${apiBase}/devices/${deviceId}/history`);
  console.log(`History entries after intake: ${historyResponse.data.length}`);

  const metadataResponse = await axios.get(`${apiBase}/devices/${deviceId}/nft/metadata`);
  console.log(`Fabric block number: ${metadataResponse.data.ledgerProof?.nftMintBlockNumber || 'n/a'}`);

  console.log('ECG preview samples:');
  simulation.hospitalIntakePayload.observations.previewSamples.slice(0, 5).forEach((sample) => {
    console.log(`  t=${sample.tMs}ms mv=${sample.mv}`);
  });
}

main().catch((error) => {
  if (error.code === 'ECONNREFUSED') {
    console.error('Backend API is not running on http://127.0.0.1:5000.');
    console.error('Start the Fabric stack and backend first:');
    console.error('  ./scripts/start-fabric-stack.sh');
    console.error('  ./start-server.sh');
    process.exit(1);
  }

  const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
  console.error(details);
  process.exit(1);
});
