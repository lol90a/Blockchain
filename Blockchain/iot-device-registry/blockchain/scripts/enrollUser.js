const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const enrollUser = async () => {
  try {
    const ccpPath = path.resolve(__dirname, '../../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    const ca = new FabricCAServices(caURL);

    const walletPath = path.join(__dirname, '../../wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get('appUser');
    if (identity) {
      console.log('✅ appUser already exists in the wallet');
      return;
    }

    const enrollment = await ca.enroll({
      enrollmentID: 'appUser',
      enrollmentSecret: 'appUserpw'
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
    console.log('🎉 Successfully enrolled appUser manually into the wallet');

  } catch (error) {
    console.error(`❌ Failed to enroll existing appUser: ${error}`);
  }
};

enrollUser();
