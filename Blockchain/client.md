“A Decentralized Architecture for Secure and Scalable IoT Device Authentication in Smart 
Healthcare Systems” 
1. What Research Is About: 
This research Is for designing a secure, scalable system called DASHCare that uses blockchain 
(Hyperledger Fabric) to: 
• Register IoT medical devices (e.g., ECG monitors, wearables) 
• Authenticate them using NFT-like digital identities 
• Revoke compromised devices in real time 
• Ensure that only trusted devices can access hospital systems 
2. System Includes: 
• IoT Device Layer – Smart devices that send metadata 
• Edge Gateway – Forwards requests to blockchain and controls device flow 
• Blockchain Layer (Hyperledger Fabric) – Smart contracts, peer nodes, NFT identity, 
CA 
• Admin Interface – Allows hospital staff to register or revoke devices and monitor logs 
• Hospital System Integration Layer – Only verified devices can send data to EMRs and 
other systems 
3. Core Features: 
• NFT-based identity tokens for devices (tamper-proof and unique) 
• Smart contracts for registration, verification, revocation 
• Immutable logging for traceability and audit 
• Compliance with GDPR / HIPAA 
• Permissioned blockchain (no public exposure) 
4. Original Contribution: 
• Blockchain + IoT + Edge computing + NFT logic 
• Tailored specifically for device-level authentication in hospital environments 
• A layered architecture that’s secure, scalable, and regulation-ready 
A. Step-by-Step Plan to Define Tools 
•  Development Environment (hardware, OS, IDE) 
•  Blockchain Platform & Configuration (Hyperledger Fabric) 
•  Smart Contract Development Tools (Go, CLI, Docker) 
•  Device Simulation Tools (REST API, mock device scripts) 
•  Admin Interface Tools (Web, Node.js or Flask) 
•  Testing Tools (Postman, logs, logs parser) 
•  External Integrations (like IPFS if you want file storage later) 
Implementation Milestones 
1) Milestone 1: Setup the Hyperledger Fabric Blockchain Network 
 
  Tools: 
• Docker & Docker Compose 
• Hyperledger Fabric binaries 
• Fabric CA 
• Visual Studio Code 
Tasks: 
• Install Docker & Fabric binaries 
• Create a test network with: 
o 1 Certificate Authority (CA) 
o 1 Peer 
o 1 Orderer 
• Create a channel (e.g., iotchannel) 
• Launch CouchDB to visualize the world state 
• Enroll admin & register edge gateway identity 
Output: 
• A running Fabric test network 
• Identities (certificates) generated for peer, admin, gateway 
2) Milestone 2: Write and Deploy Smart Contracts (Chaincode) 
 
  Tools: 
• Go programming language 
• Fabric Chaincode Lifecycle CLI 
• CouchDB (to verify stored state) 
Tasks: 
• Write smart contract (iot_device_chaincode.go) with functions: 
o registerDevice() 
o verifyDevice() 
o revokeDevice() 
o getDeviceStatus() 
• Define a JSON structure to simulate NFT-like identity 
• Package and install the chaincode 
• Approve and commit it to the blockchain 
Output: 
• Deployed chaincode 
• Chaincode tested via CLI 
• Devices registered and stored in blockchain state 
3) Milestone 3: Simulate IoT Device Interactions via API 
 
  Tools: 
• Node.js or Python (Flask or Express) 
• REST API endpoints 
• Postman or Curl 
Tasks: 
• Create APIs to simulate: 
o Device submitting metadata (/register) 
o Device requesting verification (/verify) 
• Use REST calls to trigger chaincode functions via Fabric SDK 
• Simulate successful and failed device requests 
Output: 
• API server that simulates IoT device registration and authentication 
• Real device logs recorded on-chain 
4)  Milestone 4: Develop Admin Monitoring Interface 
 
  Tools: 
• HTML/CSS/JS frontend OR Flask/Node.js 
• Fabric SDK 
• Bootstrap (for design) 
Tasks: 
• Build a simple GUI for: 
o Registering devices manually 
o Viewing device list/status 
o Revoking devices 
o Viewing logs 
• Interface communicates with blockchain via APIs 
Output: 
• Working admin panel for hospital staff 
• Secure admin authentication (optional via CA) 
5) Milestone 5: End-to-End Testing and Validation 
 
  Tools: 
• Postman 
• Docker logs 
• CouchDB browser 
• Audit script (optional) 
Tasks: 
• Register 3–5 simulated devices 
• Authenticate valid and revoked devices 
• Revoke one device and try to re-authenticate 
• View and export logs for reporting 
Output: 
• Evidence that the full flow works: 
o Device → Gateway → Blockchain → Access 
• Screenshots, logs, JSON output for thesis 
• Integrate IPFS to store encrypted files and save hashes in the blockchain for audit 
purposes. 

Project completion status in this repository:

• Milestone 1 completed with Hyperledger Fabric test-network startup, channel creation, CouchDB-backed state database, Fabric CA enrollment, admin identity, application identity, and a distinct gateway identity.
• Milestone 2 completed with deployed Node.js chaincode implementing registerDevice(), verifyDevice(), revokeDevice(), getDeviceStatus(), NFT-style metadata, NFT minting, and audit-history retrieval.
• Milestone 3 completed with backend REST APIs for registration, verification, revoke, status, challenge/proof, and simulated device signing using real RSA keys.
• Milestone 4 completed with a frontend admin panel for device registration, listing, activation, revocation, viewing details, and viewing/exporting audit logs.
• Milestone 5 completed with smoke-test automation, audit export, revoked-device validation flow, IPFS/local audit archival, and hospital intake validation.

What is implemented for the architecture description:

• IoT Device Layer: implemented as software-based device simulation with unique RSA keypairs and signed metadata.
• Edge Gateway: implemented in the backend API under /api/gateway and backed by a dedicated Fabric wallet identity named gatewayUser.
• Blockchain Layer: implemented with Hyperledger Fabric, Fabric CA, channel, peer/orderer network, chaincode, and NFT-style identity assets.
• Admin Interface: implemented in the React frontend with audit-log and revoke support.
• Hospital System Integration Layer: implemented as validated hospital intake routes and optional forwarding to an external EMR endpoint when configured.

Important honest note:

• GDPR/HIPAA-oriented technical safeguards are implemented, but formal legal certification is outside the scope of code alone.
           
 
 
