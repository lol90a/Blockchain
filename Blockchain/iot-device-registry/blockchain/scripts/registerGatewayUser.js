const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

function readFirstFile(directoryPath) {
  const files = fs.readdirSync(directoryPath);
  if (files.length === 0) {
    throw new Error(`No files found in ${directoryPath}`);
  }

  return fs.readFileSync(path.join(directoryPath, files[0]), 'utf8');
}

async function importTestNetworkUserAsGateway(wallet) {
  const basePath = path.resolve(
    __dirname,
    '../../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp'
  );

  const certificate = fs.readFileSync(path.join(basePath, 'signcerts/cert.pem'), 'utf8');
  const privateKey = readFirstFile(path.join(basePath, 'keystore'));

  await wallet.put('gatewayUser', {
    credentials: {
      certificate,
      privateKey
    },
    mspId: 'Org1MSP',
    type: 'X.509'
  });
}

async function enrollGatewayUser() {
  try {
    const ccpPath = path.resolve(__dirname, '../../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    const caTLSCACerts = ccp.certificateAuthorities['ca.org1.example.com'].tlsCACerts.pem;
    const ca = new FabricCAServices(caURL, {
      trustedRoots: Array.isArray(caTLSCACerts) ? caTLSCACerts : [caTLSCACerts],
      verify: false
    }, ccp.certificateAuthorities['ca.org1.example.com'].caName);

    const walletPath = path.join(__dirname, '../../wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      throw new Error('Admin identity is not enrolled');
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    let enrollmentSecret = 'gatewayUserpw';
    try {
      enrollmentSecret = await ca.register({
        enrollmentID: 'gatewayUser',
        enrollmentSecret,
        role: 'client',
        affiliation: 'org1.department1'
      }, adminUser);
    } catch (error) {
      if (String(error).includes('is already registered')) {
        console.log('ℹ️ gatewayUser is already registered. Proceeding to enroll and refresh the wallet identity...');
      } else {
        throw error;
      }
    }

    const enrollment = await ca.enroll({
      enrollmentID: 'gatewayUser',
      enrollmentSecret
    });

    await wallet.put('gatewayUser', {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: 'Org1MSP',
      type: 'X.509'
    });

    console.log('🎉 gatewayUser enrolled and refreshed in the wallet');
  } catch (error) {
    if (String(error).includes('Authentication failure')) {
      try {
        const walletPath = path.join(__dirname, '../../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log('ℹ️ gatewayUser enrollment secret was rejected by the CA. Importing the built-in User1 identity into the wallet as gatewayUser instead.');
        await importTestNetworkUserAsGateway(wallet);
        console.log('🎉 gatewayUser imported from the Fabric test-network user identity');
        return;
      } catch (fallbackError) {
        console.error(`❌ Failed to recover gatewayUser from the test-network identity: ${fallbackError}`);
      }
    }

    console.error(`❌ Failed to register or enroll gatewayUser: ${error}`);
  }
}

enrollGatewayUser();
