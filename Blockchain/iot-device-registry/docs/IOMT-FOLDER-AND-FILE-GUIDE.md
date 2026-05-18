# IoMT Folder And File Guide

This document explains where the IoMT-related folders and files are in this repository, what each folder is used for, and what the important files contain.

It covers the main IoMT application location:

- `Blockchain/iot-device-registry`

Older duplicate IoMT content that previously existed under `Blockchain/iomt-client` has been consolidated into the main project.

## 1. Main IoMT Project Location

Primary application:

```text
Blockchain/iot-device-registry
```

This is the full IoMT + blockchain application.
It contains:

- backend API
- Hyperledger Fabric integration
- chaincode
- React frontend
- hospital integration
- IoMT ECG simulation
- compliance and audit support

## 2. High-Level Structure

### `Blockchain/iot-device-registry`

Important folders:

- `api/`
- `blockchain/`
- `chaincode/`
- `crypto/`
- `data/`
- `docs/`
- `frontend/`
- `postman/`
- `scripts/`
- `wallet/`

Important root files:

- `.env`
- `.gitignore`
- `README.md`

## 3. Folder-By-Folder Explanation

## `Blockchain/iot-device-registry/api`

This is the backend application layer.
It contains the Express server, routes, controllers, services, and shared backend utilities.

### `api/server.js`

Main Express server entry point.
It:

- starts the backend on port `5000`
- enables CORS and JSON parsing
- applies security headers
- mounts all backend routes
- exposes `/health`

### `api/index.js`

Support entry file for the API package structure.

### `api/controllers`

This folder contains controller logic that receives HTTP requests and calls services.

#### `api/controllers/deviceController.js`

Main device controller.
It handles:

- device registration
- get one device / get all devices
- activate / deactivate
- gateway verify / revoke / status
- NFT metadata and verification
- audit history
- challenge-response identity proof
- gateway identity status

### `api/routes`

This folder defines the HTTP endpoints.

#### `api/routes/deviceRoutes.js`

Main device API routes.
Contains endpoints for:

- registering devices
- fetching devices
- updating devices
- deleting devices
- audit history
- NFT verification
- status filtering

#### `api/routes/gatewayRoutes.js`

Gateway-facing routes.
These represent the edge-gateway behavior from the project architecture.
Contains endpoints for:

- device verify
- device revoke
- device status
- gateway identity check

#### `api/routes/adminRoutes.js`

Admin authentication and admin management routes.
Contains:

- admin login
- Fabric-backed admin identity status
- admin-managed user operations

#### `api/routes/userRoutes.js`

Application user registration/login routes.
Handles:

- user register
- user login
- profile lookup
- file-backed user storage helpers

#### `api/routes/hospitalRoutes.js`

Hospital integration routes.
Contains:

- hospital intake
- accepted hospital records
- one record by id
- retention purge
- compliance profile

#### `api/routes/iomtRoutes.js`

Dedicated IoMT ECG simulation routes.
Contains:

- `/api/iomt/ecg/profile`
- `/api/iomt/ecg/waveform`
- `/api/iomt/ecg/intake-payload`
- `/api/iomt/ecg/demo-bundle`

These endpoints generate simulated IoMT ECG artifacts for demo/testing.

#### `api/routes/testRoutes.js`

Utility/test routes used for encryption and debugging workflows.

### `api/services`

This folder contains the real business logic used by the backend.

#### `api/services/deviceService.js`

Main blockchain device service.
This is one of the most important files in the project.
It:

- connects device operations to Hyperledger Fabric
- submits transactions
- evaluates queries
- merges transaction metadata into `ledgerProof`
- handles register / activate / deactivate / revoke / update / history / NFT queries

#### `api/services/ecgSimulationService.js`

Main IoMT ECG simulation engine.
It creates:

- simulated ECG device profiles
- RSA keypairs
- signed registration payloads
- synthetic ECG waveform data
- hospital intake payloads
- a full simulation bundle

This file is the core of the IoMT healthcare demo layer.

#### `api/services/hospitalIntegrationService.js`

Stores and retrieves hospital intake records.
It also handles:

- retention timestamps
- expired record cleanup
- record lookup

#### `api/services/hospitalForwardingService.js`

