# Blockchain Project Overview

This repository contains the `iot-device-registry` project, which implements a Hyperledger Fabric-backed IoT device registry with a React frontend and a Node.js backend.

The live project implementation is in:

```text
Blockchain/iot-device-registry
```

The Fabric test network used by the project is in:

```text
Blockchain/fabric-samples/test-network
```

## Alignment With The Milestone Document

The milestone document describes these major implementation areas:

1. Hyperledger Fabric blockchain network setup
2. smart contract / chaincode deployment
3. simulated IoT device interactions through API
4. admin monitoring interface
5. end-to-end testing and validation

The current project matches those areas as follows:

1. `Milestone 1: Setup the Hyperledger Fabric Blockchain Network`
   The Fabric network, channel creation, CA startup, wallet enrollment, and chaincode-as-a-service startup flow are implemented and documented.
2. `Milestone 2: Write and Deploy Smart Contracts (Chaincode)`
   The `devicecontract` chaincode is implemented and deployed on Hyperledger Fabric.
3. `Milestone 3: Simulate IoT Device Interactions via API`
   The backend exposes device registration, verification, status update, query, and deletion APIs.
4. `Milestone 4: Develop Admin Monitoring Interface`
   The frontend provides the device-management and admin monitoring flow.
5. `Milestone 5: End-to-End Testing and Validation`
   The project includes documented verification steps and an executable smoke test script.

## What The Project Does Today

- registers IoT devices on Hyperledger Fabric
- mints a Fabric NFT-style identity asset for each registered device
- records real Fabric transaction IDs and block numbers
- supports simulated device key generation and device signing flow
- supports device activation, deactivation, lookup, verification, and deletion
- exposes milestone-aligned gateway endpoints for register, verify, revoke, and status
- connects a React frontend to the backend API running against Fabric

## Important Scope Clarifications

- The Fabric-backed part of the project is the device registry and NFT identity flow.
- Admin login and user-management data are still handled by the backend application layer.
- Frontend auth/session tokens are stored in browser `localStorage`.
- The NFT is real on Hyperledger Fabric, but it is not an Ethereum ERC-721 token.
- The milestone document mentions hospital system integration and CouchDB visualization as possible architecture/tooling elements; those are not the main implemented runtime path documented here.

## Canonical Project Documentation

Use the project README as the main source of truth:

- [iot-device-registry/README.md](/home/lol/Blockchain-main/Blockchain/iot-device-registry/README.md)

That document contains:

- setup requirements
- Fabric startup steps
- chaincode deployment steps
- backend and frontend startup commands
- verification steps
- milestone alignment notes
- limitations and scope clarifications

## Current Runtime Summary

- frontend: `http://localhost:3000`
- backend: `http://localhost:5000`
- Fabric channel: `mychannel`
- chaincode: `devicecontract`
- runtime mode: Fabric only

## Recommended Start Flow

From the project directory:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
./scripts/reset-fabric-network.sh   # optional clean restart
./scripts/start-fabric-stack.sh
./start-server.sh
```

Then in another terminal:

```bash
cd Blockchain-main/Blockchain/iot-device-registry/frontend
npm start
```

## Automated Validation

From the project directory:

```bash
cd Blockchain-main/Blockchain/iot-device-registry
node scripts/test-all-operations.js
```

This validates:

- device registration on Fabric
- NFT identity verification
- real mint transaction ID
- real Fabric block number
- cleanup by deleting the test device
