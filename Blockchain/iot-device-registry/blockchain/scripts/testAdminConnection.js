const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const testAdminConnection = async () => {
  try {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
    console.log('🔧 Testing admin connection...');
    
    // Load connection profile
    const ccpPath = path.resolve(__dirname, '../../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create wallet and get admin identity
    const walletPath = path.join(__dirname, '../../wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if admin exists
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.log('❌ Admin identity not found in wallet');
      console.log('Please run: node blockchain/scripts/enrollAdmin.js');
      return;
    }

    console.log('✅ Admin identity found in wallet');

    // Create gateway connection with admin identity
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });

    console.log('✅ Successfully connected to gateway with admin identity');

    const network = await gateway.getNetwork('mychannel');
    console.log('✅ Successfully connected to mychannel');

    // Try to get contract
    const contract = network.getContract(process.env.CHAINCODE_NAME || 'devicecontract');
    console.log('✅ Successfully got contract reference');
    
    // Try a simple query
    const result = await contract.evaluateTransaction('getAllDevices');
    console.log('✅ Successfully queried chaincode');
    console.log('📄 Query result:', result.toString());

    await gateway.disconnect();
    console.log('🔌 Disconnected from gateway');

  } catch (error) {
    console.error('❌ Error testing admin connection:', error);
  }
};

testAdminConnection(); 
