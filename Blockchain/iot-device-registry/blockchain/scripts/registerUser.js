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

async function importTestNetworkUser(wallet) {
  const basePath = path.resolve(
    __dirname,
    '../../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp'
  );

  const certificate = fs.readFileSync(path.join(basePath, 'signcerts/cert.pem'), 'utf8');
  const privateKey = readFirstFile(path.join(basePath, 'keystore'));

  await wallet.put('appUser', {
    credentials: {
      certificate,
      privateKey
    },
    mspId: 'Org1MSP',
    type: 'X.509'
  });
}

const registerUser = async () => {
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

    let enrollmentSecret;
    try {
      enrollmentSecret = await ca.register({
        enrollmentID: 'appUser',
        enrollmentSecret: 'appUserpw',
        role: 'client',
        affiliation: 'org1.department1'
      }, adminUser);
    } catch (err) {
      if (err.toString().includes('is already registered')) {
        console.log('ℹ️ appUser is already registered. Proceeding to enroll...');
        enrollmentSecret = 'appUserpw';
      } else if (err.toString().includes('Authentication failure')) {
        console.log('ℹ️ CA registration rejected appUser. Importing the built-in User1 identity into the wallet as appUser instead.');
        await importTestNetworkUser(wallet);
        console.log('🎉 appUser imported from the Fabric test-network user identity');
        return;
      } else {
        throw err;
      }
    }

    let enrollment;
    try {
      enrollment = await ca.enroll({
        enrollmentID: 'appUser',
        enrollmentSecret: enrollmentSecret
      });
    } catch (err) {
      if (err.toString().includes('Authentication failure')) {
        console.log('ℹ️ appUser enrollment secret is not accepted by the CA. Importing the built-in User1 identity into the wallet as appUser instead.');
        await importTestNetworkUser(wallet);
        console.log('🎉 appUser imported from the Fabric test-network user identity');
        return;
      }

      throw err;
    }

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put('appUser', x509Identity);
    console.log('🎉 appUser enrolled and refreshed in the wallet');

  } catch (error) {
    console.error(`❌ Failed to register or enroll appUser: ${error}`);
  }
};

registerUser();