Optional external hospital forwarding layer.
If configured with an external EMR endpoint, it forwards accepted hospital records outward.
If not configured, records stay local.

#### `api/services/complianceService.js`

Compliance-oriented business rules.
It:

- defines the compliance profile
- validates incoming clinical payloads
- rejects direct personal identifiers
- calculates retention expiry
- builds audit bundles

#### `api/services/ipfsService.js`

Stores audit bundles.
It supports:

- remote IPFS pinning if `IPFS_API_URL` is configured
- local archive fallback if IPFS is not configured

### `api/utils`

Shared backend helpers.

#### `api/utils/connectFabric.js`

Creates Fabric gateway connections.
It now supports selecting different identities such as:

- `appUser`
- `gatewayUser`

#### `api/utils/fabricIdentityUtils.js`

Reads and validates identities stored in the Fabric wallet.
Used to prove that admin and gateway identities exist.

#### `api/utils/fabricTxUtils.js`

Helper functions for submitting Fabric transactions and collecting metadata like:

- transaction ID
- block number
- commit status
- timestamp

#### `api/utils/deviceRegistrationDefaults.js`

Generates deterministic default values such as:

- serial number
- hardware ID
- MAC-like address

#### `api/utils/deviceChallengeStore.js`

In-memory challenge store for challenge-response identity proof.

#### `api/utils/authUtils.js`

Authentication helpers:

- password hashing
- password verification
- JWT-like token signing and verification

#### `api/utils/jsonStore.js`

File-backed JSON storage helper used by:

- users
- hospital records
- local data archives

#### `api/utils/securityMiddleware.js`

Adds security-related HTTP headers.

#### `api/utils/encryptUtils.js`

Additional encryption helper utilities used by backend flows.

## `Blockchain/iot-device-registry/blockchain`

This folder contains Fabric-specific application-side assets and scripts.

### `blockchain/connection-org1.json`
### `blockchain/connection/connection-org1.json`

Hyperledger Fabric connection profile files for Org1.
They tell the backend how to reach peers, orderers, and CAs.

### `blockchain/deviceContract`

This is a copy/reference implementation area for the smart contract package structure.

Important files:

- `blockchain/deviceContract/index.js`
- `blockchain/deviceContract/package.json`

### `blockchain/scripts`

Fabric identity and network helper scripts.

#### `blockchain/scripts/enrollAdmin.js`

Enrolls the Fabric admin identity into the wallet.

#### `blockchain/scripts/registerUser.js`

Registers and enrolls `appUser` for backend Fabric access.

#### `blockchain/scripts/registerGatewayUser.js`

Registers and enrolls `gatewayUser`.
This supports the architecture claim that the edge gateway has its own distinct identity.

#### `blockchain/scripts/enrollUser.js`

Alternate helper for application-user enrollment.

#### `blockchain/scripts/testAdminConnection.js`

Tests whether the admin identity can connect to Fabric and query chaincode.

#### `blockchain/scripts/checkChannelPermissions.js`

Checks whether the configured wallet identity can access the channel.

#### `blockchain/scripts/fixChannelPermissions.js`

Recovery helper for Fabric permission or identity issues.

## `Blockchain/iot-device-registry/chaincode`

This folder contains the actual smart contract deployed to Hyperledger Fabric.

### `chaincode/deviceContract/index.js`

Main chaincode file.
This implements the blockchain business logic:

- `registerDevice`
- `verifyDevice`
- `revokeDevice`
- `getDeviceStatus`
- `mintDeviceNFT`
- `getDeviceNFTAsset`
- `getDeviceHistory`
- `activateDevice`
- `deactivateDevice`
- `updateDevice`
- `recordLedgerProof`

This is one of the most important files in the entire system.

### `chaincode/deviceContract/package.json`

Node package definition for the deployed chaincode.

### `chaincode/deviceContract/Dockerfile`

Container build recipe for the chaincode-as-a-service runtime.

### `chaincode/package.json`

Parent chaincode package metadata.

## `Blockchain/iot-device-registry/crypto`

This folder contains shared cryptographic logic.

### `crypto/aesUtils.js`

AES encryption/decryption utilities used for sensitive data fields.

### `crypto/nftUtils.js`

