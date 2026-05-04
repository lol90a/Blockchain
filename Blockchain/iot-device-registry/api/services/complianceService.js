const DIRECT_IDENTIFIER_FIELDS = [
  'name',
  'firstName',
  'lastName',
  'fullName',
  'email',
  'phone',
  'address',
  'nationalId',
  'ssn',
  'passportNumber'
];

function getComplianceProfile() {
  return {
    mode: 'technical-readiness',
    claims: [
      'permissioned blockchain for device identity',
      'AES field encryption in the application layer',
      'device-level audit history',
      'admin Fabric identity verification',
      'security headers and pseudonymized hospital intake flow',
      'automatic hospital record retention cleanup',
      'optional external hospital-system forwarding'
    ],
    limitations: [
      'not a formal GDPR certification',
      'not a formal HIPAA certification',
      'requires organizational policy, legal review, and operational controls'
    ],
    retentionDaysDefault: Number(process.env.HOSPITAL_RETENTION_DAYS || 365),
    directIdentifierFieldsRejected: DIRECT_IDENTIFIER_FIELDS
  };
}

function validateClinicalPayload(payload = {}) {
  const violations = DIRECT_IDENTIFIER_FIELDS.filter((field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== '');

  if (!payload.patientId) {
    violations.push('patientId is required');
  }

  if (!payload.observations || typeof payload.observations !== 'object' || Array.isArray(payload.observations)) {
    violations.push('observations object is required');
  }

  if (payload.consentObtained !== true) {
    violations.push('consentObtained must be true');
  }

  if (violations.length > 0) {
    const error = new Error(`Compliance validation failed: ${violations.join(', ')}`);
    error.code = 'COMPLIANCE_VALIDATION_FAILED';
    throw error;
  }

  const retentionDays = Math.max(1, Number(payload.retentionDays || process.env.HOSPITAL_RETENTION_DAYS || 365));

  return {
    patientId: String(payload.patientId),
    observations: payload.observations,
    consentObtained: true,
    classification: payload.classification || 'clinical',
    retentionDays,
    sourceSystem: payload.sourceSystem || 'hospital-edge-gateway',
    receivedAt: new Date().toISOString()
  };
}

function buildAuditBundle({ deviceId, intakeRecord, verification, status }) {
  return {
    deviceId,
    submittedAt: intakeRecord.submittedAt,
    patientId: intakeRecord.patientId,
    classification: intakeRecord.classification,
    sourceSystem: intakeRecord.sourceSystem,
    compliance: intakeRecord.compliance,
    observations: intakeRecord.observations,
    verification,
    deviceStatus: status
  };
}

function calculateRetentionExpiry(submittedAt, retentionDays) {
  return new Date(new Date(submittedAt).getTime() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

module.exports = {
  getComplianceProfile,
  validateClinicalPayload,
  buildAuditBundle,
  calculateRetentionExpiry
};
