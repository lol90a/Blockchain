const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const enrollAdmin = async () => {
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

    const enrollment = await ca.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'adminpw'
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put('admin', x509Identity);
    console.log('🎉 Successfully enrolled admin and refreshed the wallet identity');

  } catch (error) {
    console.error(`❌ Failed to enroll admin: ${error}`);
  }
};

enrollAdmin();
