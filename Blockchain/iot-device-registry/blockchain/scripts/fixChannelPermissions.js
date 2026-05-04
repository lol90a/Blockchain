const { Gateway, Wallets } = require('fabric-network');
const { Channel } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const fixChannelPermissions = async () => {
  try {
    console.log('🔧 Fixing channel permissions for appUser...');
    
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

    // Get network and channel
    const network = await gateway.getNetwork('mychannel');
    console.log('✅ Successfully connected to mychannel with admin identity');

    // Get channel info
    const channel = network.getChannel();
    console.log('📊 Channel name:', channel.getName());

    // Check current channel configuration
    try {
      const config = await channel.getChannelConfig();
      console.log('✅ Successfully retrieved channel configuration');
      
      // Parse the config to check application policies
      const configProto = await channel.getChannelConfigFromOrderer();
      console.log('📋 Channel config retrieved from orderer');
      
      // The issue might be that appUser needs to be added to the channel's application policies
      // For now, let's try to use the admin identity to query the chaincode
      console.log('🔄 Trying to use admin identity for chaincode operations...');
      
      const contract = network.getContract('deviceContract');
      console.log('✅ Successfully got contract reference with admin');
      
      // Try a simple query with admin
      const result = await contract.evaluateTransaction('queryAllDevices');
      console.log('✅ Successfully queried chaincode with admin identity');
      console.log('📄 Query result:', result.toString());
      
      console.log('🎉 Admin identity has proper permissions!');
      console.log('💡 The issue is that appUser needs to be added to channel policies.');
      console.log('📝 This typically requires updating the channel configuration.');
      
    } catch (error) {
      console.log('❌ Failed to get channel configuration:', error.message);
    }

    await gateway.disconnect();
    console.log('🔌 Disconnected from gateway');

    // Now let's try to re-enroll the appUser with proper attributes
    console.log('\n🔄 Re-enrolling appUser with proper attributes...');
    await reEnrollAppUser();

  } catch (error) {
    console.error('❌ Error fixing channel permissions:', error);
  }
};

const reEnrollAppUser = async () => {
  try {
    const FabricCAServices = require('fabric-ca-client');
    
    // Load connection profile
    const ccpPath = path.resolve(__dirname, '../../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    const ca = new FabricCAServices(caURL);

    const walletPath = path.join(__dirname, '../../wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Remove existing appUser
    await wallet.remove('appUser');
    console.log('🗑️ Removed existing appUser from wallet');

    const adminIdentity = await wallet.get('admin');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    // Register appUser with additional attributes
    const enrollmentSecret = await ca.register({
      enrollmentID: 'appUser',
      enrollmentSecret: 'appUserpw',
      role: 'client',
      affiliation: 'org1.department1',
      attrs: [
        { name: 'hf.Registrar.Roles', value: 'client' },
        { name: 'hf.Registrar.Attributes', value: '*' },
        { name: 'hf.Revoker', value: 'true' },
        { name: 'hf.IntermediateCA', value: 'true' }
      ]
    }, adminUser);

    console.log('✅ Registered appUser with enhanced attributes');

    // Enroll the user
    const enrollment = await ca.enroll({
      enrollmentID: 'appUser',
      enrollmentSecret: enrollmentSecret
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put('appUser', x509Identity);
    console.log('🎉 appUser re-enrolled with enhanced attributes');

  } catch (error) {
    console.error('❌ Failed to re-enroll appUser:', error);
  }
};

fixChannelPermissions(); 