# Compliance Readiness Notes

This project now includes technical controls that support a GDPR/HIPAA-oriented architecture:

- permissioned Hyperledger Fabric device identity and audit trail
- AES application-layer field encryption for sensitive device fields
- admin access tied to a Fabric wallet identity in addition to app credentials
- hospital intake flow that rejects direct personal identifiers by default
- retention metadata and consent flags on hospital intake records
- immutable-style audit export with optional IPFS storage and local archival fallback
- security headers on API responses

What this does **not** mean:

- the project is not formally GDPR-certified
- the project is not formally HIPAA-certified
- legal, policy, incident-response, workforce-training, and vendor-review requirements still need to be handled outside the codebase

Use this file as an honest thesis/reporting statement: the repository contains compliance-oriented technical safeguards, not a completed legal certification program.
