const express = require('express');
const deviceService = require('../services/deviceService');
const hospitalIntegrationService = require('../services/hospitalIntegrationService');
const { validateClinicalPayload, buildAuditBundle, getComplianceProfile } = require('../services/complianceService');
const { storeAuditBundle } = require('../services/ipfsService');
const { forwardToHospitalSystem } = require('../services/hospitalForwardingService');

const router = express.Router();

router.get('/compliance', (req, res) => {
  res.json(getComplianceProfile());
});

router.get('/records', (req, res) => {
  res.json(hospitalIntegrationService.getRecords());
});

router.post('/retention/purge', (req, res) => {
  const records = hospitalIntegrationService.purgeExpiredRecords();
  res.json({
    message: 'Expired hospital records purged',
    activeRecords: records.length
  });
});

router.get('/records/:recordId', (req, res) => {
  const record = hospitalIntegrationService.getRecordById(req.params.recordId);
  if (!record) {
    return res.status(404).json({ error: 'Hospital record not found' });
  }

  res.json(record);
});

router.post('/intake/:deviceId', async (req, res) => {
  try {
    const verification = JSON.parse(await deviceService.verifyDeviceStatus(req.params.deviceId));
    const status = JSON.parse(await deviceService.getDeviceStatus(req.params.deviceId));

    if (!verification.verified || !status.isActive) {
      return res.status(403).json({
        error: 'Only verified active devices may submit hospital data',
        verification,
        status
      });
    }

    const validatedPayload = validateClinicalPayload(req.body);
    const provisionalRecord = {
      ...validatedPayload,
      submittedAt: new Date().toISOString()
    };

    const auditBundle = buildAuditBundle({
      deviceId: req.params.deviceId,
      intakeRecord: provisionalRecord,
      verification,
      status
    });

    const storageReceipt = await storeAuditBundle(auditBundle, `${req.params.deviceId}-${Date.now()}`);
    const forwardingReceipt = await forwardToHospitalSystem({
      deviceId: req.params.deviceId,
      patientId: provisionalRecord.patientId,
      observations: provisionalRecord.observations,
      classification: provisionalRecord.classification,
      submittedAt: provisionalRecord.submittedAt
    });
    const record = hospitalIntegrationService.createRecord({
      deviceId: req.params.deviceId,
      payload: provisionalRecord,
      verification,
      storageReceipt,
      forwardingReceipt
    });

    res.status(201).json({
      message: 'Hospital intake accepted from a verified Fabric device',
      data: record
    });
  } catch (error) {
    const statusCode = error.code === 'COMPLIANCE_VALIDATION_FAILED' ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

module.exports = router;
