const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const checkChannelPermissions = async () => {
  try {
    // Load connection profile
    const ccpPath = path.resolve(__dirname, '../../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create wallet and get identity
    const walletPath = path.join(__dirname, '../../wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if appUser exists
    const appUserIdentity = await wallet.get('appUser');
    if (!appUserIdentity) {
      console.log('❌ appUser identity not found in wallet');
      console.log('Please run: node blockchain/scripts/registerUser.js');
      return;
    }

    console.log('✅ appUser identity found in wallet');

    // Create gateway connection
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'appUser',
      discovery: { enabled: true, asLocalhost: true }
    });

    // Get network and channel
    const network = await gateway.getNetwork('mychannel');
    console.log('✅ Successfully connected to mychannel');

    // Get channel info
    const channel = network.getChannel();
    console.log('📊 Channel name:', channel.getName());

    // Try to get channel configuration
    try {
      const config = await channel.getChannelConfig();
      console.log('✅ Successfully retrieved channel configuration');
    } catch (error) {
      console.log('❌ Failed to get channel configuration:', error.message);
    }

    // Check if we can query the chaincode
    try {
      const contract = network.getContract('deviceContract');
      console.log('✅ Successfully got contract reference');
      
      // Try a simple query
      const result = await contract.evaluateTransaction('queryAllDevices');
      console.log('✅ Successfully queried chaincode');
      console.log('📄 Query result:', result.toString());
    } catch (error) {
      console.log('❌ Failed to query chaincode:', error.message);
    }

    await gateway.disconnect();
    console.log('🔌 Disconnected from gateway');

  } catch (error) {
    console.error('❌ Error checking channel permissions:', error);
  }
};

checkChannelPermissions(); 