# IoMT ECG Module

This document describes the IoMT (Internet of Medical Things) ECG part of the main `iot-device-registry` project.

It is now fully integrated into the main application and is no longer maintained as a separate duplicate folder.

## What The IoMT Module Is

The IoMT component simulates a smart healthcare ECG monitoring device built from:

- an `ESP32` microcontroller as the edge node
- an `AD8232` ECG biosensor as the signal source

The hardware is simulated in software for testing and research validation, while the blockchain behavior is real.

## Main Files

### Backend IoMT routes

```text
api/routes/iomtRoutes.js
```

Contains these HTTP endpoints:

- `GET /api/iomt/ecg/profile`
- `GET /api/iomt/ecg/waveform`
- `GET /api/iomt/ecg/intake-payload`
- `GET /api/iomt/ecg/demo-bundle`

### Backend IoMT logic

```text
api/services/ecgSimulationService.js
```

This file contains the main ECG simulation logic:

- `buildDeviceProfile`
- `generateRegistrationPayload`
- `generateWaveform`
- `buildHospitalIntakePayload`
- `createSimulationBundle`

It generates:

- simulated ECG device metadata
- real RSA keypairs
- signed registration payloads
- synthetic ECG waveform samples
- hospital-ready intake payloads

### End-to-end IoMT demo

```text
scripts/run-ecg-demo.js
```

This script runs a full demo flow:

1. Generates a simulated ECG IoMT device
2. Registers it on Hyperledger Fabric
3. Verifies it through the gateway
4. Logs telemetry
5. Sends hospital intake
6. Reads the audit history

## What Is Real And What Is Simulated

Real:

- Fabric ledger writes
- Fabric transaction IDs
- Fabric block numbers
- Fabric NFT-style identity minting
- RSA keypair generation
- device signature verification

Simulated:

- ECG waveform values
- ESP32 device hardware
- AD8232 biosensor hardware
- patient health data content

## Quick API Test

With the backend running:

```bash
curl "http://localhost:5000/api/iomt/ecg/profile"
curl "http://localhost:5000/api/iomt/ecg/demo-bundle"
curl "http://localhost:5000/api/iomt/ecg/waveform?heartRateBpm=55"
```

## How It Connects To The Main Project

The IoMT module is not a separate application anymore.
It is part of the main `iot-device-registry` backend and uses the same:

- Fabric device registry
- gateway verification flow
- hospital intake flow
- audit and compliance support

So the IoMT ECG feature is now a built-in feature layer inside the main project.
