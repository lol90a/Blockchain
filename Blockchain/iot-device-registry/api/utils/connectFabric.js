require('dotenv').config(); // ✅ تأكد إنها في أعلى الملف
const fs = require('fs');
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');

const walletPath = path.join(__dirname, '../../wallet');
const connectionProfilePath = path.resolve(process.env.CONNECTION_PROFILE_PATH);

const connectFabric = async (identityLabel = 'appUser') => {
  const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: identityLabel,
    discovery: { enabled: true, asLocalhost: true }, // ✅ مهم جداً لتجنب DiscoveryService errors
  });

  const network = await gateway.getNetwork(process.env.CHANNEL_NAME);
  const contract = network.getContract(process.env.CHAINCODE_NAME);

  return { contract, gateway, network };
};

module.exports = connectFabric;
