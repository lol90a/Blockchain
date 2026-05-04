const crypto = require('crypto');
const { readJsonFile, writeJsonFile } = require('../utils/jsonStore');
const { calculateRetentionExpiry } = require('./complianceService');

const STORE_FILE = 'hospital-records.json';

function loadRecords() {
  return readJsonFile(STORE_FILE, []);
}

function saveRecords(records) {
  writeJsonFile(STORE_FILE, records);
}

function purgeExpiredRecords(records = loadRecords()) {
  const now = Date.now();
  const retained = records.filter((record) => !record.compliance?.retainUntil || new Date(record.compliance.retainUntil).getTime() > now);
  if (retained.length !== records.length) {
    saveRecords(retained);
  }

  return retained;
}

function createRecord({ deviceId, payload, verification, storageReceipt, forwardingReceipt }) {
  const records = purgeExpiredRecords(loadRecords());
  const submittedAt = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    deviceId,
    patientId: payload.patientId,
    observations: payload.observations,
    classification: payload.classification,
    sourceSystem: payload.sourceSystem,
    submittedAt,
    compliance: {
      consentObtained: payload.consentObtained,
      retentionDays: payload.retentionDays,
      retainUntil: calculateRetentionExpiry(submittedAt, payload.retentionDays)
    },
    verification,
    storageReceipt,
    forwardingReceipt
  };

  records.push(record);
  saveRecords(records);
  return record;
}

function getRecords() {
  return purgeExpiredRecords(loadRecords());
}

function getRecordById(recordId) {
  return purgeExpiredRecords(loadRecords()).find((record) => record.id === recordId) || null;
}

module.exports = {
  createRecord,
  getRecords,
  getRecordById,
  purgeExpiredRecords
};