Builds and verifies the NFT-style device identity structures and signing payloads.

## `Blockchain/iot-device-registry/data`

Runtime data folder.
This is generated and updated while the app runs.

### `data/users.json`

File-backed application user/admin data.

### `data/hospital-records.json`

Stored hospital intake records accepted by the backend.

### `data/ipfs-archive/`

Local archive of audit bundles when IPFS is not configured or as fallback storage.

## `Blockchain/iot-device-registry/docs`

Project documentation folder.

### `docs/compliance-readiness.md`

Explains the compliance-oriented safeguards and what is not formally certified.

### `docs/IOMT-FOLDER-AND-FILE-GUIDE.md`

This structure guide.

### `docs/IOMT-ECG-MODULE.md`

Focused IoMT ECG module documentation.

## `Blockchain/iot-device-registry/frontend`

React frontend for the admin and device-management UI.

### `frontend/src/App.js`

Main UI logic.
It contains:

- authentication switching
- device registration form
- device list
- activate / deactivate / revoke
- audit log viewing and export
- device details panel

### `frontend/src/App.css`

Main frontend styling.

### `frontend/src/NFTDisplay.js`

Displays NFT/device identity information and verification results.

### `frontend/src/AESTest.js`

Frontend helper view for AES-related testing/demonstration.

### `frontend/src/index.js`

React entry point.

### `frontend/src/index.css`

Global frontend styles.

### `frontend/public/index.html`

Base HTML page for the React app.

### `frontend/package.json`

Frontend dependency and script configuration.

### `frontend/start-frontend.sh`
### `frontend/setup.sh`

Helper shell scripts for frontend setup/start workflows.

### `frontend/build/`

Generated production build output.
This is not hand-written source code.

## `Blockchain/iot-device-registry/postman`

Contains Postman collections/environment files for API testing.

Use this folder when you want to demonstrate:

- device registration
- gateway verification
- hospital intake
- admin/user API flows

## `Blockchain/iot-device-registry/scripts`

Project-level automation scripts.

### `scripts/start-fabric-stack.sh`

Bootstraps the Fabric network, identities, and chaincode services.

### `scripts/reset-fabric-network.sh`

Resets containers, volumes, and stale Docker network state.

### `scripts/deploy-fabric.sh`

Deploys the Fabric chaincode-as-a-service package.

### `scripts/test-all-operations.js`

Main smoke test script.
It validates the full registry flow through backend endpoints.

### `scripts/run-ecg-demo.js`

Runs the IoMT ECG demo from start to finish:

- generates the ECG device
- registers it
- logs telemetry
- sends hospital intake
- checks audit history

## `Blockchain/iot-device-registry/wallet`

Fabric identity wallet folder.

This folder stores enrolled identities such as:

- `admin`
- `appUser`
- `gatewayUser`

These files are runtime credentials and should be treated as sensitive operational data.

## 4. Files You Usually Do Not Need To Document Line-By-Line

These folders exist, but they are mostly generated or third-party content:

- `node_modules/`
- `frontend/node_modules/`
- `chaincode/node_modules/`
- `frontend/build/`
- `.git/`
- `fabric-samples/` except where you are specifically explaining the Fabric test network

You can describe them briefly like this:

- `node_modules/` contains installed package dependencies
- `build/` contains generated production frontend output
- `fabric-samples/` contains Hyperledger Fabric sample binaries, network scripts, and reference material

## 5. Short Answer: Where Are The IoMT Files?

If someone asks only for the IoMT part, point them to these files first:

Main IoMT logic:

```text
Blockchain/iot-device-registry/api/services/ecgSimulationService.js
```

Main IoMT API endpoints:

```text
Blockchain/iot-device-registry/api/routes/iomtRoutes.js
```

Main IoMT demo script:

```text
Blockchain/iot-device-registry/scripts/run-ecg-demo.js
```

Focused IoMT documentation:

```text
Blockchain/iot-device-registry/docs/IOMT-ECG-MODULE.md
```

## 6. Recommendation

For client delivery, use this folder first:

```text
Blockchain/iot-device-registry
```

because that is where the full working backend, blockchain integration, frontend, hospital integration, and IoMT simulation are all connected together.
