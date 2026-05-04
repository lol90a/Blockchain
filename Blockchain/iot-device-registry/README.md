# IoT Device Registry On Hyperledger Fabric

This project is a full-stack IoT device registry with:

- a React frontend
- a Node.js/Express backend
- a Hyperledger Fabric network
- a Fabric-minted device NFT flow

The backend stores device records on Fabric and mints a separate on-ledger NFT asset for each registered device. The NFT is minted on Hyperledger Fabric, not on Ethereum or Polygon.

The runtime is configured for Fabric only. Mock-mode execution and Fabric fallback are disabled.

## What Is Real In This Project

- Device records are stored on the Hyperledger Fabric ledger
- Each device registration creates a Fabric-backed NFT identity record
- A dedicated NFT asset is minted on Fabric under an `NFT:<tokenId>` key
- The UI shows real Fabric block numbers
- The UI shows real Fabric transaction IDs
- Device keys are generated automatically in the frontend when needed
- Hospital intake is now gated behind verified active devices
- Audit bundles can be archived to IPFS when configured, with local archival fallback
- Admin login now requires a Fabric wallet identity in addition to app credentials
- Gateway routes now use a dedicated `gatewayUser` Fabric wallet identity
- Hospital submissions can optionally be forwarded to an external EMR endpoint

## Alignment With Your Milestone Document

The PDF you sent includes these milestone areas:

- Hyperledger Fabric blockchain network setup
- smart contract / chaincode deployment
- simulated IoT device interaction through API
- admin monitoring interface
- end-to-end testing and validation

This project currently matches those milestones as follows:

- `Milestone 1: Setup the Hyperledger Fabric Blockchain Network`
  The Fabric test network, channel, wallet enrollment, and chaincode-as-a-service startup flow are documented and working.
- `Milestone 2: Write and Deploy Smart Contracts (Chaincode)`
  The `devicecontract` chaincode is implemented and deployed on `mychannel`.
- `Milestone 3: Simulate IoT Device Interactions via API`
  The project supports simulated device registration, key generation, signing, verification, activation, deactivation, querying, and deletion through the backend API.
- `Milestone 4: Develop Admin Monitoring Interface`
  The frontend includes the admin/device monitoring flow and is connected to the backend. Admin access is now tied to a Fabric wallet identity.
- `Milestone 5: End-to-End Testing and Validation`
  The project includes runnable verification steps, a device audit-history view/export flow, a hospital-intake validation flow, and a smoke test script at `scripts/test-all-operations.js`.

More specifically against the milestone text file:

- `Register IoT medical devices`
  Implemented as generic IoT device registration on Fabric.
- `Authenticate them using NFT-like digital identities`
  Implemented with a real Fabric-minted NFT-style identity asset and signature verification flow.
- `Revoke compromised devices in real time`
  Implemented as device deactivation and lifecycle control through the backend and chaincode.
- `Immutable logging for traceability and audit`
  Implemented through Fabric transaction history references stored in `ledgerProof` plus a device audit-history endpoint and UI export flow.
- `Permissioned blockchain`
  Implemented with Hyperledger Fabric.

Items mentioned in the milestone text that are only partially implemented or not the main current runtime path:

- `Edge Gateway`
  The backend API currently plays this gateway role and now uses a distinct Fabric wallet identity (`gatewayUser`) for gateway-aligned routes under `/api/gateway`.
- `Hospital System Integration Layer`
  Implemented as a dedicated backend integration route under `/api/hospital/intake/:deviceId` that only accepts submissions from verified active devices, with optional forwarding to an external EMR endpoint.
- `GDPR / HIPAA compliance`
  The project now includes technical safeguards for compliance readiness, but it should not be described as formally compliance-certified.
- `CouchDB to visualize world state`
  The startup script now defaults to CouchDB-backed world state through the Fabric test network.
- `IPFS integration`
  Optional IPFS audit-bundle storage is implemented through `IPFS_API_URL`, with local archival fallback when an IPFS node is not configured.
- `Secure admin authentication via CA`
  Admin authentication now checks for the enrolled `admin` Fabric wallet identity before issuing an admin session.

What is still important to state honestly:

- the device and NFT ledger flow is Fabric-backed
- the admin/user authentication layer is still application-managed, not stored on Fabric
- this is a real Fabric NFT-style asset, not an Ethereum ERC-721 token

## What Is Not Stored On Fabric

- Admin login data is handled by the backend application layer
- User registration and login data is handled by the backend application layer
- Frontend auth/session tokens are stored in browser `localStorage`

So the Fabric-backed part of the project is the device registry and NFT identity flow. It would be inaccurate to claim that every piece of application data is currently stored on Fabric.

## Project Paths

Project root:

```text
Blockchain/iot-device-registry
```

Fabric test network:

```text
Blockchain/fabric-samples/test-network
```

## Requirements

- Node.js 18+
- npm
- Docker
- Docker Compose or Docker plugin support

## Runtime Ports

- frontend: `3000`
- backend: `5000`
- Fabric peer org1: `7051`
- Fabric CA org1: `7054`
- Fabric peer org2: `9051`
- orderer: `7050`


## Install Dependencies

Backend:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
npm install
```

Frontend:

```bash
cd Blockchain-main/Blockchain/iot-device-registry/frontend
npm install
```

## Start The Fabric Network

Go to the Fabric test-network directory:

```bash
cd /home/lol/Blockchain-main/Blockchain/fabric-samples/test-network
```

If you want a clean restart, use the project reset script:

```bash
cd /home/lol/Blockchain-main/Blockchain/iot-device-registry
./scripts/reset-fabric-network.sh
```

Then bootstrap the Fabric stack from the project:

```bash
cd /home/lol/Blockchain-main/Blockchain/iot-device-registry
./scripts/start-fabric-stack.sh
```

This script:

- starts the Fabric network and `mychannel` if they are not already running
- defaults to CouchDB world state unless `FABRIC_STATE_DB` is changed
- starts the Fabric CA containers if they are missing
- refreshes `admin` and `appUser` in the wallet
- refreshes `gatewayUser` in the wallet as a distinct gateway identity
- deploys the `devicecontract` chaincode if the chaincode service containers are not already running

If you prefer the manual path, start the network with CAs:

```bash
./network.sh up -ca -s couchdb
```

Create the channel:

```bash
./network.sh createChannel -c mychannel
```

## Enroll Wallet Identities

Go back to the project:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
```

Refresh the admin and application identities:

```bash
node blockchain/scripts/enrollAdmin.js
node blockchain/scripts/registerUser.js
```

This writes identities into:

```text
wallet/admin.id
wallet/appUser.id
wallet/gatewayUser.id
```

## Deploy The Fabric NFT Chaincode

Go back to the Fabric test-network directory:

```bash
cd Blockchain-main/Blockchain/fabric-samples/test-network
```

Deploy the chaincode as chaincode-as-a-service:

```bash
./network.sh deployCCAAS -c mychannel -ccn devicecontract -ccp ../../iot-device-registry/chaincode/deviceContract -ccv 1.5
```

If you have already deployed an older version, increase the version number, for example `1.6`, `1.7`, and so on.

You can also use:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
./scripts/deploy-fabric.sh 1.5
```

After deployment, you should see:

- the chaincode committed on `mychannel`
- `peer0org1_devicecontract_ccaas` running
- `peer0org2_devicecontract_ccaas` running

Check:

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep devicecontract
```

## Start The Backend

From the project directory:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
./scripts/start-fabric-stack.sh
./start-server.sh
```

The backend now exposes:

- `/api/hospital/intake/:deviceId` for verified-device hospital submissions
- `/api/hospital/records` to inspect accepted records
- `/api/hospital/retention/purge` to remove expired records immediately
- `/api/admin/fabric-status` to confirm the enrolled admin wallet identity
- `/api/gateway/identity` to confirm the enrolled gateway wallet identity
- `/api/compliance` for the technical-readiness profile

 on Hyperledger Fabric and stores the device record on-ledger.
- A Fabric NFT-style identity asset is minted for the device.
- Gateway endpoints are used to verify, revoke, activate, deactivate, and inspect device status.## Hospital Device Simulation

This project uses a real software-based device simulation rather than physical hospital hardware.

- Each simulated device is given its own real RSA public/private keypair in the frontend.
- The simulated device signs its registration payload with its private key.
- The backend registers that device
- The smoke test at `scripts/test-all-operations.js` simulates a full device lifecycle from registration to verification, revocation, hospital intake, audit-history retrieval, and cleanup.

So the honest project claim is:

- the blockchain interactions are real
- the device cryptographic identity is real
- the device itself is simulated in software for testing and research validation
- the gateway has a separate Fabric identity from the generic app client identity

## Audit Log Troubleshooting

If clicking `View Audit Log` shows:

```text
Failed to load audit history: transaction returned with failure: Error: You've asked to invoke a function that does not exist: getDeviceHistory
```

then the backend has been updated but the Fabric chaincode running on your network is still the older deployed version.

Redeploy the chaincode with the newer version and restart the backend:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
./scripts/deploy-fabric.sh 1.5
./start-server.sh
```

If Fabric is in a messy state, do a clean restart:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
./scripts/reset-fabric-network.sh
./scripts/start-fabric-stack.sh 1.5
./start-server.sh
```

## IPFS Audit Storage

To pin hospital/device audit bundles to a real IPFS node, set:

```env
IPFS_API_URL=http://127.0.0.1:5001
```



## Compliance Readiness

See:

```text
docs/compliance-readiness.md
```

This project now includes compliance-oriented technical controls, but it is still not a formal legal certification.

Or:

```bash
node api/server.js
```

Expected backend health check:

```bash
curl http://localhost:5000/health
```

Expected result includes:

- `"status":"OK"`
- `"mode":"Fabric Mode"`

## Start The Frontend

Open a second terminal:

```bash
cd Blockchain-main/Blockchain/iot-device-registry/frontend
node node_modules/react-scripts/bin/react-scripts.js start
```

Open:

```text
http://localhost:3000
```

The frontend is configured to use:

```text
http://localhost:5000/api
```

through:

- `frontend/package.json` proxy
- `frontend/src/config/api.js`

## How To Verify The Whole Project Is Connected To Fabric

### 1. Verify Fabric containers are up

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | egrep 'peer0|orderer|ca_|devicecontract'
```

You should see:

- `peer0.org1.example.com`
- `peer0.org2.example.com`
- `orderer.example.com`
- `ca_org1`
- `ca_org2`
- `ca_orderer`
- `peer0org1_devicecontract_ccaas`
- `peer0org2_devicecontract_ccaas`

### 2. Verify the backend is in Fabric mode

```bash
curl http://localhost:5000/health
```

The response must say `Fabric Mode`.

### 2a. Verify the frontend is pointed at the backend

The frontend is configured to call:

- `http://localhost:5000/api` via `frontend/src/config/api.js`
- `http://localhost:5000` via the proxy in `frontend/package.json`

So when the backend is up on port `5000`, the frontend is wired to the same Fabric-backed API.

### 3. Verify the backend can read from Fabric

```bash
curl http://localhost:5000/api/devices
```

This should return a JSON array.

### 4. Verify a real Fabric-backed NFT mint

Register a device from the frontend or with the API.

The UI flow:

1. Open `http://localhost:3000`
2. Register a device
3. Leave `Public Key` blank if you want automatic key generation
4. Leave `Serial Number`, `Hardware ID`, and `MAC Address` blank if you want auto-generated simulated device values
5. Open the device details
6. Open the NFT / Fabric identity section

You should see:

- a Fabric token id
- a real Fabric transaction id
- a real Fabric block number
- the NFT asset owner
- the Fabric NFT asset key

### 5. Verify the minted NFT asset exists on-chain

Use the UI `Verify Fabric Identity` button.

The API behind it is:

```bash
curl http://localhost:5000/api/devices/<deviceId>/nft/verify
```

The response includes:

- `ledgerProof`
- `verificationResult`
- `nftAsset`

The `nftAsset` object is the separately minted Fabric NFT asset.

### 5a. Verify the milestone-aligned gateway API

The backend also exposes gateway-style aliases that match the milestone wording more directly:

```bash
curl -X POST http://localhost:5000/api/gateway/register
curl http://localhost:5000/api/gateway/verify/<deviceId>
curl http://localhost:5000/api/gateway/status/<deviceId>
curl -X POST http://localhost:5000/api/gateway/revoke/<deviceId>
```

These routes map to the same Fabric-backed device lifecycle and are provided to align with the research milestone language around gateway-mediated device operations.

### 6. Run the automated end-to-end validation

From the project directory:

```bash
cd /home/lol/Blockchain-main/Blockchain/iot-device-registry
node scripts/test-all-operations.js
```

Expected behavior:

- a test device is registered on Fabric
- NFT identity verification returns `valid: true`
- a real mint transaction id is returned
- a real Fabric block number is returned
- gateway verify and gateway status calls succeed
- the test device is deleted at the end

## Simulated IoT Device Behavior

This project simulates a device in a realistic way:

- the frontend can auto-generate an RSA key pair in the browser
- the private key is downloaded once for storage on the simulated device
- the public key is sent to the backend
- the device data is signed locally before registration
- serial number, hardware ID, and MAC-style identifier can be auto-generated

This gives you a software-based device simulation while still writing real records to Hyperledger Fabric.

## Important Clarification About The NFT

This NFT is real on Hyperledger Fabric.

That means:

- it is minted by Fabric chaincode
- it has a real Fabric transaction
- it has a real Fabric block number
- it exists as a first-class ledger asset

It is not an ERC-721 token on Ethereum. The client asked for a real NFT on Hyperledger Fabric, and this implementation satisfies that requirement inside the Fabric network.

## Troubleshooting

### Backend says Fabric connection failed

Check:

- Fabric network is running
- channel `mychannel` exists
- wallet identities were refreshed
- `.env` still points to the test-network Org1 connection profile

### Frontend cannot reach backend

Check:

- backend is running on `5000`
- frontend is running on `3000`
- `curl http://localhost:5000/health` works

### Chaincode deploy fails

Redeploy with a higher chaincode version:

```bash
./network.sh deployCCAAS -c mychannel -ccn devicecontract -ccp ../../iot-device-registry/chaincode/deviceContract -ccv 1.5
```

### Old data or old chaincode behavior remains

Do a full clean restart:

```bash
cd /home/lol/Blockchain-main/Blockchain/fabric-samples/test-network
./network.sh down
docker rm -f peer0org1_devicecontract_ccaas peer0org2_devicecontract_ccaas 2>/dev/null || true
./network.sh up -ca
./network.sh createChannel -c mychannel
./network.sh deployCCAAS -c mychannel -ccn devicecontract -ccp ../../iot-device-registry/chaincode/deviceContract -ccv 1.2
```

Then restart the backend and frontend.

## Verified Locally

The following were verified locally:

- Fabric network running
- backend in `Fabric Mode`
- frontend reachable on `localhost:3000`
- frontend/backend connected
- device registration through backend
- real Fabric block number recorded
- real Fabric transaction id recorded
- Fabric NFT asset minted
- device fetch works
- device deletion works
